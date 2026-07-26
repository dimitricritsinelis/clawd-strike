import { emptyCompositionWaiverRegistry } from "./composition-waivers.mjs";

const EPSILON = 1e-6;
const OPENING_KINDS = new Set(["door", "window", "shop_recess", "arch"]);
const SERVICEABLE_OPENING_KINDS = new Set(["door", "window"]);
const FIXTURE_ANCHOR_TYPES = new Set([
  "dressing_anchor",
  "lantern_anchor",
  "shopfront_anchor",
  "signage_anchor",
]);

function fail(message) {
  throw new Error(`[composition-validator] ${message}`);
}

function requirePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) fail(`${label} must be > 0`);
  return value;
}

function requireNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) fail(`${label} must be >= 0`);
  return value;
}

function normalizedPairKey(leftId, rightId) {
  return [leftId, rightId].sort().join("::");
}

function waiverEvidence(exemption) {
  return exemption.waiver;
}

function frontageLengthM(frontage, zone) {
  const fullLengthM = frontage.face === "west" || frontage.face === "east"
    ? zone.rect.h
    : zone.rect.w;
  return fullLengthM * ((frontage.end ?? 1) - (frontage.start ?? 0));
}

function rotatedHalfExtents(dimensionsM, yawDeg = 0, bufferM = 0) {
  const yawRad = yawDeg * Math.PI / 180;
  const cos = Math.abs(Math.cos(yawRad));
  const sin = Math.abs(Math.sin(yawRad));
  return {
    x: cos * dimensionsM.width * 0.5 + sin * dimensionsM.depth * 0.5 + bufferM,
    y: sin * dimensionsM.width * 0.5 + cos * dimensionsM.depth * 0.5 + bufferM,
  };
}

function placementAabb(placement, bufferM = 0) {
  const half = rotatedHalfExtents(placement.dimensionsM, placement.yawDeg, bufferM);
  return {
    minX: placement.position.x - half.x,
    maxX: placement.position.x + half.x,
    minY: placement.position.y - half.y,
    maxY: placement.position.y + half.y,
    minZ: placement.position.z - bufferM,
    maxZ: placement.position.z + placement.dimensionsM.height + bufferM,
  };
}

function architectureAabb(placement, bufferM = 0) {
  const half = rotatedHalfExtents(placement.sizeM, placement.yawDeg, bufferM);
  return {
    minX: placement.center.x - half.x,
    maxX: placement.center.x + half.x,
    minY: placement.center.y - half.y,
    maxY: placement.center.y + half.y,
    minZ: placement.center.z - placement.sizeM.height * 0.5 - bufferM,
    maxZ: placement.center.z + placement.sizeM.height * 0.5 + bufferM,
  };
}

function architectureOrientedBox(placement) {
  const yawRad = (placement.yawDeg ?? 0) * Math.PI / 180;
  return {
    center: placement.center,
    half: {
      x: placement.sizeM.width * 0.5,
      y: placement.sizeM.depth * 0.5,
      z: placement.sizeM.height * 0.5,
    },
    axes: [
      { x: Math.cos(yawRad), y: Math.sin(yawRad) },
      { x: -Math.sin(yawRad), y: Math.cos(yawRad) },
    ],
  };
}

function canopyOrientedBox(placement, bufferM) {
  const start = placement.spanSeats?.start;
  const end = placement.spanSeats?.end;
  if (
    !start
    || !end
    || ![start.x, start.y, start.z, end.x, end.y, end.z].every(Number.isFinite)
  ) {
    fail(`Canopy placement '${placement.id}' requires exact span seats`);
  }
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const spanM = Math.hypot(deltaX, deltaY);
  if (spanM <= EPSILON) fail(`Canopy placement '${placement.id}' requires distinct span seats`);
  const longAxis = { x: deltaX / spanM, y: deltaY / spanM };
  const shortAxis = { x: -longAxis.y, y: longAxis.x };
  return {
    center: {
      x: (start.x + end.x) * 0.5,
      y: (start.y + end.y) * 0.5,
      z: (start.z + end.z) * 0.5,
    },
    half: {
      x: placement.dimensionsM.width * 0.5 + bufferM,
      y: spanM * 0.5 + bufferM,
      z: Math.abs(end.z - start.z) * 0.5 + placement.dimensionsM.height * 0.5 + bufferM,
    },
    axes: [shortAxis, longAxis],
  };
}

function projectedRadius(box, axis) {
  return (
    box.half.x * Math.abs(box.axes[0].x * axis.x + box.axes[0].y * axis.y)
    + box.half.y * Math.abs(box.axes[1].x * axis.x + box.axes[1].y * axis.y)
  );
}

function overlapsOrientedBoxes(left, right) {
  if (Math.abs(left.center.z - right.center.z) >= left.half.z + right.half.z - EPSILON) {
    return false;
  }
  const delta = {
    x: right.center.x - left.center.x,
    y: right.center.y - left.center.y,
  };
  for (const axis of [...left.axes, ...right.axes]) {
    const separation = Math.abs(delta.x * axis.x + delta.y * axis.y);
    if (separation >= projectedRadius(left, axis) + projectedRadius(right, axis) - EPSILON) {
      return false;
    }
  }
  return true;
}

function overlaps(left, right) {
  return (
    left.minX < right.maxX - EPSILON
    && left.maxX > right.minX + EPSILON
    && left.minY < right.maxY - EPSILON
    && left.maxY > right.minY + EPSILON
    && left.minZ < right.maxZ - EPSILON
    && left.maxZ > right.minZ + EPSILON
  );
}

function openingServiceAabb(placement, clearanceM, lateralBufferM) {
  const halfWidthM = placement.sizeM.width * 0.5 + lateralBufferM;
  const halfDepthM = clearanceM * 0.5;
  let centerX = placement.center.x;
  let centerY = placement.center.y;
  let halfX;
  let halfY;
  switch (placement.face) {
    case "west":
      centerX += halfDepthM;
      halfX = halfDepthM;
      halfY = halfWidthM;
      break;
    case "east":
      centerX -= halfDepthM;
      halfX = halfDepthM;
      halfY = halfWidthM;
      break;
    case "south":
      centerY += halfDepthM;
      halfX = halfWidthM;
      halfY = halfDepthM;
      break;
    case "north":
      centerY -= halfDepthM;
      halfX = halfWidthM;
      halfY = halfDepthM;
      break;
    default:
      fail(`Architecture placement '${placement.id}' has unsupported face '${String(placement.face)}'`);
  }
  return {
    minX: centerX - halfX,
    maxX: centerX + halfX,
    minY: centerY - halfY,
    maxY: centerY + halfY,
    minZ: placement.center.z - placement.sizeM.height * 0.5,
    maxZ: placement.center.z + placement.sizeM.height * 0.5,
  };
}

export function normalizeCompositionRules(
  raw,
  zones,
  waiverRegistry = emptyCompositionWaiverRegistry(),
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("V3 map spec requires composition_rules");
  }
  const clearances = raw.clearances;
  if (!clearances || typeof clearances !== "object" || Array.isArray(clearances)) {
    fail("composition_rules.clearances must be an object");
  }
  const wallBudgets = raw.wall_budgets;
  if (!wallBudgets || typeof wallBudgets !== "object" || Array.isArray(wallBudgets)) {
    fail("composition_rules.wall_budgets must be an object");
  }
  const zoneDensityBudgets = raw.zone_density_budgets;
  if (!zoneDensityBudgets || typeof zoneDensityBudgets !== "object" || Array.isArray(zoneDensityBudgets)) {
    fail("composition_rules.zone_density_budgets must be an object");
  }

  const zoneIds = new Set(zones.map((zone) => zone.id));
  const normalizedZoneBudgets = {};
  for (const [zoneId, value] of Object.entries(zoneDensityBudgets)) {
    if (!zoneIds.has(zoneId)) fail(`Density budget references unknown zone '${zoneId}'`);
    if (!Number.isInteger(value) || value < 0) fail(`Density budget '${zoneId}' must be a non-negative integer`);
    normalizedZoneBudgets[zoneId] = value;
  }
  const missingZones = zones.map((zone) => zone.id).filter((zoneId) => !(zoneId in normalizedZoneBudgets));
  if (missingZones.length > 0) {
    fail(`Density budgets missing zones: ${missingZones.join(", ")}`);
  }

  return {
    clearances: {
      doorServiceM: requirePositive(clearances.door_service_m, "clearances.door_service_m"),
      openingLateralBufferM: requireNonNegative(
        clearances.opening_lateral_buffer_m,
        "clearances.opening_lateral_buffer_m",
      ),
      canopyOpeningBufferM: requireNonNegative(
        clearances.canopy_opening_buffer_m,
        "clearances.canopy_opening_buffer_m",
      ),
      placementAabbBufferM: requireNonNegative(
        clearances.placement_aabb_buffer_m,
        "clearances.placement_aabb_buffer_m",
      ),
      fixtureBufferM: requireNonNegative(clearances.fixture_buffer_m, "clearances.fixture_buffer_m"),
      fixtureAxisToleranceM: requireNonNegative(
        clearances.fixture_axis_tolerance_m,
        "clearances.fixture_axis_tolerance_m",
      ),
    },
    wallBudgets: {
      fixtureSpacingM: requirePositive(wallBudgets.fixture_spacing_m, "wall_budgets.fixture_spacing_m"),
      symmetryTolerance: requireNonNegative(
        wallBudgets.symmetry_tolerance,
        "wall_budgets.symmetry_tolerance",
      ),
      smallWallMaxM: requirePositive(wallBudgets.small_wall_max_m, "wall_budgets.small_wall_max_m"),
      smallWallMaxFixtures: (() => {
        const value = requireNonNegative(
          wallBudgets.small_wall_max_fixtures,
          "wall_budgets.small_wall_max_fixtures",
        );
        if (!Number.isInteger(value)) fail("wall_budgets.small_wall_max_fixtures must be an integer");
        return value;
      })(),
    },
    zoneDensityBudgets: normalizedZoneBudgets,
    canopyOpeningExemptions: waiverRegistry.byKind["canopy-opening"],
    hardOverlapExemptions: waiverRegistry.byKind["hard-overlap"],
    fixtureBufferExemptions: waiverRegistry.byKind["fixture-buffer"],
    openingServiceExemptions: waiverRegistry.byKind["opening-service"],
    decorationOpeningExemptions: waiverRegistry.byKind["decoration-opening"],
    fenestrationExemptions: waiverRegistry.byKind.fenestration,
    wallBudgetExemptions: waiverRegistry.byKind["wall-budget"],
    fixtureAxisExemptions: waiverRegistry.byKind["fixture-axis"],
  };
}

export function validateOpeningServiceability({
  anchors = [],
  architecturePlacements,
  dressingPlacements,
  rules,
}) {
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const openings = architecturePlacements.filter((placement) => (
    placement.kind === "facade_module"
    && SERVICEABLE_OPENING_KINDS.has(placement.moduleKind)
  ));
  const blockingPlacements = dressingPlacements.filter((placement) => {
    if (placement.collisionClass === "hard") return true;
    const anchor = anchorById.get(placement.anchorId);
    if (
      placement.classification === "overhead"
      || placement.collisionClass === "overhead"
      || anchor?.type === "cloth_canopy_span"
    ) return false;
    return !(
      anchor?.frontageId
      && anchor.servedBayId
      && FIXTURE_ANCHOR_TYPES.has(anchor.type)
    );
  });
  const exemptionByPair = new Map(rules.openingServiceExemptions.map((entry) => [
    `${entry.placementId}::${entry.openingId}`,
    entry,
  ]));
  const usedExemptions = new Set();
  const deferredConflicts = [];
  const unexemptedConflicts = [];
  for (const opening of openings) {
    const serviceAabb = openingServiceAabb(
      opening,
      rules.clearances.doorServiceM,
      rules.clearances.openingLateralBufferM,
    );
    for (const placement of blockingPlacements) {
      if (!overlaps(serviceAabb, placementAabb(placement))) continue;
      const pairKey = `${placement.id}::${opening.id}`;
      const exemption = exemptionByPair.get(pairKey);
      if (!exemption) {
        unexemptedConflicts.push({ placementId: placement.id, openingId: opening.id });
        continue;
      }
      usedExemptions.add(pairKey);
      deferredConflicts.push({
        placementId: placement.id,
        openingId: opening.id,
        ...waiverEvidence(exemption),
      });
    }
  }
  if (unexemptedConflicts.length > 0) {
    fail(
      "Placements block service clearance: "
      + unexemptedConflicts.map((entry) => (
        `'${entry.placementId}' + '${entry.openingId}'`
      )).join("; "),
    );
  }
  const staleExemptions = rules.openingServiceExemptions
    .filter((entry) => !usedExemptions.has(`${entry.placementId}::${entry.openingId}`))
    .map((entry) => `${entry.placementId} + ${entry.openingId}`);
  if (staleExemptions.length > 0) {
    fail(`Opening-service exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateHardPlacementAabbs({ dressingPlacements, rules }) {
  const hard = dressingPlacements.filter((placement) => placement.collisionClass === "hard");
  const exemptionByPair = new Map(rules.hardOverlapExemptions.map((entry) => [
    normalizedPairKey(...entry.placementIds),
    entry,
  ]));
  const usedExemptions = new Set();
  const deferredConflicts = [];
  const unexemptedConflicts = [];
  for (let leftIndex = 0; leftIndex < hard.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < hard.length; rightIndex += 1) {
      const left = hard[leftIndex];
      const right = hard[rightIndex];
      if (
        overlaps(
          placementAabb(left, rules.clearances.placementAabbBufferM),
          placementAabb(right, rules.clearances.placementAabbBufferM),
        )
      ) {
        const pairKey = normalizedPairKey(left.id, right.id);
        const exemption = exemptionByPair.get(pairKey);
        if (!exemption) {
          unexemptedConflicts.push([left.id, right.id].sort());
          continue;
        }
        usedExemptions.add(pairKey);
        deferredConflicts.push({
          placementIds: [left.id, right.id].sort(),
          ...waiverEvidence(exemption),
        });
      }
    }
  }
  if (unexemptedConflicts.length > 0) {
    fail(
      `Hard placements overlap their buffered AABBs: `
      + unexemptedConflicts.map((pair) => `'${pair[0]}' + '${pair[1]}'`).join("; "),
    );
  }
  const staleExemptions = rules.hardOverlapExemptions
    .filter((entry) => !usedExemptions.has(normalizedPairKey(...entry.placementIds)))
    .map((entry) => entry.placementIds.join(" + "));
  if (staleExemptions.length > 0) {
    fail(`Hard-overlap exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateFixtureBuffers({ anchors, dressingPlacements, rules }) {
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const fixtures = dressingPlacements.filter((placement) => {
    const anchor = anchorById.get(placement.anchorId);
    return anchor?.frontageId && anchor.servedBayId && FIXTURE_ANCHOR_TYPES.has(anchor.type);
  });
  const exemptionByPair = new Map(rules.fixtureBufferExemptions.map((entry) => [
    normalizedPairKey(...entry.placementIds),
    entry,
  ]));
  const usedExemptions = new Set();
  const deferredConflicts = [];
  const unexemptedConflicts = [];
  for (let leftIndex = 0; leftIndex < fixtures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fixtures.length; rightIndex += 1) {
      const left = fixtures[leftIndex];
      const right = fixtures[rightIndex];
      const leftAnchor = anchorById.get(left.anchorId);
      const rightAnchor = anchorById.get(right.anchorId);
      if (
        overlaps(
          placementAabb(left, rules.clearances.fixtureBufferM),
          placementAabb(right, rules.clearances.fixtureBufferM),
        )
      ) {
        const pairKey = normalizedPairKey(left.id, right.id);
        const exemption = exemptionByPair.get(pairKey);
        if (!exemption) {
          unexemptedConflicts.push({
            placementIds: [left.id, right.id].sort(),
            servedBayIds: [leftAnchor.servedBayId, rightAnchor.servedBayId],
          });
          continue;
        }
        usedExemptions.add(pairKey);
        deferredConflicts.push({
          placementIds: [left.id, right.id].sort(),
          ...waiverEvidence(exemption),
        });
      }
    }
  }
  if (unexemptedConflicts.length > 0) {
    fail(
      "Fixtures violate measured decoration buffers: "
      + unexemptedConflicts.map((entry) => (
        `'${entry.placementIds[0]}' + '${entry.placementIds[1]}' `
        + `(${entry.servedBayIds.join("/")})`
      )).join("; "),
    );
  }
  const staleExemptions = rules.fixtureBufferExemptions
    .filter((entry) => !usedExemptions.has(normalizedPairKey(...entry.placementIds)))
    .map((entry) => entry.placementIds.join(" + "));
  if (staleExemptions.length > 0) {
    fail(`Fixture-buffer exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateDecorationOpeningBuffers({
  anchors,
  architecturePlacements,
  dressingPlacements,
  rules,
}) {
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const fixtures = dressingPlacements.filter((placement) => {
    const anchor = anchorById.get(placement.anchorId);
    return anchor?.frontageId && anchor.servedBayId && FIXTURE_ANCHOR_TYPES.has(anchor.type);
  });
  const openings = architecturePlacements.filter((placement) => (
    placement.kind === "facade_module" && OPENING_KINDS.has(placement.moduleKind)
  ));
  const exemptionByPair = new Map(rules.decorationOpeningExemptions.map((entry) => [
    `${entry.placementId}::${entry.openingId}`,
    entry,
  ]));
  const usedExemptions = new Set();
  const deferredConflicts = [];
  const unexemptedConflicts = [];
  for (const fixture of fixtures) {
    const servedBayId = anchorById.get(fixture.anchorId)?.servedBayId;
    const servedOpeningId = servedBayId
      ? `ARCH_${anchorById.get(fixture.anchorId)?.frontageId}_${servedBayId}`
      : null;
    for (const opening of openings) {
      // A fixture is allowed to occupy the one opening its anchor declares it
      // serves: a stall seated in its own merchant bay, or a sign hung in its
      // own shopfront, is the intended composition rather than a conflict. It
      // still has to clear every other opening on the wall. This mirrors the
      // served-bay carve-out in validateOpeningServiceability.
      if (servedOpeningId && opening.id === servedOpeningId) continue;
      if (
        !overlaps(
          placementAabb(fixture, rules.clearances.fixtureBufferM),
          architectureAabb(opening),
        )
      ) continue;
      const pairKey = `${fixture.id}::${opening.id}`;
      const exemption = exemptionByPair.get(pairKey);
      if (!exemption) {
        unexemptedConflicts.push({ placementId: fixture.id, openingId: opening.id });
        continue;
      }
      usedExemptions.add(pairKey);
      deferredConflicts.push({
        placementId: fixture.id,
        openingId: opening.id,
        ...waiverEvidence(exemption),
      });
    }
  }
  if (unexemptedConflicts.length > 0) {
    fail(
      "Fixtures violate measured opening buffers: "
      + unexemptedConflicts.map((entry) => (
        `'${entry.placementId}' + '${entry.openingId}'`
      )).join("; "),
    );
  }
  const staleExemptions = rules.decorationOpeningExemptions
    .filter((entry) => !usedExemptions.has(`${entry.placementId}::${entry.openingId}`))
    .map((entry) => `${entry.placementId} + ${entry.openingId}`);
  if (staleExemptions.length > 0) {
    fail(`Decoration-opening exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateCanopyOpeningClearance({
  anchors,
  architecturePlacements,
  dressingPlacements,
  rules,
}) {
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const openings = architecturePlacements.filter((placement) => (
    placement.kind === "facade_module" && OPENING_KINDS.has(placement.moduleKind)
  ));
  const exemptionByAnchorId = new Map(
    rules.canopyOpeningExemptions.map((entry) => [entry.anchorId, entry]),
  );
  const usedExemptions = new Set();
  const deferredConflicts = [];
  for (const placement of dressingPlacements.filter((entry) => (
    anchorById.get(entry.anchorId)?.type === "cloth_canopy_span"
  ))) {
    const openingIds = openings
      .filter((opening) => overlapsOrientedBoxes(
        canopyOrientedBox(placement, rules.clearances.canopyOpeningBufferM),
        architectureOrientedBox(opening),
      ))
      .map((opening) => opening.id)
      .sort();
    if (openingIds.length === 0) continue;
    const exemption = exemptionByAnchorId.get(placement.anchorId);
    if (!exemption) {
      fail(`Canopy '${placement.anchorId}' intersects facade openings: ${openingIds.join(", ")}`);
    }
    if (
      openingIds.length !== exemption.openingIds.length
      || openingIds.some((openingId, index) => openingId !== exemption.openingIds[index])
    ) {
      fail(
        `Canopy opening exemption '${placement.anchorId}' must exactly match conflicts `
        + `${openingIds.join(", ")}`,
      );
    }
    usedExemptions.add(placement.anchorId);
    deferredConflicts.push({
      anchorId: placement.anchorId,
      openingIds,
      ...waiverEvidence(exemption),
    });
  }
  const staleExemptions = rules.canopyOpeningExemptions
    .filter((entry) => !usedExemptions.has(entry.anchorId))
    .map((entry) => entry.anchorId);
  if (staleExemptions.length > 0) {
    fail(`Canopy opening exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateSpanDerivedFenestration({ frontages, zones, moduleById, rules }) {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const exemptionByFrontageId = new Map(
    (rules?.fenestrationExemptions ?? []).map((entry) => [entry.frontageId, entry]),
  );
  const usedExemptions = new Set();
  const deferredConflicts = [];
  for (const frontage of frontages) {
    const zone = zoneById.get(frontage.zoneId);
    if (!zone) continue;
    const lengthM = frontageLengthM(frontage, zone);
    const ground = frontage.bays.filter((bay) => {
      const module = moduleById.get(bay.moduleId);
      return bay.datumId.startsWith("GROUND_HEAD_") && module && OPENING_KINDS.has(module.kind);
    });
    const minimumGroundCount = lengthM <= (rules?.wallBudgets.smallWallMaxM ?? 2.5)
      ? 0
      : Math.ceil(lengthM / 6);
    const violations = new Map();
    if (ground.length < minimumGroundCount) {
      violations.set(
        `ground-count:${ground.length}<${minimumGroundCount}`,
        `Frontage '${frontage.id}' has ${ground.length} ground bays; `
        + `${minimumGroundCount} are required by its ${lengthM.toFixed(2)}m span`,
      );
    }
    const upper = frontage.bays.filter((bay) => {
      const module = moduleById.get(bay.moduleId);
      return bay.datumId.startsWith("STORY_") && module && OPENING_KINDS.has(module.kind);
    });
    for (const bay of upper) {
      const nearestGround = ground.length > 0
        ? Math.min(...ground.map((groundBay) => Math.abs(groundBay.along - bay.along)))
        : Number.POSITIVE_INFINITY;
      const hasFacadeCenteredPair = upper.some((candidate) => (
        candidate.id !== bay.id
        && candidate.datumId === bay.datumId
        && Math.abs(candidate.along - (1 - bay.along)) <= 0.02 + EPSILON
      ));
      const isFacadeCentered = Math.abs(bay.along - 0.5) <= 0.02 + EPSILON;
      if (nearestGround > 0.18 + EPSILON && !hasFacadeCenteredPair && !isFacadeCentered) {
        violations.set(
          `upper:${bay.id}:${ground.length === 0 ? "no-ground-axis" : "off-rhythm"}`,
          `Upper opening '${frontage.id}:${bay.id}' does not align to the ground bay rhythm`,
        );
      }
    }
    if (violations.size === 0) continue;
    const exemption = exemptionByFrontageId.get(frontage.id);
    if (!exemption) fail([...violations.values()][0]);
    const violationIds = [...violations.keys()].sort();
    if (
      violationIds.length !== exemption.violationIds.length
      || violationIds.some((violationId, index) => violationId !== exemption.violationIds[index])
    ) {
      fail(
        `Fenestration exemption '${frontage.id}' must exactly match conflicts `
        + violationIds.join(", "),
      );
    }
    usedExemptions.add(frontage.id);
    deferredConflicts.push({
      frontageId: frontage.id,
      violations: [...violations.entries()].map(([id, message]) => ({ id, message })),
      ...waiverEvidence(exemption),
    });
  }
  const staleExemptions = (rules?.fenestrationExemptions ?? [])
    .filter((entry) => !usedExemptions.has(entry.frontageId))
    .map((entry) => entry.frontageId);
  if (staleExemptions.length > 0) {
    fail(`Fenestration exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

function frontageAlongFromPosition(frontage, zone, position) {
  const fullLengthM = frontage.face === "west" || frontage.face === "east"
    ? zone.rect.h
    : zone.rect.w;
  const coordinate = frontage.face === "west" || frontage.face === "east"
    ? position.y - zone.rect.y
    : position.x - zone.rect.x;
  const startM = (frontage.start ?? 0) * fullLengthM;
  return (coordinate - startM) / frontageLengthM(frontage, zone);
}

export function validateCompiledFixtureAxes({
  frontages,
  zones,
  anchors,
  dressingPlacements,
  rules,
}) {
  const frontageById = new Map(frontages.map((frontage) => [frontage.id, frontage]));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const exemptionByConflict = new Map(
    rules.fixtureAxisExemptions.map((entry) => [
      `${entry.placementId}::${entry.openingId}`,
      entry,
    ]),
  );
  const usedExemptions = new Set();
  const deferredConflicts = [];
  const unexemptedConflicts = [];
  for (const placement of dressingPlacements) {
    const anchor = anchorById.get(placement.anchorId);
    if (!anchor || !FIXTURE_ANCHOR_TYPES.has(anchor.type)) continue;
    const hasFrontageId = typeof anchor.frontageId === "string" && anchor.frontageId.length > 0;
    const hasServedBayId = typeof anchor.servedBayId === "string" && anchor.servedBayId.length > 0;
    if (!hasFrontageId && !hasServedBayId) continue;
    if (!hasFrontageId || !hasServedBayId) {
      fail(`Fixture anchor '${anchor.id}' must resolve both frontageId and servedBayId`);
    }
    const frontage = frontageById.get(anchor.frontageId);
    if (!frontage) fail(`Fixture anchor '${anchor.id}' references unknown frontage '${anchor.frontageId}'`);
    const zone = zoneById.get(frontage.zoneId);
    if (!zone) fail(`Fixture anchor '${anchor.id}' frontage '${frontage.id}' has unknown zone '${frontage.zoneId}'`);
    const bay = frontage.bays.find((entry) => entry.id === anchor.servedBayId);
    if (!bay) fail(`Fixture anchor '${anchor.id}' serves unknown bay '${frontage.id}:${anchor.servedBayId}'`);
    const actualAlong = frontageAlongFromPosition(frontage, zone, placement.position);
    const axisErrorM = Math.abs(actualAlong - bay.along) * frontageLengthM(frontage, zone);
    if (axisErrorM <= rules.clearances.fixtureAxisToleranceM + EPSILON) continue;
    const openingId = `${frontage.id}:${bay.id}`;
    const conflictKey = `${placement.id}::${openingId}`;
    const exemption = exemptionByConflict.get(conflictKey);
    if (!exemption) {
      unexemptedConflicts.push({
        placementId: placement.id,
        openingId,
        axisErrorM,
      });
      continue;
    }
    usedExemptions.add(conflictKey);
    deferredConflicts.push({
      placementId: placement.id,
      openingId,
      axisErrorM,
      ...waiverEvidence(exemption),
    });
  }
  if (unexemptedConflicts.length > 0) {
    fail(
      "Compiled fixtures are off their served-opening axes: "
      + unexemptedConflicts.map((entry) => (
        `'${entry.placementId}' ${entry.axisErrorM.toFixed(3)}m from '${entry.openingId}'`
      )).join("; "),
    );
  }
  const staleExemptions = rules.fixtureAxisExemptions
    .filter((entry) => !usedExemptions.has(`${entry.placementId}::${entry.openingId}`))
    .map((entry) => `${entry.placementId} -> ${entry.openingId}`);
  if (staleExemptions.length > 0) {
    fail(`Fixture-axis exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateWallPlacementBudgets({
  frontages,
  zones,
  anchors,
  dressingPlacements,
  rules,
}) {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const exemptionByFrontageId = new Map(
    rules.wallBudgetExemptions.map((entry) => [entry.frontageId, entry]),
  );
  const usedExemptions = new Set();
  const deferredConflicts = [];
  for (const frontage of frontages) {
    const zone = zoneById.get(frontage.zoneId);
    if (!zone) continue;
    const fixtures = dressingPlacements
      .map((placement) => ({ placement, anchor: anchorById.get(placement.anchorId) }))
      .filter(({ anchor }) => (
        anchor?.frontageId === frontage.id
        && anchor.servedBayId
        && FIXTURE_ANCHOR_TYPES.has(anchor.type)
      ))
      .map(({ placement }) => ({
        id: placement.id,
        along: frontageAlongFromPosition(frontage, zone, placement.position),
      }));
    const lengthM = frontageLengthM(frontage, zone);
    const maxFixtures = lengthM <= rules.wallBudgets.smallWallMaxM
      ? rules.wallBudgets.smallWallMaxFixtures
      : Math.ceil(lengthM / rules.wallBudgets.fixtureSpacingM);
    const violations = new Map();
    if (fixtures.length > maxFixtures) {
      violations.set(
        `count:${fixtures.length}>${maxFixtures}`,
        `Frontage '${frontage.id}' has ${fixtures.length} fixtures, above its span-derived budget ${maxFixtures}`,
      );
    }
    if (
      fixtures.length === 1
      && lengthM > rules.wallBudgets.smallWallMaxM
      && Math.abs(fixtures[0].along - 0.5) > rules.wallBudgets.symmetryTolerance + EPSILON
    ) {
      violations.set(
        `symmetry:${fixtures[0].along.toFixed(3)}`,
        `Frontage '${frontage.id}' lone fixture ${fixtures[0].along.toFixed(3)} exceeds symmetry tolerance `
        + `${rules.wallBudgets.symmetryTolerance.toFixed(3)}`,
      );
    } else if (fixtures.length >= 2) {
      const ordered = fixtures.map((fixture) => fixture.along).sort((left, right) => left - right);
      let hasSymmetryViolation = false;
      for (let index = 0; index < Math.floor(ordered.length / 2); index += 1) {
        const mirroredSum = ordered[index] + ordered[ordered.length - 1 - index];
        if (Math.abs(mirroredSum - 1) > rules.wallBudgets.symmetryTolerance + EPSILON) {
          violations.set(
            `symmetry:${ordered.map((value) => value.toFixed(3)).join(",")}`,
            `Frontage '${frontage.id}' fixture pair ${ordered[index].toFixed(3)}/`
            + `${ordered[ordered.length - 1 - index].toFixed(3)} exceeds symmetry tolerance `
            + `${rules.wallBudgets.symmetryTolerance.toFixed(3)}`,
          );
          hasSymmetryViolation = true;
          break;
        }
      }
      if (
        !hasSymmetryViolation
        &&
        ordered.length % 2 === 1
        && Math.abs(ordered[Math.floor(ordered.length / 2)] - 0.5)
          > rules.wallBudgets.symmetryTolerance + EPSILON
      ) {
        violations.set(
          `symmetry:${ordered.map((value) => value.toFixed(3)).join(",")}`,
          `Frontage '${frontage.id}' center fixture `
          + `${ordered[Math.floor(ordered.length / 2)].toFixed(3)} exceeds symmetry tolerance `
          + `${rules.wallBudgets.symmetryTolerance.toFixed(3)}`,
        );
      }
    }
    if (violations.size === 0) continue;
    const exemption = exemptionByFrontageId.get(frontage.id);
    if (!exemption) fail([...violations.values()][0]);
    const violationIds = [...violations.keys()].sort();
    if (
      violationIds.length !== exemption.violationIds.length
      || violationIds.some((violationId, index) => violationId !== exemption.violationIds[index])
    ) {
      fail(
        `Wall-budget exemption '${frontage.id}' must exactly match conflicts `
        + violationIds.join(", "),
      );
    }
    usedExemptions.add(frontage.id);
    deferredConflicts.push({
      frontageId: frontage.id,
      violations: [...violations.entries()].map(([id, message]) => ({ id, message })),
      ...waiverEvidence(exemption),
    });
  }
  const staleExemptions = rules.wallBudgetExemptions
    .filter((entry) => !usedExemptions.has(entry.frontageId))
    .map((entry) => entry.frontageId);
  if (staleExemptions.length > 0) {
    fail(`Wall-budget exemptions no longer match a conflict: ${staleExemptions.join(", ")}`);
  }
  return deferredConflicts;
}

export function validateZoneDensityBudgets({ zones, dressingPlacements, rules }) {
  const counts = new Map();
  for (const placement of dressingPlacements) {
    counts.set(placement.zoneId, (counts.get(placement.zoneId) ?? 0) + 1);
  }
  for (const zone of zones) {
    const count = counts.get(zone.id) ?? 0;
    const budget = rules.zoneDensityBudgets[zone.id];
    if (count > budget) {
      fail(`Zone '${zone.id}' has ${count} placements, above density budget ${budget}`);
    }
  }
  return Object.fromEntries(zones.map((zone) => [
    zone.id,
    {
      placementCount: counts.get(zone.id) ?? 0,
      budget: rules.zoneDensityBudgets[zone.id],
    },
  ]));
}

export function validateCompositionRules({
  zones,
  frontages,
  anchors,
  architecturePlacements,
  dressingPlacements,
  moduleById,
  rules,
}) {
  const deferredFenestrationConflicts = validateSpanDerivedFenestration({
    frontages,
    zones,
    moduleById,
    rules,
  });
  const deferredOpeningServiceConflicts = validateOpeningServiceability({
    anchors,
    architecturePlacements,
    dressingPlacements,
    rules,
  });
  const deferredHardPlacementOverlaps = validateHardPlacementAabbs({ dressingPlacements, rules });
  const deferredFixtureAxisConflicts = validateCompiledFixtureAxes({
    frontages,
    zones,
    anchors,
    dressingPlacements,
    rules,
  });
  const deferredFixtureBufferConflicts = validateFixtureBuffers({ anchors, dressingPlacements, rules });
  const deferredDecorationOpeningConflicts = validateDecorationOpeningBuffers({
    anchors,
    architecturePlacements,
    dressingPlacements,
    rules,
  });
  const deferredCanopyOpeningConflicts = validateCanopyOpeningClearance({
    anchors,
    architecturePlacements,
    dressingPlacements,
    rules,
  });
  const deferredWallBudgetConflicts = validateWallPlacementBudgets({
    frontages,
    zones,
    anchors,
    dressingPlacements,
    rules,
  });
  const zoneDensity = validateZoneDensityBudgets({ zones, dressingPlacements, rules });
  return {
    zoneDensity,
    deferredCanopyOpeningConflicts,
    deferredOpeningServiceConflicts,
    deferredHardPlacementOverlaps,
    deferredFixtureBufferConflicts,
    deferredDecorationOpeningConflicts,
    deferredFenestrationConflicts,
    deferredWallBudgetConflicts,
    deferredFixtureAxisConflicts,
  };
}

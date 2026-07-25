const EDGE_MARGIN_M = 0.6;
const MIN_BAY_GAP_M = 0.42;
const EPSILON = 1e-6;
const MIN_AWNING_TO_UPPER_SILL_BAND_M = 0.5;
const AWNING_TOP_ABOVE_GROUND_HEAD_M = 0.48;
const FACADE_FACES = ["north", "south", "east", "west"];
const FRONTAGE_EXEMPTION_REASONS = new Set([
  "open_traversal_face",
  "short_wall_return",
  "sealed_perimeter",
  "architectural_cut_edge",
  "retaining_wall",
  "system_articulated_boundary",
]);

function fail(message) {
  throw new Error(`[facade-layout] ${message}`);
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function validateFrontageCoverage({ zones, frontages, exemptions }) {
  if (!Array.isArray(zones) || zones.length === 0) {
    fail("Frontage coverage requires at least one walkable zone");
  }
  if (!Array.isArray(frontages)) {
    fail("Frontage coverage requires a frontage array");
  }
  if (!Array.isArray(exemptions)) {
    fail("Frontage coverage requires an explicit frontage_exemptions array");
  }

  const zoneIds = new Set(zones.map((zone) => zone?.id));
  const frontageFaceKeys = new Set();
  for (const frontage of frontages) {
    const key = `${frontage.zoneId}:${frontage.face}`;
    frontageFaceKeys.add(key);
  }

  const exemptionFaceKeys = new Set();
  const normalizedExemptions = exemptions.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`frontage_exemptions[${index}] must be an object`);
    }
    if (typeof entry.zoneId !== "string" || !zoneIds.has(entry.zoneId)) {
      fail(`frontage_exemptions[${index}] references unknown zone '${String(entry.zoneId)}'`);
    }
    if (!FACADE_FACES.includes(entry.face)) {
      fail(`frontage_exemptions[${index}].face must be one of ${FACADE_FACES.join("/")}`);
    }
    if (!FRONTAGE_EXEMPTION_REASONS.has(entry.reason)) {
      fail(
        `frontage_exemptions[${index}].reason must be one of `
        + [...FRONTAGE_EXEMPTION_REASONS].join("/"),
      );
    }
    if (typeof entry.note !== "string" || entry.note.trim().length === 0) {
      fail(`frontage_exemptions[${index}].note must explain the measured exemption`);
    }
    const key = `${entry.zoneId}:${entry.face}`;
    if (exemptionFaceKeys.has(key)) {
      fail(`Duplicate frontage exemption for '${key}'`);
    }
    if (frontageFaceKeys.has(key)) {
      fail(`Zone face '${key}' cannot carry both a frontage and an exemption`);
    }
    exemptionFaceKeys.add(key);
    return {
      zoneId: entry.zoneId,
      face: entry.face,
      reason: entry.reason,
      note: entry.note.trim(),
    };
  });

  const missingFaceKeys = [];
  for (const zone of zones) {
    for (const face of FACADE_FACES) {
      const key = `${zone.id}:${face}`;
      if (!frontageFaceKeys.has(key) && !exemptionFaceKeys.has(key)) {
        missingFaceKeys.push(key);
      }
    }
  }
  if (missingFaceKeys.length > 0) {
    fail(`Walkable zone faces lack frontage or exemption records: ${missingFaceKeys.join(", ")}`);
  }

  return {
    totalFaceCount: zones.length * FACADE_FACES.length,
    frontageFaceCount: frontageFaceKeys.size,
    exemptionFaceCount: exemptionFaceKeys.size,
    exemptions: normalizedExemptions.sort((left, right) => (
      left.zoneId.localeCompare(right.zoneId) || left.face.localeCompare(right.face)
    )),
  };
}

function chooseFittingModule(moduleById, allowedModuleIds, candidates, maxWidthM, frontageId) {
  for (const moduleId of candidates) {
    if (!allowedModuleIds.has(moduleId)) continue;
    const module = moduleById.get(moduleId);
    if (module && module.dimensionsM.width <= maxWidthM + EPSILON) return module;
  }
  fail(`Frontage '${frontageId}' has no grammar module that fits ${maxWidthM.toFixed(2)}m between edge margins`);
}

function maxColumnCount(lengthM, moduleWidthM) {
  const usableM = lengthM - EDGE_MARGIN_M * 2;
  return Math.max(1, Math.floor((usableM + MIN_BAY_GAP_M) / (moduleWidthM + MIN_BAY_GAP_M)));
}

function centeredColumns(lengthM, moduleWidthM, count) {
  const firstCenterM = EDGE_MARGIN_M + moduleWidthM * 0.5;
  const lastCenterM = lengthM - EDGE_MARGIN_M - moduleWidthM * 0.5;
  if (count <= 1) return [0.5];
  return Array.from({ length: count }, (_, index) => (
    (firstCenterM + ((lastCenterM - firstCenterM) * index) / (count - 1)) / lengthM
  ));
}

function resolveStoryCount(heightM) {
  if (heightM >= 8.4) return 3;
  if (heightM >= 5.4) return 2;
  return 1;
}

function resolveGroundCandidates(family, lengthM) {
  switch (family) {
    case "active_merchant":
      return lengthM >= 3.6
        ? ["shop_recess_market", "door_shop_timber", "pilaster_facade"]
        : ["door_shop_timber", "pilaster_facade"];
    case "quiet_residential":
      return [
        "door_residential_timber",
        "timber_coverage_closure",
        "blind_niche",
        "pilaster_facade",
      ];
    case "service_storage":
      return ["door_storage_heavy", "blind_niche", "pilaster_facade"];
    case "covered_arcade":
      return ["arch_arcade", "shop_recess_market", "door_shop_timber", "pilaster_facade"];
    case "hero_courtyard":
      return lengthM >= 5.3
        ? ["arch_hero_courtyard", "door_residential_timber", "blind_niche", "pilaster_facade"]
        : ["door_residential_timber", "blind_niche", "pilaster_facade"];
    default:
      return ["blind_niche", "pilaster_facade"];
  }
}

function resolveUpperCandidates(family, accentModuleId) {
  if (accentModuleId) return [accentModuleId];
  switch (family) {
    case "active_merchant": return ["window_shuttered", "window_screened"];
    case "quiet_residential": return ["window_screened", "window_dark_recess"];
    case "service_storage": return ["vent_service", "blind_niche"];
    case "covered_arcade": return ["window_screened", "blind_niche"];
    case "hero_courtyard": return ["window_dark_recess", "window_screened"];
    default: return ["blind_niche"];
  }
}

function targetGroundCount(family, rhythm, lengthM, capacity, variation) {
  const spacingM = family === "quiet_residential" && rhythm === "residential_dense"
    ? 4.2
    : family === "active_merchant" || family === "covered_arcade"
    ? 4.1
    : family === "service_storage"
      ? 4.8
      : 5.2;
  const minimumArticulation = Math.max(1, Math.ceil(lengthM / 6));
  const rhythmicCount = Math.max(1, Math.round(lengthM / spacingM));
  const variedCount = rhythmicCount + (capacity > rhythmicCount && variation % 3 === 0 ? 1 : 0);
  return Math.min(capacity, Math.max(minimumArticulation, variedCount));
}

function groundModuleForColumn({ family, primaryModule, allowedModuleIds, moduleById, index, variation }) {
  if (
    primaryModule.id === "blind_niche"
    && allowedModuleIds.has("pilaster_niche_coverage")
    && index > 0
  ) {
    return moduleById.get("pilaster_niche_coverage") ?? primaryModule;
  }
  const alternateId = primaryModule.id === "timber_coverage_closure"
    ? "pilaster_coverage"
    : family === "active_merchant"
    ? "door_shop_timber"
    : family === "quiet_residential" || family === "service_storage"
      ? "blind_niche"
      : family === "covered_arcade"
        ? "column_arcade"
        : undefined;
  if (
    !alternateId
    || !allowedModuleIds.has(alternateId)
    || index === 0
    || (family === "covered_arcade" && primaryModule.id !== "arch_arcade")
    || (index + variation) % 3 !== 1
  ) return primaryModule;
  return moduleById.get(alternateId) ?? primaryModule;
}

function groundBaseForSharedHead(module, groundHeadM) {
  if (module.kind === "door" || module.kind === "shop_recess" || module.kind === "arch" || module.kind === "column") {
    return 0;
  }
  return Math.max(0, groundHeadM - module.dimensionsM.height);
}

export function generateFacadeLayout({
  frontageId,
  lengthM,
  heightM,
  family,
  rhythm,
  profileModuleIds,
  moduleById,
  accentModuleId,
}) {
  if (!(lengthM > EDGE_MARGIN_M * 2)) {
    fail(`Frontage '${frontageId}' is too short for the 0.6m grammar edge margins`);
  }
  const allowedModuleIds = new Set(profileModuleIds);
  const maxModuleWidthM = lengthM - EDGE_MARGIN_M * 2;
  const variation = stableHash(`${frontageId}:${rhythm}`);
  const groundModule = chooseFittingModule(
    moduleById,
    allowedModuleIds,
    resolveGroundCandidates(family, lengthM),
    maxModuleWidthM,
    frontageId,
  );
  const groundCapacity = maxColumnCount(lengthM, groundModule.dimensionsM.width);
  const groundCount = targetGroundCount(family, rhythm, lengthM, groundCapacity, variation);
  const groundColumns = centeredColumns(lengthM, groundModule.dimensionsM.width, groundCount);
  const groundHeadM = groundModule.dimensionsM.height;
  const bays = groundColumns.map((along, index) => {
    const module = groundModuleForColumn({
      family,
      primaryModule: groundModule,
      allowedModuleIds,
      moduleById,
      index,
      variation,
    });
    return {
      id: `GROUND_${String(index + 1).padStart(2, "0")}`,
      moduleId: module.id,
      along,
      baseElevationM: groundBaseForSharedHead(module, groundHeadM),
      datumId: `GROUND_HEAD_${groundHeadM.toFixed(2)}`,
      columnId: `COLUMN_${String(index + 1).padStart(2, "0")}`,
      layoutSource: "generated",
    };
  });

  const storyCount = resolveStoryCount(heightM);
  const upperSillDatumsM = [];
  if (storyCount > 1) {
    const upperModule = chooseFittingModule(
      moduleById,
      allowedModuleIds,
      resolveUpperCandidates(family, accentModuleId),
      maxModuleWidthM,
      frontageId,
    );
    const upperCapacity = maxColumnCount(lengthM, upperModule.dimensionsM.width);
    const preferredUpperCount = accentModuleId
      ? 1
      : Math.max(groundCount, Math.ceil(lengthM / 4.6));
    const upperCount = Math.min(upperCapacity, preferredUpperCount);
    const upperColumns = centeredColumns(lengthM, upperModule.dimensionsM.width, upperCount);
    for (let storyIndex = 1; storyIndex < storyCount; storyIndex += 1) {
      const sillM = family === "covered_arcade"
        ? (storyIndex === 1 ? 4.15 : 6.45)
        : family === "hero_courtyard"
          ? (storyIndex === 1 ? 5.15 : 7.35)
          : (storyIndex === 1 ? 3.68 : 6.25);
      if (sillM + upperModule.dimensionsM.height > heightM - 0.55 + EPSILON) continue;
      upperSillDatumsM.push(sillM);
      for (let columnIndex = 0; columnIndex < upperColumns.length; columnIndex += 1) {
        bays.push({
          id: `STORY_${storyIndex}_WINDOW_${String(columnIndex + 1).padStart(2, "0")}`,
          moduleId: upperModule.id,
          along: upperColumns[columnIndex],
          baseElevationM: sillM,
          datumId: `STORY_${storyIndex}_SILL_${sillM.toFixed(2)}`,
          columnId: `UPPER_COLUMN_${String(columnIndex + 1).padStart(2, "0")}`,
          layoutSource: "generated",
        });
      }
    }
  }

  const signBandBottomM = groundHeadM + 0.12;
  const signBandTopM = Math.min(
    upperSillDatumsM[0] ? upperSillDatumsM[0] - 0.12 : heightM - 0.35,
    groundHeadM + 0.72,
  );
  const layout = {
    source: "generated",
    rhythm,
    storyCount,
    edgeMarginM: EDGE_MARGIN_M,
    groundHeadM,
    upperSillDatumsM,
    signBandBottomM,
    signBandTopM,
  };
  validateFacadeLayout({ frontageId, lengthM, heightM, family, bays, layout, moduleById });
  return { bays, layout };
}

export function validateFacadeLayout({ frontageId, lengthM, heightM, family, bays, layout, moduleById }) {
  if (!Array.isArray(bays) || bays.length === 0) fail(`Frontage '${frontageId}' is blank`);
  const groundArticulation = bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_")).length;
  if (groundArticulation < Math.ceil(lengthM / 6)) {
    fail(`Frontage '${frontageId}' is under-articulated for its ${lengthM.toFixed(2)}m span`);
  }
  const intervals = [];
  const rowDatum = new Map();
  for (const bay of bays) {
    const module = moduleById.get(bay.moduleId);
    if (!module) fail(`Frontage '${frontageId}' bay '${bay.id}' references an unknown module`);
    if (!bay.datumId || !bay.columnId || bay.layoutSource !== "generated") {
      fail(`Frontage '${frontageId}' bay '${bay.id}' lacks a named generated datum/column`);
    }
    if (bay.baseElevationM > 0 && module.kind === "door") {
      fail(`Frontage '${frontageId}' bay '${bay.id}' places an upper-story door without a balcony`);
    }
    if (module.kind === "shop_recess" && family !== "active_merchant" && family !== "covered_arcade") {
      fail(`Frontage '${frontageId}' bay '${bay.id}' puts a merchant bay on '${family}'`);
    }
    if ((module.kind === "door" || module.kind === "shop_recess" || module.kind === "arch") && bay.baseElevationM === 0) {
      if (Math.abs(bay.baseElevationM) > EPSILON) fail(`Frontage '${frontageId}' bay '${bay.id}' threshold is not at grade`);
    }
    const centerM = bay.along * lengthM;
    const leftM = centerM - module.dimensionsM.width * 0.5;
    const rightM = centerM + module.dimensionsM.width * 0.5;
    if (leftM < EDGE_MARGIN_M - EPSILON || rightM > lengthM - EDGE_MARGIN_M + EPSILON) {
      fail(`Frontage '${frontageId}' bay '${bay.id}' violates the 0.6m edge margin`);
    }
    const topM = bay.baseElevationM + module.dimensionsM.height;
    if (bay.datumId.startsWith("GROUND_HEAD_") && Math.abs(topM - layout.groundHeadM) > EPSILON) {
      fail(`Frontage '${frontageId}' bay '${bay.id}' misses shared ground head ${layout.groundHeadM.toFixed(2)}m`);
    }
    if (topM > heightM - 0.35 + EPSILON) fail(`Frontage '${frontageId}' bay '${bay.id}' crowds the parapet`);
    const datumPositionM = bay.datumId.startsWith("GROUND_HEAD_") ? topM : bay.baseElevationM;
    const datumBase = rowDatum.get(bay.datumId);
    if (typeof datumBase === "number" && Math.abs(datumBase - datumPositionM) > EPSILON) {
      fail(`Frontage '${frontageId}' datum '${bay.datumId}' is not aligned`);
    }
    rowDatum.set(bay.datumId, datumPositionM);
    const interval = { leftM, rightM, bottomM: bay.baseElevationM, topM, id: bay.id };
    for (const prior of intervals) {
      const overlapsX = interval.leftM < prior.rightM - EPSILON && interval.rightM > prior.leftM + EPSILON;
      const overlapsY = interval.bottomM < prior.topM - EPSILON && interval.topM > prior.bottomM + EPSILON;
      if (overlapsX && overlapsY) fail(`Frontage '${frontageId}' bays '${prior.id}' and '${bay.id}' overlap`);
    }
    intervals.push(interval);
  }
  if (!(layout.signBandTopM > layout.signBandBottomM)) {
    fail(`Frontage '${frontageId}' has no valid sign/awning band between ground head and upper sill`);
  }
  if (
    family === "active_merchant"
    &&
    layout.upperSillDatumsM.length > 0
    && layout.upperSillDatumsM[0] - (layout.groundHeadM + AWNING_TOP_ABOVE_GROUND_HEAD_M)
      < MIN_AWNING_TO_UPPER_SILL_BAND_M - EPSILON
  ) {
    fail(
      `Frontage '${frontageId}' leaves less than ${MIN_AWNING_TO_UPPER_SILL_BAND_M.toFixed(2)}m `
      + "between the awning top and first upper-story sill",
    );
  }
}

export function expectedSignWidthM(openingWidthM) {
  return Math.min(2.2, Math.max(1.25, openingWidthM * 1.2));
}

export function validateFixtureCenterlines({ frontage, anchors, moduleById }) {
  const groundBayById = new Map(
    frontage.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_")).map((bay) => [bay.id, bay]),
  );
  for (const anchor of anchors) {
    if (anchor.frontageId !== frontage.id) continue;
    if (
      anchor.type !== "signage_anchor"
      && anchor.type !== "shopfront_anchor"
      && anchor.type !== "dressing_anchor"
      && anchor.type !== "lantern_anchor"
    ) continue;
    if (!anchor.servedBayId) fail(`Fixture '${anchor.id}' must declare servedBayId`);
    const bay = groundBayById.get(anchor.servedBayId);
    if (!bay) fail(`Fixture '${anchor.id}' serves unknown ground bay '${anchor.servedBayId}'`);
    if (Math.abs(anchor.along - bay.along) > EPSILON) {
      fail(`Fixture '${anchor.id}' is not centered on served bay '${anchor.servedBayId}'`);
    }
    if (anchor.type === "signage_anchor") {
      if (
        anchor.vertical_offset_m < frontage.layout.signBandBottomM - EPSILON
        || anchor.vertical_offset_m > frontage.layout.signBandTopM + EPSILON
      ) {
        fail(`Sign '${anchor.id}' is outside frontage '${frontage.id}' sign datum band`);
      }
    }
    const module = moduleById.get(bay.moduleId);
    if (!module) fail(`Fixture '${anchor.id}' served bay module is missing`);
    if (anchor.type === "signage_anchor") {
      const expectedWidth = expectedSignWidthM(module.dimensionsM.width);
      if (Math.abs(anchor.width_m - expectedWidth) > EPSILON) {
        fail(
          `Sign '${anchor.id}' width ${anchor.width_m.toFixed(2)}m must derive from served opening `
          + `'${anchor.servedBayId}' as ${expectedWidth.toFixed(2)}m`,
        );
      }
    }
    if (anchor.type === "shopfront_anchor" && !["shop_recess", "door", "arch"].includes(module.kind)) {
      fail(`Shopfront '${anchor.id}' cannot serve non-opening module '${module.id}'`);
    }
  }
}

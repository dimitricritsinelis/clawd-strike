import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  deriveBlockoutWallSegments,
  planV3BoundaryRetainingCurbs,
  planV3BoundarySupportCapSlices,
  planV3BoundarySupportEndCaps,
  planV3BoundarySupportPierModules,
  planV3BoundarySupportReturns,
  resolveV3BoundarySupportCapFootprint,
  resolveSegmentElevationEnvelopes,
  splitBoundarySegmentsAtTraversalSurfaceEdges,
  type BoundarySegment,
} from "./buildBlockout";
import { parseBlockoutSpec, type RuntimeTraversalSurface } from "./types";
import { buildV3Architecture } from "./v3Architecture";

const westEdge: BoundarySegment = {
  orientation: "vertical",
  coord: 11,
  start: 48,
  end: 76,
  outward: -1,
};

const surfaces: RuntimeTraversalSurface[] = [
  {
    id: "RAMP",
    zoneId: "RAMP",
    kind: "ramp",
    rect: { x: 11, y: 48, w: 8, h: 8 },
    axis: "y",
    startElevationM: 0,
    endElevationM: 1.4,
    visualStyle: "ramp",
  },
  {
    id: "TERRACE",
    zoneId: "TERRACE",
    kind: "flat",
    rect: { x: 11, y: 56, w: 8, h: 10 },
    elevationM: 1.4,
  },
  {
    id: "STAIRS",
    zoneId: "STAIRS",
    kind: "ramp",
    rect: { x: 11, y: 66, w: 8, h: 6 },
    axis: "y",
    startElevationM: 1.4,
    endElevationM: 0,
    visualStyle: "stairs",
    stepCount: 10,
  },
  {
    id: "LANDING",
    zoneId: "LANDING",
    kind: "flat",
    rect: { x: 11, y: 72, w: 8, h: 4 },
    elevationM: 0,
  },
];

test("splits elevation-side walls at flat joins and ramp slices", () => {
  const split = splitBoundarySegmentsAtTraversalSurfaceEdges([westEdge], surfaces);
  assert.equal(split.length, 20);
  assert.deepEqual(split[0], { ...westEdge, start: 48, end: 49 });
  assert.deepEqual(split[8], { ...westEdge, start: 56, end: 66 });
  assert.deepEqual(split.at(-1), { ...westEdge, start: 72, end: 76 });
});

test("resolves conservative min/max wall envelopes along gradients", () => {
  const split = splitBoundarySegmentsAtTraversalSurfaceEdges([westEdge], surfaces);
  const envelopes = resolveSegmentElevationEnvelopes(split, surfaces, 0);
  assert.ok(envelopes[0]!.minY < 0.01);
  assert.ok(envelopes[0]!.maxY > 0.17);
  assert.deepEqual(envelopes[8], { minY: 1.4, maxY: 1.4 });
  assert.ok(envelopes[9]!.minY > 1.25);
  assert.ok(envelopes[9]!.maxY > 1.39);
  assert.deepEqual(envelopes.at(-1), { minY: 0, maxY: 0 });
});

test("compiled v3 closes the full Caravan/Tea slot without changing collider authority", () => {
  const runtimeSpecUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const spec = parseBlockoutSpec(JSON.parse(readFileSync(runtimeSpecUrl, "utf8")), runtimeSpecUrl.pathname);
  const wallSegments = deriveBlockoutWallSegments(spec);
  const collisionBoundarySnapshot = structuredClone(wallSegments);
  const elevationEnvelopes = resolveSegmentElevationEnvelopes(
    wallSegments,
    spec.traversalSurfaces ?? [],
    spec.defaults.floor_height,
  );
  const elevationSnapshot = structuredClone(elevationEnvelopes);
  const segmentBaseYs = elevationEnvelopes.map((envelope) => envelope.minY);
  const architecture = buildV3Architecture({
    placements: spec.architecturePlacements ?? [],
    massingProfiles: spec.massingProfiles ?? [],
    facadeProfiles: spec.facadeProfiles ?? [],
    segments: wallSegments,
    zones: spec.zones,
    traversalSurfaces: spec.traversalSurfaces ?? [],
    wallHeightM: spec.defaults.wall_height,
    fortifiedDoorModelAvailable: false,
    experimentalVisualCutoutMassing: true,
  });
  const segmentHeights = architecture.segmentHeights.map((heightM, index) => (
    heightM + elevationEnvelopes[index]!.maxY - elevationEnvelopes[index]!.minY
  ));

  const plans = planV3BoundarySupportReturns(wallSegments, spec.zones);
  assert.equal(plans.length, 1, "only the authored Caravan/Tea sealed slot should receive a support spine");
  const caravan = plans.find((plan) => plan.sourceZoneId === "CARAVAN_COURT");
  assert.ok(caravan, "Caravan Court's one-metre sealed slot lost its structural spine");
  assert.equal(caravan.sourceSegmentIndex, 21);
  assert.deepEqual(wallSegments[caravan.sourceSegmentIndex], {
    orientation: "horizontal",
    coord: 48,
    start: 10,
    end: 11,
    outward: 1,
  });
  assert.deepEqual(caravan.pocketRect, { x: 10, y: 48, w: 1, h: 28 });
  assert.deepEqual(caravan.capSourceIndices, [21, 31]);
  assert.deepEqual(caravan.sideSourceIndices[0], [52]);
  assert.deepEqual(caravan.sideSourceIndices[1], Array.from({ length: 20 }, (_, index) => 53 + index));
  assert.equal(caravan.renderSegments.length, 23);
  assert.equal(caravan.renderSegments.length, caravan.renderSourceIndices.length);
  for (let index = 0; index < caravan.renderSegments.length; index += 1) {
    const source: BoundarySegment = wallSegments[caravan.renderSourceIndices[index]!]!;
    assert.deepEqual(caravan.renderSegments[index], {
      ...source,
      outward: -source.outward,
    }, "every inward shell face must map to an unchanged collision face");
  }
  assert.equal(segmentHeights[caravan.sourceSegmentIndex], 4.5);
  assert.ok(!("renderHeightM" in caravan), "a fixed low render height must not hide a taller collider");
  assert.equal(caravan.renderZone.facadeProfileId, "service_storage");

  const endCaps = planV3BoundarySupportEndCaps(plans, wallSegments, spec.zones);
  assert.equal(endCaps.length, 2);
  const caravanFront = endCaps.find((entry) => entry.sourceSegmentIndex === caravan.capSourceIndices[0]);
  assert.ok(caravanFront);
  assert.deepEqual(caravanFront.segment, wallSegments[caravan.capSourceIndices[0]], "end return moved off the collider face plane");
  assert.equal(caravanFront.renderZone.id, "SERVICE_NORTH");
  assert.equal(caravanFront.renderZone.facadeProfileId, "quiet_residential");
  assert.deepEqual(caravanFront.renderZone.rect, { x: 10, y: 47.8, w: 1, h: 0.2 });

  const capSlices = planV3BoundarySupportCapSlices(
    caravan,
    wallSegments,
    segmentHeights,
    segmentBaseYs,
  );
  assert.equal(capSlices[0]!.rect.y, 48);
  assert.equal(capSlices.at(-1)!.rect.y + capSlices.at(-1)!.rect.h, 76);
  assert.equal(capSlices.reduce((sum, slice) => sum + slice.rect.h, 0), 28);
  assert.equal(capSlices[0]!.topY, 4.5, "south coping must meet the full authoritative cap height");
  const frontFootprint = resolveV3BoundarySupportCapFootprint(caravan, capSlices[0]!);
  assert.equal(frontFootprint.y, 48, "front coping projected beyond the authoritative end plane");
  assert.ok(frontFootprint.x >= 10 - 0.08 - 1e-8);
  assert.ok(frontFootprint.x + frontFootprint.w <= 11 + 0.08 + 1e-8, "coping outset exceeded its 8 cm allowance");
  const backFootprint = resolveV3BoundarySupportCapFootprint(caravan, capSlices.at(-1)!);
  assert.equal(backFootprint.y + backFootprint.h, 76, "back coping projected beyond the authoritative end plane");
  for (let index = 1; index < capSlices.length; index += 1) {
    const previous = capSlices[index - 1]!;
    const current = capSlices[index]!;
    assert.ok(Math.abs(previous.rect.y + previous.rect.h - current.rect.y) < 1e-8, "coping slices must be gap-free");
  }

  const pierModules = planV3BoundarySupportPierModules(
    plans,
    wallSegments,
    segmentHeights,
    segmentBaseYs,
    spec.defaults.wall_thickness,
  );
  assert.equal(pierModules.length, 8);
  assert.deepEqual(
    new Set(pierModules.map((module) => module.role)),
    new Set([
      "closed_infill",
      "footing_block",
      "grounded_plinth",
      "left_return_lip",
      "right_return_lip",
      "left_quoin",
      "right_quoin",
      "supported_cap",
    ]),
  );
  const sourceColliderBounds = {
    min: { x: 10, y: 0, z: 48 },
    max: { x: 11, y: 4.5, z: 48 + spec.defaults.wall_thickness },
  };
  for (const module of pierModules) {
    assert.equal(module.sourceSegmentIndex, caravan.sourceSegmentIndex);
    assert.equal(module.materialRole, "limestone", "solid pier reintroduced a contrasting center material");
    for (const axis of ["x", "y", "z"] as const) {
      const footingAllowance = module.role === "footing_block" && axis === "x" ? 0.06 : 0;
      assert.ok(
        module.min[axis] >= sourceColliderBounds.min[axis] - footingAllowance - 1e-8,
        `${module.role} escaped supported footprint min ${axis}`,
      );
      assert.ok(
        module.max[axis] <= sourceColliderBounds.max[axis] + footingAllowance + 1e-8,
        `${module.role} escaped supported footprint max ${axis}`,
      );
      assert.ok(module.max[axis] > module.min[axis], `${module.role} has non-positive ${axis} extent`);
    }
  }
  const footing = pierModules.find((module) => module.role === "footing_block");
  const plinth = pierModules.find((module) => module.role === "grounded_plinth");
  const closedInfill = pierModules.find((module) => module.role === "closed_infill");
  assert.ok(footing && plinth && closedInfill);
  assert.equal(footing.min.y, sourceColliderBounds.min.y, "pier footing is not grounded");
  assert.equal(plinth.min.y, footing.max.y, "pier plinth does not bear on its footing");
  assert.equal(closedInfill.min.z, sourceColliderBounds.min.z, "center course left the solid pier face plane");
  assert.equal(closedInfill.max.z, sourceColliderBounds.max.z, "center course does not fill the collider depth");

  const curbs = planV3BoundaryRetainingCurbs(
    plans,
    wallSegments,
    spec.traversalSurfaces ?? [],
    spec.defaults.wall_thickness,
  );
  assert.ok(curbs.length > 0, "the elevated loop lost its retaining curbs");
  for (const curb of curbs) {
    const source = wallSegments[curb.sourceSegmentIndex]!;
    assert.equal(source.orientation, "vertical");
    const colliderMinX = source.outward > 0
      ? source.coord
      : source.coord - spec.defaults.wall_thickness;
    const colliderMaxX = source.outward > 0
      ? source.coord + spec.defaults.wall_thickness
      : source.coord;
    assert.ok(curb.rect.x >= colliderMinX - 1e-8);
    assert.ok(curb.rect.x + curb.rect.w <= colliderMaxX + 1e-8, "curb must remain inside the wall AABB");
    assert.ok(curb.rect.x >= caravan.pocketRect.x - 1e-8);
    assert.ok(curb.rect.x + curb.rect.w <= caravan.pocketRect.x + caravan.pocketRect.w + 1e-8);
    assert.ok(Number.isFinite(curb.baseY));
    assert.equal(curb.heightM, 0.28);
  }

  for (const plan of plans) {
    for (const value of [
      plan.pocketRect.x,
      plan.pocketRect.y,
      plan.pocketRect.w,
      plan.pocketRect.h,
      ...plan.renderSegments.flatMap((segment) => [segment.coord, segment.start, segment.end]),
      ...planV3BoundarySupportCapSlices(plan, wallSegments, segmentHeights, segmentBaseYs)
        .flatMap((slice) => [slice.rect.x, slice.rect.y, slice.rect.w, slice.rect.h, slice.topY]),
    ]) {
      assert.ok(Number.isFinite(value), `${plan.id} emitted non-finite render geometry`);
    }
  }
  assert.deepEqual(wallSegments, collisionBoundarySnapshot, "visual support planning mutated wall collider authority");
  assert.deepEqual(
    resolveSegmentElevationEnvelopes(wallSegments, spec.traversalSurfaces ?? [], spec.defaults.floor_height),
    elevationSnapshot,
    "visual support planning changed collider base/height inputs",
  );
  assert.deepEqual(
    planV3BoundarySupportReturns(wallSegments, spec.zones),
    plans,
    "visual support ownership must be deterministic",
  );
});

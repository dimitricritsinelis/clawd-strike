import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  deriveBlockoutWallSegments,
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

test("compiled v3 architecture keeps the Caravan/Tea slot collider authority", () => {
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
  const architecture = buildV3Architecture({
    placements: spec.architecturePlacements ?? [],
    massingProfiles: spec.massingProfiles ?? [],
    facadeProfiles: spec.facadeProfiles ?? [],
    segments: wallSegments,
    zones: spec.zones,
    traversalSurfaces: spec.traversalSurfaces ?? [],
    wallHeightM: spec.defaults.wall_height,
    validateCutoutMassing: true,
  });
  const segmentHeights = architecture.segmentHeights.map((heightM, index) => (
    heightM + elevationEnvelopes[index]!.maxY - elevationEnvelopes[index]!.minY
  ));

  // The one-metre sealed Caravan/Tea slot end cap keeps its full collider height.
  assert.deepEqual(wallSegments[21], {
    orientation: "horizontal",
    coord: 48,
    start: 10,
    end: 11,
    outward: 1,
  });
  assert.equal(segmentHeights[21], 4.5);
  assert.deepEqual(wallSegments, collisionBoundarySnapshot, "architecture build mutated wall collider authority");
  assert.deepEqual(
    resolveSegmentElevationEnvelopes(wallSegments, spec.traversalSurfaces ?? [], spec.defaults.floor_height),
    elevationSnapshot,
    "architecture build changed collider base/height inputs",
  );
});

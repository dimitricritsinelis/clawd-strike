import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Mesh, MeshStandardMaterial } from "three";
import type { WallMaterialLibrary } from "../render/materials/WallMaterialLibrary";
import { buildPbrWalls } from "./buildPbrWalls";
import {
  deriveBlockoutWallSegments,
  usesV3AuthoredVisualWallOwnership,
  type BoundarySegment,
} from "./buildBlockout";
import type {
  RuntimeArchitectureMassingPlacement,
  RuntimeArchitecturePlacement,
  RuntimeBlockoutZone,
  RuntimeFacadeFace,
} from "./types";
import { parseBlockoutSpec } from "./types";
import { planV3VisualWallSegments } from "./v3VisualWallSegments";

const materialSlots = {
  wall: "ph_sandstone_blocks_05",
  trim: "ph_trim_sanded_01",
  roof: "ph_sandstone_blocks_05",
  timber: "tm_balcony_wood_dark",
  metal: "tm_balcony_painted_metal",
  accent: "ph_band_lime_soft",
} as const;

const zone: RuntimeBlockoutZone = {
  id: "ZONE",
  type: "side_hall",
  rect: { x: 0, y: 0, w: 10, h: 10 },
  label: "Zone",
  notes: "",
  facadeProfileId: "service_storage",
};

const roomyBoundary = { x: -20, y: -20, w: 60, h: 60 };

function makeMassing({
  id = "MASSING",
  face = "east",
  centerX = 12,
  centerY = 5,
  width = 4,
  depth = 4,
}: {
  id?: string;
  face?: RuntimeFacadeFace;
  centerX?: number;
  centerY?: number;
  width?: number;
  depth?: number;
} = {}): RuntimeArchitectureMassingPlacement {
  return {
    id,
    kind: "massing",
    frontageId: `FRONTAGE_${id}`,
    zoneId: zone.id,
    face,
    profileId: "service_storage",
    massingProfileId: "MASSING_LOW",
    center: { x: centerX, y: centerY, z: 2 },
    sizeM: { width, depth, height: 4 },
    yawDeg: face === "east" ? 270 : face === "west" ? 90 : face === "north" ? 180 : 0,
    materialSlots,
    roof: {
      style: "flat_parapet",
      setbackM: 0.25,
      parapetHeightM: 0.5,
      upperStorySetbackM: 0,
      elevationM: 4,
    },
  };
}

function plan(
  segments: readonly BoundarySegment[],
  placements: readonly RuntimeArchitecturePlacement[] = [makeMassing()],
) {
  return planV3VisualWallSegments({
    segments,
    zones: [zone],
    placements,
    playableBoundary: roomyBoundary,
  });
}

test("v3 visual wall subtraction splits exactly and preserves immutable collider parents", () => {
  const colliderWalls: BoundarySegment[] = [
    { orientation: "vertical", coord: 10, start: 0, end: 10, outward: 1 },
  ];
  const original = structuredClone(colliderWalls);

  const result = plan(colliderWalls);

  assert.deepEqual(colliderWalls, original, "collision-wall input must remain untouched");
  assert.deepEqual(result.segments, [
    { orientation: "vertical", coord: 10, start: 0, end: 3, outward: 1 },
    { orientation: "vertical", coord: 10, start: 7, end: 10, outward: 1 },
  ]);
  assert.deepEqual(result.sourceSegmentIndices, [0, 0]);
  assert.deepEqual(result.architectureOwnedFrontages, [{
    placementId: "MASSING",
    frontageId: "FRONTAGE_MASSING",
    zoneId: "ZONE",
    face: "east",
    orientation: "vertical",
    coord: 10,
    outward: 1,
    start: 3,
    end: 7,
  }]);
  assert.deepEqual(plan(colliderWalls), result, "render-wall planning must be deterministic");
});

test("north/south authored massing uses the horizontal projection contract", () => {
  const segments: BoundarySegment[] = [
    { orientation: "horizontal", coord: 10, start: 0, end: 10, outward: 1 },
  ];
  const placement = makeMassing({ face: "north", centerX: 5, centerY: 12, width: 6, depth: 4 });
  const result = plan(segments, [placement]);
  assert.deepEqual(result.segments, [
    { orientation: "horizontal", coord: 10, start: 0, end: 2, outward: 1 },
    { orientation: "horizontal", coord: 10, start: 8, end: 10, outward: 1 },
  ]);
});

test("sealed perimeter stays byte-for-byte present and connector gaps are never synthesized", () => {
  const perimeter: BoundarySegment = {
    orientation: "horizontal",
    coord: -20,
    start: -20,
    end: 40,
    outward: -1,
  };
  const segments: BoundarySegment[] = [
    perimeter,
    { orientation: "vertical", coord: 10, start: 0, end: 4, outward: 1 },
    { orientation: "vertical", coord: 10, start: 6, end: 10, outward: 1 },
  ];
  const result = plan(segments, [makeMassing({ centerY: 2, width: 2 })]);

  assert.deepEqual(result.segments[0], perimeter);
  assert.equal(
    result.segments.some((segment) => segment.coord === 10 && segment.start < 6 && segment.end > 4),
    false,
    "an authored connector opening must remain absent",
  );
  assert.ok(result.segments.every((segment) => segment.end - segment.start >= 0.001));
});

test("non-coplanar, partially supported, perimeter, overlapping, and sliver ownership fail loudly", () => {
  const continuous: BoundarySegment[] = [
    { orientation: "vertical", coord: 10, start: 0, end: 10, outward: 1 },
  ];
  assert.throws(
    () => plan(continuous, [makeMassing({ centerX: 12.1 })]),
    /non-coplanar/,
  );

  const connectorGap: BoundarySegment[] = [
    { orientation: "vertical", coord: 10, start: 0, end: 4, outward: 1 },
    { orientation: "vertical", coord: 10, start: 6, end: 10, outward: 1 },
  ];
  assert.throws(
    () => plan(connectorGap, [makeMassing({ centerY: 5, width: 8 })]),
    /partially supported; gap/,
  );

  assert.throws(
    () => planV3VisualWallSegments({
      segments: [{ orientation: "vertical", coord: 0, start: 0, end: 10, outward: -1 }],
      zones: [zone],
      placements: [makeMassing({ face: "west", centerX: -2 })],
      playableBoundary: { x: 0, y: 0, w: 10, h: 10 },
    }),
    /sealed playable perimeter/,
  );

  assert.throws(
    () => plan(continuous, [
      makeMassing({ id: "ONE", centerY: 4, width: 4 }),
      makeMassing({ id: "TWO", centerY: 6, width: 4 }),
    ]),
    /claim overlapping visual frontage/,
  );

  assert.throws(
    () => plan(continuous, [makeMassing({ centerY: 2.50025, width: 4.9995 })]),
    /produced a .*m sliver/,
  );
});

test("no authored massing returns deterministic cloned render segments", () => {
  const source: BoundarySegment[] = [
    { orientation: "vertical", coord: 10, start: 0, end: 10, outward: 1 },
  ];
  const result = plan(source, []);
  assert.deepEqual(result.segments, source);
  assert.notEqual(result.segments[0], source[0]);
  assert.deepEqual(result.sourceSegmentIndices, [0]);
  assert.deepEqual(result.architectureOwnedFrontages, []);
});

test("visual ownership is gated to v3 final PBR bazaar rendering", () => {
  assert.equal(usesV3AuthoredVisualWallOwnership("3.0", "pbr", "bazaar"), true);
  assert.equal(usesV3AuthoredVisualWallOwnership("2.0", "pbr", "bazaar"), false);
  assert.equal(usesV3AuthoredVisualWallOwnership("3.0", "blockout", "bazaar"), false);
  assert.equal(usesV3AuthoredVisualWallOwnership("3.0", "pbr", "debug"), false);
});

test("PBR wall fragments inherit parent material context and UV seed while keeping aligned elevations", () => {
  const source: BoundarySegment = {
    orientation: "vertical",
    coord: 10,
    start: 0,
    end: 10,
    outward: 1,
  };
  const manifest = {
    getMaterialIds: () => ["ph_sandstone_blocks_05"],
    getTileSizeM: () => 1,
    createStandardMaterial: () => new MeshStandardMaterial(),
  } as unknown as WallMaterialLibrary;
  const root = buildPbrWalls({
    formatVersion: "3.0",
    segments: [
      { ...source, end: 3 },
      { ...source, start: 7 },
    ],
    sourceSegments: [source],
    segmentSourceIndices: [0, 0],
    zones: [zone],
    seed: 991,
    quality: "1k",
    manifest,
    wallHeightM: 7,
    floorTopY: 0,
    segmentHeights: [4, 7],
    segmentBaseYs: [1, 2],
  });
  const mesh = root.children[0] as Mesh;
  const uv = mesh.geometry.getAttribute("uv");
  const position = mesh.geometry.getAttribute("position");

  assert.equal(uv.getX(0), uv.getX(4) - 7, "both fragments must retain the parent UV offset");
  assert.deepEqual(
    [position.getY(0), position.getY(2), position.getY(4), position.getY(6)],
    [1, 5, 2, 9],
    "render fragments must use heights and bases mapped from their parents",
  );
  assert.equal(mesh.name, "wall-ph_sandstone_blocks_05");
});

test("PBR parent metadata is an all-or-nothing aligned contract", () => {
  const source: BoundarySegment = {
    orientation: "vertical",
    coord: 10,
    start: 0,
    end: 10,
    outward: 1,
  };
  const manifest = {
    getMaterialIds: () => ["ph_sandstone_blocks_05"],
  } as unknown as WallMaterialLibrary;
  assert.throws(
    () => buildPbrWalls({
      segments: [source],
      segmentSourceIndices: [0],
      zones: [zone],
      seed: 1,
      quality: "1k",
      manifest,
      wallHeightM: 7,
      floorTopY: 0,
    }),
    /must be provided together/,
  );
});

test("compiled Bazaar v3 supports every authored massing without changing any wall collider", () => {
  const runtimeSpecUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const spec = parseBlockoutSpec(JSON.parse(readFileSync(runtimeSpecUrl, "utf8")), runtimeSpecUrl.pathname);
  const colliderWalls = deriveBlockoutWallSegments(spec);
  const originalColliderWalls = structuredClone(colliderWalls);
  const plan = planV3VisualWallSegments({
    segments: colliderWalls,
    zones: spec.zones,
    placements: spec.architecturePlacements ?? [],
    playableBoundary: spec.playable_boundary,
  });
  assert.deepEqual(colliderWalls, originalColliderWalls);
  const authoredMassingCount = spec.architecturePlacements?.filter((placement) => placement.kind === "massing").length ?? 0;
  assert.equal(plan.architectureOwnedFrontages.length, authoredMassingCount);
  assert.ok(plan.architectureOwnedFrontages.length > 0);
});

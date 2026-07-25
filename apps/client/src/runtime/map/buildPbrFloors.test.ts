import assert from "node:assert/strict";
import test from "node:test";
import { BufferAttribute, Mesh, MeshStandardMaterial } from "three";
import type { FloorMaterialLibrary } from "../render/materials/FloorMaterialLibrary";
import { buildPbrFloors } from "./buildPbrFloors";
import type {
  RuntimeBlockoutSpec,
  RuntimeBlockoutZone,
  RuntimeTraversalSurface,
} from "./types";

const manifest = {
  getTileSizeM: () => 2,
  createStandardMaterial: () => new MeshStandardMaterial({ color: 0x9a8064 }),
} as unknown as FloorMaterialLibrary;

function zone(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
  floorMaterialId?: string,
  surfaceId?: string,
): RuntimeBlockoutZone {
  return {
    id,
    type: "side_hall",
    rect,
    label: id,
    notes: "floor-renderer fixture",
    ...(floorMaterialId ? { floorMaterialId } : {}),
    ...(surfaceId ? { surfaceId } : {}),
  };
}

function spec(
  formatVersion: string,
  zones: RuntimeBlockoutZone[],
  traversalSurfaces: RuntimeTraversalSurface[] = [],
): RuntimeBlockoutSpec {
  return {
    mapId: "floor-test",
    formatVersion,
    playable_boundary: { x: 0, y: 0, w: 20, h: 20 },
    defaults: {
      wall_height: 7,
      wall_thickness: 0.35,
      ceiling_height: 9.5,
      floor_height: 0,
    },
    wall_details: {} as RuntimeBlockoutSpec["wall_details"],
    zones,
    exterior_wall_patches: [],
    traversalSurfaces,
    constraints: {
      min_path_width_main_lane: 6,
      min_path_width_side_halls: 4.5,
    },
  };
}

function build(runtimeSpec: RuntimeBlockoutSpec) {
  return buildPbrFloors(runtimeSpec, {
    seed: 3009,
    quality: "1k",
    manifest,
    patchSizeM: 2,
    floorTopY: 0,
  });
}

function positionExtents(mesh: Mesh): { minX: number; maxX: number; minY: number; maxY: number } {
  const position = mesh.geometry.getAttribute("position") as BufferAttribute;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < position.count; index += 1) {
    minX = Math.min(minX, position.getX(index));
    maxX = Math.max(maxX, position.getX(index));
    minY = Math.min(minY, position.getY(index));
    maxY = Math.max(maxY, position.getY(index));
  }
  return { minX, maxX, minY, maxY };
}

test("v3 caps a material boundary without moving either authored traversal surface", () => {
  const left = zone(
    "LEFT",
    { x: 0, y: 0, w: 4, h: 4 },
    "large_sandstone_blocks_01",
    "SURFACE_LEFT",
  );
  const right = zone(
    "RIGHT",
    { x: 4, y: 0, w: 4, h: 4 },
    "cobblestone_pavement",
    "SURFACE_RIGHT",
  );
  const root = build(spec("3.0", [left, right], [
    { id: "SURFACE_LEFT", zoneId: "LEFT", kind: "flat", rect: left.rect, elevationM: 0 },
    { id: "SURFACE_RIGHT", zoneId: "RIGHT", kind: "flat", rect: right.rect, elevationM: 0 },
  ]));

  assert.deepEqual(root.userData.floorPolish, {
    formatVersion: "3.0",
    transitionBandCount: 1,
    materialTransitionCount: 1,
    elevationJoinCount: 0,
    elevationThresholdCount: 0,
    sameMaterialWeldCount: 0,
    fasciaQuadCount: 0,
    stairTreadCount: 0,
    stairRiserCount: 0,
  });
  const thresholdMesh = root.getObjectByName("floor-large_sandstone_blocks_01") as Mesh;
  const extents = positionExtents(thresholdMesh);
  assert.equal(extents.minX, 0);
  assert.ok(Math.abs(extents.maxX - 4.12) < 1e-5);
  assert.ok(Math.abs(extents.maxY - 0.012) < 1e-6);
  const cobble = root.getObjectByName("floor-cobblestone_pavement") as Mesh;
  assert.equal(positionExtents(cobble).maxX, 8);
  assert.equal(root.children.some((child) => child.name.startsWith("floor-edge-fascia-")), false);
});

test("v3 closes raised edges and marks a welded ramp/terrace join with a dark flush threshold", () => {
  const ramp = zone(
    "RAMP",
    { x: 0, y: 0, w: 4, h: 4 },
    "large_sandstone_blocks_01",
    "SURFACE_RAMP",
  );
  const terrace = zone(
    "TERRACE",
    { x: 0, y: 4, w: 4, h: 4 },
    "large_sandstone_blocks_01",
    "SURFACE_TERRACE",
  );
  const root = build(spec("3.0", [ramp, terrace], [
    {
      id: "SURFACE_RAMP",
      zoneId: "RAMP",
      kind: "ramp",
      rect: ramp.rect,
      axis: "y",
      startElevationM: 0,
      endElevationM: 1.4,
      visualStyle: "ramp",
    },
    {
      id: "SURFACE_TERRACE",
      zoneId: "TERRACE",
      kind: "flat",
      rect: terrace.rect,
      elevationM: 1.4,
    },
  ]));

  const stats = root.userData.floorPolish as {
    transitionBandCount: number;
    elevationJoinCount: number;
    elevationThresholdCount: number;
    sameMaterialWeldCount: number;
    fasciaQuadCount: number;
  };
  assert.equal(stats.transitionBandCount, 1);
  assert.equal(stats.elevationJoinCount, 1);
  assert.equal(stats.elevationThresholdCount, 1);
  assert.equal(stats.sameMaterialWeldCount, 1);
  assert.ok(stats.fasciaQuadCount > 0);

  const fascia = root.getObjectByName("floor-edge-fascia-large_sandstone_blocks_01") as Mesh;
  assert.ok(fascia, "raised authored surfaces should have a material-matched edge fascia");
  const fasciaExtents = positionExtents(fascia);
  assert.ok(fasciaExtents.minX >= -0.0021);
  assert.ok(fasciaExtents.maxX <= 4.0021);
  assert.ok(Math.abs(fasciaExtents.maxY - 1.4) < 1e-5);

  const floor = root.getObjectByName("floor-large_sandstone_blocks_01") as Mesh;
  assert.ok(Math.abs(positionExtents(floor).maxY - 1.4) < 1e-5);
  const threshold = root.getObjectByName("floor-grey_tiles") as Mesh;
  assert.ok(threshold, "elevation join is missing its intentional grey-stone threshold");
  assert.ok(Math.abs(positionExtents(threshold).maxY - 1.402) < 1e-5);
});

test("v3 stairs use the owning PBR floor material, world UVs, and crack-overlapped finite treads", () => {
  const terrace = zone(
    "TERRACE",
    { x: 0, y: 0, w: 4, h: 4 },
    "large_sandstone_blocks_01",
    "SURFACE_TERRACE",
  );
  const stairs = zone(
    "STAIRS",
    { x: 0, y: 4, w: 4, h: 6 },
    "large_sandstone_blocks_01",
    "SURFACE_STAIRS",
  );
  const landing = zone(
    "LANDING",
    { x: 0, y: 10, w: 4, h: 2 },
    "large_sandstone_blocks_01",
    "SURFACE_LANDING",
  );
  const root = build(spec("3.0", [terrace, stairs, landing], [
    { id: "SURFACE_TERRACE", zoneId: "TERRACE", kind: "flat", rect: terrace.rect, elevationM: 1.4 },
    {
      id: "SURFACE_STAIRS",
      zoneId: "STAIRS",
      kind: "ramp",
      rect: stairs.rect,
      axis: "y",
      startElevationM: 1.4,
      endElevationM: 0,
      visualStyle: "stairs",
      stepCount: 10,
    },
    { id: "SURFACE_LANDING", zoneId: "LANDING", kind: "flat", rect: landing.rect, elevationM: 0 },
  ]));

  const stats = root.userData.floorPolish as {
    transitionBandCount: number;
    elevationJoinCount: number;
    elevationThresholdCount: number;
    sameMaterialWeldCount: number;
    stairTreadCount: number;
    stairRiserCount: number;
  };
  assert.equal(stats.transitionBandCount, 2);
  assert.equal(stats.elevationJoinCount, 2);
  assert.equal(stats.elevationThresholdCount, 2);
  assert.equal(stats.sameMaterialWeldCount, 2);
  assert.equal(stats.stairTreadCount, 10);
  assert.equal(stats.stairRiserCount, 10);

  const floor = root.getObjectByName("floor-large_sandstone_blocks_01") as Mesh;
  assert.ok(floor.material instanceof MeshStandardMaterial);
  const position = floor.geometry.getAttribute("position") as BufferAttribute;
  const uv = floor.geometry.getAttribute("uv") as BufferAttribute;
  assert.ok(Math.abs(positionExtents(floor).maxY - 1.403) < 1e-5);
  for (let index = 0; index < position.count; index += 1) {
    assert.ok(Number.isFinite(position.getX(index)));
    assert.ok(Number.isFinite(position.getY(index)));
    assert.ok(Number.isFinite(position.getZ(index)));
  }
  for (let index = 0; index < uv.count; index += 1) {
    assert.ok(Number.isFinite(uv.getX(index)) && Number.isFinite(uv.getY(index)));
  }
});

test("v3 rejects unresolved floor authority instead of revealing a flat fallback", () => {
  const missingMaterial = zone("MISSING_MATERIAL", { x: 0, y: 0, w: 4, h: 4 }, undefined, "SURFACE");
  assert.throws(
    () => build(spec("3.0", [missingMaterial], [
      { id: "SURFACE", zoneId: "MISSING_MATERIAL", kind: "flat", rect: missingMaterial.rect, elevationM: 0 },
    ])),
    /unresolved floor material 'missing'/,
  );

  const missingSurface = zone(
    "MISSING_SURFACE",
    { x: 0, y: 0, w: 4, h: 4 },
    "cobblestone_pavement",
  );
  assert.throws(
    () => build(spec("3.0", [missingSurface])),
    /unresolved traversal surface 'missing'/,
  );
});

test("v2 keeps the legacy material fallback and receives no v3 seam geometry", () => {
  const legacy = zone("LEGACY_ZONE", { x: 0, y: 0, w: 4, h: 4 });
  const root = build(spec("2.0", [legacy]));
  assert.equal(root.userData.floorPolish, undefined);
  assert.ok(root.getObjectByName("floor-cobblestone_color"));
  assert.equal(root.children.some((child) => child.name.startsWith("floor-edge-fascia-")), false);
});

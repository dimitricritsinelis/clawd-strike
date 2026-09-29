import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial } from "three";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { buildProps } from "../props/buildProps";
import { parseAnchorsSpec, parseBlockoutSpec } from "../spec/parseMapSpec";
import type { RuntimeBlockoutZone, RuntimeRect } from "../spec/types";
import {
  resolveFacadeStyleForSegment,
  type FacadeFace,
  type FacadeSegmentFrame,
} from "../walls/wallMaterialAssignment";

function zone(id: string, type: string): RuntimeBlockoutZone {
  return {
    id,
    type,
    rect: { x: 10, y: 10, w: 12, h: 16 },
    label: id,
    notes: "semantic facade test fixture",
  };
}

function frameForFace(target: RuntimeBlockoutZone, face: FacadeFace): FacadeSegmentFrame {
  const centerX = target.rect.x + target.rect.w * 0.5;
  const centerZ = target.rect.y + target.rect.h * 0.5;
  switch (face) {
    case "west":
      return { centerX: target.rect.x, centerZ, inwardX: 1, inwardZ: 0 };
    case "east":
      return { centerX: target.rect.x + target.rect.w, centerZ, inwardX: -1, inwardZ: 0 };
    case "south":
      return { centerX, centerZ: target.rect.y, inwardX: 0, inwardZ: 1 };
    case "north":
      return { centerX, centerZ: target.rect.y + target.rect.h, inwardX: 0, inwardZ: -1 };
  }
}

function colliderOverlapsRect(
  collider: { min: { x: number; z: number }; max: { x: number; z: number } },
  rect: RuntimeRect,
): boolean {
  return !(
    collider.max.x <= rect.x
    || collider.min.x >= rect.x + rect.w
    || collider.max.z <= rect.y
    || collider.min.z >= rect.y + rect.h
  );
}

test("v3 facade profiles resolve the authored facade-family palette and reject unprofiled zones", () => {
  const profiledFixtures = [
    { profile: "active_merchant", family: "merchant" },
    { profile: "quiet_residential", family: "residential" },
    { profile: "covered_arcade", family: "merchant" },
    { profile: "service_storage", family: "service" },
    { profile: "hero_courtyard", family: "merchant" },
  ] as const;
  const authoredWallMaterials = new Set<string>();
  for (const fixture of profiledFixtures) {
    const profiledZone = {
      ...zone(`V3_${fixture.profile.toUpperCase()}`, "main_lane_segment"),
      facadeProfileId: fixture.profile,
    };
    const style = resolveFacadeStyleForSegment(profiledZone, frameForFace(profiledZone, "west"));
    authoredWallMaterials.add(style.materials.wall);
    assert.equal(style.family, fixture.family, `${fixture.profile} ignored its semantic family`);
    assert.match(style.materials.wall, /^ph_/, `${fixture.profile} left the manifest-backed PBR material family`);
  }
  assert.ok(authoredWallMaterials.size >= 4, "v3 facade families collapsed back to one wall material");
  assert.ok(
    [...authoredWallMaterials].every((id) => id !== "ph_brick_4_desert"),
    "red brick leaked into a v3 facade profile",
  );

  const unprofiled = zone("V3_UNPROFILED", "main_lane_segment");
  assert.throws(
    () => resolveFacadeStyleForSegment(unprofiled, frameForFace(unprofiled, "west")),
    /zone 'V3_UNPROFILED' has no supported facade profile/,
  );
});

test("compiled bazaar props stay deterministic, culled, and clear-zone safe", async () => {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  // Every registered model resolves to a unit box. The real GLBs change prefab
  // silhouettes, not the route and clearance rules checked here.
  const propModels = {
    hasModel: () => true,
    instantiate: (id: string) => {
      const root = new Group();
      const model = new Mesh(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new MeshStandardMaterial());
      model.name = `model-${id}`;
      root.add(model);
      return root;
    },
  } as unknown as PropModelLibrary;
  const options = {
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propModels,
  };
  const first = buildProps(options);
  const second = buildProps(options);

  assert.deepEqual(first.stats, second.stats);
  assert.deepEqual(first.colliders, second.colliders);
  assert.ok(first.stats.collidersPlaced > 0, "compiled dressing produced no gameplay cover");

  const clearRects = blockout.zones
    .filter((candidate) => candidate.type === "clear_travel_zone")
    .map((candidate) => candidate.rect);
  for (const candidate of blockout.zones) {
    if (typeof candidate.clearWidthM !== "number") continue;
    if (candidate.type === "connector" || candidate.type === "cut") {
      clearRects.push(candidate.rect);
      continue;
    }
    const width = Math.min(candidate.rect.w, candidate.clearWidthM);
    clearRects.push({
      x: candidate.rect.x + (candidate.rect.w - width) * 0.5,
      y: candidate.rect.y,
      w: width,
      h: candidate.rect.h,
    });
  }
  for (const collider of first.colliders) {
    assert.ok(
      clearRects.every((rect) => !colliderOverlapsRect(collider, rect)),
      `${collider.id} intrudes into an authored clear-travel zone`,
    );
  }
  const terraceCover = first.colliders.find((collider) => collider.id.startsWith("COVER_TEA_01"));
  assert.ok(terraceCover, "tea terrace gameplay cover is missing");
  assert.ok(terraceCover.min.y >= 1.39, "tea terrace cover sank below its authored 1.4m surface");

  const compiled = first.root.getObjectByName("map-props-v3-compiled");
  assert.ok(compiled, "compiled prop group is missing");
  const batches = compiled.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
  assert.ok(batches.length > 0, "compiled dressing drew no instanced batches");
  for (const batch of batches) {
    assert.equal(batch.frustumCulled, true, `${batch.name} disabled frustum culling`);
    assert.ok(batch.boundingSphere, `${batch.name} lacks a computed instanced bound`);
  }
});

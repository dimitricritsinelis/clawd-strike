import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { buildProps } from "./buildProps";
import { parseAnchorsSpec, parseBlockoutSpec, type RuntimeBlockoutZone, type RuntimeRect } from "./types";
import {
  resolveFacadeStyleForSegment,
  type FacadeFace,
  type FacadeSegmentFrame,
} from "./wallMaterialAssignment";

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
  const v3WallMaterials = new Set<string>();
  for (const fixture of profiledFixtures) {
    const profiledZone = {
      ...zone(`V3_${fixture.profile.toUpperCase()}`, "main_lane_segment"),
      facadeProfileId: fixture.profile,
    };
    const style = resolveFacadeStyleForSegment(profiledZone, frameForFace(profiledZone, "west"));
    v3WallMaterials.add(style.materials.wall);
    assert.equal(style.family, fixture.family, `${fixture.profile} ignored its semantic family`);
    assert.match(style.materials.wall, /^ph_/, `${fixture.profile} left the manifest-backed PBR material family`);
  }
  assert.ok(v3WallMaterials.size >= 4, "v3 facade families collapsed back to one wall material");
  assert.ok(
    [...v3WallMaterials].every((id) => id !== "ph_brick_4_desert"),
    "red brick leaked into a v3 facade profile",
  );

  const unprofiled = zone("V3_UNPROFILED", "main_lane_segment");
  assert.throws(
    () => resolveFacadeStyleForSegment(unprofiled, frameForFace(unprofiled, "west")),
    /zone 'V3_UNPROFILED' has no supported facade profile/,
  );
});

test("procedural bazaar props remain deterministic, culled, and clear-zone safe without model assets", async () => {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  // Exercise the fallback canopy after R7 retires its live render anchors.
  anchors.anchors.push({id:"LEGACY_CANOPY_FIXTURE",type:"cloth_canopy_span",zone:"COVERED_SOUK",
    pos:{x:42,y:40,z:5},endPos:{x:52,y:40,z:5},widthM:2.8});
  const options = {
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propChaos: { profile: "high" as const, jitter: 0.7, cluster: 0.85, density: 1 },
    propVisuals: "blockout" as const,
    propModels: null,
    highVis: false,
  };
  const first = buildProps(options);
  const second = buildProps(options);

  assert.deepEqual(first.stats, second.stats);
  assert.deepEqual(first.colliders, second.colliders);
  assert.ok(first.stats.collidersPlaced > 0, "procedural dressing produced no gameplay cover");

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

  const blockoutGroup = first.root.getObjectByName("map-props-blockout");
  assert.ok(blockoutGroup, "procedural prop group is missing");
  const batchNames = new Set(blockoutGroup!.children.map((child) => child.name));
  assert.ok(batchNames.has("prop-shopfront"), "market stalls are missing");
  assert.ok(batchNames.has("prop-canopy") || batchNames.has("prop-canopy-teal"), "cloth canopies are missing");
  assert.equal(
    batchNames.has("prop-threshold-rug"),
    false,
    "the removed unsupported route textile returned to the fallback prop layer",
  );
  assert.ok(batchNames.has("prop-landmark-cart"), "Caravan Court cart landmark is missing");
  assert.ok(
    [...batchNames].some((name) => name.startsWith("prop-stall-filler-")),
    "crate, sack, and pottery filler clusters are missing",
  );

  for (const child of blockoutGroup!.children) {
    const batch = child as typeof child & {
      frustumCulled?: boolean;
      boundingSphere?: unknown;
      computeBoundingSphere?: () => void;
    };
    if (!batch.computeBoundingSphere) continue;
    assert.equal(batch.frustumCulled, true, `${child.name} disabled frustum culling`);
    assert.ok(batch.boundingSphere, `${child.name} lacks a computed instanced bound`);
  }

  const shopfront = blockoutGroup!.getObjectByName("prop-shopfront") as typeof blockoutGroup & {
    geometry?: { attributes?: { position?: { count: number } } };
  };
  assert.ok((shopfront.geometry?.attributes?.position?.count ?? 0) > 24, "shopfront fallback regressed to a plain cube");
});

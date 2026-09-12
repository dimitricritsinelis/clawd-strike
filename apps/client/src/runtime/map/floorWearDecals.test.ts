import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { RuntimeBlockoutSpec } from "./types";
import { buildFloorWearDecals, planFloorWearDecals } from "./floorWearDecals";

const MAP_SPEC_URL = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);

function readSpec(): RuntimeBlockoutSpec {
  return JSON.parse(readFileSync(fileURLToPath(MAP_SPEC_URL), "utf8")) as RuntimeBlockoutSpec;
}

test("floor wear planning is deterministic and respects restrained per-zone density budgets", () => {
  const spec = readSpec();
  spec.zones = [
    { id:"SMALL_COURT",label:"Small court",notes:"Legacy density fixture",type:"spawn_plaza",rect:{x:0,y:0,w:10,h:10} },
    { id:"SERVICE_SOUTH",label:"Service",notes:"Legacy density fixture",type:"side_hall",rect:{x:10,y:0,w:8,h:10} },
    { id:"LEGACY_LANE",label:"Legacy lane",notes:"Legacy density fixture",type:"main_lane_segment",rect:{x:0,y:10,w:12,h:20} },
    { id:"R7_LANE",label:"R7 lane",notes:"Authored finish fixture",type:"main_lane_segment",rect:{x:12,y:10,w:12,h:20},floorMaterialId:"bz04_court_limestone_flags_01" },
  ];
  const first = planFloorWearDecals(spec, 7331);
  const second = planFloorWearDecals(spec, 7331);
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);

  const countByZone = new Map<string, number>();
  for (const plan of first) {
    countByZone.set(plan.zoneId, (countByZone.get(plan.zoneId) ?? 0) + 1);
    assert.ok(plan.widthM >= 1.1 && plan.widthM <= 3.8);
    assert.ok(plan.lengthM >= 2.6 && plan.lengthM <= 9.5);
  }

  // A small zone still gets one restrained patch. A long lane gets a four-patch
  // traffic axis, one threshold patch at each of its four edges so the wear
  // carries through a district junction instead of stopping at it, and three
  // grime runs banked against each of its two frontages — because a lane that
  // is only worn in its middle reads as a floor nobody has ever swept dirt to
  // the sides of.
  assert.equal(countByZone.get("SMALL_COURT"), 1);
  assert.equal(countByZone.get("SERVICE_SOUTH"), 1);
  assert.equal(countByZone.get("LEGACY_LANE"), 14);
  assert.equal(countByZone.has("R7_LANE"), false, "R7 authored floor treatment must not receive legacy wear overlays");
  assert.ok([...countByZone.values()].every((count) => count === 1 || count === 14));
});

test("legacy traffic wear respects raised floors and slopes while R7 terrace owns its finish", () => {
  const spec = readSpec();
  spec.zones = spec.zones.filter((zone) => zone.id === "TEA_TERRACE");
  assert.equal(buildFloorWearDecals(spec, 7331, 0), null, "R7 terrace must not receive legacy wear");
  spec.zones = spec.zones.map(zone => ({ ...zone, floorMaterialId: "large_sandstone_blocks_01" }));
  const mesh = buildFloorWearDecals(spec, 7331, 0);
  assert.ok(mesh);
  const vertices = mesh.geometry.getAttribute("position");
  for (let i = 0; i < vertices.count; i += 1) {
    assert.ok(Math.abs(vertices.getY(i) - 1.414) < 1e-6);
  }
  const terrace = spec.traversalSurfaces!.find((surface) => surface.zoneId === "TEA_TERRACE")!;
  spec.traversalSurfaces = [{ ...terrace, kind: "ramp", axis: "y", startElevationM: 0, endElevationM: 1.4 }];
  assert.equal(buildFloorWearDecals(spec, 7331, 0), null);
});

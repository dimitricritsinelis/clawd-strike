import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { RuntimeBlockoutSpec } from "./types";
import { planFloorWearDecals } from "./floorWearDecals";

const MAP_SPEC_URL = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);

function readSpec(): RuntimeBlockoutSpec {
  return JSON.parse(readFileSync(fileURLToPath(MAP_SPEC_URL), "utf8")) as RuntimeBlockoutSpec;
}

test("floor wear planning is deterministic and respects restrained per-zone density budgets", () => {
  const spec = readSpec();
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
  assert.equal(countByZone.get("SPAWN_A_COURTYARD"), 1);
  assert.equal(countByZone.get("SERVICE_SOUTH"), 1);
  assert.equal(countByZone.get("SPICE_STREET"), 14);
  assert.ok([...countByZone.values()].every((count) => count === 1 || count === 14));
});

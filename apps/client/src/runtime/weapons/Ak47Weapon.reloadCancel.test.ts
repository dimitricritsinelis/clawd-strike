import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { Ak47Weapon } from "./Ak47Weapon";
import type { Ak47ShotEvent } from "./Ak47FireController";
import { WorldColliders } from "../sim/collision/WorldColliders";

const PLAYABLE_BOUNDARY = { x: -100, y: -100, w: 200, h: 200 };

function makeInput(fireHeld: boolean, world: WorldColliders) {
  return {
    deltaSeconds: 1 / 60,
    fireHeld,
    origin: new Vector3(0, 1.7, 0),
    forward: new Vector3(0, 0, -1),
    grounded: true,
    speedMps: 0,
    world,
  };
}

// Regression: the reload-cancel branch used to return the fire controller's
// result directly, bypassing the only magazine deduction. Every cancelled
// reload therefore fired a live, fully damaging round for free while the HUD
// ammo count never moved.
test("cancelling a reload by firing still deducts every round from the magazine", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 3 });

  // Burn a few rounds so the magazine is partially full, then start a reload.
  weapon.update(makeInput(true, world), () => {});
  weapon.update(makeInput(false, world));
  const magBeforeReload = weapon.getAmmoSnapshot().mag;
  assert.ok(magBeforeReload > 0 && magBeforeReload < 30, `expected a partial mag, got ${magBeforeReload}`);

  weapon.queueReload();
  weapon.update(makeInput(false, world));
  assert.equal(weapon.getAmmoSnapshot().mag, magBeforeReload, "reload should not refill mid-flight");

  // Cancel the reload with a fresh trigger pull.
  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));

  const magAfter = weapon.getAmmoSnapshot().mag;
  assert.equal(
    magAfter,
    magBeforeReload - shots.length,
    `fired ${shots.length} round(s) on reload-cancel but magazine went ${magBeforeReload} -> ${magAfter}`,
  );
});

test("a reload-cancel shot cannot fire rounds the magazine does not have", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 5 });

  // Drain the magazine down to a single round.
  let guard = 0;
  while (weapon.getAmmoSnapshot().mag > 1 && guard < 5000) {
    weapon.update(makeInput(true, world), () => {});
    weapon.update(makeInput(false, world));
    guard += 1;
  }
  assert.equal(weapon.getAmmoSnapshot().mag, 1);

  weapon.queueReload();
  weapon.update(makeInput(false, world));

  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));

  assert.ok(shots.length <= 1, `fired ${shots.length} rounds from a 1-round magazine`);
  assert.ok(weapon.getAmmoSnapshot().mag >= 0, "magazine must never go negative");
});

test("profile ammo starts and deterministic kill rewards respect the reserve cap", () => {
  const weapon = new Ak47Weapon({
    seed: 7,
    reserveStart: 120,
    reserveCapacity: 150,
  });

  assert.equal(weapon.getAmmoSnapshot().reserve, 120);
  assert.equal(weapon.grantReserveAmmo(6), 6);
  assert.equal(weapon.getAmmoSnapshot().reserve, 126);
  assert.equal(weapon.grantReserveAmmo(100), 24);
  assert.equal(weapon.getAmmoSnapshot().reserve, 150);
  assert.equal(weapon.grantReserveAmmo(-5), 0);

  weapon.reset();
  assert.equal(weapon.getAmmoSnapshot().reserve, 120, "wave reset must restore the profile start, not the reward cap");
});

test("profile magazine capacity controls firing, reload, unlimited ammo, and reset", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({
    seed: 11,
    magazineCapacity: 5,
    reserveStart: 7,
    reserveCapacity: 7,
  });

  assert.deepEqual(weapon.getAmmoSnapshot(), {
    mag: 5,
    reserve: 7,
    reloading: false,
    reloadT01: 0,
  });

  weapon.update(makeInput(true, world), () => {});
  weapon.update(makeInput(false, world));
  assert.equal(weapon.getAmmoSnapshot().mag, 4);

  weapon.queueReload();
  weapon.update(makeInput(false, world));
  weapon.update({ ...makeInput(false, world), deltaSeconds: 2 });
  assert.equal(weapon.getAmmoSnapshot().mag, 5);
  assert.equal(weapon.getAmmoSnapshot().reserve, 6);

  weapon.update(makeInput(true, world), () => {});
  weapon.setUnlimitedAmmo(true);
  assert.equal(weapon.getAmmoSnapshot().mag, 5, "unlimited ammo must refill to the profile capacity");
  weapon.update(makeInput(true, world), () => {});
  assert.equal(weapon.getAmmoSnapshot().mag, 5, "unlimited fire must preserve the profile capacity");

  weapon.setUnlimitedAmmo(false);
  weapon.update(makeInput(false, world));
  weapon.update(makeInput(true, world), () => {});
  assert.equal(weapon.getAmmoSnapshot().mag, 4);
  weapon.reset();
  assert.equal(weapon.getAmmoSnapshot().mag, 5, "wave reset must restore the profile capacity");
});

import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { Ak47Weapon } from "./Ak47Weapon";
import { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } from "./ak47ReloadMarks";
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

test("profile magazine capacity controls firing, reload, free reloads, and reset", () => {
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
    reloadSerial: 0,
  });

  weapon.update(makeInput(true, world), () => {});
  weapon.update(makeInput(false, world));
  assert.equal(weapon.getAmmoSnapshot().mag, 4);

  weapon.queueReload();
  weapon.update(makeInput(false, world));
  weapon.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S });
  assert.equal(weapon.getAmmoSnapshot().mag, 5);
  assert.equal(weapon.getAmmoSnapshot().reserve, 6);

  weapon.update(makeInput(true, world), () => {});
  assert.equal(weapon.getAmmoSnapshot().mag, 4);
  weapon.setFreeReloads(true);
  // Release long enough for the tap-fire cadence to allow the next round.
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.1 });
  weapon.update(makeInput(true, world), () => {});
  assert.equal(weapon.getAmmoSnapshot().mag, 3, "free reloads still spend the magazine");
  weapon.queueReload();
  weapon.update(makeInput(false, world));
  weapon.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S });
  assert.equal(weapon.getAmmoSnapshot().mag, 5, "free reload refills the magazine");
  assert.equal(weapon.getAmmoSnapshot().reserve, 6, "free reload must not drain reserve");

  weapon.setFreeReloads(false);
  weapon.update(makeInput(false, world));
  weapon.update(makeInput(true, world), () => {});
  assert.equal(weapon.getAmmoSnapshot().mag, 4);
  weapon.reset();
  assert.equal(weapon.getAmmoSnapshot().mag, 5, "wave reset must restore the profile capacity");
});

const LATCH_S = AK47_RELOAD_MARKS.latch;

/** Fires one round, releases, and returns the partial magazine count. */
function spendOneRound(weapon: Ak47Weapon, world: WorldColliders): number {
  weapon.update(makeInput(true, world), () => {});
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.1 });
  return weapon.getAmmoSnapshot().mag;
}

test("partial and empty magazines use the same AK47_RELOAD_DURATION_S reload", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const partial = new Ak47Weapon({ seed: 13 });
  const empty = new Ak47Weapon({ seed: 17, magazineCapacity: 2 });
  const starts: number[] = [];
  partial.onReloadStart = (duration) => starts.push(duration);
  empty.onReloadStart = (duration) => starts.push(duration);

  const magBefore = spendOneRound(partial, world);
  assert.ok(magBefore > 0 && magBefore < 30);
  partial.queueReload();
  partial.update({ ...makeInput(false, world), deltaSeconds: 0 });

  let guard = 0;
  while (starts.length < 2 && guard < 200) {
    empty.update(makeInput(true, world), () => {});
    empty.update({ ...makeInput(false, world), deltaSeconds: 0.1 });
    guard += 1;
  }
  assert.equal(empty.getAmmoSnapshot().mag, 0);
  assert.deepEqual(starts, [AK47_RELOAD_DURATION_S, AK47_RELOAD_DURATION_S]);
  assert.equal(AK47_RELOAD_DURATION_S, 1.7);

  partial.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S / 2 });
  assert.ok(Math.abs(partial.getAmmoSnapshot().reloadT01 - 0.5) < 1e-9);
});

test("rounds are committed on the latch frame and the reload runs on to its end", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 29 });
  let ended = 0;
  const endFlags: boolean[] = [];
  weapon.onReloadEnd = (finishedEarly) => { ended += 1; endFlags.push(finishedEarly); };

  const magBefore = spendOneRound(weapon, world);
  const reserveBefore = weapon.getAmmoSnapshot().reserve;
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });

  weapon.update({ ...makeInput(false, world), deltaSeconds: LATCH_S - 0.01 });
  assert.equal(weapon.getAmmoSnapshot().mag, magBefore, "no rounds before the latch");
  assert.equal(weapon.getAmmoSnapshot().reserve, reserveBefore);

  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.02 });
  let snapshot = weapon.getAmmoSnapshot();
  assert.equal(snapshot.mag, 30, "the HUD ticks up on the latch frame");
  assert.equal(snapshot.reserve, reserveBefore - (30 - magBefore));
  assert.equal(snapshot.reloading, true, "the settle after the latch is still part of the reload");
  assert.equal(ended, 0);

  weapon.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S - LATCH_S - 0.02 });
  assert.equal(weapon.getAmmoSnapshot().reloading, true);
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.02 });
  snapshot = weapon.getAmmoSnapshot();
  assert.equal(ended, 1);
  assert.deepEqual(endFlags, [false], "the natural end is not an early finish");
  assert.equal(snapshot.reloading, false);
  assert.equal(snapshot.reloadT01, 0);
  assert.equal(snapshot.mag, 30, "rounds are counted exactly once");
  assert.equal(snapshot.reserve, reserveBefore - (30 - magBefore));
});

test("a fire press after the latch ends the reload and fires from the new magazine", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 31 });
  let ended = 0;
  let cancelled = 0;
  const endFlags: boolean[] = [];
  weapon.onReloadEnd = (finishedEarly) => { ended += 1; endFlags.push(finishedEarly); };
  weapon.onReloadCancel = () => { cancelled += 1; };

  const magBefore = spendOneRound(weapon, world);
  const reserveBefore = weapon.getAmmoSnapshot().reserve;
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: LATCH_S + 0.02 });
  assert.equal(weapon.getAmmoSnapshot().mag, 30);

  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  const snapshot = weapon.getAmmoSnapshot();
  assert.equal(shots.length, 1, "the press fires immediately");
  assert.equal(snapshot.reloading, false, "the rest of the reload is skipped");
  assert.equal(snapshot.reloadT01, 0);
  assert.equal(snapshot.mag, 29, "the shot comes out of the new magazine");
  assert.equal(snapshot.reserve, reserveBefore - (30 - magBefore));
  assert.equal(ended, 1);
  assert.deepEqual(endFlags, [true], "a post-latch fire press is signalled as an early finish");
  assert.equal(cancelled, 0);
});

const RELEASE_S = AK47_RELOAD_MARKS.release;

test("a fire press before the release cancels and keeps the old magazine count", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 23 });
  let cancels = 0;
  let ended = 0;
  weapon.onReloadCancel = () => { cancels += 1; };
  weapon.onReloadEnd = () => { ended += 1; };

  const magBefore = spendOneRound(weapon, world);
  const reserveBefore = weapon.getAmmoSnapshot().reserve;
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: RELEASE_S - 0.05 });

  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  const snapshot = weapon.getAmmoSnapshot();
  assert.equal(shots.length, 1);
  assert.equal(cancels, 1);
  assert.equal(ended, 0);
  assert.equal(snapshot.reloading, false);
  assert.equal(snapshot.reloadT01, 0);
  assert.equal(snapshot.mag, magBefore - 1);
  assert.equal(snapshot.reserve, reserveBefore, "a cancelled reload takes nothing from reserve");
});

test("after the release a press cannot cancel; if still held it fires at the latch", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 53 });
  let cancels = 0;
  const endFlags: boolean[] = [];
  weapon.onReloadCancel = () => { cancels += 1; };
  weapon.onReloadEnd = (finishedEarly) => endFlags.push(finishedEarly);

  const magBefore = spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: RELEASE_S + 0.02 });

  // The old magazine is out: the press is committed to the reload, not a cancel.
  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  assert.equal(shots.length, 0);
  assert.equal(cancels, 0);
  assert.equal(weapon.getAmmoSnapshot().reloading, true);
  assert.equal(weapon.getAmmoSnapshot().mag, magBefore, "the old count is gone with the old magazine, the new one is not counted yet");

  // Held until the latch: the fresh magazine is counted and the shot follows on that frame.
  const beforeLatch = LATCH_S - weapon.getAmmoSnapshot().reloadT01 * AK47_RELOAD_DURATION_S;
  weapon.update({ ...makeInput(true, world), deltaSeconds: beforeLatch - 0.01 }, (shot) => shots.push(shot));
  assert.equal(shots.length, 0, "nothing fires before the latch");
  weapon.update({ ...makeInput(true, world), deltaSeconds: 0.02 }, (shot) => shots.push(shot));
  const snapshot = weapon.getAmmoSnapshot();
  assert.equal(shots.length, 1, "the held press fires on the latch frame");
  assert.equal(snapshot.reloading, false);
  assert.equal(snapshot.mag, 29);
  assert.deepEqual(endFlags, [true], "signalled as an early finish");
  assert.equal(cancels, 0);
});

test("a press after the release that is let go before the latch leaves the reload to run out", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 59 });
  const endFlags: boolean[] = [];
  weapon.onReloadEnd = (finishedEarly) => endFlags.push(finishedEarly);

  spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.7 });
  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  weapon.update(makeInput(false, world), (shot) => shots.push(shot));
  weapon.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S }, (shot) => shots.push(shot));
  assert.equal(shots.length, 0);
  assert.deepEqual(endFlags, [false]);
  assert.equal(weapon.getAmmoSnapshot().mag, 30);
});

test("an empty magazine cannot cancel; a trigger held since before the reload does not end it", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 37, magazineCapacity: 2 });
  let guard = 0;
  // Tap out the first round, then hold the trigger through the last one so the
  // automatic reload starts with the trigger already down.
  weapon.update(makeInput(true, world), () => {});
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.1 });
  while (!weapon.getAmmoSnapshot().reloading && guard < 200) {
    weapon.update(makeInput(true, world), () => {});
    guard += 1;
  }
  assert.equal(weapon.getAmmoSnapshot().mag, 0);

  const shots: Ak47ShotEvent[] = [];
  weapon.update({ ...makeInput(true, world), deltaSeconds: 0.2 }, (shot) => shots.push(shot));
  assert.equal(shots.length, 0);
  assert.equal(weapon.getAmmoSnapshot().reloading, true, "no rounds, so no cancel even before the release");

  weapon.update({ ...makeInput(true, world), deltaSeconds: LATCH_S }, (shot) => shots.push(shot));
  assert.equal(shots.length, 0, "a held trigger is not a new press");
  assert.equal(weapon.getAmmoSnapshot().mag, 2);
  assert.equal(weapon.getAmmoSnapshot().reloading, true);

  weapon.update(makeInput(false, world));
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  assert.equal(shots.length, 1);
  assert.equal(weapon.getAmmoSnapshot().reloading, false);
  assert.equal(weapon.getAmmoSnapshot().mag, 1);
});

test("an empty-magazine press before the release is remembered and fires at the latch", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 61, magazineCapacity: 2 });
  let cancels = 0;
  const endFlags: boolean[] = [];
  weapon.onReloadCancel = () => { cancels += 1; };
  weapon.onReloadEnd = (finishedEarly) => endFlags.push(finishedEarly);
  let guard = 0;
  // Tap both rounds out and let go: the automatic reload starts with the trigger up.
  while (!weapon.getAmmoSnapshot().reloading && guard < 200) {
    weapon.update(makeInput(true, world), () => {});
    weapon.update({ ...makeInput(false, world), deltaSeconds: 0.1 });
    guard += 1;
  }
  assert.equal(weapon.getAmmoSnapshot().mag, 0);
  const startedAtS = weapon.getAmmoSnapshot().reloadT01 * AK47_RELOAD_DURATION_S;
  assert.ok(startedAtS < 0.25);

  // A fresh press early in the reload, well before the release, then held.
  const shots: Ak47ShotEvent[] = [];
  weapon.update({ ...makeInput(true, world), deltaSeconds: 0.25 - startedAtS }, (shot) => shots.push(shot));
  assert.ok(weapon.getAmmoSnapshot().reloadT01 * AK47_RELOAD_DURATION_S < RELEASE_S);
  assert.equal(shots.length, 0);
  assert.equal(cancels, 0, "nothing to cancel back to");
  assert.equal(weapon.getAmmoSnapshot().reloading, true);

  const beforeLatch = LATCH_S - weapon.getAmmoSnapshot().reloadT01 * AK47_RELOAD_DURATION_S;
  weapon.update({ ...makeInput(true, world), deltaSeconds: beforeLatch - 0.01 }, (shot) => shots.push(shot));
  assert.equal(shots.length, 0, "nothing fires before the latch");
  weapon.update({ ...makeInput(true, world), deltaSeconds: 0.02 }, (shot) => shots.push(shot));
  assert.equal(shots.length, 1, "the early press fires on the latch frame, as a press after the release would");
  assert.equal(weapon.getAmmoSnapshot().reloading, false);
  assert.equal(weapon.getAmmoSnapshot().mag, 1);
  assert.deepEqual(endFlags, [true]);
  assert.equal(cancels, 0);
});

test("the reload speed multiplier scales the duration and the latch", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 19 });
  const starts: number[] = [];
  weapon.onReloadStart = (duration) => starts.push(duration);
  weapon.setReloadSpeedMultiplier(1.35);

  const magBefore = spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  assert.equal(starts.length, 1);
  assert.ok(Math.abs(starts[0]! - AK47_RELOAD_DURATION_S / 1.35) < 1e-12);

  weapon.update({ ...makeInput(false, world), deltaSeconds: LATCH_S / 1.35 - 0.005 });
  assert.equal(weapon.getAmmoSnapshot().mag, magBefore, "no rounds before the scaled latch");
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.01 });
  assert.equal(weapon.getAmmoSnapshot().mag, 30, "rounds count at the scaled latch");
  assert.equal(weapon.getAmmoSnapshot().reloading, true);

  weapon.update({ ...makeInput(false, world), deltaSeconds: (AK47_RELOAD_DURATION_S - LATCH_S) / 1.35 });
  assert.equal(weapon.getAmmoSnapshot().reloading, false, "reload completes at the scaled duration");
  assert.equal(weapon.getAmmoSnapshot().mag, 30);
});

test("a speed change mid-reload keeps the speed the reload started with", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 43 });
  const starts: number[] = [];
  const endFlags: boolean[] = [];
  weapon.onReloadStart = (duration) => starts.push(duration);
  weapon.onReloadEnd = (finishedEarly) => endFlags.push(finishedEarly);
  weapon.setReloadSpeedMultiplier(1.35);

  const magBefore = spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  const scaledDuration = AK47_RELOAD_DURATION_S / 1.35;
  assert.ok(Math.abs(starts[0]! - scaledDuration) < 1e-12);

  // The rapid-reload buff expires 0.3 s into the buffed reload.
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.3 });
  weapon.setReloadSpeedMultiplier(1.0);
  const latchWall = LATCH_S / 1.35;
  weapon.update({ ...makeInput(false, world), deltaSeconds: latchWall - 0.3 - 0.005 });
  assert.equal(weapon.getAmmoSnapshot().mag, magBefore, "no rounds before the latch the audio was scheduled for");
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.01 });
  assert.equal(weapon.getAmmoSnapshot().mag, 30, "rounds count at the latch scheduled at reload start");
  weapon.update({ ...makeInput(false, world), deltaSeconds: scaledDuration - latchWall - 0.01 });
  assert.equal(weapon.getAmmoSnapshot().reloading, true);
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0.01 });
  assert.equal(weapon.getAmmoSnapshot().reloading, false, "ends at the duration reported to onReloadStart");
  assert.deepEqual(endFlags, [false]);

  // The next reload uses the new multiplier.
  spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  assert.equal(starts.length, 2);
  assert.equal(starts[1], AK47_RELOAD_DURATION_S);
});

test("a pre-release press with one round cancels, fires it, and starts a fresh reload", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 47, magazineCapacity: 2 });
  const events: string[] = [];
  weapon.onReloadStart = () => events.push("start");
  weapon.onReloadCancel = () => events.push("cancel");
  weapon.onReloadEnd = (finishedEarly) => events.push(finishedEarly ? "end-early" : "end");

  assert.equal(spendOneRound(weapon, world), 1);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: RELEASE_S - 0.1 });

  const shots: Ak47ShotEvent[] = [];
  weapon.update(makeInput(true, world), (shot) => shots.push(shot));
  const snapshot = weapon.getAmmoSnapshot();
  assert.equal(shots.length, 1);
  assert.equal(snapshot.mag, 0);
  assert.equal(snapshot.reloading, true, "the empty magazine starts a new reload on the same frame");
  assert.equal(snapshot.reloadT01, 0, "the viewmodel sees progress jump back while it is still blended in");
  assert.equal(snapshot.reloadSerial, 2, "the serial tells the viewmodel this is a new reload");
  assert.deepEqual(events, ["start", "cancel", "start"]);
});

test("reset mid-reload after the latch cancels and restores the profile ammo", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const weapon = new Ak47Weapon({ seed: 41, reserveStart: 40 });
  let cancels = 0;
  weapon.onReloadCancel = () => { cancels += 1; };

  spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: LATCH_S + 0.1 });
  assert.equal(weapon.getAmmoSnapshot().reserve, 39);

  weapon.reset();
  assert.equal(cancels, 1);
  assert.deepEqual(weapon.getAmmoSnapshot(), { mag: 30, reserve: 40, reloading: false, reloadT01: 0, reloadSerial: 1 });

  // A fresh reload after the reset counts its rounds once, at its own latch.
  spendOneRound(weapon, world);
  weapon.queueReload();
  weapon.update({ ...makeInput(false, world), deltaSeconds: 0 });
  weapon.update({ ...makeInput(false, world), deltaSeconds: AK47_RELOAD_DURATION_S });
  assert.equal(weapon.getAmmoSnapshot().mag, 30);
  assert.equal(weapon.getAmmoSnapshot().reserve, 39);
});

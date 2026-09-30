import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  AK47_RECOIL_HORIZONTAL_PATTERN_DEG,
  AK47_RECOIL_VERTICAL_PATTERN_DEG,
  Ak47FireController,
  type Ak47FireUpdateResult,
  type Ak47ShotEvent,
} from "./Ak47FireController";
import { WorldColliders } from "../sim/collision/WorldColliders";
import { RUN_SPEED_MPS } from "../sim/PlayerController";

const PLAYABLE_BOUNDARY = { x: -100, y: -100, w: 200, h: 200 };

function emptyWorld(): WorldColliders {
  return new WorldColliders([], PLAYABLE_BOUNDARY);
}

function walledWorld(): WorldColliders {
  return new WorldColliders(
    [
      {
        id: "wall_front",
        kind: "wall",
        min: { x: -10, y: 0, z: -12 },
        max: { x: 10, y: 6, z: -10 },
      },
    ],
    PLAYABLE_BOUNDARY,
  );
}

function fireOneShot(world: WorldColliders, forward: Vector3): Ak47ShotEvent[] {
  const controller = new Ak47FireController({ seed: 7 });
  const shots: Ak47ShotEvent[] = [];
  controller.update(
    {
      deltaSeconds: 1 / 60,
      fireHeld: true,
      shotBudget: 1,
      origin: new Vector3(0, 1.7, 0),
      forward,
      grounded: true,
      speedMps: 0,
      world,
    },
    (shot) => shots.push(shot),
  );
  return shots;
}

// Regression: enemy hit registration re-raycasts the shot from the shot event.
// If a bullet that reaches open sky reports no usable ray, every enemy standing
// in front of open sky (on a roof, up a ramp, anywhere the aim ray escapes the
// map) becomes immune to that shot.
test("a shot that hits no world geometry still reports a usable bullet ray", () => {
  const shots = fireOneShot(emptyWorld(), new Vector3(0, 0, -1));

  assert.equal(shots.length, 1);
  const shot = shots[0]!;
  assert.equal(shot.hit, false);
  assert.equal(shot.hitPoint, undefined);
  assert.ok(
    Number.isFinite(shot.travelDistance) && shot.travelDistance > 0,
    "a missed shot must still travel its full range so enemies along it can be hit",
  );
  const dirLength = Math.hypot(shot.direction.x, shot.direction.y, shot.direction.z);
  assert.ok(Math.abs(dirLength - 1) < 1e-6, "shot direction must be a unit vector");
});

test("a shot that hits world geometry reports the hit distance as its travel distance", () => {
  const shots = fireOneShot(walledWorld(), new Vector3(0, 0, -1));

  assert.equal(shots.length, 1);
  const shot = shots[0]!;
  assert.equal(shot.hit, true);
  assert.ok(shot.hitPoint, "a world hit must report a hit point");
  const hitPoint = shot.hitPoint!;
  const origin = { x: 0, y: 1.7, z: 0 };
  const actualDistance = Math.hypot(
    hitPoint.x - origin.x,
    hitPoint.y - origin.y,
    hitPoint.z - origin.z,
  );
  assert.ok(
    Math.abs(shot.travelDistance - actualDistance) < 1e-3,
    `travelDistance ${shot.travelDistance} should match the hit point distance ${actualDistance}`,
  );
});

// Regression: the reported direction must be the bullet's own spread-applied ray,
// not raw camera forward. If consumers re-raycast with camera forward instead,
// spread and bloom stop affecting enemy hit registration entirely and the weapon
// becomes pinpoint-accurate against enemies regardless of spray.
test("reported shot direction tracks the spread ray, not raw camera forward", () => {
  const controller = new Ak47FireController({ seed: 11 });
  const forward = new Vector3(0, 0, -1);
  const shots: Ak47ShotEvent[] = [];
  const world = emptyWorld();

  // Hold fire long enough to build bloom across a burst.
  for (let frame = 0; frame < 60; frame += 1) {
    controller.update(
      {
        deltaSeconds: 1 / 60,
        fireHeld: true,
        origin: new Vector3(0, 1.7, 0),
        forward,
        grounded: true,
        speedMps: 0,
        world,
      },
      (shot) => shots.push(shot),
    );
  }

  assert.ok(shots.length > 4, `expected a burst of shots, got ${shots.length}`);
  for (const shot of shots) {
    const dirLength = Math.hypot(shot.direction.x, shot.direction.y, shot.direction.z);
    assert.ok(Math.abs(dirLength - 1) < 1e-6, "every shot direction must be a unit vector");
  }
  const deviated = shots.some(
    (shot) =>
      Math.abs(shot.direction.x - forward.x) > 1e-9
      || Math.abs(shot.direction.y - forward.y) > 1e-9
      || Math.abs(shot.direction.z - forward.z) > 1e-9,
  );
  assert.ok(deviated, "spread must make at least one shot deviate from camera forward");
});

test("a held trigger fires at 600 RPM by default", () => {
  const controller = new Ak47FireController({ seed: 7 });
  const world = emptyWorld();
  let shots = 0;
  const fps = 120;
  // Frames spanning just under one second after the first shot.
  for (let frame = 0; frame < fps; frame += 1) {
    const result = controller.update({
      deltaSeconds: 1 / fps,
      fireHeld: true,
      origin: new Vector3(0, 1.7, 0),
      forward: new Vector3(0, 0, -1),
      grounded: true,
      speedMps: 0,
      world,
    });
    shots += result.shotsFired;
  }
  assert.equal(shots, 10);
});

// ---------------------------------------------------------------------------
// Shared driver for the cadence, feel-contract and tuning tests below.

type FrameOptions = { dt: number; held: boolean; budget?: number; speed?: number; grounded?: boolean };

class Driver {
  readonly controller: Ak47FireController;
  readonly world = emptyWorld();
  readonly shots: Array<Ak47ShotEvent & { timeS: number }> = [];
  readonly results: Ak47FireUpdateResult[] = [];
  timeS = 0;

  constructor(seed = 7) {
    this.controller = new Ak47FireController({ seed });
  }

  frame({ dt, held, budget, speed = 0, grounded = true }: FrameOptions): Ak47FireUpdateResult {
    this.timeS += dt;
    const result = this.controller.update(
      {
        deltaSeconds: dt,
        fireHeld: held,
        ...(budget === undefined ? {} : { shotBudget: budget }),
        origin: new Vector3(0, 1.7, 0),
        forward: new Vector3(0, 0, -1),
        grounded,
        speedMps: speed,
        world: this.world,
      },
      (shot) => this.shots.push({ ...shot, timeS: this.timeS }),
    );
    this.results.push(result);
    return result;
  }

  run(seconds: number, fps: number, held: (timeS: number, frame: number) => boolean, speed = 0): void {
    const frames = Math.round(seconds * fps);
    for (let frame = 0; frame < frames; frame += 1) {
      this.frame({ dt: 1 / fps, held: held(this.timeS, frame), speed });
    }
  }
}

// One set of shot facts for audio, viewmodel, camera punch and flash.
test("shot events carry isFirstShot, burstIndex and triggerReleased for burst, pause, tap", () => {
  const d = new Driver();
  const dt = 1 / 60;
  // Hold for a 5-round burst (rounds at frames 0, 6, 12, 18, 24).
  for (let frame = 0; frame < 25; frame += 1) d.frame({ dt, held: true });
  assert.equal(d.shots.length, 5);
  const releaseFrame = d.frame({ dt, held: false });
  assert.equal(releaseFrame.triggerReleased, true, "releasing after 5 rounds is a spray end");
  assert.equal(releaseFrame.burstLength, 5);
  assert.equal(d.frame({ dt, held: false }).triggerReleased, false, "the release is reported once");

  // 0.35 s pause: longer than the 0.3 s spray reset.
  for (let frame = 0; frame < 21; frame += 1) d.frame({ dt, held: false });
  // Single tap.
  d.frame({ dt, held: true });
  const tapRelease = d.frame({ dt, held: false });
  assert.equal(tapRelease.triggerReleased, false, "a one-round tap is not a burst release");
  assert.equal(tapRelease.burstLength, 1);

  assert.equal(d.shots.length, 6);
  assert.deepEqual(d.shots.map((shot) => shot.isFirstShot), [true, false, false, false, false, true]);
  assert.deepEqual(d.shots.map((shot) => shot.burstIndex), [0, 1, 2, 3, 4, 0]);
  for (const shot of d.shots) {
    assert.equal(shot.shotsThisFrame, 1);
    assert.ok(shot.lateS >= 0 && shot.lateS < 1e-6, `60 fps lands every round on its cadence time (lateS ${shot.lateS})`);
  }
});

test("patternYawDeg is the horizontal kick actually applied to the view", () => {
  const d = new Driver(19);
  const perShotYaw: number[] = [];
  for (let frame = 0; frame < 200 && d.shots.length < 30; frame += 1) {
    const result = d.frame({ dt: 1 / 60, held: true });
    if (result.shotsFired === 1) {
      perShotYaw.push(result.lastShotRecoilYawDeg);
      assert.ok(Math.abs(result.recoilYawRad - (result.lastShotRecoilYawDeg * Math.PI) / 180) < 1e-12);
    }
  }
  assert.equal(d.shots.length, 30);
  assert.deepEqual(d.shots.map((shot) => shot.patternYawDeg), perShotYaw);
});

test("a hitch frame reports lateS and shotsThisFrame on every round it fires", () => {
  const d = new Driver();
  d.frame({ dt: 1 / 60, held: true });
  const hitch = d.frame({ dt: 0.25, held: true });
  assert.equal(hitch.shotsFired, 2);
  const [a, b] = d.shots.slice(1);
  assert.equal(a!.shotsThisFrame, 2);
  assert.equal(b!.shotsThisFrame, 2);
  // Due at 0.1 s and 0.2 s after the first round; the frame ended at 1/60 + 0.25 s.
  assert.ok(Math.abs(a!.lateS - (0.25 + 1 / 60 - 0.1 - 1 / 60)) < 1e-9, `lateS ${a!.lateS}`);
  assert.ok(Math.abs(b!.lateS - (0.25 - 0.2)) < 1e-9, `lateS ${b!.lateS}`);
  assert.deepEqual([a!.burstIndex, b!.burstIndex], [1, 2]);
  // The cadence stays on the 0.1 s grid after the hitch: the next round is due at 0.3 s.
  const next = d.frame({ dt: 0.05, held: true });
  assert.equal(next.shotsFired, 1);
  assert.ok(d.shots.at(-1)!.lateS < 1e-9);
});

test("cancelTrigger never reports a release and drops the burst", () => {
  const d = new Driver();
  for (let frame = 0; frame < 20; frame += 1) d.frame({ dt: 1 / 60, held: true });
  d.controller.cancelTrigger();
  const after = d.frame({ dt: 1 / 60, held: false });
  assert.equal(after.triggerReleased, false);
  assert.equal(after.burstLength, 0);
});

// Tap-fire cadence with a one-round input buffer.
test("a click during the cooldown cannot beat the fire rate but is never eaten", () => {
  const d = new Driver();
  const dt = 1 / 60;
  assert.equal(d.frame({ dt, held: true }).shotsFired, 1, "the first press after idle fires at once");
  d.frame({ dt, held: false });
  // Re-press 33 ms after the round, then release at once.
  assert.equal(d.frame({ dt, held: true }).shotsFired, 0, "a press inside the cooldown must wait for the gate");
  let fired = 0;
  let framesToShot = 0;
  for (let frame = 0; frame < 30 && fired === 0; frame += 1) {
    fired = d.frame({ dt, held: false }).shotsFired;
    framesToShot = frame + 1;
  }
  assert.equal(fired, 1, "the buffered click fires after the trigger is released");
  assert.equal(d.shots.length, 2);
  assert.ok(Math.abs(d.shots[1]!.timeS - d.shots[0]!.timeS - 0.1) < 1e-9, "it fires exactly when the gate opens");
  assert.equal(framesToShot, 4, "press at 3/60 s, gate at 7/60 s");
  for (let frame = 0; frame < 30; frame += 1) d.frame({ dt, held: false });
  assert.equal(d.shots.length, 2, "exactly one round is buffered");
});

test("several clicks inside one cooldown buffer exactly one round", () => {
  const d = new Driver();
  const dt = 1 / 120;
  d.frame({ dt, held: true });
  d.frame({ dt, held: false });
  for (let i = 0; i < 4; i += 1) {
    d.frame({ dt, held: true });
    d.frame({ dt, held: false });
  }
  for (let frame = 0; frame < 60; frame += 1) d.frame({ dt, held: false });
  assert.equal(d.shots.length, 2);
});

test("a buffered round is dropped by cancelTrigger and by an empty shot budget", () => {
  const cancelled = new Driver();
  cancelled.frame({ dt: 1 / 60, held: true });
  cancelled.frame({ dt: 1 / 60, held: false });
  cancelled.frame({ dt: 1 / 60, held: true });
  cancelled.controller.cancelTrigger();
  for (let frame = 0; frame < 30; frame += 1) cancelled.frame({ dt: 1 / 60, held: false });
  assert.equal(cancelled.shots.length, 1);

  const empty = new Driver();
  empty.frame({ dt: 1 / 60, held: true });
  empty.frame({ dt: 1 / 60, held: false });
  empty.frame({ dt: 1 / 60, held: true });
  for (let frame = 0; frame < 10; frame += 1) empty.frame({ dt: 1 / 60, held: false, budget: 0 });
  for (let frame = 0; frame < 10; frame += 1) empty.frame({ dt: 1 / 60, held: false });
  assert.equal(empty.shots.length, 1, "a round buffered with no ammo to spend must not fire later");
});

test("click-spam at 11-20 Hz holds 600 RPM, never beats the cadence and blooms like held fire", () => {
  for (const fps of [30, 60, 144]) {
    const held = new Driver();
    held.run(3, fps, () => true);
    const heldBloomAt10 = held.results.filter((r) => r.shotsFired > 0)[9]!.bloomDeg;
    for (const hz of [11, 13, 15, 20]) {
      const d = new Driver();
      d.run(3, fps, (t) => ((t * hz) % 1) < 0.5);
      const times = d.shots.map((shot) => shot.timeS);
      const gaps = times.slice(1).map((t, i) => t - times[i]!);
      const rpm = ((times.length - 1) / (times.at(-1)! - times[0]!)) * 60;
      const label = `${hz} Hz at ${fps} fps`;
      assert.ok(Math.min(...gaps) >= 0.097 - 1e-9, `${label}: min gap ${Math.min(...gaps)}`);
      assert.ok(rpm >= 590 && rpm <= 600 + 1e-6, `${label}: ${rpm} RPM`);
      const bloomAt10 = d.results.filter((r) => r.shotsFired > 0)[9]!.bloomDeg;
      assert.ok(Math.abs(bloomAt10 - heldBloomAt10) <= 0.05, `${label}: bloom ${bloomAt10} vs held ${heldBloomAt10}`);
    }
  }
});

test("clicks slower than the fire rate each fire one round", () => {
  for (const fps of [30, 60, 144]) {
    for (const hz of [4, 6, 8]) {
      const d = new Driver();
      let presses = 0;
      let last = false;
      // 40 ms presses: shorter than one fire interval, like a real click.
      d.run(3, fps, (t) => {
        const held = ((t * hz) % 1) < 0.04 * hz;
        if (held && !last) presses += 1;
        last = held;
        return held;
      });
      assert.equal(d.shots.length, presses, `${hz} Hz at ${fps} fps`);
    }
  }
});

test("toggling the trigger every frame fires no more than the held rate", () => {
  for (const fps of [30, 60, 144]) {
    const d = new Driver();
    d.run(1, fps, (_t, frame) => frame % 2 === 0);
    assert.ok(d.shots.length <= 10, `${fps} fps: ${d.shots.length} rounds in 1 s`);
  }
});

test("bloom waits 0.15 s after the last round, then recovers at the same rate at any frame rate", () => {
  const bloomAfter = (fps: number, idleS: number): number => {
    const d = new Driver();
    d.run(19 / 60, 60, () => true); // rounds at frames 0, 6, 12, 18; the last frame fires
    const frames = Math.round(idleS * fps);
    let result = d.results.at(-1)!;
    for (let frame = 0; frame < frames; frame += 1) result = d.frame({ dt: idleS / frames, held: false });
    return result.bloomDeg;
  };
  const peak = bloomAfter(60, 0);
  assert.ok(Math.abs(peak - 4 * 0.06) < 1e-9, `4 rounds bloom to ${peak}`);
  // The last round fired on the last held frame; 0.14 s later nothing has recovered.
  assert.equal(bloomAfter(60, 0.14), peak);
  const reference = bloomAfter(1000, 0.2);
  assert.ok(reference < peak, "bloom recovers once the delay has passed");
  for (const fps of [30, 60, 144]) {
    assert.ok(Math.abs(bloomAfter(fps, 0.2) - reference) < 1e-9, `${fps} fps`);
  }
});

// The aim-climb shape, raised to 1.25x after the playtest asked for a little more recoil.
test("the aim-climb pattern is the base shape at 1.25x with the horizontal sway at 0.75x", () => {
  const vertical = [
    0.30, 0.33, 0.36, 0.39, 0.42, 0.44, 0.46, 0.47, 0.47, 0.46, 0.45, 0.44, 0.43, 0.42, 0.41,
    0.40, 0.39, 0.38, 0.37, 0.36, 0.35, 0.34, 0.33, 0.33, 0.32, 0.31, 0.31, 0.30, 0.30, 0.29,
  ];
  assert.equal(AK47_RECOIL_VERTICAL_PATTERN_DEG.length, 30);
  AK47_RECOIL_VERTICAL_PATTERN_DEG.forEach((value, i) => {
    assert.ok(Math.abs(value - vertical[i]! * 1.25) < 1e-12, `shot ${i + 1}: ${value}`);
  });
  const shape = [
    0.00, 0.04, -0.06, -0.12, -0.16, -0.20, -0.18, -0.10, 0.02, 0.14, 0.20, 0.18, 0.10, -0.02, -0.14,
    -0.18, -0.12, -0.04, 0.06, 0.14, 0.16, 0.10, 0.02, -0.06, -0.08, -0.04, 0.06, 0.10, 0.06, 0.00,
  ];
  assert.equal(AK47_RECOIL_HORIZONTAL_PATTERN_DEG.length, 30);
  AK47_RECOIL_HORIZONTAL_PATTERN_DEG.forEach((value, i) => {
    assert.ok(Math.abs(value - shape[i]! * 0.75) < 1e-12, `shot ${i + 1}: ${value}`);
  });
  const sum = AK47_RECOIL_VERTICAL_PATTERN_DEG.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 14.1625) < 1e-9, `table sums to ${sum}`);
});

test("a held 30-round magazine climbs 14.16 deg with 1.24 deg before round 4 and 3.38 before round 8", () => {
  for (const seed of [7, 11, 23]) {
    const d = new Driver(seed);
    const cumulative: number[] = [];
    let pitch = 0;
    for (let frame = 0; frame < 400 && cumulative.length < 30; frame += 1) {
      const result = d.frame({ dt: 1 / 60, held: true });
      if (result.shotsFired > 0) {
        pitch += (result.recoilPitchRad * 180) / Math.PI;
        cumulative.push(pitch);
      }
    }
    assert.equal(cumulative.length, 30);
    assert.ok(Math.abs(cumulative[29]! - 14.1625) <= 0.4, `seed ${seed}: 30 rounds climbed ${cumulative[29]}`);
    // Jitter is at most +-0.022 deg per round.
    assert.ok(Math.abs(cumulative[2]! - 1.2375) <= 3 * 0.022 + 1e-9, `before round 4: ${cumulative[2]}`);
    assert.ok(Math.abs(cumulative[6]! - 3.375) <= 7 * 0.022 + 1e-9, `before round 8: ${cumulative[6]}`);
  }
});

test("accumulated aim kick is capped at 15 deg pitch and 3 deg yaw", () => {
  // Full-speed movement adds 0.055 deg per round, pushing 30 rounds past 15 deg.
  const d = new Driver();
  let pitch = 0;
  let maxAbsYaw = 0;
  let yaw = 0;
  for (let frame = 0; frame < 400 && d.shots.length < 30; frame += 1) {
    const result = d.frame({ dt: 1 / 60, held: true, speed: RUN_SPEED_MPS });
    pitch += (result.recoilPitchRad * 180) / Math.PI;
    yaw += (result.recoilYawRad * 180) / Math.PI;
    maxAbsYaw = Math.max(maxAbsYaw, Math.abs(yaw));
  }
  assert.ok(Math.abs(pitch - 15) < 1e-9, `moving spray climbed ${pitch}`);
  assert.ok(maxAbsYaw <= 3 + 1e-9, `yaw reached ${maxAbsYaw}`);
});

// D3: softer movement and air spread and bloom.
test("moving, airborne and bloom spread use the D3 values", () => {
  const spreadAt = (speed: number, grounded: boolean): number =>
    new Driver().frame({ dt: 1 / 60, held: false, speed, grounded }).spreadDeg;
  assert.ok(Math.abs(spreadAt(0, true) - 0.2 * 0.4) < 1e-12, "clean first shot keeps its accuracy bonus");
  assert.ok(Math.abs(spreadAt(0.1600001, true) - 0.6) < 1e-6);
  assert.ok(Math.abs(spreadAt(RUN_SPEED_MPS, true) - 1.1) < 1e-12);
  assert.ok(Math.abs(spreadAt(0, false) - 2.5) < 1e-12);
  assert.ok(Math.abs(spreadAt(RUN_SPEED_MPS, false) - 3.5) < 1e-12);

  const d = new Driver();
  const blooms: number[] = [];
  for (let frame = 0; frame < 200 && blooms.length < 15; frame += 1) {
    const result = d.frame({ dt: 1 / 60, held: true });
    if (result.shotsFired > 0) blooms.push(result.bloomDeg);
  }
  assert.ok(Math.abs(blooms[0]! - 0.06) < 1e-12);
  assert.ok(Math.abs(blooms[4]! - 0.3) < 1e-12);
  assert.equal(blooms[11], 0.7, "bloom caps at 0.7 deg");
  assert.equal(blooms[14], 0.7);
});

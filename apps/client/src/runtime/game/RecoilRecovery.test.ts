import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  RECOIL_RECOVERY_DELAY_S,
  RECOIL_RECOVERY_OMEGA,
  RecoilRecovery,
} from "./RecoilRecovery";
import { Ak47FireController } from "../weapons/Ak47FireController";
import { WorldColliders } from "../sim/collision/WorldColliders";

const DEG = Math.PI / 180;
const MAX_PITCH = Math.PI / 2 - 0.001;
const MIN_PITCH = -MAX_PITCH;
const FIRE_INTERVAL_S = 0.1;

/**
 * Mirrors how Game applies recoil and recovery: kicks and input are recorded
 * as actually applied after the pitch clamp, and each recovery step is added
 * to the (clamped) look angles.
 */
class LookHarness {
  yaw = 0;
  pitch = 0;
  readonly recovery = new RecoilRecovery();

  constructor(pitch = 0) {
    this.pitch = pitch;
  }

  private set(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch));
  }

  look(pitchDelta: number, yawDelta = 0): void {
    const y0 = this.yaw;
    const p0 = this.pitch;
    this.set(this.yaw + yawDelta, this.pitch + pitchDelta);
    this.recovery.consumeLookInput(this.pitch - p0, this.yaw - y0);
  }

  frame(dt: number, shot: { pitch: number; yaw: number } | null): void {
    if (shot) {
      const y0 = this.yaw;
      const p0 = this.pitch;
      this.set(this.yaw + shot.yaw, this.pitch + shot.pitch);
      this.recovery.addShot(this.pitch - p0, this.yaw - y0);
    }
    const step = this.recovery.step(dt);
    if (step.pitchRad !== 0 || step.yawRad !== 0) {
      this.set(this.yaw + step.yawRad, this.pitch + step.pitchRad);
    }
  }
}

/** Kick for shot i: always up, alternating sideways. */
function kick(i: number): { pitch: number; yaw: number } {
  return { pitch: 0.84 * DEG, yaw: (i % 2 === 0 ? 0.12 : -0.2) * DEG };
}

/**
 * Holds the trigger for `shots` rounds at 600 RPM on an exact frame grid (the
 * last shot lands on the final frame), then idles for `idleS`. `fps` must be a
 * multiple of 10 so shots fall on frame boundaries.
 */
function spray(
  harness: LookHarness,
  fps: number,
  shots: number,
  idleS: number,
  onFrame?: (h: LookHarness) => void,
): LookHarness {
  const framesPerShot = Math.round(FIRE_INTERVAL_S * fps);
  assert.equal(framesPerShot, FIRE_INTERVAL_S * fps, "fps must place shots on frames");
  const sprayFrames = shots > 0 ? (shots - 1) * framesPerShot + 1 : 0;
  const idleFrames = Math.round(idleS * fps);
  for (let frame = 0; frame < sprayFrames + idleFrames; frame += 1) {
    const shotIndex = frame / framesPerShot;
    const shot = frame < sprayFrames && Number.isInteger(shotIndex) ? kick(shotIndex) : null;
    harness.frame(1 / fps, shot);
    onFrame?.(harness);
  }
  return harness;
}

test("the view climbs through a 600 RPM spray and nothing recovers between shots", () => {
  const harness = new LookHarness();
  let lastPitch = 0;
  let sawRecovery = false;
  spray(harness, 60, 16, 0, (h) => {
    if (h.pitch < lastPitch - 1e-12) sawRecovery = true;
    lastPitch = h.pitch;
  });
  assert.equal(sawRecovery, false, "recovery must not run while shots are 0.1 s apart");
  assert.ok(Math.abs(harness.pitch - 16 * 0.84 * DEG) < 1e-9, `climbed ${harness.pitch / DEG} deg`);
  assert.ok(Math.abs(harness.recovery.getPitchOffsetRad() - harness.pitch) < 1e-12);
});

test("after the spray the offset waits for the delay, then returns smoothly to zero", () => {
  const harness = spray(new LookHarness(), 240, 16, 0);
  const peak = harness.pitch;
  const peakYaw = harness.yaw;
  const dt = 1 / 240;
  let t = 0;
  let previous = peak;
  let pitchAt95ms = Number.NaN;
  let pitchAt115ms = Number.NaN;
  let pitchAt300ms = Number.NaN;
  let pitchAt370ms = Number.NaN;
  while (t < 1.2) {
    harness.frame(dt, null);
    t += dt;
    assert.ok(harness.pitch <= previous + 1e-12, "recovery must be monotone with no overshoot");
    assert.ok(harness.pitch >= -1e-12, "recovery must never pull below the pre-spray aim");
    previous = harness.pitch;
    // The shot frame already advanced the timer by one dt.
    if (t + dt <= RECOIL_RECOVERY_DELAY_S - 1e-9) assert.equal(harness.pitch, peak, "nothing recovers before the delay");
    if (Number.isNaN(pitchAt95ms) && t >= RECOIL_RECOVERY_DELAY_S + 0.095) pitchAt95ms = harness.pitch;
    if (Number.isNaN(pitchAt115ms) && t >= RECOIL_RECOVERY_DELAY_S + 0.115) pitchAt115ms = harness.pitch;
    if (Number.isNaN(pitchAt300ms) && t >= RECOIL_RECOVERY_DELAY_S + 0.3) pitchAt300ms = harness.pitch;
    if (Number.isNaN(pitchAt370ms) && t >= RECOIL_RECOVERY_DELAY_S + 0.37) pitchAt370ms = harness.pitch;
  }
  // Omega 16: half the kick is back ~0.105 s after the delay, 95% by
  // ~0.297 s and 98% by ~0.364 s.
  assert.ok(pitchAt95ms > 0.5 * peak, `half recovery must not arrive before ~0.105 s, was ${pitchAt95ms / peak} at 0.095 s`);
  assert.ok(pitchAt115ms < 0.5 * peak, `half recovery should arrive by ~0.105 s, was ${pitchAt115ms / peak} at 0.115 s`);
  assert.ok(pitchAt300ms < 0.05 * peak, `5% band should be reached ~0.30 s after the delay, was ${pitchAt300ms / peak}`);
  assert.ok(pitchAt370ms < 0.02 * peak, `2% band should be reached ~0.37 s after the delay, was ${pitchAt370ms / peak}`);
  assert.equal(harness.recovery.getPitchOffsetRad(), 0);
  assert.equal(harness.recovery.getYawOffsetRad(), 0);
  assert.ok(Math.abs(harness.pitch) < 1e-9, `pitch left at ${harness.pitch}`);
  assert.ok(Math.abs(harness.yaw) < 1e-9, `yaw left at ${harness.yaw} (peak ${peakYaw})`);
});

test("recovery is frame-rate independent", () => {
  const settleAt = (dts: readonly number[]): { pitch: number; yaw: number } => {
    const recovery = new RecoilRecovery();
    recovery.addShot(9 * DEG, -1.5 * DEG);
    for (const dt of dts) recovery.step(dt);
    return { pitch: recovery.getPitchOffsetRad(), yaw: recovery.getYawOffsetRad() };
  };
  const frames = (dt: number, total: number): number[] => {
    const count = Math.round(total / dt);
    return Array.from({ length: count }, () => total / count);
  };
  for (const total of [0.1, 0.2, 0.3, 0.45]) {
    const reference = settleAt([total]);
    const jittered: number[] = [];
    for (let t = 0, i = 0; t < total - 1e-12; i += 1) {
      const dt = Math.min(total - t, [1 / 144, 1 / 29, 0.004, 1 / 61][i % 4]!);
      jittered.push(dt);
      t += dt;
    }
    for (const dts of [frames(1 / 30, total), frames(1 / 60, total), frames(1 / 144, total), frames(1 / 240, total), jittered]) {
      const sample = settleAt(dts);
      assert.ok(Math.abs(sample.pitch - reference.pitch) < 1e-12, `at ${total}s: ${sample.pitch} vs ${reference.pitch}`);
      assert.ok(Math.abs(sample.yaw - reference.yaw) < 1e-12);
    }
  }
  assert.equal(settleAt([RECOIL_RECOVERY_DELAY_S]).pitch, 9 * DEG, "nothing recovers inside the delay");
});

test("pulling down the full spray leaves nothing to recover and is never over-corrected", () => {
  const harness = new LookHarness();
  spray(harness, 60, 12, 0, (h) => {
    // Perfect compensation: pull down whatever the view has climbed.
    if (h.pitch > 0) h.look(-h.pitch);
  });
  assert.ok(Math.abs(harness.pitch) < 1e-12);
  assert.equal(harness.recovery.getPitchOffsetRad(), 0);
  spray(harness, 60, 1, 2.0);
  // One more shot then a full recovery must return exactly to the level aim.
  assert.ok(Math.abs(harness.pitch) < 1e-9, `over-corrected to ${harness.pitch / DEG} deg`);
});

test("partial compensation recovers only the remainder; aiming further up is kept", () => {
  const partial = spray(new LookHarness(), 60, 10, 0);
  const climbed = partial.pitch;
  partial.look(-0.4 * climbed);
  assert.ok(Math.abs(partial.recovery.getPitchOffsetRad() - 0.6 * climbed) < 1e-12);
  spray(partial, 60, 0, 2.0);
  assert.ok(Math.abs(partial.pitch) < 1e-9, "returns to the pre-spray aim, not below it");

  const upward = spray(new LookHarness(), 60, 10, 0);
  upward.look(2 * DEG);
  spray(upward, 60, 0, 2.0);
  assert.ok(Math.abs(upward.pitch - 2 * DEG) < 1e-9, "the player's own upward aim must survive recovery");
});

test("pitch clamp interactions never accumulate drift", () => {
  // Start close to the upper clamp: most of each spray's kick is clipped.
  const start = MAX_PITCH - 3 * DEG;
  const harness = new LookHarness(start);
  for (let cycle = 0; cycle < 5; cycle += 1) {
    spray(harness, 60, 16, 0);
    assert.ok(harness.pitch <= MAX_PITCH);
    assert.ok(
      Math.abs(harness.recovery.getPitchOffsetRad() - (harness.pitch - start)) < 1e-9,
      "only the kick that survived the clamp may be recorded",
    );
    spray(harness, 60, 0, 2.0);
    assert.ok(Math.abs(harness.pitch - start) < 1e-9, `cycle ${cycle}: drifted to ${(harness.pitch - start) / DEG} deg`);
  }

  // Near the lower clamp, pull-down input lost to the clamp cancels nothing.
  const low = new LookHarness(MIN_PITCH + 0.5 * DEG);
  spray(low, 60, 4, 0);
  const offset = low.recovery.getPitchOffsetRad();
  low.look(-offset - 10 * DEG);
  assert.equal(low.pitch, MIN_PITCH);
  assert.equal(low.recovery.getPitchOffsetRad(), 0);
  spray(low, 60, 0, 2.0);
  assert.equal(low.pitch, MIN_PITCH, "no recovery may push the view back after a full pull-down");
});

test("reset drops pending recovery and the result is deterministic", () => {
  const a = spray(new LookHarness(), 60, 8, 0.25);
  const b = spray(new LookHarness(), 60, 8, 0.25);
  assert.equal(a.pitch, b.pitch);
  assert.equal(a.yaw, b.yaw);

  const r = spray(new LookHarness(), 60, 8, 0);
  r.recovery.reset();
  const pitch = r.pitch;
  spray(r, 60, 0, 2.0);
  assert.equal(r.pitch, pitch, "a reset offset must not move the view");
});

test("recovery omega is 16 rad/s and the delay is unchanged", () => {
  assert.equal(RECOIL_RECOVERY_OMEGA, 16);
  assert.equal(RECOIL_RECOVERY_DELAY_S, 0.14);
});

// Driven by the real fire-controller cadence (frame-quantised at
// 30/60/144 fps, so shot gaps are 97-104 ms rather than exactly 0.1 s), a held
// 20-round spray must never recover between shots.
test("a held 20-round spray from the fire controller never recovers between shots at 30/60/144 fps", () => {
  const world = new WorldColliders([], { x: -100, y: -100, w: 200, h: 200 });
  for (const fps of [30, 60, 144]) {
    const controller = new Ak47FireController({ seed: 7 });
    const harness = new LookHarness();
    const dt = 1 / fps;
    let shots = 0;
    let lastPitch = 0;
    let sawRecovery = false;
    for (let frame = 0; frame < fps * 3 && shots < 20; frame += 1) {
      const result = controller.update({
        deltaSeconds: dt,
        fireHeld: true,
        shotBudget: 20 - shots,
        origin: new Vector3(0, 1.7, 0),
        forward: new Vector3(0, 0, -1),
        grounded: true,
        speedMps: 0,
        world,
      });
      shots += result.shotsFired;
      harness.frame(dt, result.shotsFired > 0 ? { pitch: result.recoilPitchRad, yaw: result.recoilYawRad } : null);
      if (harness.pitch < lastPitch - 1e-12) sawRecovery = true;
      lastPitch = harness.pitch;
    }
    assert.equal(shots, 20, `${fps} fps`);
    assert.equal(sawRecovery, false, `${fps} fps: the view recovered between shots of a held spray`);
    assert.ok(Math.abs(harness.recovery.getPitchOffsetRad() - harness.pitch) < 1e-12, `${fps} fps: offset must equal the climb`);
  }
});

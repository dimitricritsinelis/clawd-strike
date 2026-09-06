import assert from "node:assert/strict";
import test from "node:test";
import { Ak47Motion } from "./Ak47Motion";

test("one shot has a short shoulder kick, limited muzzle rise, and little rebound", () => {
  const motion = new Ak47Motion();
  motion.shot();
  let peakBack = 0, peakPitch = 0, rebound = 0;
  for (let i = 0; i < 720; i++) {
    motion.update(1 / 720, 0, true, 0, 0);
    peakBack = Math.max(peakBack, motion.back.value);
    peakPitch = Math.max(peakPitch, motion.pitch.value);
    rebound = Math.min(rebound, motion.pitch.value);
  }
  assert.ok(peakBack > .012 && peakBack < .014, "12–14 mm shoulder kick");
  assert.ok(peakPitch > .024 && peakPitch < .030, "1.4–1.7 degrees muzzle rise");
  assert.ok(rebound > -.001, "less than 0.06 degrees rebound");
  assert.ok(Math.abs(motion.back.value) < .00001);
  assert.ok(Math.abs(motion.pitch.value) < .00001);
});

test("recoil and constant look speed agree at 30, 60, and 144 FPS", () => {
  const poses = [30, 60, 144].map((fps) => {
    const motion = new Ak47Motion();
    motion.shot();
    for (let frame = 0; frame < fps / 2; frame++) motion.update(1 / fps, 0, true, .8, -.4);
    return [motion.back.value, motion.pitch.value, motion.lookYaw.value, motion.lookPitch.value];
  });
  for (const pose of poses.slice(1)) {
    pose.forEach((value, i) => assert.ok(Math.abs(value - poses[0]![i]!) < 1e-10));
  }
});

test("sustained fire stays bounded and a paused frame changes nothing", () => {
  const motion = new Ak47Motion();
  for (let frame = 0; frame < 360; frame++) {
    if (frame % 6 === 0) motion.shot();
    motion.update(1 / 60, 5, true, 0, 0);
    assert.ok(Math.abs(motion.back.value) < .025);
    assert.ok(Math.abs(motion.pitch.value) < .05);
  }
  const snapshot = JSON.stringify(motion);
  motion.update(0, 0, false, 3, 3);
  assert.equal(JSON.stringify(motion), snapshot);
});

test("landing and stop transitions settle; reset restores deterministic shots", () => {
  const motion = new Ak47Motion();
  motion.update(.02, 4, false, 0, 0);
  motion.update(.02, 4, true, 0, 0);
  assert.ok(motion.landing.value < 0);
  for (let frame = 0; frame < 180; frame++) motion.update(1 / 60, 0, true, 0, 0);
  assert.ok(Math.abs(motion.landing.value) < .00001);
  assert.ok(Math.abs(motion.movement.value) < .00001);
  motion.reset();
  motion.shot();
  const first = [motion.yaw.velocity, motion.roll.velocity];
  motion.reset();
  motion.shot();
  assert.deepEqual([motion.yaw.velocity, motion.roll.velocity], first);
});

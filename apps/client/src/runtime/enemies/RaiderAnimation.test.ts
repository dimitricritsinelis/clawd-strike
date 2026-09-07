import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { RaiderMotion } from "./RaiderAnimation";

test("raider footsteps follow collision-resolved distance and stop against a wall", () => {
  const motion = new RaiderMotion();
  const position = new Vector3();
  motion.update(position, 0, 1 / 60, true);
  for (let frame = 0; frame < 60; frame++) {
    position.z -= 1.1 / 60;
    motion.update(position, 0, 1 / 60, true);
  }
  assert.ok(Math.abs(motion.phase - 1.1 / 1.35) < 1e-10);
  assert.ok(motion.moveWeight > .99);
  assert.equal(motion.forward, 1);
  const phase = motion.phase;
  for (let frame = 0; frame < 30; frame++) motion.update(position, 0, 1 / 60, true);
  assert.equal(motion.phase, phase);
  assert.equal(motion.moving, false);
  assert.ok(motion.moveWeight < .0001);
});

test("raider direction follows movement relative to aim, including diagonal stride", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const [forward, right] of [[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]) {
      const motion = new RaiderMotion();
      motion.update(new Vector3(), yaw, .1, true);
      const p = new Vector3(
        (-Math.sin(yaw) * forward! + Math.cos(yaw) * right!) * .11, 0,
        (-Math.cos(yaw) * forward! - Math.sin(yaw) * right!) * .11,
      );
      motion.update(p, yaw, .1, true);
      assert.ok(Math.abs(motion.forward - forward!) < 1e-10);
      assert.ok(Math.abs(motion.right - right!) < 1e-10);
      assert.ok(Math.abs(motion.phase * (forward! > 0 ? 1.35 : 1.1) * motion.forwardWeight - .11 * Math.abs(forward!)) < 1e-10);
      assert.ok(Math.abs(motion.phase * .6 * motion.sideWeight - .11 * Math.abs(right!)) < 1e-10);
    }
  }
});

test("raider stride grows with speed while full-speed cadence stays natural", () => {
  for (const [forward, right, maxCadence] of [[1, 0, 1.5], [-1, 0, 1.5], [0, 1, 2.5], [0, -1, 2.5]]) {
    const strides: number[] = [];
    for (const speed of [1.1, 1.9, 3]) {
      const motion = new RaiderMotion();
      const position = new Vector3();
      motion.update(position, 0, 1 / 60, true);
      let cycles = 0;
      for (let frame = 0; frame < 120; frame++) {
        position.x += right! * speed / 60;
        position.z -= forward! * speed / 60;
        const previousPhase = motion.phase;
        motion.update(position, 0, 1 / 60, true);
        cycles += (motion.phase - previousPhase + 1) % 1;
      }
      const cadence = cycles / 2;
      if (speed === 1.1) assert.ok(Math.abs(speed / cadence - (forward! > 0 ? 1.35 : forward! < 0 ? 1.1 : .6)) < 1e-10);
      strides.push(speed / cadence);
      if (speed === 3) assert.ok(Math.abs(cadence - maxCadence!) < 1e-10);
    }
    assert.ok(strides[1]! > strides[0]! * 1.2, `${forward},${right}: ${strides}`);
    assert.ok(strides[2]! > strides[1]! * 1.2, `${forward},${right}: ${strides}`);
  }
});

test("pause, falling, respawn and teleports cannot drive a false walking cycle", () => {
  const motion = new RaiderMotion();
  motion.update(new Vector3(), 0, .1, true);
  motion.update(new Vector3(0,0,-.11), 0, .1, true);
  const beforePause = JSON.stringify(motion);
  for (const dt of [0, -1, NaN, Infinity]) motion.update(new Vector3(50,0,50), 0, dt, true);
  assert.equal(JSON.stringify(motion), beforePause);
  const phase = motion.phase;
  motion.update(new Vector3(0,-.1,-.22), 0, .1, false);
  assert.equal(motion.phase, phase);
  motion.update(new Vector3(50,0,50), 0, .1, true);
  assert.equal(motion.phase, phase);
  motion.reset();
  motion.update(new Vector3(-50,0,-50), 0, .1, true);
  assert.equal(motion.phase, 0);
  assert.equal(motion.moving, false);
});

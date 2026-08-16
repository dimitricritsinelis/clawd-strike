import assert from "node:assert/strict";
import test from "node:test";
import { integrateShakeSpring, type ShakeSpringState } from "./Game";

/**
 * Regression: the camera-shake spring was integrated once per frame with the
 * raw frame delta. The runtime loop clamps delta at 100 ms, and at that step
 * size the explicit integrator's step matrix has an eigenvalue of -2 — every
 * frame doubled the shake instead of damping it. Any device sustaining below
 * ~12.8 fps threw the camera out of the world and eventually to NaN.
 */
function settle(dtSeconds: number, frames: number): ShakeSpringState {
  const state: ShakeSpringState = { offset: 0.05, velocity: 0 };
  for (let i = 0; i < frames; i += 1) {
    integrateShakeSpring(state, dtSeconds);
  }
  return state;
}

test("the shake spring decays at playable frame rates", () => {
  for (const fps of [144, 60, 30]) {
    const state = settle(1 / fps, 120);
    assert.ok(
      Math.abs(state.offset) < 1e-3,
      `at ${fps}fps the shake should have settled, got ${state.offset}`,
    );
  }
});

test("the shake spring stays stable at the loop's worst-case frame time", () => {
  // 100 ms is exactly the runtime loop's dt clamp — the worst case the spring
  // can ever be handed.
  const state = settle(0.1, 200);
  assert.ok(Number.isFinite(state.offset), `offset diverged to ${state.offset}`);
  assert.ok(Number.isFinite(state.velocity), `velocity diverged to ${state.velocity}`);
  assert.ok(
    Math.abs(state.offset) < 1e-3,
    `shake must decay even at 10fps, got ${state.offset}`,
  );
});

test("the shake spring never diverges across a sweep of frame times", () => {
  for (const dt of [0.016, 0.033, 0.05, 0.078, 0.08, 0.1]) {
    const state = settle(dt, 300);
    assert.ok(
      Number.isFinite(state.offset) && Math.abs(state.offset) < 1,
      `dt=${dt}s diverged to ${state.offset}`,
    );
  }
});

test("a single long frame does not amplify the shake", () => {
  const state: ShakeSpringState = { offset: 0.05, velocity: 0 };
  const startingMagnitude = Math.abs(state.offset);
  integrateShakeSpring(state, 0.1);
  assert.ok(
    Math.abs(state.offset) <= startingMagnitude,
    `one 100ms frame grew the shake from ${startingMagnitude} to ${state.offset}`,
  );
});

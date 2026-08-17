import assert from "node:assert/strict";
import test from "node:test";
import {
  TouchInputManager,
  resolveRadialJoystickInput,
} from "./TouchInputManager";

test("profile joystick radius clamps physical travel and preserves direction", () => {
  const resolved = resolveRadialJoystickInput(60, 80, 50, 0);

  assert.equal(Math.hypot(resolved.visualDx, resolved.visualDy), 50);
  assert.equal(resolved.moveX, 0.6);
  assert.equal(resolved.moveZ, -0.8);
});

test("radial deadzone suppresses drift and remaps the remaining range", () => {
  const inside = resolveRadialJoystickInput(14, 0, 60, 0.25);
  assert.equal(inside.moveX, 0);
  assert.equal(inside.moveZ, 0);

  const halfway = resolveRadialJoystickInput(30, 0, 60, 0.25);
  assert.ok(Math.abs(halfway.moveX - 1 / 3) < 1e-12);
  assert.equal(halfway.moveZ, 0);

  const full = resolveRadialJoystickInput(60, 0, 60, 0.25);
  assert.equal(full.moveX, 1);
});

test("enabled but unsupported touch aim assist fails closed", () => {
  assert.throws(
    () => new TouchInputManager({} as HTMLElement, { aimAssistEnabled: true }),
    /aim assist.+not implemented/i,
  );
});

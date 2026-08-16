import assert from "node:assert/strict";
import test from "node:test";
import { designYawDegToWorldYawRad } from "./coordinateTransforms";

function forward(yawRad: number): { x: number; z: number } {
  return { x: -Math.sin(yawRad), z: -Math.cos(yawRad) };
}

test("maps authored north/east/south/west yaw into gameplay forward", () => {
  const north = forward(designYawDegToWorldYawRad(0));
  const east = forward(designYawDegToWorldYawRad(90));
  const south = forward(designYawDegToWorldYawRad(180));
  const west = forward(designYawDegToWorldYawRad(270));
  assert.ok(Math.abs(north.x) < 1e-9 && north.z > 0.999);
  assert.ok(east.x > 0.999 && Math.abs(east.z) < 1e-9);
  assert.ok(Math.abs(south.x) < 1e-9 && south.z < -0.999);
  assert.ok(west.x < -0.999 && Math.abs(west.z) < 1e-9);
});

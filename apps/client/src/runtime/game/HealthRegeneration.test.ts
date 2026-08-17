import assert from "node:assert/strict";
import test from "node:test";
import { stepHealthRegeneration } from "./HealthRegeneration";

const ENABLED = {
  enabled: true,
  delayS: 3,
  healthPerS: 10,
  cap: 80,
} as const;

test("regeneration uses only simulation time after its delay", () => {
  const beforeDelay = stepHealthRegeneration(ENABLED, 50, 0, 2, 0);
  assert.deepEqual(beforeDelay, { secondsSinceDamage: 2, healthRestored: 0 });

  const crossesDelay = stepHealthRegeneration(
    ENABLED,
    50,
    beforeDelay.secondsSinceDamage,
    2,
    0,
  );
  assert.deepEqual(crossesDelay, { secondsSinceDamage: 4, healthRestored: 10 });

  const paused = stepHealthRegeneration(ENABLED, 60, crossesDelay.secondsSinceDamage, 0, 0);
  assert.deepEqual(paused, { secondsSinceDamage: 4, healthRestored: 0 });
});

test("damage restarts the delay and the profile cap bounds healing", () => {
  assert.deepEqual(stepHealthRegeneration(ENABLED, 50, 10, 1, 20), {
    secondsSinceDamage: 0,
    healthRestored: 0,
  });
  assert.deepEqual(stepHealthRegeneration(ENABLED, 79, 10, 1, 0), {
    secondsSinceDamage: 11,
    healthRestored: 1,
  });
});

test("disabled regeneration remains neutral while retaining generic timing state", () => {
  assert.deepEqual(stepHealthRegeneration({ ...ENABLED, enabled: false }, 50, 2, 5, 0), {
    secondsSinceDamage: 7,
    healthRestored: 0,
  });
});

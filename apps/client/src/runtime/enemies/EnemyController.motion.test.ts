import assert from "node:assert/strict";
import test from "node:test";
import { hasInsufficientEnemyMotion } from "./EnemyController";

test("normal frame-rate movement is not misclassified as stuck", () => {
  // A 2.6 m/s investigate step moves only 4.3 cm at 60 Hz. The old fixed
  // 5 cm threshold declared that healthy movement stuck every frame.
  assert.equal(hasInsufficientEnemyMotion(2.6 / 60, 2.6, 1 / 60), false);
  assert.equal(hasInsufficientEnemyMotion(2.6 / 120, 2.6, 1 / 120), false);
  assert.equal(hasInsufficientEnemyMotion(2.6 / 30, 2.6, 1 / 30), false);
});

test("motion far below the expected frame distance is classified as stuck", () => {
  assert.equal(hasInsufficientEnemyMotion(0.001, 3.75, 1 / 60), true);
  assert.equal(hasInsufficientEnemyMotion(0, 1.1, 0.1), true);
  assert.equal(hasInsufficientEnemyMotion(0, 0, 1 / 60), false);
});

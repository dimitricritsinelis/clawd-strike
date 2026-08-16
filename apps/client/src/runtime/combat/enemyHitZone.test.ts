import assert from "node:assert/strict";
import test from "node:test";
import { resolveEnemyHitDamage } from "./enemyHitZone";

test("enemy hit zones and damage are elevation-relative", () => {
  for (const feetY of [0, 1.4]) {
    assert.deepEqual(resolveEnemyHitDamage(feetY + 0.2, feetY), {
      zone: "legs",
      damage: 13,
      isHeadshot: false,
    });
    assert.deepEqual(resolveEnemyHitDamage(feetY + 0.9, feetY), {
      zone: "body",
      damage: 25,
      isHeadshot: false,
    });
    assert.deepEqual(resolveEnemyHitDamage(feetY + 1.6, feetY), {
      zone: "head",
      damage: 100,
      isHeadshot: true,
    });
  }
});

test("enemy hit-zone thresholds preserve strict boundary behavior", () => {
  assert.equal(resolveEnemyHitDamage(1.8 * 0.25, 0).zone, "body");
  assert.equal(resolveEnemyHitDamage(1.8 * 0.78, 0).zone, "body");
});

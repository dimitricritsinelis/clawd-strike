import assert from "node:assert/strict";
import test from "node:test";
import { Scene, Vector3 } from "three";
import { EnemyManager } from "./EnemyManager";
import type { EnemyAabb } from "./EnemyController";

type FakeController = {
  isDead(): boolean;
  getAabb(): EnemyAabb;
};

function installControllers(manager: EnemyManager, controllers: FakeController[]): void {
  (manager as unknown as { controllers: FakeController[] }).controllers = controllers;
}

test("player raycasts use live enemy bounds instead of the perception cache", () => {
  const manager = new EnemyManager(new Scene());
  let x = 2;
  const controller: FakeController = {
    isDead: () => false,
    getAabb: () => ({
      id: "enemy_live",
      minX: x - 0.3,
      maxX: x + 0.3,
      minY: 0,
      maxY: 1.8,
      minZ: -0.3,
      maxZ: 0.3,
    }),
  };
  installControllers(manager, [controller]);

  const origin = new Vector3(0, 1, 0);
  const direction = new Vector3(1, 0, 0);
  const first = manager.checkRaycastHit(origin, direction, 20);
  assert.equal(first.hit, true);
  if (!first.hit) return;
  assert.equal(first.enemyId, "enemy_live");
  assert.ok(Math.abs(first.distance - 1.7) < 1e-6);

  x = 5;
  const moved = manager.checkRaycastHit(origin, direction, 20);
  assert.equal(moved.hit, true);
  if (!moved.hit) return;
  assert.ok(Math.abs(moved.distance - 4.7) < 1e-6, "the moved controller must be sampled again");
});

test("player raycasts skip enemies killed earlier in the same update", () => {
  const manager = new EnemyManager(new Scene());
  installControllers(manager, [
    {
      isDead: () => true,
      getAabb: () => ({
        id: "enemy_dead",
        minX: 1.7,
        maxX: 2.3,
        minY: 0,
        maxY: 1.8,
        minZ: -0.3,
        maxZ: 0.3,
      }),
    },
    {
      isDead: () => false,
      getAabb: () => ({
        id: "enemy_alive",
        minX: 3.7,
        maxX: 4.3,
        minY: 0,
        maxY: 1.8,
        minZ: -0.3,
        maxZ: 0.3,
      }),
    },
  ]);

  const result = manager.checkRaycastHit(new Vector3(0, 1, 0), new Vector3(1, 0, 0), 20);
  assert.equal(result.hit, true);
  if (!result.hit) return;
  assert.equal(result.enemyId, "enemy_alive");
});

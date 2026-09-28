import assert from "node:assert/strict";
import test from "node:test";
import { Scene, Vector3 } from "three";
import { EnemyController } from "./EnemyController";
import { EnemyManager, resolveVisualHitReaction } from "./EnemyManager";

function managerWith(controllers: EnemyController[]): EnemyManager {
  const manager = new EnemyManager(new Scene());
  (manager as unknown as { controllers: EnemyController[] }).controllers = controllers;
  return manager;
}

const IMPACT = { dirX: 0.6, dirY: -0.1, dirZ: 0.8, hitX: 2.1, hitY: 1.2, hitZ: 3.2 };

test("a damaging hit queues one render reaction carrying the bullet direction", () => {
  const controller = new EnemyController("enemy_a", "A", 2, 3, 1);
  const manager = managerWith([controller]);
  manager.applyDamageToEnemy("enemy_a", 10, false, IMPACT);
  const reaction = controller.consumeHitReaction();
  assert.deepEqual(reaction, { headshot: false, killed: false, impact: IMPACT });
  assert.equal(controller.consumeHitReaction(), null, "each hit reacts once");

  const visual = resolveVisualHitReaction(reaction, { x: 2, z: 3 }, { x: 0, z: 0 });
  assert.deepEqual(visual, { dirX: 0.6, dirZ: 0.8, headshot: false, hitX: 2.1, hitZ: 3.2 });
});

test("callers that pass no impact still get a reaction along the player-to-enemy line", () => {
  const controller = new EnemyController("enemy_a", "A", 2, 3, 1);
  managerWith([controller]).applyDamageToEnemy("enemy_a", 10, true);
  const visual = resolveVisualHitReaction(controller.consumeHitReaction(), { x: 2, z: 3 }, { x: -1, z: -1 });
  assert.deepEqual(visual, { dirX: 3, dirZ: 4, headshot: true });
  assert.equal(resolveVisualHitReaction(null, { x: 0, z: 0 }, { x: 1, z: 1 }), null);
});

test("the killing hit removes the collider and completes the wave at t = 0", () => {
  const first = new EnemyController("enemy_a", "A", 2, 0, 1);
  const second = new EnemyController("enemy_b", "B", 6, 0, 2);
  const manager = managerWith([first, second]);
  const origin = new Vector3(0, 1, 0);
  const direction = new Vector3(1, 0, 0);
  const before = manager.checkRaycastHit(origin, direction, 20);
  assert.ok(before.hit && before.enemyId === "enemy_a");

  manager.applyDamageToEnemy("enemy_a", 10_000, true, IMPACT);
  assert.equal(first.consumeHitReaction()?.killed, true);
  const through = manager.checkRaycastHit(origin, direction, 20);
  assert.ok(through.hit && through.enemyId === "enemy_b", "the falling body never blocks shots");
  assert.equal(manager.allDead(), false);

  manager.applyDamageToEnemy("enemy_b", 10_000, false);
  assert.equal(manager.allDead(), true, "wave completion does not wait for the death fall");
  manager.applyDamageToEnemy("enemy_b", 10, false, IMPACT);
  assert.equal(second.consumeHitReaction()?.killed, true, "hits on a corpse queue nothing new");
  assert.equal(second.consumeHitReaction(), null);
});

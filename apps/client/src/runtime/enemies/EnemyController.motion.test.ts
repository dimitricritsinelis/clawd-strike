import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three";
import { WorldColliders } from "../sim/collision/WorldColliders";
import { EnemyManager } from "./EnemyManager";
import { EnemyController, resolveEnemyTierProfile, type EnemyDirective, hasInsufficientEnemyMotion } from "./EnemyController";

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

const moveDirective = (x: number, z: number): EnemyDirective => ({
  role: "rifler", state: "ROTATE", tier: 0, tierProfile: resolveEnemyTierProfile(0),
  assignedNodeId: null, targetNodeId: null, movePoint: { x, z }, holdPoint: null,
  focusPoint: null, peekOffsetM: 0, allowFire: false, aggressive: false,
  hasDirectSight: false, directiveAgeS: 0, debugReason: "collision regression",
});

const world = new WorldColliders([
  { id: "floor", kind: "floor_slab", min: { x: -20, y: -1, z: -20 }, max: { x: 20, y: 0, z: 20 } },
], { x: -20, y: -20, w: 40, h: 40 });

for (const dt of [1 / 120, 1 / 60, 0.1]) {
  test(`opposing raiders do not cross or overlap at ${dt}s frames and can get around each other`, () => {
    const first = new EnemyController("first", "first", -2, 0, 1);
    const second = new EnemyController("second", "second", 2, 0, 2);
    const bodies = [first.getAabb(), second.getAabb()];
    for (let elapsed = 0; elapsed < 8; elapsed += dt) {
      first.step(dt, moveDirective(5, 0), [], world, bodies, () => {});
      second.step(dt, moveDirective(-5, 0), [], world, bodies, () => {});
      const a = first.getPosition(), b = second.getPosition();
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.6 - 1e-6, JSON.stringify({ dt, elapsed, a, b }));
    }
    assert.ok(first.getPosition().x > 2, "first raider must get past the other");
    assert.ok(second.getPosition().x < -2, "second raider must get past the other");
  });
}

test("overlap recovery separates coincident raiders and ignores dead or vertically separate raiders", () => {
  const first = new EnemyController("first", "first", 0, 0, 1);
  const second = new EnemyController("second", "second", 0, 0, 2);
  const upper = new EnemyController("upper", "upper", 0, 0, 3, 3);
  const dead = new EnemyController("dead", "dead", 0, 0, 4);
  dead.applyDamage(10000);
  const manager = new EnemyManager(new Scene()) as unknown as {
    controllers: EnemyController[];
    resolveLiveBotOverlaps(world: WorldColliders): void;
  };
  manager.controllers = [first, second, upper, dead];
  manager.resolveLiveBotOverlaps(world);
  const a = first.getPosition(), b = second.getPosition();
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.6 - 1e-6);
  assert.deepEqual(upper.getPosition(), { x: 0, y: 3, z: 0 });
  assert.deepEqual(dead.getPosition(), { x: 0, y: 0, z: 0 });
});

test("raider body blocking leaves player collision unchanged and ignores separate elevations", () => {
  for (const body of [
    { id: "player", minY: 0, maxY: 1.8 },
    { id: "upper", minY: 3, maxY: 4.8 },
  ]) {
    const enemy = new EnemyController("runner", "runner", -2, 0, 1);
    for (let frame = 0; frame < 90; frame++) {
      enemy.step(1 / 60, moveDirective(5, 0), [], world, [
        { ...body, minX: -0.3, maxX: 0.3, minZ: -0.3, maxZ: 0.3 },
      ], () => {});
    }
    assert.ok(enemy.getPosition().x > 1);
  }
});

test("raiders queue in a narrow passage without pushing each other through walls", () => {
  const corridor = new WorldColliders([
    { id: "floor", kind: "floor_slab", min: { x: -20, y: -1, z: -20 }, max: { x: 20, y: 0, z: 20 } },
    { id: "north", kind: "wall", min: { x: -20, y: 0, z: 0.4 }, max: { x: 20, y: 3, z: 1 } },
    { id: "south", kind: "wall", min: { x: -20, y: 0, z: -1 }, max: { x: 20, y: 3, z: -0.4 } },
  ], { x: -20, y: -20, w: 40, h: 40 });
  const raiders = [0, -1, -2].map((x, i) => new EnemyController(`raider${i}`, "raider", x, 0, i));
  const bodies = raiders.map(raider => raider.getAabb());
  for (let frame = 0; frame < 300; frame++) {
    for (let i = 0; i < raiders.length; i++) {
      raiders[i]!.step(1 / 60, moveDirective(i === 0 ? 0 : 5, 0), [], corridor, bodies, () => {});
    }
    for (let i = 0; i < raiders.length; i++) {
      const a = raiders[i]!.getPosition();
      assert.ok(Math.abs(a.z) <= 0.1);
      for (let j = i + 1; j < raiders.length; j++) {
        const b = raiders[j]!.getPosition();
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.6 - 1e-6);
      }
    }
  }
});

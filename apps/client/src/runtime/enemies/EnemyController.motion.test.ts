import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseBlockoutSpec, parseAnchorsSpec } from "../map/spec/parseMapSpec";
import type { TacticalGraph } from "./TacticalGraph";
import { Scene } from "three";
import { WorldColliders } from "../sim/collision/WorldColliders";
import { EnemyManager, DIRECTIVE_PLAN_INTERVAL_S } from "./EnemyManager";
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


test("a raider blocked by a wall detects the stall and moves around the obstacle", () => {
  const blockedWorld = new WorldColliders([
    { id: "floor", kind: "floor_slab", min: { x: -20, y: -1, z: -20 }, max: { x: 20, y: 0, z: 20 } },
    { id: "obstacle", kind: "wall", min: { x: 0, y: 0, z: -0.4 }, max: { x: 0.4, y: 3, z: 0.4 } },
  ], { x: -20, y: -20, w: 40, h: 40 });
  const enemy = new EnemyController("runner", "runner", -2, 0, 1);
  for (let frame = 0; frame < 600; frame++) {
    enemy.step(1 / 60, moveDirective(5, 0), [], blockedWorld, [], () => {});
    const { x, z } = enemy.getPosition();
    assert.ok(x <= -0.3 || x >= 0.7 || Math.abs(z) >= 0.7, "escape must preserve wall collision");
  }
  assert.ok(enemy.getPosition().x > 1, `raider stayed blocked at ${JSON.stringify(enemy.getPosition())}`);
});


test("bot directives advance past co-located portal and zone waypoints", () => {
  const source = JSON.parse(readFileSync(new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8"));
  const manager = new EnemyManager(new Scene());
  manager.setTacticalContext(parseBlockoutSpec(source), parseAnchorsSpec(source));
  const planner = manager as unknown as {
    tacticalGraph: TacticalGraph;
    pickRoleNode(): { node: unknown; score: number };
    resolvePressureProfile(pressure: number): unknown;
    buildDirective(...args: unknown[]): EnemyDirective;
  };
  const target = planner.tacticalGraph.nodeById.get("zone:TEXTILE_ARCADE")!;
  planner.pickRoleNode = () => ({ node: target, score: 1 });
  const controller = new EnemyController("portal-runner", "runner", 20, 74.25, 1);
  const directive = planner.buildDirective(
    controller,
    { id: "player", team: "player", position: { x: 28, y: 0, z: 7 }, health: 100, aimHeightM: 1.5 },
    resolveEnemyTierProfile(0), planner.resolvePressureProfile(0), false, 70,
  );
  assert.equal(directive.targetNodeId, target.id);
  assert.deepEqual(directive.movePoint, { x: 27.5, z: 71 }, "next movement must leave the already-reached west-upper portal");
});


test("following a tactical route does not reverse toward an earlier waypoint when nearest-node identity changes", () => {
  const source = JSON.parse(readFileSync(new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8"));
  const manager = new EnemyManager(new Scene());
  manager.setTacticalContext(parseBlockoutSpec(source), parseAnchorsSpec(source));
  const planner = manager as unknown as {
    tacticalGraph: TacticalGraph;
    waveElapsedS: number;
    pickRoleNode(): { node: unknown; score: number };
    resolvePressureProfile(pressure: number): unknown;
    buildDirective(...args: unknown[]): EnemyDirective;
  };
  const target = planner.tacticalGraph.nodeById.get("zone:COVERED_SOUK")!;
  planner.pickRoleNode = () => ({ node: target, score: 1 });
  const controller = new EnemyController("route-runner", "runner", 49.5, 55, 1);
  const routeWorld = new WorldColliders([
    { id: "floor", kind: "floor_slab", min: { x: 0, y: -1, z: 0 }, max: { x: 56, y: 0, z: 92 } },
  ], { x: 0, y: 0, w: 56, h: 92 });
  let nextPlanAtS = 0;
  let directive = moveDirective(target.x, target.z);
  for (let frame = 0; frame < 300; frame++) {
    planner.waveElapsedS = frame / 60;
    if (planner.waveElapsedS >= nextPlanAtS) {
      directive = planner.buildDirective(
        controller,
        { id: "player", team: "player", position: { x: 28, y: 0, z: 7 }, health: 100, aimHeightM: 1.5 },
        resolveEnemyTierProfile(0), planner.resolvePressureProfile(0), false, 70,
      );
      nextPlanAtS = planner.waveElapsedS + DIRECTIVE_PLAN_INTERVAL_S;
    }
    controller.step(1 / 60, directive, [], routeWorld, [], () => {});
  }
  assert.ok(controller.getPosition().z < 45, `route runner reversed before reaching the souk: ${JSON.stringify(controller.getPosition())}`);
});

test("silent unseen player locations do not change the squad's remembered-spawn search plan", () => {
  const source = JSON.parse(readFileSync(new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8"));
  const plan = (position: { x: number; y: number; z: number }) => {
    const manager = new EnemyManager(new Scene());
    manager.setTacticalContext(parseBlockoutSpec(source), parseAnchorsSpec(source));
    const planner = manager as unknown as {
      assumedPlayerSpawnZoneId: string;
      waveElapsedS: number;
      searchPhase: string;
      refreshSearchBeliefs(): void;
      resolvePressureProfile(pressure: number): unknown;
      buildDirective(...args: unknown[]): EnemyDirective;
      squadTaskByEnemyId: Map<string, { zoneId: string; reason: string }>;
      blackboard: { lastSeenPlayer: unknown; lastHeardPlayer: unknown };
    };
    planner.assumedPlayerSpawnZoneId = "SPAWN_A_COURTYARD";
    planner.waveElapsedS = 43;
    planner.searchPhase = "sweep";
    planner.refreshSearchBeliefs();
    const controller = new EnemyController("searcher", "searcher", 49.5, 55, 1);
    const directive = planner.buildDirective(
      controller, { id: "player", team: "player", position, health: 100, aimHeightM: 1.5 },
      resolveEnemyTierProfile(1), planner.resolvePressureProfile(2 / 3), false, 70,
    );
    const task = planner.squadTaskByEnemyId.get(controller.id);
    assert.ok(task);
    assert.match(task.reason, /spawn-/);
    assert.equal(planner.blackboard.lastSeenPlayer, null);
    assert.equal(planner.blackboard.lastHeardPlayer, null);
    return { directive, task };
  };
  assert.deepEqual(plan({ x: 6.5, y: 0, z: 65 }), plan({ x: 49.5, y: 0, z: 21 }));
});

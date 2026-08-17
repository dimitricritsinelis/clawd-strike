import assert from "node:assert/strict";
import test from "node:test";
import {
  DESKTOP_HUMAN_GAMEPLAY_TUNING,
  GAMEPLAY_TUNINGS,
} from "../tuning/gameplayTuning";
import { WorldColliders } from "../sim/collision/WorldColliders";
import {
  EnemyController,
  applyCircularConeSpread,
  isTargetInsideEnemyVisionCone,
  resolveEnemyShotSpreadDeg,
  resolveEnemyTierProfile,
  type EnemyAabb,
  type EnemyDirective,
  type EnemyTarget,
} from "./EnemyController";
import {
  resolveEnemyPressureTiming,
  resolveEnemyDeathCallbackBatch,
  resolveEnemyTier,
  resolveEnemyTierForTuning,
  resolveFullHuntFirePermission,
  selectNextAttackTokenHolder,
  EnemyManager,
} from "./EnemyManager";
import { Scene } from "three";

const EMPTY_WORLD = new WorldColliders(
  [{
    id: "floor",
    kind: "floor_slab",
    min: { x: -100, y: -1, z: -100 },
    max: { x: 100, y: 0, z: 100 },
  }],
  { x: -100, y: -100, w: 200, h: 200 },
);

function createTarget(x = 0, z = -5): EnemyTarget {
  return {
    id: "player",
    team: "player",
    position: { x, y: 0, z },
    health: 100,
    aimHeightM: 1.5,
  };
}

function createPlayerAabb(target: EnemyTarget): EnemyAabb {
  return {
    id: target.id,
    minX: target.position.x - 5,
    maxX: target.position.x + 5,
    minY: -1,
    maxY: 5,
    minZ: target.position.z - 0.4,
    maxZ: target.position.z + 0.4,
  };
}

function createDirective(
  overrides: Partial<EnemyDirective> = {},
): EnemyDirective {
  const tierProfile = {
    ...resolveEnemyTierProfile(0, DESKTOP_HUMAN_GAMEPLAY_TUNING),
    reactionTimeS: 0,
  };
  return {
    role: "rifler",
    state: "HOLD",
    tier: 0,
    tierProfile,
    assignedNodeId: null,
    targetNodeId: null,
    movePoint: null,
    holdPoint: null,
    focusPoint: { x: 0, y: 0, z: -5 },
    peekOffsetM: 0,
    tacticalAllowFire: true,
    allowFire: true,
    aggressive: false,
    hasDirectSight: true,
    directiveAgeS: 0,
    debugReason: "focused tuning test",
    ...overrides,
  };
}

test("all profiles use the canonical wave-only tier and pressure schedules", () => {
  const baseline = DESKTOP_HUMAN_GAMEPLAY_TUNING;
  const sampledWaves = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 99];

  for (const tuning of Object.values(GAMEPLAY_TUNINGS)) {
    for (const wave of sampledWaves) {
      const expectedTier = resolveEnemyTierForTuning(wave, 0, baseline);
      assert.equal(resolveEnemyTierForTuning(wave, 0, tuning), expectedTier);
      assert.equal(
        resolveEnemyTierForTuning(wave, 3_600, tuning),
        expectedTier,
        `${tuning.identity.profileId} must not add elapsed-time tier spikes`,
      );
      assert.deepEqual(
        resolveEnemyPressureTiming(wave, tuning),
        resolveEnemyPressureTiming(wave, baseline),
      );
    }
  }

  for (const wave of sampledWaves) {
    assert.equal(
      resolveEnemyTier(wave, 3_600),
      resolveEnemyTierForTuning(wave, 3_600, baseline),
      "generic tier resolution must stay pinned to the canonical baseline",
    );
  }
});

test("attacker token selection is deterministic, capped, and round-robin", () => {
  const candidates = ["alpha", "bravo", "charlie", "delta"];
  const held = new Set<string>();
  let cursor = 0;

  for (let count = 0; count < 2; count += 1) {
    const selection = selectNextAttackTokenHolder(candidates, held, cursor);
    assert.ok(selection.enemyId);
    held.add(selection.enemyId);
    cursor = selection.nextIndex;
  }
  assert.deepEqual([...held], ["alpha", "bravo"]);

  held.delete("alpha");
  const next = selectNextAttackTokenHolder(candidates, held, cursor);
  assert.equal(next.enemyId, "charlie");
  assert.equal(held.size, 1, "the caller retains strict ownership of the configured cap");
});

test("manager attack tokens enforce tier caps and stagger later burst starts", () => {
  const manager = new EnemyManager(new Scene(), DESKTOP_HUMAN_GAMEPLAY_TUNING);
  const tier = 1;
  const staggerS = DESKTOP_HUMAN_GAMEPLAY_TUNING.waves.burstStartStaggerMsByTier[tier] / 1_000;
  let completedId: string | null = null;
  let firingId: string | null = null;
  const updates = ["alpha", "bravo", "charlie"].map((id) => ({
    controller: {
      id,
      isFiring: () => firingId === id,
      consumeCompletedBurst: () => {
        if (completedId !== id) return false;
        completedId = null;
        return true;
      },
    },
    directive: createDirective(),
  }));
  const harness = manager as unknown as {
    waveElapsedS: number;
    coordinateAttackTokens(
      prepared: typeof updates,
      tier: number,
    ): void;
  };

  harness.waveElapsedS = 0;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [true, false, false]);

  harness.waveElapsedS = staggerS - 0.001;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [true, false, false]);

  harness.waveElapsedS = staggerS;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [true, false, false]);

  firingId = "alpha";
  harness.coordinateAttackTokens(updates, tier);
  firingId = null;

  harness.waveElapsedS = (staggerS * 2) - 0.001;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [true, false, false]);

  harness.waveElapsedS = staggerS * 2;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [true, true, false]);

  completedId = "alpha";
  harness.waveElapsedS = (staggerS * 2) + 0.1;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [false, true, false]);

  firingId = "bravo";
  harness.waveElapsedS = (staggerS * 2) + 0.2;
  harness.coordinateAttackTokens(updates, tier);
  firingId = null;

  harness.waveElapsedS = (staggerS * 3) + 0.2;
  harness.coordinateAttackTokens(updates, tier);
  assert.deepEqual(updates.map(({ directive }) => directive.allowFire), [false, true, true]);
});

test("full-hunt logic never grants blind fire in any profile", () => {
  for (const tuning of Object.values(GAMEPLAY_TUNINGS)) {
    assert.equal(resolveFullHuntFirePermission(false, tuning), false);
    assert.equal(resolveFullHuntFirePermission(true, tuning), true);
  }
});

test("baseline wave transition holds for its tuned duration and skip completes exactly once", () => {
  const manager = new EnemyManager(new Scene(), DESKTOP_HUMAN_GAMEPLAY_TUNING);
  const intermissionS = DESKTOP_HUMAN_GAMEPLAY_TUNING.flow.intermissionDurationS;
  const harness = manager as unknown as {
    controllers: Array<{ isDead(): boolean }>;
    worldCollidersRef: WorldColliders | null;
    hasLastPlayerPosition: boolean;
    waveRespawnTimer: number | null;
    waveNumber: number;
    onNewWave: ((wave: number) => void) | null;
    spawn: (...args: unknown[]) => void;
  };
  let spawnCount = 0;
  let callbackCount = 0;
  harness.controllers = [{ isDead: () => true }];
  harness.worldCollidersRef = EMPTY_WORLD;
  harness.hasLastPlayerPosition = true;
  harness.waveNumber = 1;
  harness.onNewWave = (wave) => {
    callbackCount += 1;
    assert.equal(wave, 2);
  };
  harness.spawn = () => {
    spawnCount += 1;
    harness.waveNumber += 1;
    harness.waveRespawnTimer = null;
    harness.controllers = [{ isDead: () => false }];
  };

  assert.equal(manager.skipWaveCountdown(), false, "skip is unavailable before countdown initialization");
  assert.equal(manager.updateWaveTransition(0.25), false);
  assert.equal(manager.getWaveCountdownS(), intermissionS);
  assert.equal(manager.updateWaveTransition(intermissionS - 0.001), false);
  assert.ok((manager.getWaveCountdownS() ?? 0) > 0);
  assert.equal(spawnCount, 0);

  assert.equal(manager.skipWaveCountdown(), true);
  assert.equal(manager.getWaveCountdownS(), 0);
  assert.equal(manager.updateWaveTransition(0), true);
  assert.equal(spawnCount, 1);
  assert.equal(callbackCount, 1);
  assert.equal(manager.updateWaveTransition(10), false);
  assert.equal(spawnCount, 1);
  assert.equal(callbackCount, 1);
});

test("baseline wave transition auto-advances once when its tuned clock expires", () => {
  const manager = new EnemyManager(new Scene(), DESKTOP_HUMAN_GAMEPLAY_TUNING);
  const intermissionS = DESKTOP_HUMAN_GAMEPLAY_TUNING.flow.intermissionDurationS;
  const harness = manager as unknown as {
    controllers: Array<{ isDead(): boolean }>;
    worldCollidersRef: WorldColliders | null;
    hasLastPlayerPosition: boolean;
    waveRespawnTimer: number | null;
    waveNumber: number;
    spawn: (...args: unknown[]) => void;
  };
  let spawnCount = 0;
  harness.controllers = [{ isDead: () => true }];
  harness.worldCollidersRef = EMPTY_WORLD;
  harness.hasLastPlayerPosition = true;
  harness.waveNumber = 4;
  harness.spawn = () => {
    spawnCount += 1;
    harness.waveNumber += 1;
    harness.waveRespawnTimer = null;
    harness.controllers = [{ isDead: () => false }];
  };

  assert.equal(manager.updateWaveTransition(0), false);
  assert.equal(manager.getWaveCountdownS(), intermissionS);
  assert.equal(manager.updateWaveTransition(intermissionS - 0.01), false);
  assert.equal(spawnCount, 0);
  assert.equal(manager.updateWaveTransition(0.01), true);
  assert.equal(spawnCount, 1);
  assert.equal(manager.updateWaveTransition(1), false);
  assert.equal(spawnCount, 1);
});

test("a multi-death wave-closing batch marks exactly the last stable callback", () => {
  const dead = { isDead: () => true };
  const alive = { isDead: () => false };

  const closingBatch = resolveEnemyDeathCallbackBatch(
    [dead, dead, dead],
    new Set([0]),
  );
  assert.deepEqual(closingBatch.newlyDeadIndices, [1, 2]);
  assert.equal(closingBatch.waveClosingKillIndex, 2);
  assert.deepEqual(
    closingBatch.newlyDeadIndices.map((index) => index === closingBatch.waveClosingKillIndex),
    [false, true],
  );

  const openBatch = resolveEnemyDeathCallbackBatch(
    [dead, dead, alive],
    new Set<number>(),
  );
  assert.deepEqual(openBatch.newlyDeadIndices, [0, 1]);
  assert.equal(openBatch.waveClosingKillIndex, null);

  const alreadyReported = resolveEnemyDeathCallbackBatch(
    [dead, dead],
    new Set([0, 1]),
  );
  assert.deepEqual(alreadyReported.newlyDeadIndices, []);
  assert.equal(alreadyReported.waveClosingKillIndex, null);
});

test("120-degree vision cone rejects flanks and rear targets except within proximity awareness", () => {
  const source = { x: 0, z: 0 };
  assert.equal(isTargetInsideEnemyVisionCone(source, 0, { x: 0, z: -10 }, 120, 4), true);
  assert.equal(isTargetInsideEnemyVisionCone(source, 0, { x: 10, z: 0 }, 120, 4), false);
  assert.equal(isTargetInsideEnemyVisionCone(source, 0, { x: 0, z: 10 }, 120, 4), false);
  assert.equal(isTargetInsideEnemyVisionCone(source, 0, { x: 0, z: 3.9 }, 120, 4), true);
  assert.equal(isTargetInsideEnemyVisionCone(source, 0, { x: 10, z: 0 }, 360, 0), true);
});

test("circular spread samples both axes and stays inside the requested cone", () => {
  const forward = { x: 0, y: 0, z: -1 };
  const horizontal = applyCircularConeSpread(forward, 10, 1, 0);
  const vertical = applyCircularConeSpread(forward, 10, 1, 0.25);
  const angleFromForwardDeg = (vector: { x: number; y: number; z: number }) => (
    Math.acos(Math.max(-1, Math.min(1, -vector.z))) * 180 / Math.PI
  );

  assert.ok(horizontal.x > 0.1);
  assert.ok(Math.abs(horizontal.y) < 1e-9);
  assert.ok(vertical.y > 0.1);
  assert.ok(Math.abs(vertical.x) < 1e-9);
  assert.ok(Math.abs(angleFromForwardDeg(horizontal) - 10) < 1e-9);
  assert.ok(Math.abs(angleFromForwardDeg(vertical) - 10) < 1e-9);
  assert.ok(Math.abs(horizontal.length() - 1) < 1e-12);
  assert.equal(resolveEnemyShotSpreadDeg(13, true, 1.6), 20.8);
  assert.equal(resolveEnemyShotSpreadDeg(13, false, 1.6), 13);
});

test("baseline firing requires aim alignment and deals tuned damage", () => {
  const tuning = DESKTOP_HUMAN_GAMEPLAY_TUNING;
  const enemy = new EnemyController("enemy-test", "Test", 0, 0, 42, 0, tuning);
  const sideTarget = createTarget(5, 0);
  const sideAabbs = [enemy.getAabb(), createPlayerAabb(sideTarget)];
  const damages: number[] = [];
  const sideDirective = createDirective({
    focusPoint: { ...sideTarget.position },
  });

  enemy.step(
    0.1,
    sideDirective,
    [sideTarget],
    EMPTY_WORLD,
    sideAabbs,
    (_targetId, damage) => damages.push(damage),
  );
  assert.equal(damages.length, 0, "a bot facing 78 degrees away must not fire");
  assert.ok(enemy.getDebugSnapshot().aimYawErrorDeg > tuning.enemy.combat.aimToleranceDeg);

  for (let frame = 0; frame < 12 && damages.length === 0; frame += 1) {
    enemy.step(
      0.1,
      sideDirective,
      [sideTarget],
      EMPTY_WORLD,
      [enemy.getAabb(), createPlayerAabb(sideTarget)],
      (_targetId, damage) => damages.push(damage),
    );
  }
  assert.ok(damages.length > 0);
  assert.ok(damages.every((damage) => damage === tuning.enemy.combat.damagePerHit));
});

test("long LOS breaks apply reacquire delay while short breaks preserve tracking", () => {
  const tuning = DESKTOP_HUMAN_GAMEPLAY_TUNING;
  const target = createTarget();
  const visible = createDirective();
  const hidden = createDirective({ hasDirectSight: false, allowFire: false, tacticalAllowFire: false });

  const shortBreakEnemy = new EnemyController("enemy-short", "Short", 0, 0, 7, 0, tuning);
  shortBreakEnemy.step(0.1, visible, [target], EMPTY_WORLD, [shortBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  shortBreakEnemy.step(0.1, hidden, [target], EMPTY_WORLD, [shortBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  shortBreakEnemy.step(0.1, visible, [target], EMPTY_WORLD, [shortBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  assert.equal(shortBreakEnemy.getDebugSnapshot().reacquireRemainingS, 0);

  const longBreakEnemy = new EnemyController("enemy-long", "Long", 0, 0, 7, 0, tuning);
  longBreakEnemy.step(0.1, visible, [target], EMPTY_WORLD, [longBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  longBreakEnemy.step(0.1, hidden, [target], EMPTY_WORLD, [longBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  longBreakEnemy.step(0.1, hidden, [target], EMPTY_WORLD, [longBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  longBreakEnemy.step(0.1, visible, [target], EMPTY_WORLD, [longBreakEnemy.getAabb(), createPlayerAabb(target)], () => {});
  assert.ok(Math.abs(longBreakEnemy.getDebugSnapshot().reacquireRemainingS - 0.1) < 1e-9);
});

test("low-tier movement spread remains active through the configured settle window", () => {
  const enemy = new EnemyController(
    "enemy-moving",
    "Moving",
    0,
    0,
    13,
    0,
    DESKTOP_HUMAN_GAMEPLAY_TUNING,
  );
  const moving = createDirective({
    state: "ROTATE",
    hasDirectSight: false,
    allowFire: false,
    tacticalAllowFire: false,
    focusPoint: null,
    movePoint: { x: 0, z: 10 },
  });
  const stopped = createDirective({
    hasDirectSight: false,
    allowFire: false,
    tacticalAllowFire: false,
    focusPoint: null,
  });

  enemy.step(0.1, moving, [], EMPTY_WORLD, [enemy.getAabb()], () => {});
  assert.equal(enemy.getDebugSnapshot().movementSpreadRemainingS, 0.2);
  enemy.step(0.1, stopped, [], EMPTY_WORLD, [enemy.getAabb()], () => {});
  assert.ok(Math.abs(enemy.getDebugSnapshot().movementSpreadRemainingS - 0.1) < 1e-9);
  enemy.step(0.1, stopped, [], EMPTY_WORLD, [enemy.getAabb()], () => {});
  assert.equal(enemy.getDebugSnapshot().movementSpreadRemainingS, 0);
});

test("high-tier movement spread stays active while moving despite a zero settle duration", () => {
  const enemy = new EnemyController(
    "enemy-high-tier-moving",
    "High Tier Moving",
    0,
    0,
    17,
    0,
    DESKTOP_HUMAN_GAMEPLAY_TUNING,
  );
  const tier = 3;
  const tierProfile = resolveEnemyTierProfile(tier, DESKTOP_HUMAN_GAMEPLAY_TUNING);
  const moving = createDirective({
    tier,
    tierProfile,
    state: "ROTATE",
    hasDirectSight: false,
    allowFire: false,
    tacticalAllowFire: false,
    focusPoint: null,
    movePoint: { x: 0, z: 10 },
  });
  const stopped = createDirective({
    tier,
    tierProfile,
    hasDirectSight: false,
    allowFire: false,
    tacticalAllowFire: false,
    focusPoint: null,
  });

  enemy.step(0.1, moving, [], EMPTY_WORLD, [enemy.getAabb()], () => {});
  const movingSnapshot = enemy.getDebugSnapshot();
  assert.equal(movingSnapshot.movementSpreadRemainingS, 0);
  assert.equal(movingSnapshot.movementSpreadActive, true);
  assert.equal(
    resolveEnemyShotSpreadDeg(
      tierProfile.spreadDeg,
      movingSnapshot.movementSpreadActive,
      DESKTOP_HUMAN_GAMEPLAY_TUNING.enemy.combat.movingSpreadMultiplier,
    ),
    tierProfile.spreadDeg * DESKTOP_HUMAN_GAMEPLAY_TUNING.enemy.combat.movingSpreadMultiplier,
  );

  enemy.step(0.1, stopped, [], EMPTY_WORLD, [enemy.getAabb()], () => {});
  const stoppedSnapshot = enemy.getDebugSnapshot();
  assert.equal(stoppedSnapshot.movementSpreadRemainingS, 0);
  assert.equal(stoppedSnapshot.movementSpreadActive, false);
  assert.equal(
    resolveEnemyShotSpreadDeg(
      tierProfile.spreadDeg,
      stoppedSnapshot.movementSpreadActive,
      DESKTOP_HUMAN_GAMEPLAY_TUNING.enemy.combat.movingSpreadMultiplier,
    ),
    tierProfile.spreadDeg,
  );
});

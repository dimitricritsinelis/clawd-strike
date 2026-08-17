import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  GAMEPLAY_BALANCE_BASELINE_FINGERPRINT,
  GAMEPLAY_PROFILE_IDS,
  resolveGameplayProfileIdentity,
} from "../../../../shared/gameplayProfile";
import {
  SHARED_CHAMPION_FIRE_INTERVAL_S,
  SHARED_CHAMPION_WAVE_ENEMY_COUNT,
} from "../../../../shared/highScore";
import {
  DESKTOP_HUMAN_BALANCE_BASELINE,
  DESKTOP_AGENT_GAMEPLAY_TUNING,
  DESKTOP_HUMAN_GAMEPLAY_TUNING,
  GAMEPLAY_TUNINGS,
  MOBILE_HUMAN_GAMEPLAY_TUNING,
  getGameplayTuning,
  resolveGameplayTuning,
  validateGameplayTuning,
  type GameplayTuning,
} from "./gameplayTuning";

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return;
  visited.add(value);
  assert.equal(Object.isFrozen(value), true, "every profile container must be frozen");
  for (const child of Object.values(value)) assertDeepFrozen(child, visited);
}

test("registry has one valid, revisioned tuning for every canonical profile id", () => {
  assert.deepEqual(Object.keys(GAMEPLAY_TUNINGS), GAMEPLAY_PROFILE_IDS);

  for (const profileId of GAMEPLAY_PROFILE_IDS) {
    const tuning = getGameplayTuning(profileId);
    assert.equal(tuning.identity.profileId, profileId);
    assert.match(tuning.identity.tuningRevision, /^[a-z0-9-]+-r\d+$/);
    assert.equal(validateGameplayTuning(tuning).length, 0);
  }

  for (const tuning of Object.values(GAMEPLAY_TUNINGS)) {
    assert.equal(tuning.validationStatus, "approved");
  }
});

test("environment resolver selects each supported profile", () => {
  assert.equal(
    resolveGameplayTuning({ controlMode: "human", isMobile: true }),
    MOBILE_HUMAN_GAMEPLAY_TUNING,
  );
  assert.equal(
    resolveGameplayTuning({ controlMode: "human", isMobile: false }),
    DESKTOP_HUMAN_GAMEPLAY_TUNING,
  );
  assert.equal(
    resolveGameplayTuning({ controlMode: "agent", isMobile: false }),
    DESKTOP_AGENT_GAMEPLAY_TUNING,
  );
});

test("mobile agent request stays rejected instead of silently applying desktop tuning", () => {
  const identityResolution = resolveGameplayProfileIdentity({
    controlMode: "agent",
    isMobile: true,
  });

  assert.equal(identityResolution.supported, false);
  if (identityResolution.supported) assert.fail("mobile agent unexpectedly resolved as supported");
  assert.equal(identityResolution.reason, "mobile-agent-unsupported");
  assert.equal(identityResolution.resolvedProfileId, "desktop-agent");
  assert.throws(
    () => resolveGameplayTuning({ controlMode: "agent", isMobile: true }),
    /unsupported profile: mobile-agent-unsupported/,
  );
});

test("registry, profiles, nested records, and tuples are immutable", () => {
  assertDeepFrozen(GAMEPLAY_TUNINGS);
  assertDeepFrozen(DESKTOP_HUMAN_BALANCE_BASELINE);

  assert.throws(() => {
    (DESKTOP_HUMAN_GAMEPLAY_TUNING.enemy.combat.reactionTimeSByTier as unknown as number[])[0] = 0;
  }, TypeError);
  assert.throws(() => {
    (DESKTOP_HUMAN_GAMEPLAY_TUNING.flow as unknown as { intermissionDurationS: number })
      .intermissionDurationS = 0;
  }, TypeError);
  assert.equal(DESKTOP_HUMAN_GAMEPLAY_TUNING.enemy.combat.reactionTimeSByTier[0], 0.95);
  assert.equal(DESKTOP_HUMAN_GAMEPLAY_TUNING.flow.intermissionDurationS, 5);
});

test("canonical shared baseline encodes the approved progressive difficulty", () => {
  const tuning = DESKTOP_HUMAN_GAMEPLAY_TUNING;

  assert.deepEqual(tuning.waves.tierProgression.waveBands, [
    { minWave: 1, maxWaveInclusive: 2, tier: 0 },
    { minWave: 3, maxWaveInclusive: 4, tier: 1 },
    { minWave: 5, maxWaveInclusive: 6, tier: 2 },
    { minWave: 7, maxWaveInclusive: 8, tier: 3 },
    { minWave: 9, maxWaveInclusive: 10, tier: 4 },
    { minWave: 11, maxWaveInclusive: null, tier: 5 },
  ]);
  assert.deepEqual(tuning.waves.tierProgression.elapsedTierBonusThresholdsS, []);
  assert.deepEqual(tuning.waves.simultaneousAttackerLimitByTier, [1, 2, 2, 3, 3, 4]);
  assert.deepEqual(tuning.waves.burstStartStaggerMsByTier, [450, 400, 350, 300, 250, 200]);
  assert.deepEqual(tuning.waves.pressure.waveBands, [
    { minWave: 1, maxWaveInclusive: 2, searchStartS: 30, fullPressureS: 75 },
    { minWave: 3, maxWaveInclusive: 4, searchStartS: 25, fullPressureS: 60 },
    { minWave: 5, maxWaveInclusive: 6, searchStartS: 20, fullPressureS: 50 },
    { minWave: 7, maxWaveInclusive: null, searchStartS: 15, fullPressureS: 40 },
  ]);

  assert.equal(tuning.enemy.combat.damagePerHit, 20);
  assert.equal(tuning.enemy.combat.spreadModel, "circular");
  assert.deepEqual(tuning.enemy.combat.reactionTimeSByTier, [0.95, 0.85, 0.72, 0.6, 0.48, 0.4]);
  assert.deepEqual(tuning.enemy.combat.spreadDegByTier, [13, 11, 9, 8, 7, 6.5]);
  assert.equal(tuning.enemy.combat.requiresAimAlignment, true);
  assert.equal(tuning.enemy.combat.requiresDirectSightToFire, true);
  assert.equal(tuning.enemy.combat.aimToleranceDeg, 8);
  assert.equal(tuning.enemy.combat.movingSpreadMultiplier, 1.6);
  assert.deepEqual(tuning.enemy.combat.postMovementSettleSByTier, [0.2, 0.2, 0.2, 0, 0, 0]);

  assert.equal(tuning.enemy.perception.visionConeDeg, 120);
  assert.equal(tuning.enemy.perception.proximityAwarenessM, 4);
  assert.equal(tuning.enemy.perception.lineOfSightBreakGraceS, 0.175);
  assert.deepEqual(tuning.enemy.perception.reacquire, { enabled: true, minimumDelayS: 0.2 });
  assert.equal(tuning.enemy.perception.hearing.crouchRangeMultiplier, 0.25);

  assert.deepEqual(tuning.player.economy, {
    maxHealth: 100,
    waveStartHealth: 100,
    magazineCapacity: 30,
    waveStartReserve: 120,
    reserveCapacity: 150,
    killHeal: 8,
    killReserveAmmo: 6,
    regeneration: { enabled: false, delayS: 0, healthPerS: 0, cap: 100 },
    resetHealthEachWave: true,
    resetAmmoEachWave: true,
    resetOvershieldEachWave: false,
  });
  assert.deepEqual(tuning.buffs.pity, {
    enabled: true,
    maxConsecutiveMisses: 3,
    carryAcrossWaves: true,
  });
  assert.deepEqual(tuning.buffs.selection, {
    rng: "seeded",
    recentExclusionCount: 2,
    carryAcrossWaves: true,
  });
  assert.deepEqual(tuning.buffs.waveCarry, {
    activeBuffs: true,
    droppedOrbs: true,
    bankWaveClosingDrop: true,
  });
  assert.equal(tuning.buffs.speedMultiplier, 1.2);
  assert.equal(tuning.buffs.rapidFireIntervalS, 0.08);
  assert.equal(tuning.buffs.rapidReloadSpeedMultiplier, 1.35);
  assert.equal(tuning.buffs.shieldHealth, 50);
  assert.deepEqual(tuning.buffs.perfectWave, { mode: "single-deterministic", durationS: 15 });
  assert.deepEqual(tuning.flow, {
    intermissionDurationS: 5,
    skipAvailableAfterS: 2,
    autoAdvance: true,
    showRoundSummary: true,
    freezeSimulationDuringIntermission: true,
    deathRestart: {
      autoRespawnS: null,
      restartOnBackdropClick: false,
      releasePointerLock: true,
    },
  });
});

test("all profiles share the exact Desktop Human balance baseline", () => {
  for (const tuning of Object.values(GAMEPLAY_TUNINGS)) {
    assert.equal(tuning.waves, DESKTOP_HUMAN_BALANCE_BASELINE.waves);
    assert.equal(tuning.enemy, DESKTOP_HUMAN_BALANCE_BASELINE.enemy);
    assert.equal(tuning.player, DESKTOP_HUMAN_BALANCE_BASELINE.player);
    assert.equal(tuning.buffs, DESKTOP_HUMAN_BALANCE_BASELINE.buffs);
    assert.equal(tuning.flow, DESKTOP_HUMAN_BALANCE_BASELINE.flow);
    assert.deepEqual(
      {
        waves: tuning.waves,
        enemy: tuning.enemy,
        player: tuning.player,
        buffs: tuning.buffs,
        flow: tuning.flow,
      },
      DESKTOP_HUMAN_BALANCE_BASELINE,
    );
  }

  // Touch availability is a platform capability, not a balance divergence.
  assert.equal(MOBILE_HUMAN_GAMEPLAY_TUNING.touch.enabled, true);
  assert.equal(DESKTOP_HUMAN_GAMEPLAY_TUNING.touch.enabled, false);
  assert.equal(DESKTOP_AGENT_GAMEPLAY_TUNING.touch.enabled, false);
});

test("shared score validation bounds track the fastest baseline mechanics", () => {
  const tunings = Object.values(GAMEPLAY_TUNINGS);
  assert.equal(
    SHARED_CHAMPION_FIRE_INTERVAL_S,
    Math.min(...tunings.map((tuning) => tuning.buffs.rapidFireIntervalS)),
  );
  for (const tuning of tunings) {
    assert.equal(tuning.waves.enemiesPerWave, SHARED_CHAMPION_WAVE_ENEMY_COUNT);
  }
});

test("baseline fingerprint forces every competitive revision to move with mechanics", () => {
  const actualFingerprint = createHash("sha256")
    .update(JSON.stringify(DESKTOP_HUMAN_BALANCE_BASELINE))
    .digest("hex")
    .slice(0, 12);

  assert.equal(actualFingerprint, GAMEPLAY_BALANCE_BASELINE_FINGERPRINT);
  for (const tuning of Object.values(GAMEPLAY_TUNINGS)) {
    assert.match(
      tuning.identity.tuningRevision,
      new RegExp(`-baseline-${actualFingerprint}-r\\d+$`),
      `${tuning.identity.profileId} must create a new board when the baseline fingerprint changes`,
    );
  }
});

test("validation reports unsafe numeric changes", () => {
  const invalid = structuredClone(DESKTOP_HUMAN_GAMEPLAY_TUNING) as unknown as GameplayTuning;
  (invalid.enemy.combat as unknown as { damagePerHit: number }).damagePerHit = -1;
  (invalid.waves as unknown as { enemiesPerWave: number }).enemiesPerWave = 11;
  (invalid.buffs as unknown as { dropChancePerKill: number }).dropChancePerKill = 2;
  (invalid.flow as unknown as { skipAvailableAfterS: number }).skipAvailableAfterS = 6;
  (invalid.touch.aimAssist as unknown as { enabled: boolean }).enabled = true;

  const errors = validateGameplayTuning(invalid);
  assert.ok(errors.includes("enemy.combat.damagePerHit must be positive"));
  assert.ok(errors.includes("waves.enemiesPerWave is structural and must remain 10"));
  assert.ok(errors.includes("buffs.dropChancePerKill must be in [0, 1]"));
  assert.ok(errors.includes("flow.skipAvailableAfterS must be within the intermission"));
  assert.ok(errors.includes("touch.aimAssist.enabled is unsupported by the runtime"));
  assert.equal(Object.isFrozen(errors), true);
});

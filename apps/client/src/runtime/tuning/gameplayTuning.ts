import {
  GAMEPLAY_PROFILE_IDENTITIES,
  GAMEPLAY_PROFILE_IDS,
  resolveGameplayProfileIdentity,
  type GameplayProfileId,
  type GameplayProfileIdentity,
  type GameplayProfileResolutionInput,
} from "../../../../shared/gameplayProfile";
import { SHARED_CHAMPION_WAVE_ENEMY_COUNT } from "../../../../shared/highScore";

type Atomic = string | number | boolean | bigint | symbol | null | undefined;

/** Compile-time counterpart to the runtime deep freeze applied to every profile. */
export type DeepReadonly<T> =
  T extends Atomic ? T
    : T extends readonly unknown[] ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export type TierTuple<T> = readonly [T, T, T, T, T, T];
export type CountRange = readonly [minimum: number, maximum: number];
export type GameplayValidationStatus = "approved" | "experimental";

export type GameplayTuning = DeepReadonly<{
  identity: GameplayProfileIdentity;
  displayName: string;
  validationStatus: GameplayValidationStatus;
  waves: {
    enemiesPerWave: number;
    tierProgression: {
      waveBands: readonly {
        minWave: number;
        maxWaveInclusive: number | null;
        tier: number;
      }[];
      elapsedTierBonusThresholdsS: readonly number[];
      maxTier: number;
    };
    pressure: {
      basis: "wave-elapsed";
      waveBands: readonly {
        minWave: number;
        maxWaveInclusive: number | null;
        searchStartS: number;
        fullPressureS: number;
      }[];
    };
    simultaneousAttackerLimitByTier: TierTuple<number>;
    burstStartStaggerMsByTier: TierTuple<number>;
  };
  enemy: {
    combat: {
      maxHealth: number;
      damagePerHit: number;
      spreadModel: "circular" | "legacy-horizontal";
      reactionTimeSByTier: TierTuple<number>;
      spreadDegByTier: TierTuple<number>;
      shotIntervalSByTier: TierTuple<number>;
      reloadTimeSByTier: TierTuple<number>;
      maxTurnDegPerSByTier: TierTuple<number>;
      burstByTier: TierTuple<{
        longRange: CountRange;
        midRange: CountRange;
        closeRange: CountRange;
      }>;
      burstCooldownBands: readonly {
        minimumDistanceM: number;
        cooldownS: number;
      }[];
      magazineCapacity: number;
      reserveStart: number;
      requiresAimAlignment: boolean;
      requiresDirectSightToFire: boolean;
      aimToleranceDeg: number;
      movingSpreadMultiplier: number;
      postMovementSettleSByTier: TierTuple<number>;
    };
    perception: {
      visionConeDeg: number;
      proximityAwarenessM: number;
      visionRangeMByTier: TierTuple<number>;
      memorySByTier: TierTuple<number>;
      sharedAlertRadiusMByTier: TierTuple<number>;
      lineOfSightBreakGraceS: number;
      reacquire: {
        enabled: boolean;
        minimumDelayS: number;
      };
      hearing: {
        gunshotRangeM: number;
        footstepBaseRangeM: number;
        footstepSpeedBonusRangeM: number;
        crouchRangeMultiplier: number;
      };
    };
  };
  player: {
    economy: {
      maxHealth: number;
      waveStartHealth: number;
      magazineCapacity: number;
      waveStartReserve: number;
      reserveCapacity: number;
      killHeal: number;
      killReserveAmmo: number;
      regeneration: {
        enabled: boolean;
        delayS: number;
        healthPerS: number;
        cap: number;
      };
      resetHealthEachWave: boolean;
      resetAmmoEachWave: boolean;
      resetOvershieldEachWave: boolean;
    };
  };
  buffs: {
    dropChancePerKill: number;
    pity: {
      enabled: boolean;
      maxConsecutiveMisses: number | null;
      carryAcrossWaves: boolean;
    };
    selection: {
      rng: "seeded";
      recentExclusionCount: number;
      carryAcrossWaves: boolean;
    };
    waveCarry: {
      activeBuffs: boolean;
      droppedOrbs: boolean;
      bankWaveClosingDrop: boolean;
    };
    standardDurationS: number;
    orbLifetimeS: number;
    speedMultiplier: number;
    rapidFireIntervalS: number;
    rapidReloadSpeedMultiplier: number;
    unlimitedAmmo: boolean;
    shieldHealth: number;
    perfectWave: {
      mode: "single-deterministic" | "all-four";
      durationS: number;
    };
  };
  flow: {
    intermissionDurationS: number;
    skipAvailableAfterS: number | null;
    autoAdvance: boolean;
    showRoundSummary: boolean;
    freezeSimulationDuringIntermission: boolean;
    deathRestart: {
      autoRespawnS: number | null;
      restartOnBackdropClick: boolean;
      releasePointerLock: boolean;
    };
  };
  touch: {
    enabled: boolean;
    joystickRadiusPx: number;
    moveDeadzone: number;
    lookSensitivityDegPerPixel: number;
    aimAssist: {
      enabled: boolean;
      slowdownConeDeg: number;
      slowdownMultiplier: number;
      magnetismDeg: number;
    };
  };
}>;

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }

  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value) as DeepReadonly<T>;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function validateTierNumbers(
  errors: string[],
  field: string,
  values: readonly number[],
  minimum: number,
  allowMinimum = true,
): void {
  if (values.length !== 6) errors.push(`${field} must contain exactly six tiers`);
  for (const value of values) {
    if (!isFiniteNumber(value) || (allowMinimum ? value < minimum : value <= minimum)) {
      errors.push(`${field} contains an invalid value: ${String(value)}`);
      return;
    }
  }
}

function validateWaveBands(
  errors: string[],
  field: string,
  bands: readonly { minWave: number; maxWaveInclusive: number | null }[],
): void {
  if (bands.length === 0) {
    errors.push(`${field} must contain at least one wave band`);
    return;
  }

  let expectedMinimum = 1;
  bands.forEach((band, index) => {
    if (!Number.isInteger(band.minWave) || band.minWave !== expectedMinimum) {
      errors.push(`${field}[${index}] must begin at wave ${expectedMinimum}`);
    }
    if (band.maxWaveInclusive === null) {
      if (index !== bands.length - 1) errors.push(`${field}[${index}] is open-ended before the last band`);
      return;
    }
    if (!Number.isInteger(band.maxWaveInclusive) || band.maxWaveInclusive < band.minWave) {
      errors.push(`${field}[${index}] has an invalid maximum wave`);
      return;
    }
    expectedMinimum = band.maxWaveInclusive + 1;
  });

  if (bands[bands.length - 1]?.maxWaveInclusive !== null) {
    errors.push(`${field} must finish with an open-ended band`);
  }
}

/** Runtime guard used both at module initialization and by focused tests/tooling. */
export function validateGameplayTuning(tuning: GameplayTuning): readonly string[] {
  const errors: string[] = [];
  const { waves, enemy, player, buffs, flow, touch } = tuning;

  if (!GAMEPLAY_PROFILE_IDS.includes(tuning.identity.profileId)) errors.push("identity.profileId is unknown");
  if (tuning.identity.tuningRevision.trim().length === 0) errors.push("identity.tuningRevision is empty");
  if (tuning.identity.balanceSeason.trim().length === 0) errors.push("identity.balanceSeason is empty");
  if (!Number.isInteger(waves.enemiesPerWave) || waves.enemiesPerWave < 1) errors.push("waves.enemiesPerWave must be a positive integer");
  if (waves.enemiesPerWave !== SHARED_CHAMPION_WAVE_ENEMY_COUNT) {
    errors.push(`waves.enemiesPerWave is structural and must remain ${SHARED_CHAMPION_WAVE_ENEMY_COUNT}`);
  }

  validateWaveBands(errors, "waves.tierProgression.waveBands", waves.tierProgression.waveBands);
  for (const [index, band] of waves.tierProgression.waveBands.entries()) {
    if (!Number.isInteger(band.tier) || band.tier < 0 || band.tier > 5) {
      errors.push(`waves.tierProgression.waveBands[${index}].tier must be in [0, 5]`);
    }
  }
  if (!Number.isInteger(waves.tierProgression.maxTier) || waves.tierProgression.maxTier < 0 || waves.tierProgression.maxTier > 5) {
    errors.push("waves.tierProgression.maxTier must be in [0, 5]");
  }
  let previousThreshold = 0;
  for (const threshold of waves.tierProgression.elapsedTierBonusThresholdsS) {
    if (!isFiniteNumber(threshold) || threshold <= previousThreshold) {
      errors.push("waves.tierProgression.elapsedTierBonusThresholdsS must be finite, positive, and ascending");
      break;
    }
    previousThreshold = threshold;
  }

  validateWaveBands(errors, "waves.pressure.waveBands", waves.pressure.waveBands);
  for (const [index, band] of waves.pressure.waveBands.entries()) {
    if (!isFiniteNumber(band.searchStartS) || band.searchStartS < 0 || !isFiniteNumber(band.fullPressureS) || band.fullPressureS <= band.searchStartS) {
      errors.push(`waves.pressure.waveBands[${index}] must satisfy 0 <= searchStartS < fullPressureS`);
    }
  }
  validateTierNumbers(errors, "waves.simultaneousAttackerLimitByTier", waves.simultaneousAttackerLimitByTier, 1);
  if (waves.simultaneousAttackerLimitByTier.some((limit) => !Number.isInteger(limit) || limit > waves.enemiesPerWave)) {
    errors.push("waves.simultaneousAttackerLimitByTier must contain integer limits no greater than enemiesPerWave");
  }
  validateTierNumbers(errors, "waves.burstStartStaggerMsByTier", waves.burstStartStaggerMsByTier, 0);

  const combat = enemy.combat;
  if (!isFiniteNumber(combat.maxHealth) || combat.maxHealth <= 0) errors.push("enemy.combat.maxHealth must be positive");
  if (!isFiniteNumber(combat.damagePerHit) || combat.damagePerHit <= 0) errors.push("enemy.combat.damagePerHit must be positive");
  validateTierNumbers(errors, "enemy.combat.reactionTimeSByTier", combat.reactionTimeSByTier, 0, false);
  validateTierNumbers(errors, "enemy.combat.spreadDegByTier", combat.spreadDegByTier, 0, false);
  validateTierNumbers(errors, "enemy.combat.shotIntervalSByTier", combat.shotIntervalSByTier, 0, false);
  validateTierNumbers(errors, "enemy.combat.reloadTimeSByTier", combat.reloadTimeSByTier, 0, false);
  validateTierNumbers(errors, "enemy.combat.maxTurnDegPerSByTier", combat.maxTurnDegPerSByTier, 0, false);
  validateTierNumbers(errors, "enemy.combat.postMovementSettleSByTier", combat.postMovementSettleSByTier, 0);
  if (typeof combat.requiresDirectSightToFire !== "boolean") errors.push("enemy.combat.requiresDirectSightToFire must be boolean");
  if (!isFiniteNumber(combat.aimToleranceDeg) || combat.aimToleranceDeg < 0 || combat.aimToleranceDeg > 180) errors.push("enemy.combat.aimToleranceDeg must be in [0, 180]");
  if (!isFiniteNumber(combat.movingSpreadMultiplier) || combat.movingSpreadMultiplier < 1) errors.push("enemy.combat.movingSpreadMultiplier must be at least 1");
  if (!Number.isInteger(combat.magazineCapacity) || combat.magazineCapacity < 1) errors.push("enemy.combat.magazineCapacity must be a positive integer");
  if (!Number.isInteger(combat.reserveStart) || combat.reserveStart < 0) errors.push("enemy.combat.reserveStart must be a non-negative integer");
  if (combat.burstByTier.length !== 6) errors.push("enemy.combat.burstByTier must contain exactly six tiers");
  for (const [tier, burst] of combat.burstByTier.entries()) {
    for (const [rangeName, range] of Object.entries(burst)) {
      if (!Number.isInteger(range[0]) || !Number.isInteger(range[1]) || range[0] < 1 || range[1] < range[0]) {
        errors.push(`enemy.combat.burstByTier[${tier}].${rangeName} is invalid`);
      }
    }
  }
  let previousDistance = Number.POSITIVE_INFINITY;
  for (const [index, band] of combat.burstCooldownBands.entries()) {
    if (!isFiniteNumber(band.minimumDistanceM) || band.minimumDistanceM < 0 || band.minimumDistanceM >= previousDistance || !isFiniteNumber(band.cooldownS) || band.cooldownS < 0) {
      errors.push(`enemy.combat.burstCooldownBands[${index}] is invalid or out of descending distance order`);
    }
    previousDistance = band.minimumDistanceM;
  }

  const perception = enemy.perception;
  if (!isFiniteNumber(perception.visionConeDeg) || perception.visionConeDeg <= 0 || perception.visionConeDeg > 360) errors.push("enemy.perception.visionConeDeg must be in (0, 360]");
  if (!isFiniteNumber(perception.proximityAwarenessM) || perception.proximityAwarenessM < 0) errors.push("enemy.perception.proximityAwarenessM must be non-negative");
  validateTierNumbers(errors, "enemy.perception.visionRangeMByTier", perception.visionRangeMByTier, 0, false);
  validateTierNumbers(errors, "enemy.perception.memorySByTier", perception.memorySByTier, 0);
  validateTierNumbers(errors, "enemy.perception.sharedAlertRadiusMByTier", perception.sharedAlertRadiusMByTier, 0);
  if (!isFiniteNumber(perception.lineOfSightBreakGraceS) || perception.lineOfSightBreakGraceS < 0) errors.push("enemy.perception.lineOfSightBreakGraceS must be non-negative");
  if (!isFiniteNumber(perception.reacquire.minimumDelayS) || perception.reacquire.minimumDelayS < 0) errors.push("enemy.perception.reacquire.minimumDelayS must be non-negative");
  for (const [field, value] of Object.entries(perception.hearing)) {
    if (!isFiniteNumber(value) || value < 0) errors.push(`enemy.perception.hearing.${field} must be non-negative`);
  }
  if (perception.hearing.crouchRangeMultiplier > 1) errors.push("enemy.perception.hearing.crouchRangeMultiplier must not amplify crouched footsteps");

  const economy = player.economy;
  for (const [field, value] of Object.entries(economy)) {
    if (typeof value === "number" && (!isFiniteNumber(value) || value < 0)) errors.push(`player.economy.${field} must be non-negative`);
  }
  if (economy.maxHealth <= 0 || economy.waveStartHealth > economy.maxHealth) errors.push("player.economy health bounds are invalid");
  if (!Number.isInteger(economy.magazineCapacity) || economy.magazineCapacity < 1) errors.push("player.economy.magazineCapacity must be a positive integer");
  if (!Number.isInteger(economy.waveStartReserve) || !Number.isInteger(economy.reserveCapacity) || economy.waveStartReserve > economy.reserveCapacity) errors.push("player.economy reserve bounds are invalid");
  if (
    typeof economy.resetHealthEachWave !== "boolean"
    || typeof economy.resetAmmoEachWave !== "boolean"
    || typeof economy.resetOvershieldEachWave !== "boolean"
  ) errors.push("player.economy reset flags must be boolean");
  for (const [field, value] of Object.entries(economy.regeneration)) {
    if (typeof value === "number" && (!isFiniteNumber(value) || value < 0)) {
      errors.push(`player.economy.regeneration.${field} must be non-negative`);
    }
  }
  if (typeof economy.regeneration.enabled !== "boolean") errors.push("player.economy.regeneration.enabled must be boolean");
  if (economy.regeneration.enabled && economy.regeneration.healthPerS <= 0) errors.push("enabled regeneration must have a positive rate");
  if (!economy.regeneration.enabled && (economy.regeneration.delayS !== 0 || economy.regeneration.healthPerS !== 0)) errors.push("disabled regeneration must have zero delay and rate");
  if (economy.regeneration.cap <= 0 || economy.regeneration.cap > economy.maxHealth) errors.push("player.economy.regeneration.cap must be within player health bounds");

  if (!isFiniteNumber(buffs.dropChancePerKill) || buffs.dropChancePerKill < 0 || buffs.dropChancePerKill > 1) errors.push("buffs.dropChancePerKill must be in [0, 1]");
  if (buffs.pity.enabled) {
    if (!Number.isInteger(buffs.pity.maxConsecutiveMisses) || (buffs.pity.maxConsecutiveMisses ?? 0) < 1) {
      errors.push("enabled buffs.pity must define a positive maxConsecutiveMisses");
    }
  } else if (buffs.pity.maxConsecutiveMisses !== null) {
    errors.push("disabled buffs.pity must use a null maxConsecutiveMisses");
  }
  if (!Number.isInteger(buffs.selection.recentExclusionCount) || buffs.selection.recentExclusionCount < 0) errors.push("buffs.selection.recentExclusionCount must be a non-negative integer");
  for (const [field, value] of Object.entries(buffs)) {
    if (typeof value === "number" && (!isFiniteNumber(value) || value <= 0) && field !== "dropChancePerKill") errors.push(`buffs.${field} must be positive`);
  }
  if (!isFiniteNumber(buffs.perfectWave.durationS) || buffs.perfectWave.durationS <= 0) errors.push("buffs.perfectWave.durationS must be positive");
  for (const [field, value] of Object.entries(buffs.waveCarry)) {
    if (typeof value !== "boolean") errors.push(`buffs.waveCarry.${field} must be boolean`);
  }

  if (!isFiniteNumber(flow.intermissionDurationS) || flow.intermissionDurationS < 0) errors.push("flow.intermissionDurationS must be non-negative");
  if (flow.skipAvailableAfterS !== null && (!isFiniteNumber(flow.skipAvailableAfterS) || flow.skipAvailableAfterS < 0 || flow.skipAvailableAfterS > flow.intermissionDurationS)) errors.push("flow.skipAvailableAfterS must be within the intermission");
  if (typeof flow.autoAdvance !== "boolean" || typeof flow.showRoundSummary !== "boolean" || typeof flow.freezeSimulationDuringIntermission !== "boolean") errors.push("flow flags must be boolean");
  if (flow.deathRestart.autoRespawnS !== null && (!isFiniteNumber(flow.deathRestart.autoRespawnS) || flow.deathRestart.autoRespawnS < 0)) errors.push("flow.deathRestart.autoRespawnS must be null or non-negative");
  if (typeof flow.deathRestart.restartOnBackdropClick !== "boolean" || typeof flow.deathRestart.releasePointerLock !== "boolean") errors.push("flow.deathRestart flags must be boolean");
  if (typeof touch.enabled !== "boolean") errors.push("touch.enabled must be boolean");
  if (!isFiniteNumber(touch.joystickRadiusPx) || touch.joystickRadiusPx <= 0) errors.push("touch.joystickRadiusPx must be positive");
  if (!isFiniteNumber(touch.moveDeadzone) || touch.moveDeadzone < 0 || touch.moveDeadzone >= 1) errors.push("touch.moveDeadzone must be in [0, 1)");
  if (!isFiniteNumber(touch.lookSensitivityDegPerPixel) || touch.lookSensitivityDegPerPixel <= 0) errors.push("touch.lookSensitivityDegPerPixel must be positive");
  if (!isFiniteNumber(touch.aimAssist.slowdownMultiplier) || touch.aimAssist.slowdownMultiplier <= 0 || touch.aimAssist.slowdownMultiplier > 1) errors.push("touch.aimAssist.slowdownMultiplier must be in (0, 1]");
  if (touch.aimAssist.enabled) errors.push("touch.aimAssist.enabled is unsupported by the runtime");
  if (!touch.aimAssist.enabled && (touch.aimAssist.slowdownConeDeg !== 0 || touch.aimAssist.slowdownMultiplier !== 1 || touch.aimAssist.magnetismDeg !== 0)) errors.push("disabled touch aim assist must use neutral values");

  return Object.freeze(errors);
}

function defineGameplayTuning(tuning: GameplayTuning): GameplayTuning {
  const errors = validateGameplayTuning(tuning);
  if (errors.length > 0) {
    throw new Error(`[gameplay-tuning:${tuning.identity.profileId}] ${errors.join("; ")}`);
  }
  return deepFreeze(tuning);
}

/**
 * Canonical balance baseline for every supported gameplay profile.
 *
 * Platform capabilities (currently touch availability) live outside this
 * object. Keeping every balance-bearing section behind one immutable value
 * makes equality the default and requires future divergence to be explicit.
 */
export const DESKTOP_HUMAN_BALANCE_BASELINE = deepFreeze({
  waves: {
    enemiesPerWave: 10,
    tierProgression: {
      waveBands: [
        { minWave: 1, maxWaveInclusive: 2, tier: 0 },
        { minWave: 3, maxWaveInclusive: 4, tier: 1 },
        { minWave: 5, maxWaveInclusive: 6, tier: 2 },
        { minWave: 7, maxWaveInclusive: 8, tier: 3 },
        { minWave: 9, maxWaveInclusive: 10, tier: 4 },
        { minWave: 11, maxWaveInclusive: null, tier: 5 },
      ],
      elapsedTierBonusThresholdsS: [],
      maxTier: 5,
    },
    pressure: {
      basis: "wave-elapsed",
      waveBands: [
        { minWave: 1, maxWaveInclusive: 2, searchStartS: 30, fullPressureS: 75 },
        { minWave: 3, maxWaveInclusive: 4, searchStartS: 25, fullPressureS: 60 },
        { minWave: 5, maxWaveInclusive: 6, searchStartS: 20, fullPressureS: 50 },
        { minWave: 7, maxWaveInclusive: null, searchStartS: 15, fullPressureS: 40 },
      ],
    },
    simultaneousAttackerLimitByTier: [1, 2, 2, 3, 3, 4],
    burstStartStaggerMsByTier: [450, 400, 350, 300, 250, 200],
  },
  enemy: {
    combat: {
      maxHealth: 100,
      damagePerHit: 20,
      spreadModel: "circular",
      reactionTimeSByTier: [0.95, 0.85, 0.72, 0.6, 0.48, 0.4],
      spreadDegByTier: [13, 11, 9, 8, 7, 6.5],
      shotIntervalSByTier: [0.22, 0.2, 0.18, 0.14, 0.13, 0.12],
      reloadTimeSByTier: [2.45, 2.45, 2.2, 2, 1.8, 1.6],
      maxTurnDegPerSByTier: [120, 150, 180, 220, 235, 245],
      burstByTier: [
        { longRange: [1, 1], midRange: [1, 2], closeRange: [2, 3] },
        { longRange: [1, 1], midRange: [1, 2], closeRange: [2, 4] },
        { longRange: [1, 2], midRange: [2, 3], closeRange: [3, 5] },
        { longRange: [1, 2], midRange: [2, 3], closeRange: [5, 6] },
        { longRange: [1, 2], midRange: [2, 3], closeRange: [4, 6] },
        { longRange: [1, 2], midRange: [2, 4], closeRange: [4, 6] },
      ],
      burstCooldownBands: [
        { minimumDistanceM: 18, cooldownS: 0.5 },
        { minimumDistanceM: 8, cooldownS: 0.34 },
        { minimumDistanceM: 0, cooldownS: 0.2 },
      ],
      magazineCapacity: 30,
      reserveStart: 90,
      requiresAimAlignment: true,
      requiresDirectSightToFire: true,
      aimToleranceDeg: 8,
      movingSpreadMultiplier: 1.6,
      postMovementSettleSByTier: [0.2, 0.2, 0.2, 0, 0, 0],
    },
    perception: {
      visionConeDeg: 120,
      proximityAwarenessM: 4,
      visionRangeMByTier: [80, 80, 85, 90, 90, 95],
      memorySByTier: [0.75, 1.25, 2, 3, 4.2, 5.5],
      sharedAlertRadiusMByTier: [18, 24, 30, 40, 55, 70],
      lineOfSightBreakGraceS: 0.175,
      reacquire: { enabled: true, minimumDelayS: 0.2 },
      hearing: {
        gunshotRangeM: 44,
        footstepBaseRangeM: 22,
        footstepSpeedBonusRangeM: 8,
        crouchRangeMultiplier: 0.25,
      },
    },
  },
  player: {
    economy: {
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
    },
  },
  buffs: {
    dropChancePerKill: 0.3,
    pity: {
      enabled: true,
      maxConsecutiveMisses: 3,
      carryAcrossWaves: true,
    },
    selection: {
      rng: "seeded",
      recentExclusionCount: 2,
      carryAcrossWaves: true,
    },
    waveCarry: {
      activeBuffs: true,
      droppedOrbs: true,
      bankWaveClosingDrop: true,
    },
    standardDurationS: 10,
    orbLifetimeS: 15,
    speedMultiplier: 1.2,
    rapidFireIntervalS: 0.08,
    rapidReloadSpeedMultiplier: 1.35,
    unlimitedAmmo: true,
    shieldHealth: 50,
    perfectWave: { mode: "single-deterministic", durationS: 15 },
  },
  flow: {
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
  },
} satisfies Pick<GameplayTuning, "waves" | "enemy" | "player" | "buffs" | "flow">);

const PLATFORM_INPUT_BASELINE = {
  joystickRadiusPx: 60,
  moveDeadzone: 0,
  lookSensitivityDegPerPixel: 0.15,
  aimAssist: {
    enabled: false,
    slowdownConeDeg: 0,
    slowdownMultiplier: 1,
    magnetismDeg: 0,
  },
} as const;

function defineBaselineProfile(input: {
  identity: GameplayProfileIdentity;
  displayName: string;
  touchEnabled: boolean;
}): GameplayTuning {
  return defineGameplayTuning({
    identity: input.identity,
    displayName: input.displayName,
    validationStatus: "approved",
    ...DESKTOP_HUMAN_BALANCE_BASELINE,
    touch: { enabled: input.touchEnabled, ...PLATFORM_INPUT_BASELINE },
  });
}

export const MOBILE_HUMAN_GAMEPLAY_TUNING = defineBaselineProfile({
  identity: GAMEPLAY_PROFILE_IDENTITIES["mobile-human"],
  displayName: "Mobile Human (Shared Baseline)",
  touchEnabled: true,
});

export const DESKTOP_HUMAN_GAMEPLAY_TUNING = defineBaselineProfile({
  identity: GAMEPLAY_PROFILE_IDENTITIES["desktop-human"],
  displayName: "Desktop Human (Canonical Baseline)",
  touchEnabled: false,
});

export const DESKTOP_AGENT_GAMEPLAY_TUNING = defineBaselineProfile({
  identity: GAMEPLAY_PROFILE_IDENTITIES["desktop-agent"],
  displayName: "Desktop Agent (Shared Baseline)",
  touchEnabled: false,
});

/*
 * Historical legacy values intentionally do not remain as live profile
 * defaults. A future profile divergence must start from the baseline above,
 * override only approved fields, bump that profile's revision, and document
 * the reason in docs/gameplay-balancing.md.
 */

/** Deeply frozen profiles share one immutable baseline; no mutable runtime inheritance occurs. */
export const GAMEPLAY_TUNINGS = deepFreeze({
  "mobile-human": MOBILE_HUMAN_GAMEPLAY_TUNING,
  "desktop-human": DESKTOP_HUMAN_GAMEPLAY_TUNING,
  "desktop-agent": DESKTOP_AGENT_GAMEPLAY_TUNING,
} satisfies Record<GameplayProfileId, GameplayTuning>);

for (const profileId of GAMEPLAY_PROFILE_IDS) {
  const tuning = GAMEPLAY_TUNINGS[profileId];
  if (tuning.identity.profileId !== profileId) {
    throw new Error(`[gameplay-tuning:${profileId}] registry key does not match identity`);
  }
}

export function getGameplayTuning(profileId: GameplayProfileId): GameplayTuning {
  return GAMEPLAY_TUNINGS[profileId];
}

/** Resolves a supported environment to a complete tuning object. */
export function resolveGameplayTuning(input: GameplayProfileResolutionInput): GameplayTuning {
  const resolution = resolveGameplayProfileIdentity(input);
  if (!resolution.supported) {
    throw new Error(`[gameplay-tuning] unsupported profile: ${resolution.reason}`);
  }
  return GAMEPLAY_TUNINGS[resolution.resolvedProfileId];
}

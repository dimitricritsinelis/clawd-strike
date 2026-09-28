import type { BuffType } from "../buffs/BuffTypes";
import type { GameplayTuning } from "../tuning/gameplayTuning";

export type BuffDisplayCopy = Readonly<{
  compactEffects: Readonly<Record<BuffType, string>>;
  detailedEffects: Readonly<Record<BuffType, string>>;
  standardDurationLabel: string;
  durationLabels: Readonly<Record<BuffType, string>>;
  perfectWaveDescription: string;
}>;

function formatDecimal(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
}

/** Build all player-facing buff numbers from the immutable run tuning. */
export function createBuffDisplayCopy(tuning: GameplayTuning): BuffDisplayCopy {
  const buffs = tuning.buffs;
  const speedPercent = (buffs.speedMultiplier - 1) * 100;
  const speedPercentLabel = formatDecimal(speedPercent, 1);
  const fireIntervalLabel = formatDecimal(buffs.rapidFireIntervalS, 3);
  const reloadSpeedLabel = formatDecimal(buffs.rapidReloadSpeedMultiplier, 2);
  const shieldLabel = formatDecimal(buffs.shieldHealth, 1);
  const standardDurationLabel = `${formatDecimal(buffs.standardDurationS, 1)}s`;
  const perfectWaveDurationLabel = formatDecimal(buffs.perfectWave.durationS, 1);
  const shieldPersists = buffs.shieldPersistsUntilBroken;
  const ammoCompact = buffs.freeReloads ? "Free Reloads" : "Standard Ammo";
  const ammoDetailed = buffs.freeReloads
    ? "Reloads never drain reserve ammo"
    : "Standard ammo and reload rules";
  const perfectWaveEffect = buffs.perfectWave.mode === "single-deterministic"
    ? "one deterministically selected buff"
    : shieldPersists
      ? "all four buffs simultaneously (Iron Skin lasts until broken)"
      : "all four buffs simultaneously";

  return Object.freeze({
    compactEffects: Object.freeze({
      speed_boost: `+${speedPercentLabel}% Speed`,
      rapid_fire: `${fireIntervalLabel}s Fire \u00B7 ${reloadSpeedLabel}\u00D7 Reload`,
      unlimited_ammo: ammoCompact,
      health_boost: `+${shieldLabel} HP`,
    }),
    detailedEffects: Object.freeze({
      speed_boost: `+${speedPercentLabel}% movement speed`,
      rapid_fire: `${fireIntervalLabel} s fire interval, ${reloadSpeedLabel}\u00D7 reload speed`,
      unlimited_ammo: ammoDetailed,
      health_boost: shieldPersists
        ? `+${shieldLabel} bonus health, lasts until shot off (absorbs damage first)`
        : `+${shieldLabel} overshield (absorbs damage first)`,
    }),
    standardDurationLabel,
    durationLabels: Object.freeze({
      speed_boost: standardDurationLabel,
      rapid_fire: standardDurationLabel,
      unlimited_ammo: standardDurationLabel,
      health_boost: shieldPersists ? "Until broken" : standardDurationLabel,
    }),
    perfectWaveDescription:
      `Score 10 headshot kills in a single wave to activate ${perfectWaveEffect} for ${perfectWaveDurationLabel} seconds at the start of the next wave.`,
  });
}

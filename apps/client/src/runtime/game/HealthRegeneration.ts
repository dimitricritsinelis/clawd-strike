export type HealthRegenerationConfig = {
  enabled: boolean;
  delayS: number;
  healthPerS: number;
  cap: number;
};

export type HealthRegenerationStep = {
  secondsSinceDamage: number;
  healthRestored: number;
};

/**
 * Advances profile-driven regeneration using simulation time only. Crossing
 * the delay within a frame heals only for the eligible tail of that frame.
 */
export function stepHealthRegeneration(
  config: HealthRegenerationConfig,
  currentHealth: number,
  secondsSinceDamage: number,
  deltaSeconds: number,
  damageTaken: number,
): HealthRegenerationStep {
  const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  if (Number.isFinite(damageTaken) && damageTaken > 0) {
    return { secondsSinceDamage: 0, healthRestored: 0 };
  }

  const previousIdleS = Number.isFinite(secondsSinceDamage)
    ? Math.max(0, secondsSinceDamage)
    : 0;
  const nextIdleS = previousIdleS + dt;
  if (
    !config.enabled
    || !Number.isFinite(currentHealth)
    || currentHealth <= 0
    || currentHealth >= config.cap
    || dt === 0
  ) {
    return { secondsSinceDamage: nextIdleS, healthRestored: 0 };
  }

  const eligibleBeforeS = Math.max(0, previousIdleS - config.delayS);
  const eligibleAfterS = Math.max(0, nextIdleS - config.delayS);
  const eligibleDeltaS = eligibleAfterS - eligibleBeforeS;
  const healthRestored = Math.min(
    config.cap - currentHealth,
    Math.max(0, config.healthPerS * eligibleDeltaS),
  );
  return { secondsSinceDamage: nextIdleS, healthRestored };
}

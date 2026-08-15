export const ENEMY_HITBOX_HEIGHT_M = 1.8;
export const ENEMY_LEG_THRESHOLD_RATIO = 0.25;
/**
 * Head zone starts here, as a fraction of ENEMY_HITBOX_HEIGHT_M.
 *
 * 0.78 put the boundary at 1.404 m — below the enemy's own 1.5 m eye line — so
 * shoulder and upper-chest hits paid the 4x headshot multiplier and killed
 * outright. 0.86 puts it at 1.548 m, just above the eye line, which is where a
 * head actually begins on a 1.8 m figure.
 */
export const ENEMY_HEAD_THRESHOLD_RATIO = 0.86;

export type EnemyHitZone = "legs" | "body" | "head";

export type EnemyHitDamage = {
  zone: EnemyHitZone;
  damage: number;
  isHeadshot: boolean;
};

export function resolveEnemyHitDamage(
  hitY: number,
  feetY: number,
  baseDamage = 25,
): EnemyHitDamage {
  const relativeHitY = hitY - feetY;
  if (relativeHitY > ENEMY_HITBOX_HEIGHT_M * ENEMY_HEAD_THRESHOLD_RATIO) {
    return { zone: "head", damage: baseDamage * 4, isHeadshot: true };
  }
  if (relativeHitY < ENEMY_HITBOX_HEIGHT_M * ENEMY_LEG_THRESHOLD_RATIO) {
    return { zone: "legs", damage: Math.round(baseDamage * 0.5), isHeadshot: false };
  }
  return { zone: "body", damage: baseDamage, isHeadshot: false };
}

export const ENEMY_HITBOX_HEIGHT_M = 1.8;
export const ENEMY_LEG_THRESHOLD_RATIO = 0.25;
export const ENEMY_HEAD_THRESHOLD_RATIO = 0.78;

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

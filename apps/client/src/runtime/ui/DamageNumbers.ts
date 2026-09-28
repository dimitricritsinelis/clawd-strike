/**
 * DamageNumbers — floating damage numbers that appear at enemy hit positions
 * and drift upward before fading out.
 *
 * Numbers are 2D overlays positioned via CSS `left`/`top` (screen %).
 * Colors: white = body, gold = headshot, red (#ff5a4a) = kill total.
 * Size scales with damage amount, capped at 2.0 rem.
 *
 * Stacking: when a spawn carries an enemyId and that enemy's number was last
 * added to within 0.4 s, the damage is added to the existing number instead
 * of spawning a new one. The fade restarts and the number punches from 1.25x
 * to 1.0x over 80 ms. markKill()/markKillNear() turn the stacked total red.
 */

import { PerspectiveCamera, Vector3 } from "three";

type DamageEntry = {
  el: HTMLDivElement;
  timerS: number;
  velY: number; // pixels per second, upward
  currentY: number;
  startX: number;
  enemyId: string | null;
  total: number;
  isHeadshot: boolean;
  isKill: boolean;
  lastAddClockS: number;
  punchElapsedS: number;
  freshPunch: boolean;
  worldX: number;
  worldY: number;
  worldZ: number;
};

export const DAMAGE_NUMBER_TUNING = Object.freeze({
  fadeS: 0.75,
  risePxPerS: 38,
  stackWindowS: 0.4,
  punchStartScale: 1.25,
  punchS: 0.08,
  baseRem: 1.0,
  remPerDamage: 1 / 120,
  maxRem: 2.0,
  bodyColor: "#ffffff",
  headshotColor: "#ffd040",
  killColor: "#ff5a4a",
  killNearMaxDistanceM: 1.5,
});

// Kept for readability of the update loop.
const FADE_DURATION_S = DAMAGE_NUMBER_TUNING.fadeS;
const RISE_SPEED_PX = DAMAGE_NUMBER_TUNING.risePxPerS;

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

/** Font size for a displayed total: 25 -> ~1.21 rem, 100 -> ~1.83 rem, capped at 2.0 rem. */
export function damageNumberFontRem(total: number): number {
  const { baseRem, remPerDamage, maxRem } = DAMAGE_NUMBER_TUNING;
  return Math.min(maxRem, baseRem + Math.max(0, total) * remPerDamage);
}

/** Punch scale `elapsedS` after a spawn or merge: ease-out 1.25 -> 1.0 over 80 ms. */
export function damageNumberPunchScale(elapsedS: number): number {
  const { punchStartScale, punchS } = DAMAGE_NUMBER_TUNING;
  const t = clamp01(elapsedS / punchS);
  const inv = 1 - t;
  return punchStartScale + (1 - punchStartScale) * (1 - inv * inv);
}

/** Opacity with `remainingS` left on the fade timer (power 1.4 ease-out). */
export function damageNumberOpacity(remainingS: number): number {
  return Math.pow(clamp01(remainingS / FADE_DURATION_S), 1.4);
}

/** True when a new hit on `enemyId` at `nowClockS` should merge into this stack. */
export function canStackDamage(
  stack: Readonly<{ enemyId: string | null; isKill: boolean; lastAddClockS: number; timerS: number }>,
  enemyId: string | null | undefined,
  nowClockS: number,
): boolean {
  if (enemyId === null || enemyId === undefined || enemyId === "") return false;
  if (stack.enemyId !== enemyId || stack.isKill || stack.timerS <= 0) return false;
  return nowClockS - stack.lastAddClockS <= DAMAGE_NUMBER_TUNING.stackWindowS + 1e-9;
}

export type DamageNumberSnapshot = Readonly<{
  enemyId: string | null;
  total: number;
  isHeadshot: boolean;
  isKill: boolean;
  timerS: number;
  scale: number;
  fontRem: number;
  color: string;
}>;

function colorFor(entry: Pick<DamageEntry, "isHeadshot" | "isKill">): string {
  if (entry.isKill) return DAMAGE_NUMBER_TUNING.killColor;
  return entry.isHeadshot ? DAMAGE_NUMBER_TUNING.headshotColor : DAMAGE_NUMBER_TUNING.bodyColor;
}

function shadowFor(entry: Pick<DamageEntry, "isHeadshot" | "isKill">): string {
  if (entry.isKill) return "0 0 12px rgba(255,90,74,0.6), 0 1px 6px rgba(0,0,0,0.9)";
  return entry.isHeadshot
    ? "0 0 12px rgba(255,200,60,0.6), 0 1px 6px rgba(0,0,0,0.9)"
    : "0 1px 5px rgba(0,0,0,0.75)";
}

export class DamageNumbers {
  private readonly root: HTMLDivElement;
  private readonly entries: DamageEntry[] = [];
  private readonly freeEls: HTMLDivElement[] = [];
  private readonly scratch = new Vector3();
  private clockS = 0;

  constructor(mountEl: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "25",
      overflow: "hidden",
    });
    mountEl.append(this.root);
  }

  prewarm(count = 1): void {
    const targetCount = Math.max(0, Math.ceil(count));
    while (this.freeEls.length < targetCount) {
      this.freeEls.push(document.createElement("div"));
    }
  }

  /**
   * Spawn a floating damage number at a 3D world position, or add to the
   * number already showing for the same enemy.
   * @param worldPos  3D position (enemy hit point)
   * @param camera    Main perspective camera (for projection)
   * @param damage    Damage value to display
   * @param isHeadshot True → gold colour + larger text; false → white
   * @param enemyId   Optional enemy id; hits on the same enemy within 0.4 s stack
   * @param isKill    Optional; true shows the (stacked) total as a red kill total
   */
  spawn(
    worldPos: { x: number; y: number; z: number },
    camera: PerspectiveCamera,
    damage: number,
    isHeadshot: boolean,
    enemyId?: string | null,
    isKill = false,
  ): void {
    const stack = this.findStack(enemyId);
    if (stack) {
      stack.total += damage;
      stack.isHeadshot = stack.isHeadshot || isHeadshot;
      stack.isKill = stack.isKill || isKill;
      stack.lastAddClockS = this.clockS;
      stack.worldX = worldPos.x;
      stack.worldY = worldPos.y;
      stack.worldZ = worldPos.z;
      this.restartPunch(stack);
      return;
    }

    // Project 3D position to NDC
    const v = this.scratch.set(worldPos.x, worldPos.y, worldPos.z);
    v.project(camera);

    // NDC to screen percent
    const screenX = (v.x * 0.5 + 0.5) * 100;
    const screenY = (-v.y * 0.5 + 0.5) * 100;

    // Cull if behind camera or out of view
    if (v.z > 1 || screenX < -5 || screenX > 105 || screenY < -5 || screenY > 105) return;

    // Horizontal jitter so separate numbers don't perfectly overlap
    const jitterX = (Math.random() - 0.5) * 3.5; // in % units
    const jitterY = (Math.random() - 0.5) * 1.5;

    const el = this.freeEls.pop() ?? document.createElement("div");

    Object.assign(el.style, {
      position: "absolute",
      left: `${(screenX + jitterX).toFixed(1)}%`,
      top: `${(screenY + jitterY).toFixed(1)}%`,
      fontFamily: '"Segoe UI", Tahoma, Verdana, sans-serif',
      pointerEvents: "none",
      userSelect: "none",
      opacity: "1",
      letterSpacing: "0.02em",
      willChange: "transform, opacity",
    });

    this.root.append(el);

    const startY = ((screenY + jitterY) / 100) * window.innerHeight;

    const entry: DamageEntry = {
      el,
      timerS: FADE_DURATION_S,
      velY: RISE_SPEED_PX,
      currentY: startY,
      startX: screenX + jitterX,
      enemyId: enemyId ? enemyId : null,
      total: damage,
      isHeadshot,
      isKill,
      lastAddClockS: this.clockS,
      punchElapsedS: 0,
      freshPunch: true,
      worldX: worldPos.x,
      worldY: worldPos.y,
      worldZ: worldPos.z,
    };
    this.entries.push(entry);
    this.applyContent(entry);
  }

  /**
   * Turn the live number for `enemyId` into a red kill total (restarting its
   * fade and punch). Returns false when no live number exists for that enemy.
   */
  markKill(enemyId: string): boolean {
    let target: DamageEntry | null = null;
    for (const entry of this.entries) {
      if (entry.enemyId !== enemyId || entry.isKill || entry.timerS <= 0) continue;
      if (!target || entry.lastAddClockS >= target.lastAddClockS) target = entry;
    }
    if (!target) return false;
    this.applyKill(target);
    return true;
  }

  /**
   * Kill-total fallback for callers that only know where the enemy died:
   * marks the live, not-yet-killed number whose last hit point is nearest to
   * `worldPos` on the ground plane, within `maxDistanceM`. Returns false when
   * nothing is close enough.
   */
  markKillNear(
    worldPos: { x: number; y: number; z: number },
    maxDistanceM: number = DAMAGE_NUMBER_TUNING.killNearMaxDistanceM,
  ): boolean {
    let target: DamageEntry | null = null;
    let bestDistSq = maxDistanceM * maxDistanceM;
    for (const entry of this.entries) {
      if (entry.isKill || entry.timerS <= 0) continue;
      const dx = entry.worldX - worldPos.x;
      const dz = entry.worldZ - worldPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq || (distSq === bestDistSq && target && entry.lastAddClockS > target.lastAddClockS)) {
        bestDistSq = distSq;
        target = entry;
      }
    }
    if (!target) return false;
    this.applyKill(target);
    return true;
  }

  /** Called every frame from bootstrap step(). */
  update(deltaSeconds: number): void {
    const dt = Math.max(0, deltaSeconds);
    this.clockS += dt;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i]!;
      entry.timerS -= dt;

      if (entry.timerS <= 0) {
        entry.el.remove();
        this.freeEls.push(entry.el);
        const lastIndex = this.entries.length - 1;
        if (i !== lastIndex) {
          this.entries[i] = this.entries[lastIndex]!;
        }
        this.entries.pop();
        continue;
      }

      // Rise
      entry.currentY -= entry.velY * dt;

      // The frame that spawned or merged shows the full punch.
      if (entry.freshPunch) {
        entry.freshPunch = false;
      } else if (entry.punchElapsedS < DAMAGE_NUMBER_TUNING.punchS) {
        entry.punchElapsedS += dt;
      }

      entry.el.style.top = `${((entry.currentY / window.innerHeight) * 100).toFixed(1)}%`;
      entry.el.style.opacity = damageNumberOpacity(entry.timerS).toFixed(3);
      entry.el.style.transform = this.transformFor(entry);
    }
  }

  /** Live numbers, for tests and debug readouts. */
  getSnapshot(): DamageNumberSnapshot[] {
    return this.entries.map((entry) => ({
      enemyId: entry.enemyId,
      total: entry.total,
      isHeadshot: entry.isHeadshot,
      isKill: entry.isKill,
      timerS: entry.timerS,
      scale: damageNumberPunchScale(entry.punchElapsedS),
      fontRem: damageNumberFontRem(entry.total),
      color: colorFor(entry),
    }));
  }

  clear(): void {
    while (this.entries.length > 0) {
      const entry = this.entries.pop()!;
      entry.el.remove();
      this.freeEls.push(entry.el);
    }
  }

  dispose(): void {
    for (const entry of this.entries) {
      entry.el.remove();
    }
    this.entries.length = 0;
    for (const el of this.freeEls) {
      el.remove();
    }
    this.freeEls.length = 0;
    this.root.remove();
  }

  private findStack(enemyId: string | null | undefined): DamageEntry | null {
    let found: DamageEntry | null = null;
    for (const entry of this.entries) {
      if (!canStackDamage(entry, enemyId, this.clockS)) continue;
      if (!found || entry.lastAddClockS >= found.lastAddClockS) found = entry;
    }
    return found;
  }

  private applyKill(entry: DamageEntry): void {
    entry.isKill = true;
    this.restartPunch(entry);
  }

  private restartPunch(entry: DamageEntry): void {
    entry.timerS = FADE_DURATION_S;
    entry.punchElapsedS = 0;
    entry.freshPunch = true;
    this.applyContent(entry);
  }

  private applyContent(entry: DamageEntry): void {
    const emphasized = entry.isHeadshot || entry.isKill;
    Object.assign(entry.el.style, {
      fontSize: `${damageNumberFontRem(entry.total).toFixed(2)}rem`,
      fontWeight: emphasized ? "800" : "700",
      color: colorFor(entry),
      textShadow: shadowFor(entry),
      opacity: "1",
      transform: this.transformFor(entry),
    });
    entry.el.textContent = String(entry.total);
  }

  private transformFor(entry: DamageEntry): string {
    return `translate(-50%, -50%) scale(${damageNumberPunchScale(entry.punchElapsedS).toFixed(3)})`;
  }
}

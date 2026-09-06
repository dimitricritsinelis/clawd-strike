import type { PerspectiveCamera, Scene } from "three";
import { BuffOrb, BuffOrbRenderer } from "./BuffOrb";
import {
  type BuffType,
  type BuffDefinition,
  BUFF_DROP_CHANCE,
  BUFF_DEFINITIONS,
  BUFF_TYPES,
  MAX_CONSECUTIVE_BUFF_NON_DROPS,
  ORB_LIFETIME_S,
  ORB_PICKUP_RADIUS_M,
  RALLYING_CRY_DURATION_S,
} from "./BuffTypes";
import { rayVsAabb } from "../sim/collision/rayVsAabb";
import { DeterministicRng } from "../utils/Rng";
import type { GameplayTuning } from "../tuning/gameplayTuning";

type ActiveBuff = {
  remainingS: number;
  durationS: number;
};

export type BuffPickupResult = "activated" | "refreshed";
export type BuffActivationContext = BuffPickupResult | "reapplied";

export type BuffManagerOptions = {
  /** Stable run seed. Runtime wiring can pass the owning gameplay seed later. */
  seed?: number;
  /** Optional injected root stream for deterministic tests or alternate run ownership. */
  rng?: DeterministicRng;
  /** Immutable profile values captured at run start. Defaults to the rebalanced behavior for focused tests. */
  tuning?: GameplayTuning["buffs"];
};

export type EnemyDeathBuffOptions = {
  /** Bank a successful final-kill drop instead of spawning an intermission orb. */
  waveClosing?: boolean;
};

export type BuffDropResult =
  | {
      dropped: false;
      forcedByPity: false;
    }
  | {
      dropped: true;
      type: BuffType;
      disposition: "orb" | "banked";
      forcedByPity: boolean;
    };

type PendingOrbSpawn = {
  position: { x: number; y: number; z: number };
  definition: BuffDefinition;
};

export type ActiveBuffSnapshot = {
  type: BuffType;
  remainingS: number;
  durationS: number;
};

export type BuffPerfSnapshot = {
  orbCount: number;
  orbCapacity: number;
  orbSpawnMs: number;
  orbUpdateMs: number;
};

export type BuffWaveCarryoverSnapshot = {
  activeBuffs: ActiveBuffSnapshot[];
  orbCount: number;
  pendingOrbCount: number;
  bankedWaveClosingBuffs: BuffType[];
};

export class BuffManager {
  private readonly scene: Scene;
  private orbRenderer: BuffOrbRenderer | null = null;
  private activeBuffs = new Map<BuffType, ActiveBuff>();
  private droppedOrbs: BuffOrb[] = [];

  // Deferred spawn queue to avoid frame-spike on enemy death
  private pendingSpawns: PendingOrbSpawn[] = [];
  private orbSpawnMs = 0;
  private orbUpdateMs = 0;

  // Headshot tracking for Rallying Cry
  private waveKills = 0;
  private waveHeadshots = 0;
  private previousWaveWasPerfectHeadshots = false;
  private _rallyingCryActive = false;
  private rallyingCryBuffType: BuffType | null = null;
  private lastRallyingCryBuffType: BuffType | null = null;

  // Callbacks
  private onBuffActivated: ((type: BuffType, context: BuffActivationContext) => void) | null = null;
  private onBuffExpired: ((type: BuffType) => void) | null = null;
  private onBuffPickedUp: ((type: BuffType, result: BuffPickupResult) => void) | null = null;

  // Pseudo-random buff distribution: track recent drops to guarantee variety
  private recentDrops: BuffType[] = [];
  private consecutiveNonDrops = 0;
  private readonly bankedWaveClosingBuffs: BuffType[] = [];
  private readonly dropRollRng: DeterministicRng;
  private readonly buffTypeRng: DeterministicRng;
  private readonly rallyingCryRng: DeterministicRng;
  private readonly dropChancePerKill: number;
  private readonly pityMaxConsecutiveMisses: number | null;
  private readonly carryPityAcrossWaves: boolean;
  private readonly recentExclusionCount: number;
  private readonly carrySelectionAcrossWaves: boolean;
  private readonly standardDurationS: number;
  private readonly orbLifetimeS: number;
  private readonly perfectWaveMode: "single-deterministic" | "all-four";
  private readonly perfectWaveDurationS: number;

  constructor(scene: Scene, options: BuffManagerOptions = {}) {
    this.scene = scene;
    const tuning = options.tuning;
    this.dropChancePerKill = tuning?.dropChancePerKill ?? BUFF_DROP_CHANCE;
    this.pityMaxConsecutiveMisses = tuning?.pity.enabled === false
      ? null
      : (tuning?.pity.maxConsecutiveMisses ?? MAX_CONSECUTIVE_BUFF_NON_DROPS);
    this.carryPityAcrossWaves = tuning?.pity.carryAcrossWaves ?? true;
    this.recentExclusionCount = tuning?.selection.recentExclusionCount ?? 2;
    this.carrySelectionAcrossWaves = tuning?.selection.carryAcrossWaves ?? true;
    this.standardDurationS = tuning?.standardDurationS ?? 10;
    this.orbLifetimeS = tuning?.orbLifetimeS ?? ORB_LIFETIME_S;
    this.perfectWaveMode = tuning?.perfectWave.mode ?? "single-deterministic";
    this.perfectWaveDurationS = tuning?.perfectWave.durationS ?? RALLYING_CRY_DURATION_S;
    const rootRng = options.rng ?? new DeterministicRng(options.seed ?? 1);
    // Independent streams keep a pity-forced drop from perturbing type or Rally
    // selection. A given kill sequence therefore remains reproducible.
    this.dropRollRng = rootRng.fork("buff-drop-roll");
    this.buffTypeRng = rootRng.fork("buff-drop-type");
    this.rallyingCryRng = rootRng.fork("rallying-cry");
  }

  setOnBuffActivated(cb: (type: BuffType, context: BuffActivationContext) => void): void {
    this.onBuffActivated = cb;
  }

  setOnBuffExpired(cb: (type: BuffType) => void): void {
    this.onBuffExpired = cb;
  }

  setOnBuffPickedUp(cb: (type: BuffType, result: BuffPickupResult) => void): void {
    this.onBuffPickedUp = cb;
  }

  /**
   * Called when any enemy dies. Uses a seeded 15% roll, with the seventh
   * consecutive would-be miss converted into a guaranteed drop.
   */
  onEnemyDeath(
    _enemyIndex: number,
    deathPosition: { x: number; y: number; z: number },
    options: EnemyDeathBuffOptions = {},
  ): BuffDropResult {
    const roll = this.dropRollRng.next();
    const rolledDrop = roll < this.dropChancePerKill;
    const forcedByPity = !rolledDrop
      && this.pityMaxConsecutiveMisses !== null
      && this.consecutiveNonDrops >= this.pityMaxConsecutiveMisses;
    if (!rolledDrop && !forcedByPity) {
      this.consecutiveNonDrops += 1;
      return { dropped: false, forcedByPity: false };
    }

    this.consecutiveNonDrops = 0;
    const randomType = this.pickPseudoRandomBuff();
    if (options.waveClosing === true) {
      this.bankedWaveClosingBuffs.push(randomType);
      return {
        dropped: true,
        type: randomType,
        disposition: "banked",
        forcedByPity,
      };
    }

    const def = BUFF_DEFINITIONS[randomType];
    // Defer orb creation to next update() to avoid frame spike during death processing
    this.pendingSpawns.push({
      position: { x: deathPosition.x, y: deathPosition.y, z: deathPosition.z },
      definition: def,
    });
    return {
      dropped: true,
      type: randomType,
      disposition: "orb",
      forcedByPity,
    };
  }

  /**
   * Record a kill for headshot tracking.
   */
  recordKill(isHeadshot: boolean): void {
    this.waveKills++;
    if (isHeadshot) this.waveHeadshots++;
  }

  /**
   * Check if previous wave had 10/10 headshots. Call at wave start.
   */
  checkRallyingCry(): boolean {
    return this.previousWaveWasPerfectHeadshots;
  }

  /** Compatibility/debug helper. Rallying Cry no longer calls this. */
  activateAllBuffs(durationOverrideS?: number): void {
    for (const type of BUFF_TYPES) {
      this.activateBuff(type, durationOverrideS);
    }
  }

  /**
   * Activate Rallying Cry as one deterministic 15-second buff. Repeated calls
   * while it is active refresh the same selection instead of accumulating all
   * four effects through duplicate activation.
   */
  activateRallyingCry(): BuffType | null {
    if (this.perfectWaveMode === "all-four") {
      this._rallyingCryActive = true;
      this.rallyingCryBuffType = null;
      this.activateAllBuffs(this.perfectWaveDurationS);
      return null;
    }
    const selected = this.rallyingCryBuffType ?? this.pickRallyingCryBuff();
    this._rallyingCryActive = true;
    this.rallyingCryBuffType = selected;
    this.activateBuff(selected, this.perfectWaveDurationS);
    return selected;
  }

  /**
   * Called at wave start. Finalize previous wave stats and reset.
   */
  onNewWave(): void {
    // Check if previous wave was 10/10 headshots
    this.previousWaveWasPerfectHeadshots = this.waveKills >= 10 && this.waveHeadshots >= 10;
    this.waveKills = 0;
    this.waveHeadshots = 0;
    if (!this.carryPityAcrossWaves) this.consecutiveNonDrops = 0;
    if (!this.carrySelectionAcrossWaves) this.recentDrops.length = 0;
    // Active buffs, physical orbs, pending spawns, pity progress and banked
    // final-kill rewards deliberately carry across the boundary. The runtime
    // pauses them by calling update(0) during intermission.
  }

  /**
   * Drops run-scoped headshot, pity, variety and banked-reward progress, then
   * rewinds the seeded streams. Call when a run ends and a fresh one begins —
   * otherwise the new run inherits reward progress it did not earn.
   *
   * Deliberately NOT part of clearAllBuffs(): the wave-boundary path clears
   * buffs and then reads previousWaveWasPerfectHeadshots to grant the reward.
   */
  resetWaveProgress(): void {
    this.waveKills = 0;
    this.waveHeadshots = 0;
    this.previousWaveWasPerfectHeadshots = false;
    this.consecutiveNonDrops = 0;
    this.recentDrops.length = 0;
    this.bankedWaveClosingBuffs.length = 0;
    this.lastRallyingCryBuffType = null;
    this.dropRollRng.reset();
    this.buffTypeRng.reset();
    this.rallyingCryRng.reset();
  }

  /**
   * Re-assert carried effects after Game resets its weapon/player modifiers at
   * a wave boundary. Consumers receive an explicit reapplication context so
   * consumable effects such as a partially depleted shield are not refilled.
   */
  reapplyActiveBuffEffects(): void {
    for (const type of this.activeBuffs.keys()) {
      this.onBuffActivated?.(type, "reapplied");
    }
  }

  /** Activate the oldest final-kill reward once real gameplay resumes. */
  activateBankedWaveClosingBuff(): BuffType | null {
    const type = this.bankedWaveClosingBuffs.shift() ?? null;
    if (!type) return null;
    this.activateBuff(type);
    return type;
  }

  /** Convenience boundary API for future runtime wiring. */
  beginActiveWave(): BuffType | null {
    this.reapplyActiveBuffEffects();
    return this.activateBankedWaveClosingBuff();
  }

  getWaveCarryoverSnapshot(): BuffWaveCarryoverSnapshot {
    return {
      activeBuffs: this.getActiveBuffs(),
      orbCount: this.droppedOrbs.length,
      pendingOrbCount: this.pendingSpawns.length,
      bankedWaveClosingBuffs: [...this.bankedWaveClosingBuffs],
    };
  }

  /**
   * Per-frame update. Ticks orbs, checks pickup, ticks buff timers.
   */
  update(
    deltaSeconds: number,
    playerPosition: { x: number; y: number; z: number },
    camera: PerspectiveCamera,
  ): void {
    const updateStartedAt = performance.now();
    this.orbSpawnMs = 0;
    const simulationDt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;

    // dt=0 is the pause/intermission contract: do not materialize pending
    // spawns, collect nearby orbs, age lifetimes, or burn active durations.
    if (simulationDt === 0) {
      this.orbUpdateMs = performance.now() - updateStartedAt;
      return;
    }

    if (this.pendingSpawns.length > 0) {
      const spawnStartedAt = performance.now();
      const spawns = this.pendingSpawns.splice(0, this.pendingSpawns.length);
      // The renderer is visual-only. Keeping simulation valid without a DOM
      // lets deterministic gameplay tests exercise lifetime and pickup rules.
      if (typeof document !== "undefined") {
        this.ensureOrbRenderer();
      }
      for (const spawn of spawns) {
        this.droppedOrbs.push(new BuffOrb(
          spawn.position,
          spawn.definition,
          this.orbLifetimeS,
        ));
      }
      this.orbSpawnMs = performance.now() - spawnStartedAt;
    }

    // Update orbs and check walk-over pickup
    for (let i = this.droppedOrbs.length - 1; i >= 0; i--) {
      const orb = this.droppedOrbs[i]!;
      const alive = orb.update(simulationDt);

      if (!alive) {
        // Orb expired
        this.droppedOrbs.splice(i, 1);
        continue;
      }

      // Walk-over pickup check
      const orbPos = orb.getPosition();
      const dx = playerPosition.x - orbPos.x;
      const dz = playerPosition.z - orbPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < ORB_PICKUP_RADIUS_M * ORB_PICKUP_RADIUS_M) {
        const dy = Math.abs(playerPosition.y - orbPos.y);
        if (dy < 2.0) {
          this.collectOrbAtIndex(i);
          continue;
        }
      }
    }

    this.orbRenderer?.update(this.droppedOrbs, camera, simulationDt);

    // Tick active buff timers
    for (const [type, buff] of this.activeBuffs) {
      buff.remainingS -= simulationDt;
      if (buff.remainingS <= 0) {
        this.activeBuffs.delete(type);
        this.onBuffExpired?.(type);
        if (this.rallyingCryBuffType === type) {
          this._rallyingCryActive = false;
          this.rallyingCryBuffType = null;
        }
      }
    }

    if (this._rallyingCryActive) {
      if (this.perfectWaveMode === "single-deterministic" && this.rallyingCryBuffType === null) {
        this._rallyingCryActive = false;
      } else if (this.perfectWaveMode === "all-four" && this.activeBuffs.size === 0) {
        this._rallyingCryActive = false;
      }
    }

    this.orbUpdateMs = performance.now() - updateStartedAt;
    this.disposeOrbRendererIfIdle();
  }

  /**
   * Raycast check against all orbs. Returns closest hit.
   */
  checkRaycastHit(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): { hit: true; orbIndex: number; distance: number } | { hit: false } {
    let closestDist = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < this.droppedOrbs.length; i++) {
      const orb = this.droppedOrbs[i]!;
      const dist = rayVsAabb(ox, oy, oz, dx, dy, dz, maxDist, orb.getAabb());
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0 && closestDist < maxDist) {
      return { hit: true, orbIndex: closestIndex, distance: closestDist };
    }
    return { hit: false };
  }

  /**
   * Collect orb by index. Removes from scene, activates buff.
   */
  collectOrbAtIndex(index: number): BuffType | null {
    if (index < 0 || index >= this.droppedOrbs.length) return null;
    const orb = this.droppedOrbs[index]!;
    const buffType = orb.getBuffType();
    this.droppedOrbs.splice(index, 1);
    const pickupResult = this.activateBuff(buffType);
    this.onBuffPickedUp?.(buffType, pickupResult);
    return buffType;
  }

  isBuffActive(type: BuffType): boolean {
    return this.activeBuffs.has(type);
  }

  getActiveBuffs(): ActiveBuffSnapshot[] {
    const result: ActiveBuffSnapshot[] = [];
    for (const [type, buff] of this.activeBuffs) {
      result.push({ type, remainingS: buff.remainingS, durationS: buff.durationS });
    }
    return result;
  }

  /** Check if Rallying Cry is active (explicitly activated via activateRallyingCry) */
  isRallyingCryActive(): boolean {
    return this._rallyingCryActive;
  }

  getRallyingCryBuffType(): BuffType | null {
    return this.rallyingCryBuffType;
  }

  clearOrbs(): void {
    this.droppedOrbs.length = 0;
    this.pendingSpawns.length = 0;
    this.orbRenderer?.clear();
    this.orbSpawnMs = 0;
    this.orbUpdateMs = 0;
    this.disposeOrbRendererIfIdle();
  }

  clearAllBuffs(): void {
    for (const [type] of this.activeBuffs) {
      this.onBuffExpired?.(type);
    }
    this.activeBuffs.clear();
    this._rallyingCryActive = false;
    this.rallyingCryBuffType = null;
    this.clearOrbs();
  }

  dispose(): void {
    this.clearAllBuffs();
    this.bankedWaveClosingBuffs.length = 0;
    this.orbRenderer?.dispose();
    this.orbRenderer = null;
  }

  getPerfSnapshot(): BuffPerfSnapshot {
    return {
      orbCount: this.droppedOrbs.length,
      orbCapacity: this.orbRenderer?.getCapacity() ?? 0,
      orbSpawnMs: this.orbSpawnMs,
      orbUpdateMs: this.orbUpdateMs,
    };
  }

  debugSetOrbCount(
    count: number,
    origin: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
  ): number {
    const nextCount = Math.max(0, Math.floor(count));
    this.clearOrbs();
    if (nextCount === 0) return 0;

    const forwardLength = Math.hypot(forward.x, forward.z);
    const normalizedX = forwardLength > 0.001 ? forward.x / forwardLength : 0;
    const normalizedZ = forwardLength > 0.001 ? forward.z / forwardLength : 1;
    const baseAngle = Math.atan2(normalizedZ, normalizedX);
    const orbsPerRing = 8;
    this.ensureOrbRenderer();

    for (let index = 0; index < nextCount; index += 1) {
      const ring = Math.floor(index / orbsPerRing);
      const ringIndex = index % orbsPerRing;
      const ringCount = Math.min(orbsPerRing, nextCount - ring * orbsPerRing);
      const span = ringCount <= 1 ? 0 : Math.min(Math.PI * 0.9, Math.PI * (0.35 + ringCount * 0.06));
      const angle = ringCount <= 1
        ? baseAngle
        : baseAngle - span * 0.5 + (span * ringIndex) / Math.max(1, ringCount - 1);
      const distance = 3.4 + ring * 1.2;
      const type = BUFF_TYPES[index % BUFF_TYPES.length]!;
      this.droppedOrbs.push(new BuffOrb(
        {
          x: origin.x + Math.cos(angle) * distance,
          y: origin.y,
          z: origin.z + Math.sin(angle) * distance,
        },
        BUFF_DEFINITIONS[type],
        this.orbLifetimeS,
      ));
    }

    return this.droppedOrbs.length;
  }

  debugActivateBuff(type: BuffType): BuffPickupResult {
    return this.activateBuff(type);
  }

  debugDeactivateBuff(type: BuffType): void {
    if (!this.activeBuffs.has(type)) return;
    this.activeBuffs.delete(type);
    this.onBuffExpired?.(type);
    if (this.rallyingCryBuffType === type) {
      this._rallyingCryActive = false;
      this.rallyingCryBuffType = null;
    }
  }

  private ensureOrbRenderer(): BuffOrbRenderer {
    if (!this.orbRenderer) {
      this.orbRenderer = new BuffOrbRenderer(this.scene);
    }
    return this.orbRenderer;
  }

  private disposeOrbRendererIfIdle(): void {
    if (this.orbRenderer && this.droppedOrbs.length === 0 && this.pendingSpawns.length === 0) {
      this.orbRenderer.dispose();
      this.orbRenderer = null;
    }
  }

  /**
   * Pick a buff type using pseudo-random distribution.
   * Excludes types that appeared in the last 2 drops to guarantee variety.
   */
  private pickPseudoRandomBuff(): BuffType {
    // Filter out types that appeared in the last 2 drops
    const recentSet = this.recentExclusionCount > 0
      ? new Set(this.recentDrops.slice(-this.recentExclusionCount))
      : new Set<BuffType>();
    let candidates = BUFF_TYPES.filter((t) => !recentSet.has(t));
    if (candidates.length === 0) candidates = [...BUFF_TYPES];
    const picked = candidates[this.buffTypeRng.int(0, candidates.length)]!;
    this.recentDrops.push(picked);
    // Keep queue bounded
    if (this.recentDrops.length > this.recentExclusionCount) this.recentDrops.shift();
    return picked;
  }

  private pickRallyingCryBuff(): BuffType {
    const candidates = this.lastRallyingCryBuffType === null
      ? [...BUFF_TYPES]
      : BUFF_TYPES.filter((type) => type !== this.lastRallyingCryBuffType);
    const selected = candidates[this.rallyingCryRng.int(0, candidates.length)]!;
    this.lastRallyingCryBuffType = selected;
    return selected;
  }

  private activateBuff(type: BuffType, durationOverrideS?: number): BuffPickupResult {
    const durationS = Math.max(0, durationOverrideS ?? this.standardDurationS);
    const existing = this.activeBuffs.get(type);
    if (existing) {
      // Refresh timer, then re-apply the effect. Refreshing the clock alone is
      // wrong for any buff whose effect can be consumed: an Iron Skin shield
      // that has already been shot off is never restored, so the player pays
      // for a pickup that visibly does nothing. Every activation handler is an
      // idempotent setter, so re-invoking it is safe for the other buffs too.
      existing.remainingS = Math.max(existing.remainingS, durationS);
      existing.durationS = Math.max(existing.durationS, durationS);
      this.onBuffActivated?.(type, "refreshed");
      return "refreshed";
    }
    this.activeBuffs.set(type, {
      remainingS: durationS,
      durationS,
    });
    this.onBuffActivated?.(type, "activated");
    return "activated";
  }
}

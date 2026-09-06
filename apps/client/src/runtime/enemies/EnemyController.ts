import { Vector3 } from "three";
import { AabbCollisionSolver, type MotionResult, type MutablePosition } from "../sim/collision/Solver";
import { rayVsAabb } from "../sim/collision/rayVsAabb";
import { raycastFirstHit, type RaycastAabbHit } from "../sim/collision/raycastAabb";
import type { WorldColliders } from "../sim/collision/WorldColliders";
import {
  DESKTOP_HUMAN_GAMEPLAY_TUNING,
  type GameplayTuning,
} from "../tuning/gameplayTuning";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import { createLineOfSightScratch, hasLineOfSight } from "./enemyLineOfSight";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const ENEMY_HALF_WIDTH_M = 0.3;
export const ENEMY_HEIGHT_M = 1.8;
export const ENEMY_EYE_HEIGHT_M = 1.5;
const ENEMY_ROTATE_SPEED_MPS = 3.15;
const ENEMY_INVESTIGATE_SPEED_MPS = 2.6;
const ENEMY_HOLD_SPEED_MPS = 1.1;
const ENEMY_PRESSURE_SPEED_MPS = 3.75;
const ENEMY_FALLBACK_SPEED_MPS = 3.2;
const ENEMY_PEEK_SPEED_MPS = 2.0;
const ENEMY_STUCK_THRESHOLD_S = 0.45;
/** How long a stuck bot steers sideways to slide off whatever blocked it. */
const STUCK_ESCAPE_DURATION_S = 0.6;
const STUCK_ESCAPE_FORWARD_BLEND = 0.35;
const STUCK_ESCAPE_SIDE_BLEND = 0.9;
const ENEMY_MIN_PROGRESS_M = 0.005;
const ENEMY_EXPECTED_PROGRESS_RATIO = 0.2;
/** Horizontal velocity ramp so starts, stops and strafe reversals do not snap. */
const ENEMY_ACCEL_MPS2 = 14;
const ENEMY_SWEEP_CHANGE_S_MIN = 0.9;
const ENEMY_SWEEP_CHANGE_S_MAX = 1.5;
const ENEMY_MIN_NODE_RADIUS_M = 0.6;
const ENEMY_RELOAD_DECISION_MAG = 6;
const GRAVITY_MPS2 = 20.0;
const MAX_SUBSTEP_DT_S = 1 / 120;
// Matches the runtime/player clamp. Movement is already sub-stepped below, so
// discarding everything above 50 ms only made AI clocks drift behind the wave
// director and player on slow frames.
const MAX_FRAME_DT_S = 0.1;
const BOUNDS_EPS = 0.001;
const ENEMY_MAX_STEP_M = 0.35;
const ENEMY_GROUND_SNAP_DOWN_M = 0.45;
const SURFACE_GROUND_EPSILON_M = 0.002;

type BurstRange = readonly [number, number];

export type EnemyId = string;
export type EnemyTeam = "player" | "enemy";
export type EnemyRole = "anchor" | "rifler" | "flanker" | "roamer";
export type EnemyState = "HOLD" | "OVERWATCH" | "ROTATE" | "INVESTIGATE" | "PEEK" | "PRESSURE" | "FALLBACK" | "RELOAD";

export type EnemyTierProfile = {
  tier: number;
  reactionTimeS: number;
  memoryS: number;
  spreadDeg: number;
  visionRangeM: number;
  sharedAlertRadiusM: number;
  maxTurnDegPerS: number;
  activeFlankers: number;
  pairSwing: boolean;
  collapse: boolean;
  mandatoryReloadFallback: boolean;
  maxLaneStack: number;
  shotIntervalS: number;
  reloadTimeS: number;
  longBurst: BurstRange;
  midBurst: BurstRange;
  closeBurst: BurstRange;
};

export const ENEMY_TIER_PROFILES: readonly EnemyTierProfile[] = [
  {
    tier: 0,
    reactionTimeS: 0.8,
    memoryS: 0.75,
    spreadDeg: 13.0,
    visionRangeM: 80,
    sharedAlertRadiusM: 18,
    maxTurnDegPerS: 120,
    activeFlankers: 0,
    pairSwing: false,
    collapse: false,
    mandatoryReloadFallback: false,
    maxLaneStack: 2,
    shotIntervalS: 0.22,
    reloadTimeS: 2.45,
    longBurst: [1, 1],
    midBurst: [1, 2],
    closeBurst: [2, 3],
  },
  {
    tier: 1,
    reactionTimeS: 0.6,
    memoryS: 1.25,
    spreadDeg: 9.5,
    visionRangeM: 80,
    sharedAlertRadiusM: 24,
    maxTurnDegPerS: 150,
    activeFlankers: 0,
    pairSwing: false,
    collapse: false,
    mandatoryReloadFallback: false,
    maxLaneStack: 2,
    shotIntervalS: 0.2,
    reloadTimeS: 2.45,
    longBurst: [1, 1],
    midBurst: [1, 2],
    closeBurst: [2, 4],
  },
  {
    tier: 2,
    reactionTimeS: 0.45,
    memoryS: 2.0,
    spreadDeg: 6.5,
    visionRangeM: 85,
    sharedAlertRadiusM: 30,
    maxTurnDegPerS: 180,
    activeFlankers: 1,
    pairSwing: false,
    collapse: false,
    mandatoryReloadFallback: false,
    maxLaneStack: 2,
    shotIntervalS: 0.18,
    reloadTimeS: 2.2,
    longBurst: [1, 2],
    midBurst: [2, 3],
    closeBurst: [3, 5],
  },
  {
    tier: 3,
    reactionTimeS: 0.3,
    memoryS: 3.0,
    spreadDeg: 4.5,
    visionRangeM: 90,
    sharedAlertRadiusM: 40,
    maxTurnDegPerS: 220,
    activeFlankers: 1,
    pairSwing: false,
    collapse: false,
    mandatoryReloadFallback: false,
    maxLaneStack: 2,
    shotIntervalS: 0.14,
    reloadTimeS: 2.0,
    longBurst: [1, 2],
    midBurst: [2, 3],
    closeBurst: [5, 6],
  },
  {
    tier: 4,
    reactionTimeS: 0.26,
    memoryS: 4.2,
    spreadDeg: 4.0,
    visionRangeM: 90,
    sharedAlertRadiusM: 55,
    maxTurnDegPerS: 235,
    activeFlankers: 1,
    pairSwing: true,
    collapse: false,
    mandatoryReloadFallback: true,
    maxLaneStack: 2,
    shotIntervalS: 0.13,
    reloadTimeS: 1.8,
    longBurst: [1, 2],
    midBurst: [2, 3],
    closeBurst: [4, 6],
  },
  {
    tier: 5,
    reactionTimeS: 0.22,
    memoryS: 5.5,
    spreadDeg: 3.7,
    visionRangeM: 95,
    sharedAlertRadiusM: 70,
    maxTurnDegPerS: 245,
    activeFlankers: 2,
    pairSwing: true,
    collapse: true,
    mandatoryReloadFallback: true,
    maxLaneStack: 3,
    shotIntervalS: 0.12,
    reloadTimeS: 1.6,
    longBurst: [1, 2],
    midBurst: [2, 4],
    closeBurst: [4, 6],
  },
] as const;

export function clampEnemyTier(value: number): number {
  return Math.max(0, Math.min(ENEMY_TIER_PROFILES.length - 1, Math.trunc(value)));
}

export function resolveEnemyTierProfile(tier: number, tuning?: GameplayTuning): EnemyTierProfile {
  const clampedTier = clampEnemyTier(tier);
  const baseProfile = ENEMY_TIER_PROFILES[clampedTier]!;
  if (!tuning) return baseProfile;

  const combat = tuning.enemy.combat;
  const perception = tuning.enemy.perception;
  const burst = combat.burstByTier[clampedTier]!;
  return {
    ...baseProfile,
    reactionTimeS: combat.reactionTimeSByTier[clampedTier]!,
    memoryS: perception.memorySByTier[clampedTier]!,
    spreadDeg: combat.spreadDegByTier[clampedTier]!,
    visionRangeM: perception.visionRangeMByTier[clampedTier]!,
    sharedAlertRadiusM: perception.sharedAlertRadiusMByTier[clampedTier]!,
    maxTurnDegPerS: combat.maxTurnDegPerSByTier[clampedTier]!,
    shotIntervalS: combat.shotIntervalSByTier[clampedTier]!,
    reloadTimeS: combat.reloadTimeSByTier[clampedTier]!,
    longBurst: burst.longRange,
    midBurst: burst.midRange,
    closeBurst: burst.closeRange,
  };
}

export function hasInsufficientEnemyMotion(
  movedDistanceM: number,
  desiredSpeedMps: number,
  deltaSeconds: number,
): boolean {
  if (desiredSpeedMps <= 0 || deltaSeconds <= 0) return false;
  const expectedDistanceM = desiredSpeedMps * deltaSeconds;
  const requiredProgressM = Math.max(
    ENEMY_MIN_PROGRESS_M,
    expectedDistanceM * ENEMY_EXPECTED_PROGRESS_RATIO,
  );
  return movedDistanceM < requiredProgressM;
}

export function isTargetInsideEnemyVisionCone(
  source: { x: number; z: number },
  yawRad: number,
  target: { x: number; z: number },
  visionConeDeg: number,
  proximityAwarenessM: number,
): boolean {
  const dx = target.x - source.x;
  const dz = target.z - source.z;
  const distanceM = Math.hypot(dx, dz);
  if (distanceM <= Math.max(0, proximityAwarenessM)) return true;
  if (distanceM <= 1e-6 || visionConeDeg >= 360) return true;

  const inverseDistance = 1 / distanceM;
  const targetDirX = dx * inverseDistance;
  const targetDirZ = dz * inverseDistance;
  const forwardX = -Math.sin(yawRad);
  const forwardZ = -Math.cos(yawRad);
  const minimumDot = Math.cos(Math.max(0, visionConeDeg) * 0.5 * DEG_TO_RAD);
  return forwardX * targetDirX + forwardZ * targetDirZ >= minimumDot;
}

export function resolveEnemyShotSpreadDeg(
  baseSpreadDeg: number,
  movementPenaltyActive: boolean,
  movingSpreadMultiplier: number,
): number {
  return baseSpreadDeg * (movementPenaltyActive ? Math.max(1, movingSpreadMultiplier) : 1);
}

/**
 * Applies a deterministic, area-uniform sample inside a circular aim cone.
 * The caller supplies both random samples so tests and seeded runtimes share
 * the exact same geometry without introducing an unseeded randomness path.
 */
export function applyCircularConeSpread(
  direction: { x: number; y: number; z: number },
  spreadDeg: number,
  radialSample: number,
  angleSample: number,
  out = new Vector3(),
): Vector3 {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length <= 1e-8 || spreadDeg <= 0) {
    return out.set(direction.x, direction.y, direction.z).normalize();
  }

  const fx = direction.x / length;
  const fy = direction.y / length;
  const fz = direction.z / length;

  // forward x world-up gives a stable horizontal basis except when looking
  // nearly vertical, where world-right avoids the degeneracy.
  let rx: number;
  let ry: number;
  let rz: number;
  if (Math.abs(fy) < 0.999) {
    rx = -fz;
    ry = 0;
    rz = fx;
  } else {
    rx = 0;
    ry = fz;
    rz = -fy;
  }
  const rightLength = Math.hypot(rx, ry, rz);
  rx /= rightLength;
  ry /= rightLength;
  rz /= rightLength;

  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  const radius = Math.tan(spreadDeg * DEG_TO_RAD) * Math.sqrt(clamp01(radialSample));
  const angle = Math.PI * 2 * clamp01(angleSample);
  const horizontalOffset = Math.cos(angle) * radius;
  const verticalOffset = Math.sin(angle) * radius;

  return out.set(
    fx + rx * horizontalOffset + ux * verticalOffset,
    fy + ry * horizontalOffset + uy * verticalOffset,
    fz + rz * horizontalOffset + uz * verticalOffset,
  ).normalize();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export type EnemyTarget = {
  id: string;
  team: EnemyTeam;
  position: { x: number; y: number; z: number };
  health: number;
  /**
   * Height above the target's feet that shooters aim at. This must track the
   * target's CURRENT stance: aiming at a fixed 1.5 m sent every shot straight
   * over a crouching player, whose collision box only reaches 1.4 m, making
   * crouch a total immunity to enemy fire at close range.
   */
  aimHeightM: number;
};

export type EnemyAabb = {
  id: EnemyId;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export type EnemyDirective = {
  role: EnemyRole;
  state: EnemyState;
  tier: number;
  tierProfile: EnemyTierProfile;
  assignedNodeId: string | null;
  targetNodeId: string | null;
  movePoint: { x: number; z: number } | null;
  holdPoint: { x: number; z: number } | null;
  focusPoint: { x: number; y: number; z: number } | null;
  peekOffsetM: number;
  /** Planner intent before the manager applies per-frame attacker tokens. */
  tacticalAllowFire?: boolean;
  allowFire: boolean;
  aggressive: boolean;
  hasDirectSight: boolean;
  directiveAgeS: number;
  debugReason: string;
};

export type EnemyPerceptionEvent = {
  kind: "seen-player";
  enemyId: string;
  targetId: string;
  position: { x: number; y: number; z: number };
  distanceM: number;
};

export type EnemyDebugSnapshot = {
  id: string;
  name: string;
  team: EnemyTeam;
  role: EnemyRole;
  state: EnemyState;
  tier: number;
  health: number;
  reloading: boolean;
  mag: number;
  reserve: number;
  assignedNodeId: string | null;
  targetNodeId: string | null;
  memoryRemainingS: number;
  reactionRemainingS: number;
  reacquireRemainingS: number;
  lineOfSightBreakS: number;
  movementSpreadActive: boolean;
  movementSpreadRemainingS: number;
  burstShotsRemaining: number;
  debugReason: string;
  position: { x: number; y: number; z: number };
  movePoint: { x: number; z: number } | null;
  holdPoint: { x: number; z: number } | null;
  focusPoint: { x: number; y: number; z: number } | null;
  directSight: boolean;
  aimYawErrorDeg: number;
  directiveAgeS: number;
  targetNodeChangeCount: number;
  spawnValidation?: {
    spawnX: number;
    spawnY: number;
    spawnZ: number;
    actualZoneId: string | null;
    expectedZoneId: string | null;
    withinPlayableBounds: boolean;
    insideExpectedZone: boolean;
    blockingColliderIds: string[];
    elevated: boolean;
    valid: boolean;
    correctionKind: "none" | "same-lane-fallback" | "global-fallback";
    fallbackNodeId: string | null;
  } | null;
};

function resolveBurstCount(rng: DeterministicRng, range: BurstRange): number {
  const [minBurst, maxBurst] = range;
  const minValue = Math.max(1, Math.trunc(minBurst));
  const maxValue = Math.max(minValue, Math.trunc(maxBurst));
  return rng.int(minValue, maxValue + 1);
}

function resolveBurstCooldownS(
  distanceM: number,
  bands: GameplayTuning["enemy"]["combat"]["burstCooldownBands"],
): number {
  for (const band of bands) {
    if (distanceM > band.minimumDistanceM || band.minimumDistanceM === 0) {
      return band.cooldownS;
    }
  }
  return bands[bands.length - 1]?.cooldownS ?? 0;
}

function normalizeAngleRad(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

export class EnemyController {
  readonly id: EnemyId;
  readonly name: string;

  private readonly gameplayTuning: GameplayTuning;
  private readonly position: MutablePosition;
  private readonly aabb: EnemyAabb;
  private yaw = 0;
  private health = 0;
  private state: EnemyState = "HOLD";
  private role: EnemyRole = "rifler";
  private readonly team: EnemyTeam = "enemy";
  private dead = false;
  private lastHitWasHeadshot = false;

  private assignedNodeId: string | null = null;
  private targetNodeId: string | null = null;
  private debugReason = "spawn hold";

  private shootTimer = 0;
  private burstCooldownTimerS = 0;
  private burstShotsRemaining = 0;
  private firingThisFrame = false;
  private velocityY = 0;
  private grounded = false;
  private reactionTimerS = 0;
  private reacquireTimerS = 0;
  private lineOfSightBreakTimerS = 0;
  private hadDirectSightLastFrame = false;
  private memoryTimerS = 0;
  private lastKnownTargetPos: { x: number; y: number; z: number } | null = null;
  private lastVisibleTargetId: string | null = null;

  private mag = 0;
  private reserve = 0;
  private reloading = false;
  private reloadTimer = 0;

  private desiredVX = 0;
  private desiredVZ = 0;
  private velX = 0;
  private velZ = 0;
  private stuckEscapeTimerS = 0;
  private stuckEscapeDir = 1;
  private stuckTimer = 0;
  private peekDir = 1;
  private peekTimerS = 0;
  private sweepDir = 1;
  private sweepTimerS = 0;
  private footstepTimerS = 0;
  private movingForSpread = false;
  private movementSpreadTimerS = 0;
  private burstCompletedSinceLastStep = false;
  private currentTier = 0;

  private currentMovePoint: { x: number; z: number } | null = null;
  private currentHoldPoint: { x: number; z: number } | null = null;
  private currentFocusPoint: { x: number; y: number; z: number } | null = null;
  private directSight = false;
  private aimYawErrorDeg = 0;
  private currentDirectiveAgeS = 0;
  private targetNodeChangeCount = 0;

  private readonly solver: AabbCollisionSolver;
  private rng: DeterministicRng;
  private readonly motionResult: MotionResult = { hitX: false, hitY: false, hitZ: false, grounded: false };

  private readonly losScratch = createLineOfSightScratch();
  private readonly shotDir = new Vector3();
  private readonly shotHit: RaycastAabbHit = {
    distance: 0,
    point: new Vector3(),
    normal: new Vector3(),
    colliderId: "",
    colliderKind: "wall",
  };

  constructor(
    id: EnemyId,
    name: string,
    spawnX: number,
    spawnZ: number,
    seed: number,
    spawnY = 0,
    gameplayTuning: GameplayTuning = DESKTOP_HUMAN_GAMEPLAY_TUNING,
  ) {
    this.id = id;
    this.name = name;
    this.gameplayTuning = gameplayTuning;
    this.aabb = {
      id,
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 0,
      maxY: 0,
      maxZ: 0,
    };
    this.position = { x: spawnX, y: spawnY, z: spawnZ };
    this.health = gameplayTuning.enemy.combat.maxHealth;
    this.mag = gameplayTuning.enemy.combat.magazineCapacity;
    this.reserve = gameplayTuning.enemy.combat.reserveStart;
    this.solver = new AabbCollisionSolver(ENEMY_HALF_WIDTH_M, ENEMY_HEIGHT_M);
    this.rng = new DeterministicRng(deriveSubSeed(seed, id));
    this.shootTimer = this.rng.range(0.08, 0.22);
    this.peekTimerS = this.rollStrafeFlipS(0);
    this.sweepTimerS = this.rng.range(ENEMY_SWEEP_CHANGE_S_MIN, ENEMY_SWEEP_CHANGE_S_MAX);
  }

  private rollStrafeFlipS(tier: number): number {
    const meanS = this.gameplayTuning.enemy.movement.strafeFlipIntervalSByTier[clampEnemyTier(tier)]!;
    return meanS * this.rng.range(0.75, 1.25);
  }

  reset(spawnX: number, spawnZ: number, seed: number, spawnY = 0): void {
    this.position.x = spawnX;
    this.position.y = spawnY;
    this.position.z = spawnZ;

    this.yaw = 0;
    this.health = this.gameplayTuning.enemy.combat.maxHealth;
    this.state = "HOLD";
    this.role = "rifler";
    this.dead = false;
    this.lastHitWasHeadshot = false;
    this.assignedNodeId = null;
    this.targetNodeId = null;
    this.debugReason = "spawn hold";

    this.shootTimer = 0;
    this.burstCooldownTimerS = 0;
    this.burstShotsRemaining = 0;
    this.firingThisFrame = false;
    this.velocityY = 0;
    this.grounded = false;
    this.reactionTimerS = 0;
    this.reacquireTimerS = 0;
    this.lineOfSightBreakTimerS = 0;
    this.hadDirectSightLastFrame = false;
    this.memoryTimerS = 0;
    this.lastKnownTargetPos = null;
    this.lastVisibleTargetId = null;

    this.mag = this.gameplayTuning.enemy.combat.magazineCapacity;
    this.reserve = this.gameplayTuning.enemy.combat.reserveStart;
    this.reloading = false;
    this.reloadTimer = 0;

    this.desiredVX = 0;
    this.desiredVZ = 0;
    this.velX = 0;
    this.velZ = 0;
    this.stuckTimer = 0;
    this.stuckEscapeTimerS = 0;
    this.stuckEscapeDir = 1;
    this.peekDir = 1;
    this.peekTimerS = 0;
    this.sweepDir = 1;
    this.sweepTimerS = 0;
    this.footstepTimerS = 0;
    this.movingForSpread = false;
    this.movementSpreadTimerS = 0;
    this.burstCompletedSinceLastStep = false;
    this.currentTier = 0;
    this.currentMovePoint = null;
    this.currentHoldPoint = null;
    this.currentFocusPoint = null;
    this.directSight = false;
    this.aimYawErrorDeg = 0;
    this.currentDirectiveAgeS = 0;
    this.targetNodeChangeCount = 0;

    this.motionResult.hitX = false;
    this.motionResult.hitY = false;
    this.motionResult.hitZ = false;
    this.motionResult.grounded = false;

    this.rng = new DeterministicRng(deriveSubSeed(seed, this.id));
    this.shootTimer = this.rng.range(0.08, 0.22);
    this.peekTimerS = this.rollStrafeFlipS(0);
    this.sweepTimerS = this.rng.range(ENEMY_SWEEP_CHANGE_S_MIN, ENEMY_SWEEP_CHANGE_S_MAX);
  }

  step(
    deltaSeconds: number,
    directive: EnemyDirective,
    targets: readonly EnemyTarget[],
    worldColliders: WorldColliders,
    enemyAabbs: readonly EnemyAabb[],
    onEnemyShot: (targetId: string, damage: number) => void,
    onFootstep?: (distanceToPlayer: number) => void,
    onPerception?: (event: EnemyPerceptionEvent) => void,
  ): void {
    if (this.dead) return;

    this.firingThisFrame = false;
    this.role = directive.role;
    this.state = directive.state;
    this.currentTier = directive.tier;
    if (directive.targetNodeId !== this.targetNodeId) {
      this.targetNodeChangeCount += 1;
    }
    this.assignedNodeId = directive.assignedNodeId;
    this.targetNodeId = directive.targetNodeId;
    this.debugReason = directive.debugReason;
    this.currentMovePoint = directive.movePoint;
    this.currentHoldPoint = directive.holdPoint;
    this.currentFocusPoint = directive.focusPoint;
    this.currentDirectiveAgeS = directive.directiveAgeS;

    const clampedDt = Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DT_S);
    if (clampedDt <= 0) return;

    if (this.reloading) {
      this.reloadTimer += clampedDt;
      if (this.reloadTimer >= directive.tierProfile.reloadTimeS) {
        const needed = this.gameplayTuning.enemy.combat.magazineCapacity - this.mag;
        const moved = Math.min(needed, this.reserve);
        this.mag += moved;
        this.reserve -= moved;
        this.reloading = false;
        this.reloadTimer = 0;
      }
    }

    this.burstCooldownTimerS = Math.max(0, this.burstCooldownTimerS - clampedDt);
    this.peekTimerS -= clampedDt;
    if (this.peekTimerS <= 0) {
      this.peekDir *= -1;
      this.peekTimerS = this.rollStrafeFlipS(directive.tier);
    }
    this.sweepTimerS -= clampedDt;
    if (this.sweepTimerS <= 0) {
      this.sweepDir *= -1;
      this.sweepTimerS = this.rng.range(ENEMY_SWEEP_CHANGE_S_MIN, ENEMY_SWEEP_CHANGE_S_MAX);
    }

    const tierProfile = directive.tierProfile;
    const visibleTarget = directive.hasDirectSight ? this.findDirectSightTarget(targets) : null;
    this.directSight = visibleTarget !== null;
    if (visibleTarget) {
      const perception = this.gameplayTuning.enemy.perception;
      if (
        perception.reacquire.enabled
        && !this.hadDirectSightLastFrame
        && this.lineOfSightBreakTimerS > perception.lineOfSightBreakGraceS
      ) {
        this.reacquireTimerS = Math.max(
          this.reacquireTimerS,
          perception.reacquire.minimumDelayS,
        );
      }
      this.lineOfSightBreakTimerS = 0;
      this.hadDirectSightLastFrame = true;

      const dx = visibleTarget.position.x - this.position.x;
      const dz = visibleTarget.position.z - this.position.z;
      const distanceM = Math.hypot(dx, dz);
      this.lastKnownTargetPos = {
        x: visibleTarget.position.x,
        y: visibleTarget.position.y,
        z: visibleTarget.position.z,
      };
      this.memoryTimerS = tierProfile.memoryS;
      if (this.lastVisibleTargetId !== visibleTarget.id) {
        this.reactionTimerS = Math.max(this.reactionTimerS, tierProfile.reactionTimeS);
      }
      this.lastVisibleTargetId = visibleTarget.id;
      onPerception?.({
        kind: "seen-player",
        enemyId: this.id,
        targetId: visibleTarget.id,
        position: {
          x: visibleTarget.position.x,
          y: visibleTarget.position.y,
          z: visibleTarget.position.z,
        },
        distanceM,
      });
    } else {
      this.lineOfSightBreakTimerS += clampedDt;
      this.hadDirectSightLastFrame = false;
      this.reacquireTimerS = 0;
      this.reactionTimerS = Math.max(0, this.reactionTimerS - clampedDt);
      this.memoryTimerS = Math.max(0, this.memoryTimerS - clampedDt);
      if (this.memoryTimerS <= 0) {
        this.lastVisibleTargetId = null;
        this.lastKnownTargetPos = null;
      }
    }

    if (!visibleTarget && !this.reloading && this.reserve > 0 && this.mag <= ENEMY_RELOAD_DECISION_MAG) {
      this.reloading = true;
      this.reloadTimer = 0;
    }

    const turnTarget = this.applyDirectiveMovement(directive, visibleTarget);
    if (turnTarget) {
      this.turnTowardPoint(turnTarget.x, turnTarget.z, tierProfile.maxTurnDegPerS, clampedDt);
    } else {
      this.aimYawErrorDeg = 0;
    }

    const stepCount = Math.max(1, Math.ceil(clampedDt / MAX_SUBSTEP_DT_S));
    const stepDt = clampedDt / stepCount;
    const preX = this.position.x;
    const preZ = this.position.z;
    const maxDeltaV = ENEMY_ACCEL_MPS2 * clampedDt;
    const dvx = this.desiredVX - this.velX;
    const dvz = this.desiredVZ - this.velZ;
    const dvLen = Math.hypot(dvx, dvz);
    if (dvLen <= maxDeltaV) {
      this.velX = this.desiredVX;
      this.velZ = this.desiredVZ;
    } else {
      this.velX += (dvx / dvLen) * maxDeltaV;
      this.velZ += (dvz / dvLen) * maxDeltaV;
    }
    let vx = this.velX;
    let vz = this.velZ;

    // Stuck escape: flipping peek direction only helps a bot that is peeking.
    // A bot travelling into a prop or a wall corner keeps pushing straight at
    // it forever, and because the wave only ends when every bot dies, one
    // wedged bot can stall the whole run. Steering perpendicular to the blocked
    // heading lets it slide along the obstacle and re-path.
    if (this.stuckEscapeTimerS > 0) {
      const escapeX = -vz * this.stuckEscapeDir;
      const escapeZ = vx * this.stuckEscapeDir;
      vx = vx * STUCK_ESCAPE_FORWARD_BLEND + escapeX * STUCK_ESCAPE_SIDE_BLEND;
      vz = vz * STUCK_ESCAPE_FORWARD_BLEND + escapeZ * STUCK_ESCAPE_SIDE_BLEND;
    }

    for (let i = 0; i < stepCount; i += 1) {
      this.velocityY -= GRAVITY_MPS2 * stepDt;

      const previousX = this.position.x;
      const previousY = this.position.y;
      const previousZ = this.position.z;
      const wasGrounded = this.grounded;

      this.solver.moveAndCollide(
        this.position,
        vx * stepDt,
        vz * stepDt,
        this.velocityY * stepDt,
        worldColliders,
        this.motionResult,
      );

      if (worldColliders.hasTraversalSurfaces) {
        const surface = worldColliders.traversalSurfaces.sample(this.position.x, this.position.z, previousY);
        const surfaceRise = surface ? surface.elevationM - previousY : Number.POSITIVE_INFINITY;

        if (wasGrounded && surface && surfaceRise <= ENEMY_MAX_STEP_M && surfaceRise >= -ENEMY_GROUND_SNAP_DOWN_M) {
          this.position.y = surface.elevationM;
          this.velocityY = 0;
          this.grounded = true;
          this.motionResult.hitY = true;
          this.motionResult.grounded = true;
        } else if (wasGrounded && surface && surfaceRise > ENEMY_MAX_STEP_M) {
          this.position.x = previousX;
          this.position.z = previousZ;
          const previousSurface = worldColliders.traversalSurfaces.sample(previousX, previousZ, previousY);
          this.position.y = previousSurface?.elevationM ?? previousY;
          this.velocityY = 0;
          this.grounded = true;
          this.motionResult.hitX = Math.abs(vx) > 0.0001;
          this.motionResult.hitZ = Math.abs(vz) > 0.0001;
          this.motionResult.hitY = true;
          this.motionResult.grounded = true;
        } else if (
          surface
          && this.velocityY <= 0
          && previousY >= surface.elevationM - SURFACE_GROUND_EPSILON_M
          && this.position.y <= surface.elevationM + SURFACE_GROUND_EPSILON_M
        ) {
          this.position.y = surface.elevationM;
          this.velocityY = 0;
          this.grounded = true;
          this.motionResult.hitY = true;
          this.motionResult.grounded = true;
        } else if (this.motionResult.hitY) {
          if (this.velocityY < 0) this.grounded = true;
          this.velocityY = 0;
        } else {
          this.grounded = false;
          this.motionResult.grounded = false;
        }
      } else if (this.motionResult.hitY) {
        if (this.velocityY < 0) this.grounded = true;
        this.velocityY = 0;
      } else {
        this.grounded = false;
      }

      if (this.motionResult.hitX) vx = this.velX = 0;
      if (this.motionResult.hitZ) vz = this.velZ = 0;

      const pb = worldColliders.playableBounds;
      const hw = ENEMY_HALF_WIDTH_M + BOUNDS_EPS;
      if (this.position.x < pb.minX + hw) this.position.x = pb.minX + hw;
      if (this.position.x > pb.maxX - hw) this.position.x = pb.maxX - hw;
      if (this.position.z < pb.minZ + hw) this.position.z = pb.minZ + hw;
      if (this.position.z > pb.maxZ - hw) this.position.z = pb.maxZ - hw;
    }

    const movedDistanceM = Math.hypot(this.position.x - preX, this.position.z - preZ);
    const desiredSpeedMps = Math.hypot(this.velX, this.velZ);
    const movementSettleS = this.gameplayTuning.enemy.combat.postMovementSettleSByTier[
      clampEnemyTier(directive.tier)
    ]!;
    this.movingForSpread = desiredSpeedMps > 0.3 && movedDistanceM > ENEMY_MIN_PROGRESS_M;
    if (this.movingForSpread) {
      this.movementSpreadTimerS = movementSettleS;
    } else {
      this.movementSpreadTimerS = Math.max(0, this.movementSpreadTimerS - clampedDt);
    }
    if (hasInsufficientEnemyMotion(movedDistanceM, desiredSpeedMps, clampedDt)) {
      this.stuckTimer += clampedDt;
      if (this.stuckTimer >= ENEMY_STUCK_THRESHOLD_S) {
        this.stuckTimer = 0;
        this.peekDir *= -1;
        // Alternate the slide direction so a bot wedged in a corner tries both
        // ways out instead of grinding against the same face.
        this.stuckEscapeDir *= -1;
        this.stuckEscapeTimerS = STUCK_ESCAPE_DURATION_S;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.stuckEscapeTimerS = Math.max(0, this.stuckEscapeTimerS - clampedDt);

    if (visibleTarget) {
      this.reactionTimerS = Math.max(0, this.reactionTimerS - clampedDt);
      this.reacquireTimerS = Math.max(0, this.reacquireTimerS - clampedDt);
      this.runFiringLogic(visibleTarget, directive, clampedDt, worldColliders, enemyAabbs, targets, onEnemyShot);
    } else {
      this.burstShotsRemaining = 0;
    }

    if (onFootstep && this.grounded) {
      const speed = desiredSpeedMps;
      if (speed > 0.3) {
        const targetDistance = this.lastKnownTargetPos
          ? Math.hypot(this.lastKnownTargetPos.x - this.position.x, this.lastKnownTargetPos.z - this.position.z)
          : 20;
        this.footstepTimerS -= clampedDt;
        if (this.footstepTimerS <= 0) {
          this.footstepTimerS = speed > 2.6 ? 0.46 : 0.68;
          onFootstep(targetDistance);
        }
      } else {
        this.footstepTimerS = 0;
      }
    }
  }

  getAabb(): EnemyAabb {
    this.aabb.minX = this.position.x - ENEMY_HALF_WIDTH_M;
    this.aabb.minY = this.position.y;
    this.aabb.minZ = this.position.z - ENEMY_HALF_WIDTH_M;
    this.aabb.maxX = this.position.x + ENEMY_HALF_WIDTH_M;
    this.aabb.maxY = this.position.y + ENEMY_HEIGHT_M;
    this.aabb.maxZ = this.position.z + ENEMY_HALF_WIDTH_M;
    return this.aabb;
  }

  applyDamage(amount: number, isHeadshot = false): void {
    if (this.dead) return;
    this.lastHitWasHeadshot = isHeadshot;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.dead = true;
    }
  }

  isDead(): boolean { return this.dead; }
  wasLastHitHeadshot(): boolean { return this.lastHitWasHeadshot; }
  getHealth(): number { return this.health; }
  getMag(): number { return this.mag; }
  getReserve(): number { return this.reserve; }
  isReloading(): boolean { return this.reloading; }
  isGrounded(): boolean { return this.grounded; }
  getTeam(): EnemyTeam { return this.team; }
  getRole(): EnemyRole { return this.role; }
  getPosition(): Readonly<MutablePosition> { return this.position; }
  getYaw(): number { return this.yaw; }
  isFiring(): boolean { return this.firingThisFrame; }
  getState(): EnemyState { return this.state; }
  consumeCompletedBurst(): boolean {
    const completed = this.burstCompletedSinceLastStep;
    this.burstCompletedSinceLastStep = false;
    return completed;
  }

  nudgeWithCollision(deltaX: number, deltaZ: number, worldColliders: WorldColliders): void {
    if (this.dead) return;
    if (Math.abs(deltaX) < 0.0001 && Math.abs(deltaZ) < 0.0001) return;

    this.solver.moveAndCollide(
      this.position,
      deltaX,
      deltaZ,
      0,
      worldColliders,
      this.motionResult,
    );

    if (worldColliders.hasTraversalSurfaces) {
      const surface = worldColliders.traversalSurfaces.sample(this.position.x, this.position.z, this.position.y);
      if (surface && Math.abs(surface.elevationM - this.position.y) <= ENEMY_MAX_STEP_M) {
        this.position.y = surface.elevationM;
        this.velocityY = 0;
        this.grounded = true;
      }
    }

    const bounds = worldColliders.playableBounds;
    const halfWidth = ENEMY_HALF_WIDTH_M + BOUNDS_EPS;
    if (this.position.x < bounds.minX + halfWidth) this.position.x = bounds.minX + halfWidth;
    if (this.position.x > bounds.maxX - halfWidth) this.position.x = bounds.maxX - halfWidth;
    if (this.position.z < bounds.minZ + halfWidth) this.position.z = bounds.minZ + halfWidth;
    if (this.position.z > bounds.maxZ - halfWidth) this.position.z = bounds.maxZ - halfWidth;
  }

  getDebugSnapshot(): EnemyDebugSnapshot {
    return {
      id: this.id,
      name: this.name,
      team: this.team,
      role: this.role,
      state: this.state,
      tier: this.currentTier,
      health: this.health,
      reloading: this.reloading,
      mag: this.mag,
      reserve: this.reserve,
      assignedNodeId: this.assignedNodeId,
      targetNodeId: this.targetNodeId,
      memoryRemainingS: this.memoryTimerS,
      reactionRemainingS: this.reactionTimerS,
      reacquireRemainingS: this.reacquireTimerS,
      lineOfSightBreakS: this.lineOfSightBreakTimerS,
      movementSpreadActive: this.movingForSpread || this.movementSpreadTimerS > 0,
      movementSpreadRemainingS: this.movementSpreadTimerS,
      burstShotsRemaining: this.burstShotsRemaining,
      debugReason: this.debugReason,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      },
      movePoint: this.currentMovePoint ? { ...this.currentMovePoint } : null,
      holdPoint: this.currentHoldPoint ? { ...this.currentHoldPoint } : null,
      focusPoint: this.currentFocusPoint ? { ...this.currentFocusPoint } : null,
      directSight: this.directSight,
      aimYawErrorDeg: this.aimYawErrorDeg,
      directiveAgeS: this.currentDirectiveAgeS,
      targetNodeChangeCount: this.targetNodeChangeCount,
    };
  }

  canSeeTarget(
    target: EnemyTarget,
    world: WorldColliders,
    enemyAabbs: readonly EnemyAabb[],
  ): boolean {
    const perception = this.gameplayTuning.enemy.perception;
    if (!isTargetInsideEnemyVisionCone(
      this.position,
      this.yaw,
      target.position,
      perception.visionConeDeg,
      perception.proximityAwarenessM,
    )) {
      return false;
    }
    return this.hasLineOfSight(target.position, target.aimHeightM, world, enemyAabbs);
  }

  private applyDirectiveMovement(
    directive: EnemyDirective,
    visibleTarget: EnemyTarget | null,
  ): { x: number; z: number } | null {
    this.desiredVX = 0;
    this.desiredVZ = 0;

    const focus = visibleTarget
      ? visibleTarget.position
      : (this.memoryTimerS > 0 ? this.lastKnownTargetPos : null) ?? directive.focusPoint ?? null;
    const anchorPoint = directive.holdPoint ?? directive.movePoint;

    const lowAmmoNeedsCover =
      this.mag <= ENEMY_RELOAD_DECISION_MAG && this.reserve > 0 && directive.tierProfile.mandatoryReloadFallback;
    const effectiveState: EnemyState = lowAmmoNeedsCover && directive.state !== "RELOAD" ? "FALLBACK" : directive.state;
    this.state = effectiveState;

    switch (effectiveState) {
      case "ROTATE":
        this.moveTowardPoint(directive.movePoint, ENEMY_ROTATE_SPEED_MPS);
        break;
      case "INVESTIGATE":
        if (anchorPoint && focus) {
          this.moveTowardSweep(anchorPoint, focus, directive.peekOffsetM * 1.55, ENEMY_INVESTIGATE_SPEED_MPS);
        } else {
          this.moveTowardPoint(directive.movePoint, ENEMY_INVESTIGATE_SPEED_MPS);
        }
        break;
      case "PRESSURE":
        if (anchorPoint && focus) {
          this.moveTowardPressure(anchorPoint, focus, directive.peekOffsetM * (directive.aggressive ? 1.25 : 0.9), ENEMY_PRESSURE_SPEED_MPS);
        } else if (directive.movePoint) {
          this.moveTowardPoint(directive.movePoint, ENEMY_PRESSURE_SPEED_MPS);
        } else if (focus) {
          this.moveTowardPoint({ x: focus.x, z: focus.z }, ENEMY_PRESSURE_SPEED_MPS);
        }
        break;
      case "PEEK":
        if (anchorPoint && focus) {
          this.moveTowardPeek(anchorPoint, focus, directive.peekOffsetM, ENEMY_PEEK_SPEED_MPS);
        } else {
          this.moveTowardPoint(directive.movePoint, ENEMY_PEEK_SPEED_MPS);
        }
        break;
      case "FALLBACK":
      case "RELOAD":
        this.moveTowardPoint(directive.movePoint ?? directive.holdPoint, ENEMY_FALLBACK_SPEED_MPS);
        if (effectiveState === "RELOAD" && !this.reloading && this.reserve > 0) {
          const holdPoint = directive.holdPoint ?? directive.movePoint;
          const settled = !holdPoint || Math.hypot(holdPoint.x - this.position.x, holdPoint.z - this.position.z) <= 1.1;
          if (settled) {
            this.reloading = true;
            this.reloadTimer = 0;
          }
        }
        break;
      case "OVERWATCH":
      case "HOLD":
      default: {
        // Engaged bots strafe across their cover anchor instead of standing
        // still; amplitude, speed and flip cadence scale with tier. Idle bots
        // simply settle onto the anchor.
        const engagedFocus = visibleTarget?.position ?? (this.memoryTimerS > 0 ? this.lastKnownTargetPos : null);
        if (anchorPoint && engagedFocus) {
          const tier = clampEnemyTier(directive.tier);
          const movement = this.gameplayTuning.enemy.movement;
          this.moveTowardPeek(
            anchorPoint,
            engagedFocus,
            movement.strafeAmplitudeMByTier[tier]!,
            movement.strafeSpeedMpsByTier[tier]!,
          );
        } else if (anchorPoint && Math.hypot(anchorPoint.x - this.position.x, anchorPoint.z - this.position.z) > ENEMY_MIN_NODE_RADIUS_M) {
          this.moveTowardPoint(anchorPoint, effectiveState === "OVERWATCH" ? ENEMY_HOLD_SPEED_MPS * 0.8 : ENEMY_HOLD_SPEED_MPS);
        }
        break;
      }
    }

    if (focus) {
      return { x: focus.x, z: focus.z };
    }
    if (directive.movePoint) {
      return directive.movePoint;
    }
    return null;
  }

  private moveTowardPoint(point: { x: number; z: number } | null, speed: number): void {
    if (!point) return;
    const dx = point.x - this.position.x;
    const dz = point.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= ENEMY_MIN_NODE_RADIUS_M) return;
    const invDistance = 1 / distance;
    this.desiredVX = dx * invDistance * speed;
    this.desiredVZ = dz * invDistance * speed;
  }

  private moveTowardPeek(
    anchorPoint: { x: number; z: number },
    focusPoint: { x: number; z: number } | { x: number; y: number; z: number },
    offsetM: number,
    speed: number,
  ): void {
    const dx = focusPoint.x - anchorPoint.x;
    const dz = focusPoint.z - anchorPoint.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) {
      this.moveTowardPoint(anchorPoint, speed);
      return;
    }

    const invDistance = 1 / distance;
    const perpX = -dz * invDistance;
    const perpZ = dx * invDistance;
    const desiredPoint = {
      x: anchorPoint.x + perpX * this.peekDir * offsetM,
      z: anchorPoint.z + perpZ * this.peekDir * offsetM,
    };

    const desiredDx = desiredPoint.x - this.position.x;
    const desiredDz = desiredPoint.z - this.position.z;
    const desiredDistance = Math.hypot(desiredDx, desiredDz);
    if (desiredDistance <= 0.1) {
      return;
    }

    const invDesiredDistance = 1 / desiredDistance;
    this.desiredVX = desiredDx * invDesiredDistance * speed;
    this.desiredVZ = desiredDz * invDesiredDistance * speed;
  }

  private moveTowardSweep(
    anchorPoint: { x: number; z: number },
    focusPoint: { x: number; z: number } | { x: number; y: number; z: number },
    offsetM: number,
    speed: number,
  ): void {
    const dx = focusPoint.x - anchorPoint.x;
    const dz = focusPoint.z - anchorPoint.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) {
      this.moveTowardPoint(anchorPoint, speed);
      return;
    }

    const invDistance = 1 / distance;
    const forwardX = dx * invDistance;
    const forwardZ = dz * invDistance;
    const perpX = -forwardZ;
    const perpZ = forwardX;
    const desiredPoint = {
      x: anchorPoint.x + perpX * this.sweepDir * offsetM + forwardX * offsetM * 0.3,
      z: anchorPoint.z + perpZ * this.sweepDir * offsetM + forwardZ * offsetM * 0.3,
    };
    this.moveTowardPoint(desiredPoint, speed);
  }

  private moveTowardPressure(
    anchorPoint: { x: number; z: number },
    focusPoint: { x: number; z: number } | { x: number; y: number; z: number },
    offsetM: number,
    speed: number,
  ): void {
    const dx = focusPoint.x - anchorPoint.x;
    const dz = focusPoint.z - anchorPoint.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) {
      this.moveTowardPoint(anchorPoint, speed);
      return;
    }

    const invDistance = 1 / distance;
    const forwardX = dx * invDistance;
    const forwardZ = dz * invDistance;
    const perpX = -forwardZ;
    const perpZ = forwardX;
    const desiredPoint = {
      x: anchorPoint.x + forwardX * Math.max(0.9, offsetM * 0.95) + perpX * this.peekDir * offsetM * 0.55,
      z: anchorPoint.z + forwardZ * Math.max(0.9, offsetM * 0.95) + perpZ * this.peekDir * offsetM * 0.55,
    };
    this.moveTowardPoint(desiredPoint, speed);
  }

  private runFiringLogic(
    visibleTarget: EnemyTarget,
    directive: EnemyDirective,
    deltaSeconds: number,
    world: WorldColliders,
    enemyAabbs: readonly EnemyAabb[],
    targets: readonly EnemyTarget[],
    onEnemyShot: (targetId: string, damage: number) => void,
  ): void {
    if (!directive.allowFire) return;
    if (this.reloading) return;
    if (this.state === "ROTATE" || this.state === "FALLBACK" || this.state === "RELOAD") return;
    if (this.reactionTimerS > 0) return;
    if (this.reacquireTimerS > 0) return;

    const combat = this.gameplayTuning.enemy.combat;
    if (combat.requiresAimAlignment && this.aimYawErrorDeg > combat.aimToleranceDeg) return;

    const dx = visibleTarget.position.x - this.position.x;
    const dz = visibleTarget.position.z - this.position.z;
    const distanceM = Math.hypot(dx, dz);

    if (this.burstCooldownTimerS > 0) return;
    if (this.burstShotsRemaining <= 0) {
      const burstRange =
        distanceM > 18
          ? directive.tierProfile.longBurst
          : distanceM > 8
            ? directive.tierProfile.midBurst
            : directive.tierProfile.closeBurst;
      this.burstShotsRemaining = resolveBurstCount(this.rng, burstRange);
    }

    this.shootTimer -= deltaSeconds;
    if (this.shootTimer > 0) return;
    this.shootTimer = directive.tierProfile.shotIntervalS;

    const spreadDeg = resolveEnemyShotSpreadDeg(
      directive.tierProfile.spreadDeg,
      this.movingForSpread || this.movementSpreadTimerS > 0,
      combat.movingSpreadMultiplierByTier[clampEnemyTier(directive.tier)]!,
    );
    if (this.tryFireAt(visibleTarget, world, enemyAabbs, targets, onEnemyShot, spreadDeg)) {
      this.firingThisFrame = true;
    }

    this.burstShotsRemaining = Math.max(0, this.burstShotsRemaining - 1);
    if (this.burstShotsRemaining <= 0) {
      this.burstCooldownTimerS = resolveBurstCooldownS(distanceM, combat.burstCooldownBands);
      this.burstCompletedSinceLastStep = true;
    }
  }

  /**
   * The manager already raycasts the enemy->player line of sight when it
   * computes directive.hasDirectSight each frame, so the controller only
   * resolves which hostile target that sight refers to instead of re-casting
   * the same ray.
   */
  private findDirectSightTarget(targets: readonly EnemyTarget[]): EnemyTarget | null {
    let nearestDist = Number.POSITIVE_INFINITY;
    let nearestTarget: EnemyTarget | null = null;

    for (const target of targets) {
      if (target.id === this.id) continue;
      if (target.team === this.team) continue;
      if (target.health <= 0) continue;

      const dx = target.position.x - this.position.x;
      const dz = target.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = target;
      }
    }

    return nearestTarget;
  }

  private resolveTargetTeam(targets: readonly EnemyTarget[], targetId: string): EnemyTeam | null {
    for (const target of targets) {
      if (target.id === targetId) {
        return target.team;
      }
    }
    return null;
  }

  private turnTowardPoint(targetX: number, targetZ: number, maxTurnDegPerS: number, deltaSeconds: number): void {
    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) {
      this.aimYawErrorDeg = 0;
      return;
    }

    const desiredYaw = Math.atan2(-dx, -dz);
    const deltaYaw = normalizeAngleRad(desiredYaw - this.yaw);
    const maxTurnRad = Math.max(1, maxTurnDegPerS) * DEG_TO_RAD * deltaSeconds;
    const clampedDelta = Math.max(-maxTurnRad, Math.min(maxTurnRad, deltaYaw));
    this.yaw = normalizeAngleRad(this.yaw + clampedDelta);
    this.aimYawErrorDeg = Math.abs(normalizeAngleRad(desiredYaw - this.yaw)) * RAD_TO_DEG;
  }

  private hasLineOfSight(
    targetPos: { x: number; y: number; z: number },
    targetAimHeightM: number,
    world: WorldColliders,
    enemyAabbs: readonly EnemyAabb[],
  ): boolean {
    return hasLineOfSight(
      this.position,
      ENEMY_EYE_HEIGHT_M,
      targetPos,
      targetAimHeightM,
      world,
      enemyAabbs,
      this.losScratch,
      this.id,
      "player",
    );
  }

  private tryFireAt(
    target: EnemyTarget,
    world: WorldColliders,
    enemyAabbs: readonly EnemyAabb[],
    targets: readonly EnemyTarget[],
    onEnemyShot: (targetId: string, damage: number) => void,
    spreadDeg: number,
  ): boolean {
    if (this.reloading) return false;
    if (this.mag <= 0) {
      if (this.reserve > 0) {
        this.reloading = true;
        this.reloadTimer = 0;
      }
      return false;
    }

    const eyeX = this.position.x;
    const eyeY = this.position.y + ENEMY_EYE_HEIGHT_M;
    const eyeZ = this.position.z;

    const targetEyeX = target.position.x;
    // Aim at the target's own current aim height, not a fixed enemy eye height.
    // Clamped a little below the top of the target so a stance change mid-flight
    // still lands inside the collision box rather than skimming over it.
    const targetEyeY = target.position.y + Math.min(target.aimHeightM, ENEMY_EYE_HEIGHT_M);
    const targetEyeZ = target.position.z;

    const dx = targetEyeX - eyeX;
    const dy = targetEyeY - eyeY;
    const dz = targetEyeZ - eyeZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.01) return false;

    const invDist = 1 / dist;
    let ndx = dx * invDist;
    let ndy = dy * invDist;
    let ndz = dz * invDist;

    if (this.gameplayTuning.enemy.combat.spreadModel === "circular") {
      applyCircularConeSpread(
        { x: ndx, y: ndy, z: ndz },
        spreadDeg,
        this.rng.next(),
        this.rng.next(),
        this.shotDir,
      );
      ndx = this.shotDir.x;
      ndy = this.shotDir.y;
      ndz = this.shotDir.z;
    } else {
      // Retain the alternate horizontal-spread model for an explicitly
      // revisioned future experiment. No current profile selects this path.
      const spreadRad = this.rng.range(-spreadDeg, spreadDeg) * DEG_TO_RAD;
      const cosS = Math.cos(spreadRad);
      const sinS = Math.sin(spreadRad);
      const rotatedX = ndx * cosS - ndz * sinS;
      const rotatedZ = ndx * sinS + ndz * cosS;
      ndx = rotatedX;
      ndz = rotatedZ;
      ndy += this.rng.range(-0.02, 0.02);

      const len = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz);
      if (len > 0.01) {
        const inv = 1 / len;
        ndx *= inv;
        ndy *= inv;
        ndz *= inv;
      }
    }

    const maxRange = 100;
    let bestDist = maxRange;
    let bestHitId: string | null = null;

    for (const aabb of enemyAabbs) {
      if (aabb.id === this.id) continue;
      if (this.resolveTargetTeam(targets, aabb.id) === this.team) continue;
      const t = rayVsAabb(eyeX, eyeY, eyeZ, ndx, ndy, ndz, maxRange, aabb);
      if (t < bestDist) {
        bestDist = t;
        bestHitId = aabb.id;
      }
    }

    this.losScratch.origin.set(eyeX, eyeY, eyeZ);
    this.shotDir.set(ndx, ndy, ndz);
    const worldHit = raycastFirstHit(world, this.losScratch.origin, this.shotDir, maxRange, this.shotHit);
    if (worldHit && this.shotHit.distance < bestDist) {
      bestHitId = null;
    }

    this.mag -= 1;
    if (this.mag <= 0 && this.reserve > 0) {
      this.reloading = true;
      this.reloadTimer = 0;
    }

    if (bestHitId !== null) {
      onEnemyShot(bestHitId, this.gameplayTuning.enemy.combat.damagePerHit);
    }

    return true;
  }
}

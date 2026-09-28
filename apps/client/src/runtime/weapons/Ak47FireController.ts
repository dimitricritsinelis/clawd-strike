import { Vector3 } from "three";
import { RUN_SPEED_MPS } from "../sim/PlayerController";
import { type RaycastAabbHit, raycastFirstHit } from "../sim/collision/raycastAabb";
import type { WorldColliders } from "../sim/collision/WorldColliders";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";

const DEG_TO_RAD = Math.PI / 180;
const TAU = Math.PI * 2;

export const DEFAULT_FIRE_INTERVAL_S = 0.1; // 600 RPM (10 shots per second)
const MAX_RANGE_M = 200;
const MAX_SHOTS_PER_UPDATE = 3;
/**
 * A shot is due when its remaining cooldown is at or below this. Absorbs the
 * float error of repeatedly subtracting frame times (six 1/60 s frames do not
 * sum to exactly 0.1), which would otherwise push a shot one frame late.
 */
const FIRE_TIME_EPSILON_S = 1e-6;
/** A release after at least this many shots in the burst reports triggerReleased. */
const TRIGGER_RELEASE_MIN_BURST = 2;

const STATIONARY_SPEED_EPS_MPS = 0.16;
const SPREAD_STATIONARY_DEG = 0.2;
// D3 (arcade handling): moving and airborne spread softened from 1.4-2.25 and 5-7 deg.
const SPREAD_MOVE_MIN_DEG = 0.6;
const SPREAD_MOVE_MAX_DEG = 1.1;
const SPREAD_AIR_MIN_DEG = 2.5;
const SPREAD_AIR_MAX_DEG = 3.5;

// D3: bloom softened from 0.11 per shot / 1.2 max.
const BLOOM_PER_SHOT_DEG = 0.06;
const BLOOM_MAX_DEG = 0.7;
/** Time to recover from full bloom once recovery has started. */
const BLOOM_RECOVERY_SECONDS = 0.34;
/**
 * Bloom only recovers once no shot has fired for this long, so click-spamming
 * at the fire rate blooms like held fire instead of resetting between clicks.
 */
const BLOOM_RECOVERY_DELAY_S = 0.15;

const RECOIL_RESET_DELAY_S = 0.3;
const RECOIL_MAX_ACCUM_PITCH_DEG = 15;
const RECOIL_MAX_ACCUM_YAW_DEG = 3;

// 30-shot aim-climb shape (WP-17, decision D2), scaled by
// RECOIL_VERTICAL_PATTERN_SCALE. The render-only view punch and the viewmodel
// carry the felt kick; this table is only where the crosshair goes.
// Shots 1-8 build up, 9-10 peak, then the climb tapers through the magazine.
const RECOIL_VERTICAL_PATTERN_SHAPE_DEG = [
  0.30, 0.33, 0.36, 0.39, 0.42, 0.44, 0.46, 0.47,
  0.47, 0.46, 0.45, 0.44, 0.43, 0.42, 0.41, 0.40,
  0.39, 0.38, 0.37, 0.36, 0.35, 0.34, 0.33, 0.33,
  0.32, 0.31, 0.31, 0.30, 0.30, 0.29,
] as const;

/**
 * Playtest: "a little more recoil". 1.25x the WP-17 shape climbs 14.16 deg per
 * magazine (the original was 22.7, WP-17 halved it to 11.33).
 */
const RECOIL_VERTICAL_PATTERN_SCALE = 1.25;

/** WP-17: the horizontal sway keeps its shape at three quarters of its old size. */
const RECOIL_HORIZONTAL_PATTERN_SCALE = 0.75;

// Horizontal sway shape, scaled by RECOIL_HORIZONTAL_PATTERN_SCALE.
// Phase 1 (shots 1-8):  center then left
// Phase 2 (shots 9-16): strong left-to-right swing
// Phase 3 (shots 17-24): right settle
// Phase 4 (shots 25-30): tight random walk
const RECOIL_HORIZONTAL_PATTERN_SHAPE_DEG = [
   0.00,  0.04, -0.06, -0.12,
  -0.16, -0.20, -0.18, -0.10,
   0.02,  0.14,  0.20,  0.18,
   0.10, -0.02, -0.14, -0.18,
  -0.12, -0.04,  0.06,  0.14,
   0.16,  0.10,  0.02, -0.06,
  -0.08, -0.04,  0.06,  0.10,
   0.06,  0.00,
] as const;

/** Per-shot vertical aim kick (degrees, + is up) before jitter and caps. */
export const AK47_RECOIL_VERTICAL_PATTERN_DEG: readonly number[] = Object.freeze(
  RECOIL_VERTICAL_PATTERN_SHAPE_DEG.map((value) => value * RECOIL_VERTICAL_PATTERN_SCALE),
);
/** Per-shot horizontal aim kick (degrees) before jitter and caps. */
export const AK47_RECOIL_HORIZONTAL_PATTERN_DEG: readonly number[] = Object.freeze(
  RECOIL_HORIZONTAL_PATTERN_SHAPE_DEG.map((value) => value * RECOIL_HORIZONTAL_PATTERN_SCALE),
);

const RECOIL_VERTICAL_JITTER_DEG = 0.022;
const RECOIL_HORIZONTAL_JITTER_DEG = 0.03;
const RECOIL_MOVE_EXTRA_DEG = 0.055;

const WORLD_UP = new Vector3(0, 1, 0);
const WORLD_RIGHT = new Vector3(1, 0, 0);

export type Ak47ShotEvent = {
  hit: boolean;
  /**
   * The direction the bullet actually travelled, including spread and bloom.
   * Consumers that re-raycast the shot (enemy hit registration, buff orbs)
   * must use this instead of raw camera forward, or spread stops applying to
   * anything but wall decals.
   */
  direction: {
    x: number;
    y: number;
    z: number;
  };
  /**
   * How far the bullet may travel before it is spent: the world hit distance
   * when it struck geometry, otherwise the weapon's max range.
   */
  travelDistance: number;
  hitPoint?: {
    x: number;
    y: number;
    z: number;
  };
  hitNormal?: {
    x: number;
    y: number;
    z: number;
  };
  colliderId?: string;
  /**
   * The one first-shot rule every feel layer reads: the spray had fully reset
   * (no shot for RECOIL_RESET_DELAY_S) when this round fired. It is the same
   * condition that grants the first-shot accuracy bonus.
   */
  isFirstShot: boolean;
  /** 0-based index of this round within the current trigger pull. */
  burstIndex: number;
  /**
   * How late this round fired against its ideal cadence time (seconds, >= 0).
   * Non-zero when a frame boundary or a hitch delayed it; use it to place the
   * round's audio/visual onset back on the true rhythm.
   */
  lateS: number;
  /** Rounds fired in the same update call as this one (1 unless the frame hitched). */
  shotsThisFrame: number;
  /**
   * The horizontal aim kick actually applied for this round (degrees, after
   * jitter and the yaw cap, + is the same sign as recoilYawRad). Viewmodel
   * drift uses its sign so the gun moves the same way as the view.
   */
  patternYawDeg: number;
};

export type Ak47FireControllerOptions = {
  seed: number;
  maxRangeM?: number;
};

export type Ak47FireUpdateInput = {
  deltaSeconds: number;
  fireHeld: boolean;
  shotBudget?: number;
  origin: Vector3;
  forward: Vector3;
  grounded: boolean;
  speedMps: number;
  world: WorldColliders;
};

export type Ak47FireUpdateResult = {
  recoilPitchRad: number;
  recoilYawRad: number;
  shotsFired: number;
  shotIndex: number;
  spreadDeg: number;
  bloomDeg: number;
  lastShotRecoilPitchDeg: number;
  lastShotRecoilYawDeg: number;
  /**
   * True on the frame the trigger goes up after a burst of at least two
   * rounds (spray-end cues such as the release clack). Not raised by
   * cancelTrigger (reload start, death, pause).
   */
  triggerReleased: boolean;
  /**
   * Rounds fired since the trigger was last pressed. On a triggerReleased
   * frame this is the length of the burst that just ended.
   */
  burstLength: number;
};

type ShotFrameInfo = {
  lateS: number;
  shotsThisFrame: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class Ak47FireController {
  private readonly maxRangeM: number;
  private readonly spreadRng: DeterministicRng;
  private readonly recoilRng: DeterministicRng;

  private readonly basisForward = new Vector3();
  private readonly basisRight = new Vector3();
  private readonly basisUp = new Vector3();
  private readonly shotDirection = new Vector3();
  private readonly shotFrameInfo: ShotFrameInfo = { lateS: 0, shotsThisFrame: 0 };

  private readonly raycastHit: RaycastAabbHit = {
    distance: 0,
    point: new Vector3(),
    normal: new Vector3(),
    colliderId: "",
    colliderKind: "wall",
  };

  private fireIntervalS = DEFAULT_FIRE_INTERVAL_S;
  private fireHeldLastFrame = false;
  /** Remaining cooldown until the next round may fire (negative when it is overdue). */
  private timeUntilNextShotS = 0;
  /** Time since the last round's ideal cadence time (its fire frame minus its lateS). */
  private timeSinceLastShotS = Number.POSITIVE_INFINITY;
  /** A press that arrived during the cooldown: exactly one round fires when the gate opens. */
  private bufferedShot = false;
  private burstShotCount = 0;
  private shotIndex = 0;
  private bloomDeg = 0;
  private accumulatedPitchDeg = 0;
  private accumulatedYawDeg = 0;

  private debugSpreadDeg = SPREAD_STATIONARY_DEG;
  private debugLastShotRecoilPitchDeg = 0;
  private debugLastShotRecoilYawDeg = 0;

  constructor(options: Ak47FireControllerOptions) {
    this.maxRangeM = options.maxRangeM ?? MAX_RANGE_M;

    const rootSeed = deriveSubSeed(options.seed, "ak47-fire");
    this.spreadRng = new DeterministicRng(deriveSubSeed(rootSeed, "spread"));
    this.recoilRng = new DeterministicRng(deriveSubSeed(rootSeed, "recoil"));
  }

  setFireIntervalS(interval: number): void {
    this.fireIntervalS = Math.max(0.02, interval);
  }

  reset(): void {
    this.fireIntervalS = DEFAULT_FIRE_INTERVAL_S;
    this.spreadRng.reset();
    this.recoilRng.reset();
    this.clearTriggerState();
    this.debugSpreadDeg = SPREAD_STATIONARY_DEG;
    this.debugLastShotRecoilPitchDeg = 0;
    this.debugLastShotRecoilYawDeg = 0;
    this.resetSprayState();
  }

  /** Hard trigger reset (reload start, death, pause): drops any buffered round and reports no release. */
  cancelTrigger(): void {
    this.clearTriggerState();
    this.resetSprayState();
  }

  update(input: Ak47FireUpdateInput, onShot?: (shot: Ak47ShotEvent) => void): Ak47FireUpdateResult {
    const deltaSeconds = Math.max(0, input.deltaSeconds);
    const shotBudget =
      input.shotBudget === undefined ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(input.shotBudget));

    this.timeSinceLastShotS += deltaSeconds;

    let recoilPitchRad = 0;
    let recoilYawRad = 0;
    let shotsFired = 0;
    let triggerReleased = false;

    if (!input.fireHeld) {
      triggerReleased = this.fireHeldLastFrame && this.burstShotCount >= TRIGGER_RELEASE_MIN_BURST;
      this.fireHeldLastFrame = false;

      // A click that landed during the cooldown still fires when the gate
      // opens, even though the trigger is already up again.
      let bufferedShotDue = false;
      if (this.bufferedShot) {
        this.timeUntilNextShotS -= deltaSeconds;
        if (shotBudget <= 0) {
          this.bufferedShot = false;
        } else {
          bufferedShotDue = this.timeUntilNextShotS <= FIRE_TIME_EPSILON_S;
        }
      }

      this.recoverBloom(deltaSeconds, bufferedShotDue ? this.dueShotLateS() : 0);

      if (bufferedShotDue) {
        this.bufferedShot = false;
        const recoil = this.fireDueShot(input, 1, onShot);
        recoilPitchRad += recoil.pitchRad;
        recoilYawRad += recoil.yawRad;
        shotsFired = 1;
      }

      if (this.timeSinceLastShotS >= RECOIL_RESET_DELAY_S) {
        this.resetSprayState();
      }

      this.debugSpreadDeg = this.computeSpreadDeg(input.grounded, input.speedMps);

      return this.buildResult(recoilPitchRad, recoilYawRad, shotsFired, triggerReleased);
    }

    if (!this.fireHeldLastFrame) {
      // Fresh press. A click can never beat the fire rate: the cooldown left
      // over from the previous round still applies, and a press during it
      // queues exactly one round. The first press after idle fires at once
      // because timeSinceLastShotS starts at +Infinity.
      if (this.timeSinceLastShotS >= RECOIL_RESET_DELAY_S) {
        this.resetSprayState();
      }
      this.burstShotCount = 0;
      this.timeUntilNextShotS = Math.max(0, this.fireIntervalS - this.timeSinceLastShotS);
      this.bufferedShot = this.timeUntilNextShotS > FIRE_TIME_EPSILON_S;
    } else {
      this.timeUntilNextShotS -= deltaSeconds;
    }
    this.fireHeldLastFrame = true;

    const shotsThisFrame = this.countDueShots(shotBudget);
    this.recoverBloom(deltaSeconds, shotsThisFrame > 0 ? this.dueShotLateS() : 0);
    while (shotsFired < shotsThisFrame) {
      const recoil = this.fireDueShot(input, shotsThisFrame, onShot);
      recoilPitchRad += recoil.pitchRad;
      recoilYawRad += recoil.yawRad;
      shotsFired += 1;
    }
    if (shotsFired > 0) {
      this.bufferedShot = false;
    }

    return this.buildResult(recoilPitchRad, recoilYawRad, shotsFired, triggerReleased);
  }

  private buildResult(
    recoilPitchRad: number,
    recoilYawRad: number,
    shotsFired: number,
    triggerReleased: boolean,
  ): Ak47FireUpdateResult {
    return {
      recoilPitchRad,
      recoilYawRad,
      shotsFired,
      shotIndex: this.shotIndex,
      spreadDeg: this.debugSpreadDeg,
      bloomDeg: this.bloomDeg,
      lastShotRecoilPitchDeg: this.debugLastShotRecoilPitchDeg,
      lastShotRecoilYawDeg: this.debugLastShotRecoilYawDeg,
      triggerReleased,
      burstLength: this.burstShotCount,
    };
  }

  /** How many rounds the cadence owes this frame, limited by the per-frame cap and the budget. */
  private countDueShots(shotBudget: number): number {
    let count = 0;
    let untilNext = this.timeUntilNextShotS;
    while (untilNext <= FIRE_TIME_EPSILON_S && count < MAX_SHOTS_PER_UPDATE && count < shotBudget) {
      untilNext += this.fireIntervalS;
      count += 1;
    }
    return count;
  }

  /** How far the next round's cadence time lies before now (seconds, >= 0). */
  private dueShotLateS(): number {
    return Math.max(0, -this.timeUntilNextShotS);
  }

  /** Fires the round whose cadence time has arrived and schedules the next one. */
  private fireDueShot(
    input: Ak47FireUpdateInput,
    shotsThisFrame: number,
    onShot?: (shot: Ak47ShotEvent) => void,
  ): { pitchRad: number; yawRad: number } {
    const lateS = this.dueShotLateS();
    this.timeUntilNextShotS += this.fireIntervalS;
    this.shotFrameInfo.lateS = lateS;
    this.shotFrameInfo.shotsThisFrame = shotsThisFrame;
    return this.fireSingleShot(input, this.shotFrameInfo, onShot);
  }

  private fireSingleShot(
    input: Ak47FireUpdateInput,
    frame: Readonly<ShotFrameInfo>,
    onShot?: (shot: Ak47ShotEvent) => void,
  ): { pitchRad: number; yawRad: number } {
    const isFirstShot = this.isFirstShotReady();
    const burstIndex = this.burstShotCount;

    this.debugSpreadDeg = this.computeSpreadDeg(input.grounded, input.speedMps);
    this.sampleSpreadDirection(input.forward, this.debugSpreadDeg, this.shotDirection);

    const hit = raycastFirstHit(input.world, input.origin, this.shotDirection, this.maxRangeM, this.raycastHit);

    // Measured from the round's ideal cadence time so tap-fire keeps the same
    // average rate as held fire instead of drifting a frame late per click.
    this.timeSinceLastShotS = frame.lateS;

    const patternIndex = this.shotIndex % AK47_RECOIL_VERTICAL_PATTERN_DEG.length;
    const basePitchDeg = AK47_RECOIL_VERTICAL_PATTERN_DEG[patternIndex]!;
    const baseYawDeg = AK47_RECOIL_HORIZONTAL_PATTERN_DEG[patternIndex]!;

    const moveNorm = clamp(input.speedMps / RUN_SPEED_MPS, 0, 1);

    let pitchDeg =
      basePitchDeg +
      this.recoilRng.range(-RECOIL_VERTICAL_JITTER_DEG, RECOIL_VERTICAL_JITTER_DEG) +
      moveNorm * RECOIL_MOVE_EXTRA_DEG;
    let yawDeg =
      baseYawDeg +
      this.recoilRng.range(-RECOIL_HORIZONTAL_JITTER_DEG, RECOIL_HORIZONTAL_JITTER_DEG);

    const nextPitchDeg = this.accumulatedPitchDeg + pitchDeg;
    if (nextPitchDeg > RECOIL_MAX_ACCUM_PITCH_DEG) {
      pitchDeg = RECOIL_MAX_ACCUM_PITCH_DEG - this.accumulatedPitchDeg;
    }

    const nextYawDeg = this.accumulatedYawDeg + yawDeg;
    if (nextYawDeg > RECOIL_MAX_ACCUM_YAW_DEG) {
      yawDeg = RECOIL_MAX_ACCUM_YAW_DEG - this.accumulatedYawDeg;
    } else if (nextYawDeg < -RECOIL_MAX_ACCUM_YAW_DEG) {
      yawDeg = -RECOIL_MAX_ACCUM_YAW_DEG - this.accumulatedYawDeg;
    }

    this.accumulatedPitchDeg += pitchDeg;
    this.accumulatedYawDeg += yawDeg;
    this.shotIndex += 1;
    this.burstShotCount += 1;

    this.bloomDeg = Math.min(BLOOM_MAX_DEG, this.bloomDeg + BLOOM_PER_SHOT_DEG);

    this.debugLastShotRecoilPitchDeg = pitchDeg;
    this.debugLastShotRecoilYawDeg = yawDeg;

    if (onShot) {
      const direction = {
        x: this.shotDirection.x,
        y: this.shotDirection.y,
        z: this.shotDirection.z,
      };
      const feel = {
        isFirstShot,
        burstIndex,
        lateS: frame.lateS,
        shotsThisFrame: frame.shotsThisFrame,
        patternYawDeg: yawDeg,
      };
      if (hit) {
        onShot({
          hit: true,
          direction,
          travelDistance: this.raycastHit.distance,
          hitPoint: {
            x: this.raycastHit.point.x,
            y: this.raycastHit.point.y,
            z: this.raycastHit.point.z,
          },
          hitNormal: {
            x: this.raycastHit.normal.x,
            y: this.raycastHit.normal.y,
            z: this.raycastHit.normal.z,
          },
          colliderId: this.raycastHit.colliderId,
          ...feel,
        });
      } else {
        // A bullet that reaches open sky still travels through the world and
        // must remain able to hit an enemy along the way.
        onShot({ hit: false, direction, travelDistance: this.maxRangeM, ...feel });
      }
    }

    return {
      pitchRad: pitchDeg * DEG_TO_RAD,
      yawRad: yawDeg * DEG_TO_RAD,
    };
  }

  /** The spray has fully reset, so the next round is a clean first shot. */
  private isFirstShotReady(): boolean {
    return this.shotIndex === 0 && this.timeSinceLastShotS >= RECOIL_RESET_DELAY_S;
  }

  private computeSpreadDeg(grounded: boolean, speedMps: number): number {
    const speed = Math.max(0, speedMps);
    const speedNorm = Math.min(1, speed / RUN_SPEED_MPS);

    let baseSpreadDeg: number;
    if (!grounded) {
      baseSpreadDeg = SPREAD_AIR_MIN_DEG + (SPREAD_AIR_MAX_DEG - SPREAD_AIR_MIN_DEG) * speedNorm;
    } else if (speed <= STATIONARY_SPEED_EPS_MPS) {
      baseSpreadDeg = SPREAD_STATIONARY_DEG;
    } else {
      const moveNorm = Math.min(1, (speed - STATIONARY_SPEED_EPS_MPS) / Math.max(0.001, RUN_SPEED_MPS - STATIONARY_SPEED_EPS_MPS));
      baseSpreadDeg = SPREAD_MOVE_MIN_DEG + (SPREAD_MOVE_MAX_DEG - SPREAD_MOVE_MIN_DEG) * moveNorm;
    }

    // First-shot accuracy bonus: if the spray has fully reset and the player
    // is stationary and grounded, suppress bloom entirely and tighten the base
    // spread for a near-perfect first bullet.
    if (this.isFirstShotReady() && grounded && speed <= STATIONARY_SPEED_EPS_MPS) {
      return baseSpreadDeg * 0.4; // near-perfect accuracy for the first clean tap
    }

    return baseSpreadDeg + this.bloomDeg;
  }

  /**
   * Recovers bloom for the idle part of this frame: time that lies past
   * BLOOM_RECOVERY_DELAY_S after the last round's cadence time and before the
   * cadence time of the first round fired this frame (firstShotLateS before
   * now). Splitting the frame exactly keeps recovery independent of frame
   * rate and of whether the trigger was up or down while idle.
   */
  private recoverBloom(deltaSeconds: number, firstShotLateS: number): void {
    if (this.bloomDeg <= 0 || !Number.isFinite(this.timeSinceLastShotS)) return;
    const idleEndS = this.timeSinceLastShotS - firstShotLateS;
    const idleStartS = Math.max(this.timeSinceLastShotS - deltaSeconds, BLOOM_RECOVERY_DELAY_S);
    const recoverSeconds = idleEndS - idleStartS;
    if (recoverSeconds <= 0) return;
    const recoverPerSecond = BLOOM_MAX_DEG / BLOOM_RECOVERY_SECONDS;
    this.bloomDeg = Math.max(0, this.bloomDeg - recoverPerSecond * recoverSeconds);
  }

  private clearTriggerState(): void {
    this.fireHeldLastFrame = false;
    this.timeUntilNextShotS = 0;
    this.timeSinceLastShotS = Number.POSITIVE_INFINITY;
    this.bufferedShot = false;
    this.burstShotCount = 0;
  }

  private resetSprayState(): void {
    this.shotIndex = 0;
    this.bloomDeg = 0;
    this.accumulatedPitchDeg = 0;
    this.accumulatedYawDeg = 0;
  }

  private sampleSpreadDirection(forward: Vector3, spreadDeg: number, outDir: Vector3): void {
    const spreadRad = spreadDeg * DEG_TO_RAD;
    const spreadRadius = Math.tan(spreadRad) * Math.sqrt(this.spreadRng.next());
    const theta = TAU * this.spreadRng.next();

    this.basisForward.copy(forward).normalize();

    const upReference = Math.abs(this.basisForward.y) > 0.98 ? WORLD_RIGHT : WORLD_UP;
    this.basisRight.copy(this.basisForward).cross(upReference).normalize();
    this.basisUp.copy(this.basisRight).cross(this.basisForward).normalize();

    const offsetX = Math.cos(theta) * spreadRadius;
    const offsetY = Math.sin(theta) * spreadRadius;

    outDir
      .copy(this.basisForward)
      .addScaledVector(this.basisRight, offsetX)
      .addScaledVector(this.basisUp, offsetY)
      .normalize();
  }
}

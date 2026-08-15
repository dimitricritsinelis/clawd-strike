import { AabbCollisionSolver, type MotionResult, type MutablePosition } from "./collision/Solver";
import { WorldColliders } from "./collision/WorldColliders";
import { intersectsAabb, setAabbFromFootPosition, type MutableAabb } from "./collision/Aabb";
import type { WorldColliderEntry } from "./collision/WorldColliders";

export type PlayerInputState = {
  forward: number;
  right: number;
  crouchHeld: boolean;
  jumpPressed: boolean;
};

export const PLAYER_WIDTH_M = 0.6;
export const PLAYER_HEIGHT_M = 1.8;
export const PLAYER_EYE_HEIGHT_M = 1.7;
export const RUN_SPEED_MPS = 6.0;
export const CROUCH_HEIGHT_M = 1.4;
export const CROUCH_EYE_HEIGHT_M = 1.3;
export const CROUCH_SPEED_MPS = 3.0;
export const GRAVITY_MPS2 = 20.0;
export const JUMP_VELOCITY_MPS = 6.35;
const MIN_RUN_SPEED_MPS = 0;

/** Coyote time: player can still jump for this many seconds after walking off a ledge. */
const COYOTE_TIME_S = 0.1;
/** Jump buffer: a jump input this many seconds early will be queued and executed on landing. */
const JUMP_BUFFER_S = 0.1;

const PLAYER_HALF_WIDTH_M = PLAYER_WIDTH_M * 0.5;
/**
 * Must match the runtime loop's own per-frame clamp (100 ms in bootstrap's
 * step()). When this was tighter than the loop clamp, every frame between 10 and
 * 20 fps advanced the player by at most 50 ms while enemies, buff durations,
 * wave timers and weapon cadence consumed the full frame — the player was
 * silently time-dilated to half speed exactly when the game was already
 * struggling. Movement is sub-stepped below, so a longer clamp costs accuracy
 * nothing; it only stops the player's clock drifting from the world's.
 */
const MAX_FRAME_DT_S = 0.1;
const MAX_SUBSTEP_DT_S = 1 / 120;
const BOUNDS_EPSILON_M = 0.001;
/**
 * Below this Y the player is considered to have fallen out of the world. The
 * bazaar's lowest authored ground sits far above it, so only a genuine fall
 * through the floor reaches this.
 */
const OUT_OF_WORLD_Y_M = -25;
export const MAX_AUTO_STEP_M = 0.35;
export const GROUND_SNAP_DOWN_M = 0.45;
const SURFACE_GROUND_EPSILON_M = 0.002;

export class PlayerController {
  private readonly position: MutablePosition = { x: 0, y: 0, z: 0 };
  private readonly solver = new AabbCollisionSolver(PLAYER_HALF_WIDTH_M, PLAYER_HEIGHT_M);
  private readonly motionResult: MotionResult = { hitX: false, hitY: false, hitZ: false, grounded: false };
  private readonly stanceAabb: MutableAabb = {
    minX: 0,
    minY: 0,
    minZ: 0,
    maxX: 0,
    maxY: 0,
    maxZ: 0,
  };
  private readonly stanceCollisionScratch: WorldColliderEntry[] = [];

  private world: WorldColliders | null = null;
  private velocityX = 0;
  private velocityY = 0;
  private velocityZ = 0;
  /** Last position the player was known to be standing safely on. */
  private lastGroundedX = 0;
  private lastGroundedY = 0;
  private lastGroundedZ = 0;
  private outOfWorldRecoveries = 0;
  private grounded = true;
  private horizontalSpeedMps = 0;
  private currentHeight = PLAYER_HEIGHT_M;
  private currentEyeHeight = PLAYER_EYE_HEIGHT_M;
  private readonly runSpeedMps: number;
  private speedMultiplier = 1.0;

  constructor(runSpeedOverrideMps = RUN_SPEED_MPS) {
    const normalizedRunSpeed = Number.isFinite(runSpeedOverrideMps)
      ? Math.max(MIN_RUN_SPEED_MPS, runSpeedOverrideMps)
      : RUN_SPEED_MPS;
    this.runSpeedMps = normalizedRunSpeed;
  }
  /** Coyote timer: counts down from COYOTE_TIME_S when the player leaves the ground. */
  private coyoteTimerS = 0;
  /** Jump buffer timer: set to JUMP_BUFFER_S on input; executes jump when grounded. */
  private jumpBufferTimerS = 0;

  setWorld(world: WorldColliders): void {
    this.world = world;
    this.clampToPlayableBounds();
    if (world.hasTraversalSurfaces) {
      const surface = world.traversalSurfaces.sample(this.position.x, this.position.z, this.position.y);
      if (surface) {
        this.position.y = surface.elevationM;
        this.grounded = true;
      }
    }
  }

  setSpawn(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    if (this.world?.hasTraversalSurfaces) {
      const surface = this.world.traversalSurfaces.sample(x, z, y);
      if (surface) this.position.y = surface.elevationM;
    }
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    this.grounded = true;
    this.horizontalSpeedMps = 0;
    this.coyoteTimerS = 0;
    this.jumpBufferTimerS = 0;
    this.motionResult.hitX = false;
    this.motionResult.hitY = false;
    this.motionResult.hitZ = false;
    this.motionResult.grounded = true;
    this.lastGroundedX = this.position.x;
    this.lastGroundedY = this.position.y;
    this.lastGroundedZ = this.position.z;
    this.clampToPlayableBounds();
  }

  step(deltaSeconds: number, input: PlayerInputState, yaw: number): void {
    const world = this.world;
    if (!world) return;

    const canStand = !input.crouchHeld && this.canOccupyHeight(PLAYER_HEIGHT_M, world);
    this.currentHeight = input.crouchHeld || !canStand ? CROUCH_HEIGHT_M : PLAYER_HEIGHT_M;
    const crouched = this.currentHeight === CROUCH_HEIGHT_M;
    this.currentEyeHeight = crouched ? CROUCH_EYE_HEIGHT_M : PLAYER_EYE_HEIGHT_M;
    this.solver.setHeight(this.currentHeight);

    const clampedDt = Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DT_S);
    if (clampedDt <= 0) return;

    const stepCount = Math.max(1, Math.ceil(clampedDt / MAX_SUBSTEP_DT_S));
    const stepDt = clampedDt / stepCount;

    // ── Jump buffer: receiving new jump input refreshes the buffer timer ──────
    if (input.jumpPressed) {
      this.jumpBufferTimerS = JUMP_BUFFER_S;
    }

    for (let i = 0; i < stepCount; i += 1) {
      let forward = input.forward;
      let right = input.right;

      const axisLength = Math.hypot(forward, right);
      if (axisLength > 1) {
        const invLength = 1 / axisLength;
        forward *= invLength;
        right *= invLength;
      }

      const speedMps = (crouched ? CROUCH_SPEED_MPS : this.runSpeedMps) * this.speedMultiplier;
      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);
      const forwardX = -sinYaw;
      const forwardZ = -cosYaw;
      const rightX = cosYaw;
      const rightZ = -sinYaw;

      const velocityX = (forwardX * forward + rightX * right) * speedMps;
      const velocityZ = (forwardZ * forward + rightZ * right) * speedMps;
      this.velocityX = velocityX;
      this.velocityZ = velocityZ;
      this.horizontalSpeedMps = Math.hypot(velocityX, velocityZ);

      // ── Coyote time: allow jumping briefly after walking off a ledge ────────
      const canJump = this.grounded || this.coyoteTimerS > 0;

      if (this.jumpBufferTimerS > 0 && canJump) {
        this.velocityY = JUMP_VELOCITY_MPS;
        this.grounded = false;
        this.coyoteTimerS = 0;   // consume coyote window immediately
        this.jumpBufferTimerS = 0;
      }

      // Decay timers by substep dt
      this.jumpBufferTimerS = Math.max(0, this.jumpBufferTimerS - stepDt);
      if (!this.grounded) {
        this.coyoteTimerS = Math.max(0, this.coyoteTimerS - stepDt);
      }

      this.velocityY -= GRAVITY_MPS2 * stepDt;

      const previousX = this.position.x;
      const previousY = this.position.y;
      const previousZ = this.position.z;
      const wasGrounded = this.grounded;

      this.solver.moveAndCollide(
        this.position,
        velocityX * stepDt,
        velocityZ * stepDt,
        this.velocityY * stepDt,
        world,
        this.motionResult,
      );

      if (world.hasTraversalSurfaces) {
        const surface = world.traversalSurfaces.sample(this.position.x, this.position.z, previousY);
        const surfaceRise = surface ? surface.elevationM - previousY : Number.POSITIVE_INFINITY;
        const shouldFollowGround = wasGrounded && this.velocityY <= 0;

        if (shouldFollowGround && surface && surfaceRise <= MAX_AUTO_STEP_M && surfaceRise >= -GROUND_SNAP_DOWN_M) {
          this.position.y = surface.elevationM;
          this.velocityY = 0;
          this.grounded = true;
          this.coyoteTimerS = 0;
          this.motionResult.hitY = true;
          this.motionResult.grounded = true;
        } else if (shouldFollowGround && surface && surfaceRise > MAX_AUTO_STEP_M) {
          this.position.x = previousX;
          this.position.z = previousZ;
          const previousSurface = world.traversalSurfaces.sample(previousX, previousZ, previousY);
          this.position.y = previousSurface?.elevationM ?? previousY;
          this.velocityY = 0;
          this.grounded = true;
          this.motionResult.hitX = Math.abs(velocityX) > 0.0001;
          this.motionResult.hitZ = Math.abs(velocityZ) > 0.0001;
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
          this.coyoteTimerS = 0;
          this.motionResult.hitY = true;
          this.motionResult.grounded = true;
        } else if (this.motionResult.hitY) {
          if (this.velocityY < 0) {
            this.grounded = true;
            this.coyoteTimerS = 0;
          }
          this.velocityY = 0;
        } else {
          if (wasGrounded) this.coyoteTimerS = COYOTE_TIME_S;
          this.grounded = false;
          this.motionResult.grounded = false;
        }
      } else if (this.motionResult.hitY) {
        if (this.velocityY < 0) {
          this.grounded = true;
          this.coyoteTimerS = 0; // reset coyote on landing
        }
        this.velocityY = 0;
      } else {
        if (this.grounded) {
          // Just left the ground — start the coyote window
          this.coyoteTimerS = COYOTE_TIME_S;
        }
        this.grounded = false;
      }

      this.clampToPlayableBounds();
    }
  }

  getPosition(): Readonly<MutablePosition> {
    return this.position;
  }

  getVelocity(): Readonly<MutablePosition> {
    return {
      x: this.velocityX,
      y: this.velocityY,
      z: this.velocityZ,
    };
  }

  getGrounded(): boolean {
    return this.grounded;
  }

  getHorizontalSpeedMps(): number {
    return this.horizontalSpeedMps;
  }

  getLastCollisionState(): MotionResult {
    return {
      hitX: this.motionResult.hitX,
      hitY: this.motionResult.hitY,
      hitZ: this.motionResult.hitZ,
      grounded: this.motionResult.grounded,
    };
  }

  getCurrentHeight(): number {
    return this.currentHeight;
  }

  getCurrentEyeHeight(): number {
    return this.currentEyeHeight;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, multiplier);
  }

  isWithinPlayableBounds(): boolean {
    if (!this.world) return true;

    const minX = this.world.playableBounds.minX + PLAYER_HALF_WIDTH_M + BOUNDS_EPSILON_M;
    const maxX = this.world.playableBounds.maxX - PLAYER_HALF_WIDTH_M - BOUNDS_EPSILON_M;
    const minZ = this.world.playableBounds.minZ + PLAYER_HALF_WIDTH_M + BOUNDS_EPSILON_M;
    const maxZ = this.world.playableBounds.maxZ - PLAYER_HALF_WIDTH_M - BOUNDS_EPSILON_M;

    return (
      this.position.x >= minX &&
      this.position.x <= maxX &&
      this.position.z >= minZ &&
      this.position.z <= maxZ
    );
  }

  private clampToPlayableBounds(): void {
    if (!this.world) return;

    const minX = this.world.playableBounds.minX + PLAYER_HALF_WIDTH_M + BOUNDS_EPSILON_M;
    const maxX = this.world.playableBounds.maxX - PLAYER_HALF_WIDTH_M - BOUNDS_EPSILON_M;
    const minZ = this.world.playableBounds.minZ + PLAYER_HALF_WIDTH_M + BOUNDS_EPSILON_M;
    const maxZ = this.world.playableBounds.maxZ - PLAYER_HALF_WIDTH_M - BOUNDS_EPSILON_M;

    if (this.position.x < minX) this.position.x = minX;
    if (this.position.x > maxX) this.position.x = maxX;
    if (this.position.z < minZ) this.position.z = minZ;
    if (this.position.z > maxZ) this.position.z = maxZ;

    this.recoverIfOutOfWorld();
  }

  /**
   * Last-resort floor. Bounds clamping only constrains X/Z — nothing stops a
   * fall, so any spot the map leaves without a traversal surface or floor
   * collider drops the player forever with no way back and no death, which
   * soft-locks the whole run. A NaN position would be equally unrecoverable.
   * Returning to the last known-good standing position keeps a map gap or a
   * numerical glitch to a blink instead of a lost session.
   */
  private recoverIfOutOfWorld(): void {
    const { x, y, z } = this.position;
    const finite = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);

    if (finite && y > OUT_OF_WORLD_Y_M) {
      if (this.grounded) {
        this.lastGroundedX = x;
        this.lastGroundedY = y;
        this.lastGroundedZ = z;
      }
      return;
    }

    this.position.x = this.lastGroundedX;
    this.position.y = this.lastGroundedY;
    this.position.z = this.lastGroundedZ;
    this.velocityY = 0;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.grounded = true;
    this.coyoteTimerS = 0;
    this.outOfWorldRecoveries += 1;
  }

  /** Number of times the player has been rescued from below the world. */
  getOutOfWorldRecoveryCount(): number {
    return this.outOfWorldRecoveries;
  }

  private canOccupyHeight(heightM: number, world: WorldColliders): boolean {
    setAabbFromFootPosition(
      this.stanceAabb,
      this.position.x,
      this.position.y,
      this.position.z,
      PLAYER_HALF_WIDTH_M - BOUNDS_EPSILON_M,
      heightM,
    );
    world.queryCandidates(this.stanceAabb, this.stanceCollisionScratch);
    for (const collider of this.stanceCollisionScratch) {
      if (collider.kind !== "wall" && collider.kind !== "prop") continue;
      if (intersectsAabb(this.stanceAabb, collider)) return false;
    }
    return true;
  }
}

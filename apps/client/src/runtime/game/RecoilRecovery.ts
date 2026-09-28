/**
 * CS-style view-punch recovery for the player's AK-47.
 *
 * Fire recoil is still applied straight to the look angles so the camera and
 * crosshair climb during a spray. Every applied kick is also recorded here as
 * an offset. Look input that opposes the offset consumes it, so a player who
 * pulls the spray down fully has nothing left to recover and is never
 * over-corrected. Once no shot has fired for RECOIL_RECOVERY_DELAY_S, the
 * remaining offset returns to zero along a critically damped curve, and the
 * caller subtracts each step's change from the look angles.
 *
 * Everything is deterministic and frame-rate independent: the recovery is the
 * closed-form solution of a critically damped spring, and the delay is split
 * exactly inside the frame in which it elapses.
 */

/** Idle time after the last shot before recovery starts. Longer than the 0.1 s fire interval so a held spray never recovers between shots. */
export const RECOIL_RECOVERY_DELAY_S = 0.14;
/**
 * Natural frequency of the critically damped return (rad/s). From rest the
 * remaining fraction is (1 + wt)e^(-wt): 50% at ~0.105 s, 5% at ~0.297 s and
 * 2% at ~0.364 s after the delay. Raised from 13 for a snappier settle
 * (WP-16); the delay stays 0.14 s so a held spray never recovers between shots.
 */
export const RECOIL_RECOVERY_OMEGA = 16;
/** Offsets below this (radians, ~0.0006 deg) snap to zero so recovery terminates. */
const RECOIL_RECOVERY_EPSILON_RAD = 1e-5;

export type RecoilRecoveryStep = {
  /** Change to add to the look pitch this frame (radians, + is up). */
  pitchRad: number;
  /** Change to add to the look yaw this frame (radians). */
  yawRad: number;
};

type Axis = { offset: number; velocity: number };

export class RecoilRecovery {
  private readonly pitch: Axis = { offset: 0, velocity: 0 };
  private readonly yaw: Axis = { offset: 0, velocity: 0 };
  private timeSinceShotS = Number.POSITIVE_INFINITY;
  private readonly stepResult: RecoilRecoveryStep = { pitchRad: 0, yawRad: 0 };

  /** Remaining recoverable pitch offset (radians, + means the view was kicked up). */
  getPitchOffsetRad(): number {
    return this.pitch.offset;
  }

  /** Remaining recoverable yaw offset (radians). */
  getYawOffsetRad(): number {
    return this.yaw.offset;
  }

  /**
   * Records a shot. Pass the recoil that was actually applied to the look
   * angles after clamping, so a clamped kick can never be "recovered".
   */
  addShot(appliedPitchRad: number, appliedYawRad: number): void {
    this.pitch.offset += finiteOrZero(appliedPitchRad);
    this.yaw.offset += finiteOrZero(appliedYawRad);
    this.pitch.velocity = 0;
    this.yaw.velocity = 0;
    this.timeSinceShotS = 0;
  }

  /**
   * Lets look input that was actually applied (after clamping) cancel the
   * offset it opposes. Input in the same direction as the offset is the
   * player's own aim and leaves the offset untouched.
   */
  consumeLookInput(appliedPitchDeltaRad: number, appliedYawDeltaRad: number): void {
    consumeAxis(this.pitch, finiteOrZero(appliedPitchDeltaRad));
    consumeAxis(this.yaw, finiteOrZero(appliedYawDeltaRad));
  }

  /**
   * Advances time and returns the look-angle change to apply this frame. The
   * returned object is reused between calls.
   */
  step(deltaSeconds: number): Readonly<RecoilRecoveryStep> {
    this.stepResult.pitchRad = 0;
    this.stepResult.yawRad = 0;
    const dt = Math.max(0, finiteOrZero(deltaSeconds));
    if (dt === 0) return this.stepResult;

    const before = this.timeSinceShotS;
    this.timeSinceShotS = before + dt;
    const recoverSeconds = before >= RECOIL_RECOVERY_DELAY_S
      ? dt
      : Math.max(0, this.timeSinceShotS - RECOIL_RECOVERY_DELAY_S);
    if (recoverSeconds <= 0) return this.stepResult;

    this.stepResult.pitchRad = advanceAxis(this.pitch, recoverSeconds);
    this.stepResult.yawRad = advanceAxis(this.yaw, recoverSeconds);
    return this.stepResult;
  }

  /** Drops any pending recovery. Use wherever look angles are set directly. */
  reset(): void {
    this.pitch.offset = 0;
    this.pitch.velocity = 0;
    this.yaw.offset = 0;
    this.yaw.velocity = 0;
    this.timeSinceShotS = Number.POSITIVE_INFINITY;
  }
}

function consumeAxis(axis: Axis, delta: number): void {
  if (axis.offset === 0 || delta === 0 || Math.sign(delta) === Math.sign(axis.offset)) return;
  const next = Math.abs(delta) >= Math.abs(axis.offset) ? 0 : axis.offset + delta;
  // The spring is linear, so scaling offset and velocity together keeps the
  // remaining return on the same curve shape.
  axis.velocity = next === 0 ? 0 : axis.velocity * (next / axis.offset);
  axis.offset = next;
}

/** Closed-form critically damped step toward zero. Returns the offset change. */
function advanceAxis(axis: Axis, seconds: number): number {
  const x0 = axis.offset;
  if (x0 === 0 && axis.velocity === 0) return 0;
  const w = RECOIL_RECOVERY_OMEGA;
  const decay = Math.exp(-w * seconds);
  const b = axis.velocity + w * x0;
  let x = (x0 + b * seconds) * decay;
  let v = (axis.velocity - w * b * seconds) * decay;
  if (Math.abs(x) < RECOIL_RECOVERY_EPSILON_RAD || Math.sign(x) !== Math.sign(x0)) {
    x = 0;
    v = 0;
  }
  axis.offset = x;
  axis.velocity = v;
  return x - x0;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

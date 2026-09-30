import { DeterministicRng } from "../utils/Rng";
import { ak47FeelTuning, type Ak47MotionTuning } from "./ak47FeelTuning";

/** Exact underdamped spring integration; impulse velocities use metres/radians per second. */
class Spring {
  value = 0;
  velocity = 0;
  /** Low-passed target, used only by stepLagged. */
  input = 0;

  step(target: number, frequency: number, dampingRatio: number, dt: number): void {
    if (dt <= 0) return;
    const decay = frequency * dampingRatio;
    const oscillation = frequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    const displacement = this.value - target;
    const b = (this.velocity + decay * displacement) / oscillation;
    const sin = Math.sin(oscillation * dt);
    const cos = Math.cos(oscillation * dt);
    const envelope = Math.exp(-decay * dt);
    this.value = target + envelope * (displacement * cos + b * sin);
    this.velocity = envelope * (
      oscillation * (-displacement * sin + b * cos) - decay * (displacement * cos + b * sin)
    );
  }

  /**
   * Spring toward a target that first passes a one-pole low-pass (time constant lag).
   * Solved exactly for a target held constant over the frame, so a constant input
   * gives the same motion at any frame rate.
   */
  stepLagged(target: number, lag: number, frequency: number, dampingRatio: number, dt: number): void {
    if (dt <= 0) return;
    if (lag <= 0) {
      this.input = target;
      this.step(target, frequency, dampingRatio, dt);
      return;
    }
    const rate = 1 / lag;
    const w2 = frequency * frequency;
    // Particular solution target + a·e^(-t/lag) for the exponentially approaching input.
    const a = w2 * (this.input - target) / (w2 - 2 * dampingRatio * frequency * rate + rate * rate);
    const fade = Math.exp(-dt * rate);
    this.value -= target + a;
    this.velocity += a * rate;
    this.step(0, frequency, dampingRatio, dt);
    this.value += target + a * fade;
    this.velocity -= a * rate * fade;
    this.input = target + (this.input - target) * fade;
  }

  reset(): void { this.value = this.velocity = this.input = 0; }
}

/**
 * Shot facts from the fire controller (a subset of Ak47ShotEvent). Every field is
 * optional: without an event the motion applies the same first-shot rule itself.
 */
export type Ak47MotionShot = {
  isFirstShot?: boolean;
  /** 0-based index within the held burst. */
  burstIndex?: number;
  /** Shots fired in this frame; each one's impulse is divided by this. */
  shotsThisFrame?: number;
  /** The view's applied horizontal pattern value; the gun yaws the same way. */
  patternYawDeg?: number;
};

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

export class Ak47Motion {
  readonly back = new Spring();
  readonly pitch = new Spring();
  readonly yaw = new Spring();
  readonly roll = new Spring();
  readonly side = new Spring();
  readonly sustainBack = new Spring();
  readonly sustainPitch = new Spring();
  readonly sustainYaw = new Spring();
  readonly sustainRoll = new Spring();
  readonly lookYaw = new Spring();
  readonly lookPitch = new Spring();
  readonly landing = new Spring();
  readonly movement = new Spring();
  readonly pose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  private readonly rng = new DeterministicRng(0x47a11);
  private breathPhase = 0;
  private stepPhase = 0;
  /** Remaining pull toward the footstep trough, applied over footstepSnapS. */
  private stepCorrection = 0;
  /** Last interval reported by onFootstep; 0 means no hook, use the stride fallback. */
  private footstepIntervalS = 0;
  private grounded = true;
  private clockS = 0;
  private sinceShotS = Number.POSITIVE_INFINITY;
  private burst = 0;

  constructor(private readonly tuning: Ak47MotionTuning = ak47FeelTuning.motion) {}

  shot(event: Ak47MotionShot = {}): void {
    const t = this.tuning.kick;
    const first = event.isFirstShot ?? this.sinceShotS >= t.firstShotResetS;
    this.burst = event.burstIndex !== undefined ? event.burstIndex + 1 : first ? 1 : this.burst + 1;
    this.sinceShotS = 0;
    const k = (first ? t.firstShotScale : t.followShotScale)
      * this.rng.range(1 - t.scaleJitter, 1 + t.scaleJitter)
      / Math.max(1, event.shotsThisFrame ?? 1);
    this.back.value = Math.min(t.backValueCap, this.back.value + t.backValue * k);
    this.back.velocity = Math.min(t.backVelocityCap, this.back.velocity + t.backVelocity * k);
    this.pitch.value = Math.min(t.pitchValueCap, this.pitch.value + t.pitchValue * k);
    this.pitch.velocity = Math.min(t.pitchVelocityCap, this.pitch.velocity + t.pitchVelocity * k);
    const rollSign = this.rng.next() < t.rollClockwiseBias ? -1 : 1;
    this.roll.velocity = clamp(
      this.roll.velocity + rollSign * t.rollVelocity * this.rng.range(1 - t.rollJitter, 1 + t.rollJitter) * k,
      t.rollVelocityCap,
    );
    const pattern = event.patternYawDeg ?? 0;
    const yawSign = pattern !== 0 ? Math.sign(pattern) : this.rng.next() < .5 ? -1 : 1;
    this.yaw.velocity = clamp(
      this.yaw.velocity + (yawSign * t.yawDrift + this.rng.range(-t.yawJitter, t.yawJitter)) * k,
      t.yawVelocityCap,
    );
    this.side.velocity += (this.rng.next() < .5 ? -1 : 1) * t.sideVelocity * k;
  }

  /**
   * Footstep hook: the bootstrap footstep timer stays the cadence authority. The bob
   * phase then runs at pi per interval and is pulled to its vertical trough here.
   */
  onFootstep(intervalS: number): void {
    if (!Number.isFinite(intervalS) || intervalS <= 0) return;
    this.footstepIntervalS = intervalS;
    // Vertical bob cos(2·phase) bottoms out at phase = pi/2 + n·pi; aim for the nearest one.
    const phase = this.stepPhase + this.stepCorrection;
    const trough = Math.PI / 2 + Math.round((phase - Math.PI / 2) / Math.PI) * Math.PI;
    this.stepCorrection = trough - this.stepPhase;
    if (this.tuning.bob.footstepSnapS <= 0) {
      this.stepPhase = trough;
      this.stepCorrection = 0;
    }
  }

  update(dt: number, speed: number, grounded: boolean, lookYawRate: number, lookPitchRate: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    const { kick, sustain, sway, bob, breath, landing } = this.tuning;
    speed = Math.max(0, speed);
    if (grounded && !this.grounded) this.landing.velocity += landing.velocity;
    this.grounded = grounded;
    this.clockS += dt;
    this.sinceShotS += dt;

    this.back.step(0, kick.backSpring.frequency, kick.backSpring.damping, dt);
    this.pitch.step(0, kick.pitchSpring.frequency, kick.pitchSpring.damping, dt);
    this.yaw.step(0, kick.yawSpring.frequency, kick.yawSpring.damping, dt);
    this.roll.step(0, kick.rollSpring.frequency, kick.rollSpring.damping, dt);
    this.side.step(0, kick.sideSpring.frequency, kick.sideSpring.damping, dt);

    const held = this.sinceShotS < sustain.holdS ? Math.min(1, this.burst / sustain.rampShots) : 0;
    const wander = Math.PI * 2 * this.clockS;
    this.sustainBack.step(sustain.back * held, sustain.digSpring.frequency, sustain.digSpring.damping, dt);
    this.sustainPitch.step(sustain.pitch * held, sustain.digSpring.frequency, sustain.digSpring.damping, dt);
    this.sustainYaw.step(Math.sin(wander * sustain.yawHz) * sustain.yaw * held,
      sustain.wanderSpring.frequency, sustain.wanderSpring.damping, dt);
    this.sustainRoll.step(Math.sin(wander * sustain.rollHz + sustain.rollPhase) * sustain.roll * held,
      sustain.wanderSpring.frequency, sustain.wanderSpring.damping, dt);

    const { frequency, damping } = sway.spring;
    this.lookYaw.stepLagged(sway.yawLimit * Math.tanh(-lookYawRate * sway.yawGain / sway.yawLimit),
      sway.lookLagS, frequency, damping, dt);
    this.lookPitch.stepLagged(sway.pitchLimit * Math.tanh(-lookPitchRate * sway.pitchGain / sway.pitchLimit),
      sway.lookLagS, frequency, damping, dt);
    this.landing.step(0, landing.spring.frequency, landing.spring.damping, dt);
    this.movement.step(grounded ? Math.min(1, speed / bob.fullMoveSpeedMps) : 0,
      bob.movementSpring.frequency, bob.movementSpring.damping, dt);

    this.breathPhase += dt * Math.PI * 2 * breath.hz;
    if (this.footstepIntervalS > 0) {
      if (grounded && speed > bob.minSpeedMps) this.stepPhase += dt * Math.PI / this.footstepIntervalS;
    } else {
      this.stepPhase += dt * speed * bob.fallbackPhasePerMetre;
    }
    if (this.stepCorrection !== 0) {
      const pull = bob.footstepSnapS > 0 ? this.stepCorrection * (1 - Math.exp(-dt / bob.footstepSnapS)) : this.stepCorrection;
      this.stepPhase += pull;
      this.stepCorrection -= pull;
      if (Math.abs(this.stepCorrection) < 1e-9) this.stepCorrection = 0;
    }

    const move = this.movement.value;
    const still = Math.min(1, Math.max(0, 1 - move));
    const eight = Math.sin(this.breathPhase / 2) * still;
    const breathe = Math.sin(this.breathPhase);
    const stride = Math.sin(this.stepPhase);
    const bounce = Math.cos(this.stepPhase * 2);
    const kickPitch = this.pitch.value + this.sustainPitch.value;
    this.pose.x = stride * bob.x * move + this.lookYaw.value * sway.yawToX + this.side.value
      + eight * breath.figure8X;
    this.pose.y = breathe * breath.y + bounce * bob.y * move + this.landing.value + kickPitch * kick.pitchToLift;
    this.pose.z = this.back.value + this.sustainBack.value + Math.cos(this.breathPhase) * breath.z + move * bob.moveZ;
    this.pose.pitch = kickPitch + this.lookPitch.value + breathe * breath.figure8Pitch * still
      + move * bob.movePitch + bounce * bob.pitch * move;
    this.pose.yaw = this.yaw.value + this.sustainYaw.value + this.lookYaw.value - eight * breath.figure8Yaw;
    this.pose.roll = this.roll.value + this.sustainRoll.value + this.lookYaw.value * sway.yawToRoll
      + stride * bob.roll * move - eight * breath.figure8Roll;
  }

  reset(): void {
    for (const spring of [
      this.back, this.pitch, this.yaw, this.roll, this.side,
      this.sustainBack, this.sustainPitch, this.sustainYaw, this.sustainRoll,
      this.lookYaw, this.lookPitch, this.landing, this.movement,
    ]) spring.reset();
    this.rng.reset();
    this.breathPhase = this.stepPhase = this.stepCorrection = this.footstepIntervalS = this.clockS = this.burst = 0;
    this.sinceShotS = Number.POSITIVE_INFINITY;
    this.grounded = true;
    Object.assign(this.pose, { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 });
  }
}

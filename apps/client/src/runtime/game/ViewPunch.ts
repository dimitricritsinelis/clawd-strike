import { DeterministicRng } from "../utils/Rng";
import { ak47FeelTuning, type Ak47ViewPunchTuning } from "../weapons/ak47FeelTuning";

const DEG_TO_RAD = Math.PI / 180;

type Axis = { offset: number; velocity: number };

/**
 * Render-only camera view punch (WP-06). Each shot kicks an underdamped spring
 * per axis (pitch up, alternating roll, small random yaw) that peaks about
 * 26 ms later and has settled before the next 600 RPM round. Game adds the
 * offsets to the camera as its last rotation write of the frame; the next
 * frame's look update overwrites them, so aim, shot rays and the agent API
 * never see the punch.
 */
export class ViewPunch {
  private readonly pitch: Axis = { offset: 0, velocity: 0 };
  private readonly yaw: Axis = { offset: 0, velocity: 0 };
  private readonly roll: Axis = { offset: 0, velocity: 0 };
  private rng: DeterministicRng;
  private rollSign = 1;
  /** Initial velocity that makes a spring from rest peak at exactly 1. */
  private readonly velocityPerPeak: number;
  private readonly omega: number;
  private readonly zetaOmega: number;
  private readonly omegaD: number;

  constructor(seed: number, private readonly tuning: Ak47ViewPunchTuning = ak47FeelTuning.viewPunch) {
    this.rng = new DeterministicRng(seed);
    const { frequency, damping } = tuning.spring;
    if (!(damping > 0 && damping < 1)) throw new Error(`view punch damping must be in (0, 1), got ${damping}`);
    this.omega = frequency;
    this.zetaOmega = damping * frequency;
    this.omegaD = frequency * Math.sqrt(1 - damping * damping);
    const peakTime = Math.atan2(this.omegaD, this.zetaOmega) / this.omegaD;
    this.velocityPerPeak = this.omegaD / (Math.exp(-this.zetaOmega * peakTime) * Math.sin(this.omegaD * peakTime));
  }

  reseed(seed: number): void {
    this.rng = new DeterministicRng(seed);
    this.reset();
  }

  reset(): void {
    for (const axis of [this.pitch, this.yaw, this.roll]) {
      axis.offset = 0;
      axis.velocity = 0;
    }
    this.rng.reset();
    this.rollSign = 1;
  }

  /** Kicks the spring for one fired round. */
  addShot(isFirstShot: boolean): void {
    const t = this.tuning;
    if (t.scale <= 0) return;
    const peaks = isFirstShot ? t.firstShot : t.followShot;
    const jitter = (): number => this.rng.range(1 - t.jitter, 1 + t.jitter);
    if (isFirstShot) {
      this.rollSign = this.rng.next() < 0.5 ? -1 : 1;
    } else if (this.rng.next() < t.rollAlternateBias) {
      this.rollSign = -this.rollSign;
    }
    const kick = (axis: Axis, peakDeg: number): void => {
      axis.velocity += peakDeg * t.scale * DEG_TO_RAD * this.velocityPerPeak;
    };
    kick(this.pitch, peaks.pitchDeg * jitter());
    kick(this.roll, this.rollSign * peaks.rollDeg * jitter());
    kick(this.yaw, this.rng.range(-t.yawDeg, t.yawDeg));
  }

  /** Advances the springs exactly (frame-rate independent). */
  step(deltaSeconds: number): void {
    if (!(deltaSeconds > 0)) return;
    const decay = Math.exp(-this.zetaOmega * deltaSeconds);
    const cos = Math.cos(this.omegaD * deltaSeconds);
    const sin = Math.sin(this.omegaD * deltaSeconds);
    for (const axis of [this.pitch, this.yaw, this.roll]) {
      const x = axis.offset;
      const v = axis.velocity;
      axis.offset = decay * (x * cos + ((v + this.zetaOmega * x) / this.omegaD) * sin);
      axis.velocity = decay * (v * cos - ((this.zetaOmega * v + this.omega * this.omega * x) / this.omegaD) * sin);
    }
  }

  /** Pitch offset in radians (+ looks up), capped. */
  getPitchRad(): number {
    return clampAbs(this.pitch.offset, this.tuning.pitchCapDeg * DEG_TO_RAD);
  }

  /** Yaw offset in radians, capped. */
  getYawRad(): number {
    return clampAbs(this.yaw.offset, this.tuning.yawCapDeg * DEG_TO_RAD);
  }

  /** Roll offset in radians, capped. */
  getRollRad(): number {
    return clampAbs(this.roll.offset, this.tuning.rollCapDeg * DEG_TO_RAD);
  }
}

function clampAbs(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

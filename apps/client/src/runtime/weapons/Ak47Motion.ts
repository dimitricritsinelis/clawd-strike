import { DeterministicRng } from "../utils/Rng";

/** Exact underdamped spring integration; impulse velocities use metres/radians per second. */
class Spring {
  value = 0;
  velocity = 0;

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

  reset(): void { this.value = this.velocity = 0; }
}

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

export class Ak47Motion {
  readonly back = new Spring();
  readonly pitch = new Spring();
  readonly yaw = new Spring();
  readonly roll = new Spring();
  readonly lookYaw = new Spring();
  readonly lookPitch = new Spring();
  readonly landing = new Spring();
  readonly movement = new Spring();
  readonly pose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  private readonly rng = new DeterministicRng(0x47a11);
  private breathPhase = 0;
  private stepPhase = 0;
  private grounded = true;

  shot(): void {
    this.back.value = Math.min(.025, this.back.value + .003);
    this.back.velocity = Math.min(1.3, this.back.velocity + 1.05);
    this.pitch.value = Math.min(.06, this.pitch.value + .004);
    this.pitch.velocity = Math.min(2.2, this.pitch.velocity + 1.85);
    this.yaw.velocity += this.rng.range(-.16, .16);
    this.roll.velocity += this.rng.range(-.22, .16);
  }

  update(dt: number, speed: number, grounded: boolean, lookYawRate: number, lookPitchRate: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    if (grounded && !this.grounded) this.landing.velocity -= .22;
    this.grounded = grounded;
    this.back.step(0, 40, .82, dt);
    this.pitch.step(0, 32, .80, dt);
    this.yaw.step(0, 30, .84, dt);
    this.roll.step(0, 30, .84, dt);
    this.lookYaw.step(clamp(-lookYawRate * .024, .048), 14, .8, dt);
    this.lookPitch.step(clamp(-lookPitchRate * .021, .035), 14, .8, dt);
    this.landing.step(0, 19, .65, dt);
    this.movement.step(grounded ? Math.min(1, Math.max(0, speed) / 5) : 0, 10, .85, dt);
    this.breathPhase += dt * Math.PI * 2 * .28;
    this.stepPhase += dt * Math.max(0, speed) * 2.65;
    const move = this.movement.value;
    this.pose.x = Math.sin(this.stepPhase) * .006 * move + this.lookYaw.value * .19;
    this.pose.y = Math.sin(this.breathPhase) * .0018 + Math.cos(this.stepPhase * 2) * .0055 * move + this.landing.value;
    this.pose.z = this.back.value + Math.cos(this.breathPhase) * .0008 + move * .010;
    this.pose.pitch = this.pitch.value + this.lookPitch.value + Math.sin(this.breathPhase) * .002 + move * -.025;
    this.pose.yaw = this.yaw.value + this.lookYaw.value;
    this.pose.roll = this.roll.value + this.lookYaw.value * .3 + Math.sin(this.stepPhase) * .009 * move;
  }

  reset(): void {
    for (const spring of [this.back, this.pitch, this.yaw, this.roll, this.lookYaw, this.lookPitch, this.landing, this.movement]) spring.reset();
    this.rng.reset();
    this.breathPhase = this.stepPhase = 0;
    this.grounded = true;
    Object.assign(this.pose, { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 });
  }
}

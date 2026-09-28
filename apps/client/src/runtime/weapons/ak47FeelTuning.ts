/**
 * AK-47 feel tuning: every feel constant, grouped by layer, so feel is signed
 * off by playing rather than by test bounds. The exported object is deep-frozen.
 *
 * Units: metres, radians, seconds; springs are { frequency (rad/s), damping
 * ratio }. Damping must stay below 1 (the exact spring step is underdamped).
 */

type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === "object") deepFreeze(child as object);
  }
  return Object.freeze(value) as DeepReadonly<T>;
}

const DEG = Math.PI / 180;

const motion = {
  /** Per-shot viewmodel kick. */
  kick: {
    /** Fallback first-shot rule when the caller passes no shot event; matches RECOIL_RESET_DELAY_S. */
    firstShotResetS: 0.3,
    firstShotScale: 1.3,
    followShotScale: 0.85,
    /** k is multiplied by rng(1 - jitter, 1 + jitter). */
    scaleJitter: 0.1,
    /** Back (+z toward the camera): instant one-frame attack, then velocity. */
    backValue: 0.0022,
    backValueCap: 0.03,
    backVelocity: 0.92,
    backVelocityCap: 1.4,
    backSpring: { frequency: 38, damping: 0.7 },
    /** Muzzle rise. */
    pitchValue: 0.003,
    pitchValueCap: 0.07,
    pitchVelocity: 1.52,
    pitchVelocityCap: 2.3,
    pitchSpring: { frequency: 30, damping: 0.62 },
    /** Roll: 0.5-0.7 deg peak on the first shot, 0.35-0.5 on follow-ups, mostly clockwise (negative). */
    rollVelocity: 0.36,
    rollJitter: 0.05,
    rollClockwiseBias: 0.7,
    rollVelocityCap: 0.8,
    rollSpring: { frequency: 24, damping: 0.5 },
    /** Yaw follows the view's pattern drift (random side when the pattern is 0 or unknown); peak <= 0.4 deg. */
    yawDrift: 0.19,
    yawJitter: 0.06,
    yawVelocityCap: 0.45,
    yawSpring: { frequency: 26, damping: 0.55 },
    /** Lateral shove added to pose.x. */
    sideVelocity: 0.12,
    sideSpring: { frequency: 30, damping: 0.6 },
    /** Kick pitch lifts the gun (pivot toward the shoulder). */
    pitchToLift: 0.12,
  },
  /** Held-fire layer: the gun digs into the shoulder and wanders, then settles on release. */
  sustain: {
    /** The layer is live while the last shot is younger than this. */
    holdS: 0.14,
    /** Full strength at this many shots into a burst. */
    rampShots: 6,
    back: 0.006,
    pitch: 0.012,
    digSpring: { frequency: 14, damping: 0.95 },
    yaw: 0.005,
    yawHz: 1.7,
    roll: 0.009,
    rollHz: 1.3,
    rollPhase: 1,
    wanderSpring: { frequency: 12, damping: 0.9 },
  },
  /** Look sway: low-passed, tanh-shaped look rate into a weighty spring. */
  sway: {
    /** Low-pass on the shaped look target; frame-rate exact. */
    lookLagS: 0.025,
    yawGain: 0.028,
    yawLimit: 0.055,
    pitchGain: 0.025,
    pitchLimit: 0.04,
    spring: { frequency: 11, damping: 0.68 },
    yawToX: 0.19,
    yawToRoll: 0.45,
  },
  /** Walk bob. The bootstrap footstep timer is the cadence authority when it calls onFootstep. */
  bob: {
    x: 0.0036,
    y: 0.0033,
    roll: 0.0054,
    /** Muzzle nod in phase with the vertical bob; 0 disables. */
    pitch: 0.003,
    /** Phase rad per metre when no footstep hook has reported an interval (legacy stride). */
    fallbackPhasePerMetre: 2.65,
    /** Footsteps only advance the phase above this speed (matches the bootstrap footstep gate). */
    minSpeedMps: 0.5,
    /** Time constant of the pull to the vertical trough on a footstep; 0 snaps instantly. */
    footstepSnapS: 0.05,
    /** Walk pose offsets at full movement. */
    moveZ: 0.01,
    movePitch: -0.025,
    movementSpring: { frequency: 10, damping: 0.85 },
    fullMoveSpeedMps: 5,
  },
  /** Breathing: the base breath stays on while moving; the figure-8 fades out with movement. */
  breath: {
    hz: 0.28,
    y: 0.0018,
    z: 0.0008,
    /** Figure-8 (1:2 Lissajous against the base breath), faded by (1 - move). */
    figure8X: 0.0015,
    figure8Pitch: 0.2 * DEG,
    figure8Yaw: 0.14 * DEG,
    figure8Roll: 0.23 * DEG,
  },
  /** Landing dip (unchanged). */
  landing: {
    velocity: -0.22,
    spring: { frequency: 19, damping: 0.65 },
  },
};

/**
 * Render-only camera view punch: the whole view thumps on each shot and
 * settles before the next one. It never moves the aim, the shot ray or the
 * crosshair's truth. Peaks are in degrees.
 */
const viewPunch = {
  /** Multiplies every peak; 0 disables the punch (comfort). */
  scale: 1,
  /** Peaks about 26 ms after the shot and is about -7% of peak at 100 ms (the 600 RPM interval). */
  spring: { frequency: 45, damping: 0.6 },
  firstShot: { pitchDeg: 0.35, rollDeg: 0.45 },
  followShot: { pitchDeg: 0.2, rollDeg: 0.28 },
  /** Peaks are multiplied by rng(1 - jitter, 1 + jitter). */
  jitter: 0.12,
  /** Chance that a follow-up rolls the other way from the previous shot. */
  rollAlternateBias: 0.7,
  /** Random yaw peak in [-yawDeg, yawDeg]. */
  yawDeg: 0.1,
  pitchCapDeg: 0.8,
  rollCapDeg: 0.6,
  yawCapDeg: 0.3,
};

export const ak47FeelTuning = deepFreeze({ motion, viewPunch });

type Ak47FeelTuning = typeof ak47FeelTuning;
export type Ak47MotionTuning = Ak47FeelTuning["motion"];
export type Ak47ViewPunchTuning = Ak47FeelTuning["viewPunch"];

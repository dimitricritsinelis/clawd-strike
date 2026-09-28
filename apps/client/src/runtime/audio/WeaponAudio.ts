import {
  AK47_DSP_PEAK,
  ak47ShotVariantSteps,
  buildAk47ReloadFoley,
  type Ak47ReloadEventId,
  type Ak47ReloadFoley,
} from "./ak47AudioDsp";
import { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS, type Ak47ReloadMark } from "../weapons/ak47ReloadMarks";

const AK47_CLOSE_BASENAME = "/assets/audio/weapons/ak47/fire_close_01";
const AK47_TAIL_BASENAME = "/assets/audio/weapons/ak47/fire_tail_01";
/** Legacy recording; only the gunshot mechanism layer is still cut from it. */
const AK47_RELOAD_BASENAME = "/assets/audio/weapons/ak47/reload";
/** CC0 magazine foley cuts (see assets/source/audio/reload-foley.provenance.json and AK47_RELOAD_FOLEY_LAYOUT). */
const AK47_RELOAD_FOLEY_BASENAME = "/assets/audio/weapons/ak47/reload-foley";
const KILL_DING_BASENAME = "/assets/audio/ui/kill_ding";
// Prefer mp3 first: the deployed site ships mp3, and probing for ogg first creates noisy 404s in the console.
const AUDIO_EXTENSIONS = [".mp3", ".ogg", ".wav"] as const;
const FALLBACK_NOISE_SECONDS = 0.22;
const EVENT_NOISE_POOL_SIZE = 4;
const KILL_DING_TRIM_START_S = 0.26;

export const AK47_AUDIO_TUNING = {
  player: {
    /** Fallback synthesized crack only; sample layers carry their own gains. */
    layerGainScale: 0.7,
    postGain: 0.11,
  },
  enemy: {
    postGain: 0.055,
    mixPeakLimit: 0.025,
    distanceMinM: 2,
    distanceDecayM: 60,
    distanceMaxM: 60,
    nearLowpassHz: 12000,
    farLowpassHz: 4500,
    /** Distance crossfade: far shooters lose crack/body and keep the room tail. */
    farCloseGain: 0.5,
    farTailGain: 1.9,
    tailPanScale: 0.6,
    behindLowpassScale: 0.5,
    behindGain: 0.8,
  },
  shot: {
    burstGapS: 0.2,
    /** Previous shot's body/tail level once the next round starts (moderate, not silent). */
    closeDuckGain: 0.5,
    tailDuckGain: 0.65,
    duckTimeConstantS: 0.018,
  },
  reload: {
    /**
     * Player shot peak at the mix bus, used until the shot variants are built.
     * Reload levels are always relative to the measured shot peak.
     */
    shotPeakFallback: 0.098,
    /**
     * The master compressor lifts quiet material (makeup gain) and holds the
     * shot crack down, so equal pre-compressor ratios come out about 2.5 dB
     * closer. Measured by weapon-audio.spec.ts against rendered shot peaks.
     */
    compressorOffsetDb: -2.6,
    /**
     * Scheduled audio lands earlier by the device output latency, capped here.
     * Events on the latch mark are exempt (see reloadEventLatencyS).
     */
    latencyCompensationMaxS: 0.06,
    /** Fixed micro-offsets (slide-out, settle) shrink only below this duration. */
    microOffsetFullDurationS: 1.2,
    /** Per-play level variation: hero seat and every other event. */
    seatGainJitterDb: 0.5,
    gainJitterDb: 1.5,
    /** Cancel: 5 ms fade, sources stop 30 ms later. */
    cancelFadeTauS: 0.005,
    cancelStopAfterS: 0.03,
  },
} as const;

/**
 * One reload sound. `offsetS` is added to the scaled mark: "micro" offsets stay
 * fixed in seconds (they shrink only once the reload is shorter than
 * microOffsetFullDurationS), "timeline" offsets scale with the reload.
 */
export type Ak47ReloadAudioEvent = {
  id: Ak47ReloadEventId;
  mark: Ak47ReloadMark;
  offsetS: number;
  offsetKind: "micro" | "timeline";
  /** Peak level in dB against the measured player shot peak. */
  levelDb: number;
};

/**
 * Magazine-only reload. Every event hangs off a mark in ak47ReloadMarks.ts, the
 * same constant the clip and the viewmodel use. No charging handle, no bolt and
 * no ground impact for the dropped magazine. The seat is the loudest event.
 */
export const AK47_RELOAD_AUDIO_TIMELINE: readonly Ak47ReloadAudioEvent[] = [
  { id: "liftCloth", mark: "leaveHandguard", offsetS: 0, offsetKind: "micro", levelDb: -20 },
  { id: "magRelease", mark: "release", offsetS: 0, offsetKind: "micro", levelDb: -11 },
  { id: "slideOut", mark: "release", offsetS: 0.035, offsetKind: "micro", levelDb: -15 },
  { id: "dropSwish", mark: "drop", offsetS: 0, offsetKind: "micro", levelDb: -22 },
  { id: "grabCloth", mark: "newMagazineInView", offsetS: -0.14, offsetKind: "timeline", levelDb: -18 },
  { id: "hookTick", mark: "hook", offsetS: 0, offsetKind: "micro", levelDb: -14 },
  { id: "magSeat", mark: "latch", offsetS: 0, offsetKind: "micro", levelDb: -6 },
  { id: "settleRattle", mark: "latch", offsetS: 0.05, offsetKind: "micro", levelDb: -22 },
  { id: "readySlap", mark: "handOnHandguard", offsetS: 0, offsetKind: "micro", levelDb: -17 },
  { id: "readyCloth", mark: "handOnHandguard", offsetS: 0, offsetKind: "micro", levelDb: -22 },
];

/**
 * Output-latency compensation for one reload event. Events on the two marks
 * where a cancel decision flips are scheduled on the uncompensated clock, so a
 * cancel on the gameplay side of the mark always reaches them before any
 * sample of their transient has been rendered:
 * - `release`: Ak47Weapon cancels on a fire press until the release mark, so
 *   the paddle click (and the slide-out after it) must not be rendered early.
 * - `latch`: the rounds are committed here; the seat and settle are heard at
 *   latch + output latency, inside the seat-punch window.
 * Every other event is compensated and lands on its mark.
 */
export function ak47ReloadEventLatencyS(mark: Ak47ReloadMark, latencyS: number): number {
  return mark === "latch" || mark === "release" ? 0 : latencyS;
}

/** Hit times (seconds after reload start) of every reload event for a reload of `durationSeconds`. */
export function ak47ReloadAudioSchedule(durationSeconds: number): { id: Ak47ReloadEventId; mark: Ak47ReloadMark; atS: number; levelDb: number }[] {
  const scale = durationSeconds / AK47_RELOAD_DURATION_S;
  const microScale = Math.min(1, durationSeconds / AK47_AUDIO_TUNING.reload.microOffsetFullDurationS);
  return AK47_RELOAD_AUDIO_TIMELINE.map((event) => ({
    id: event.id,
    mark: event.mark,
    atS: Math.max(0, AK47_RELOAD_MARKS[event.mark] * scale
      + event.offsetS * (event.offsetKind === "timeline" ? scale : microScale)),
    levelDb: event.levelDb,
  }));
}

type LoadedLayer = {
  buffer: AudioBuffer | null;
  resolvedUrl: string | null;
  triedUrls: string[];
};

export type EnemyAk47ShotOptions = {
  sourceId: string;
  distanceM: number;
  /** dot(camera right, normalized direction to shooter), -1 (left) .. 1 (right). */
  pan?: number;
  /** 0 when the shooter is in front, 1 when directly behind the listener. */
  behind?: number;
};

type Ak47Voice = { gain: GainNode; startTime: number; level: number };
type Ak47Burst = { close?: Ak47Voice; tail?: Ak47Voice; lastVariant?: number };

type Ak47ShotVariant = {
  close: AudioBuffer;
  enemyClose: AudioBuffer;
  tail: AudioBuffer;
  enemyTail: AudioBuffer;
  playbackRate: number;
  tailPlaybackRate: number;
  tailDelayS: number;
  closeGain: number;
  tailGain: number;
};

type ReloadClip = { buffers: AudioBuffer[]; hitOffsetsS: number[] };
type ReloadVoice = {
  id: Ak47ReloadEventId;
  mark: Ak47ReloadMark;
  /** When the event's transient is heard (context time). */
  hitTime: number;
  startTime: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
};
type ReloadRun = {
  durationS: number;
  /** Output-latency compensation fixed at reload start. */
  latencyS: number;
  /** Context time of reload position 0 (moved forward by each pause). */
  originTime: number;
  seatVariant: number;
  /** Reload position held while paused, or null while running. */
  pausedAtS: number | null;
  foley: Map<Ak47ReloadEventId, ReloadClip>;
};

/**
 * Computes stereo pan and "behind" amount for a sound source from a camera's
 * world matrix (three.js column-major `matrixWorld.elements`).
 */
export function computeListenerSpatial(
  matrixWorld: ArrayLike<number>,
  sourceX: number,
  sourceY: number,
  sourceZ: number,
): { pan: number; behind: number } {
  const dx = sourceX - matrixWorld[12]!;
  const dy = sourceY - matrixWorld[13]!;
  const dz = sourceZ - matrixWorld[14]!;
  const length = Math.hypot(dx, dy, dz);
  if (!(length > 1e-6)) return { pan: 0, behind: 0 };
  const rightLength = Math.hypot(matrixWorld[0]!, matrixWorld[1]!, matrixWorld[2]!) || 1;
  const backLength = Math.hypot(matrixWorld[8]!, matrixWorld[9]!, matrixWorld[10]!) || 1;
  const pan = (dx * matrixWorld[0]! + dy * matrixWorld[1]! + dz * matrixWorld[2]!) / (length * rightLength);
  // The camera looks down its local -Z, so the +Z column points backwards.
  const back = (dx * matrixWorld[8]! + dy * matrixWorld[9]! + dz * matrixWorld[10]!) / (length * backLength);
  return { pan: Math.max(-1, Math.min(1, pan)), behind: clamp01(back) };
}

function toAudioBuffer(ctx: BaseAudioContext, channels: readonly Float32Array[], sampleRate: number): AudioBuffer {
  const buffer = ctx.createBuffer(channels.length, channels[0]!.length, sampleRate);
  channels.forEach((channel, index) => buffer.copyToChannel(channel as Float32Array<ArrayBuffer>, index));
  return buffer;
}

function channelsOf(buffer: AudioBuffer): Float32Array[] {
  return Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index).slice());
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  const out = buffer.getChannelData(0).slice();
  for (let channel = 1; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < out.length; i += 1) out[i] = out[i]! + data[i]!;
  }
  if (buffer.numberOfChannels > 1) for (let i = 0; i < out.length; i += 1) out[i] = out[i]! / buffer.numberOfChannels;
  return out;
}

type Ak47BufferPlaybackOptions = {
  destination?: AudioNode;
  attackSeconds?: number;
  lowShelfGainDb?: number;
  highShelfFrequencyHz?: number;
  highShelfGainDb?: number;
  driveCurve?: Float32Array;
  lowpassFrequencyHz?: number;
  offsetSeconds?: number;
  onEnded?: () => void;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function createDriveCurve(samples: number, amount: number): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

const DRIVE_CURVE = createDriveCurve(512, 1.35);
const KILL_DING_DRIVE_CURVE = createDriveCurve(512, 1.05);

export class WeaponAudio {
  /**
   * When true the audio graph is never built, so nothing plays and no
   * AudioContext is created at all. Used to keep automated and agent-driven
   * playtests silent — a person watching an LLM drive the game should not have
   * gunfire and ambience coming out of their speakers.
   */
  private muted = false;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private playerGunGain: GainNode | null = null;
  private enemyGunGain: GainNode | null = null;
  private enemyGunLimiter: WaveShaperNode | null = null;
  private reloadGain: GainNode | null = null;
  private playerBurst: Ak47Burst = {};
  private enemyBursts = new Map<string, Ak47Burst>();
  private lastPlayerVariant = -1;

  /** Gunshot variations rebuilt once from the decoded recordings. */
  private shotVariants: Ak47ShotVariant[] | null = null;
  /** Magazine-only reload events built from reload-foley.wav (synthesized if it fails to load). */
  private reloadFoley: Map<Ak47ReloadEventId, ReloadClip> | null = null;
  private lastSeatVariant = -1;
  private shotPeakCache: { variants: Ak47ShotVariant[]; peak: number } | null = null;
  private killDingBuffer: AudioBuffer | null = null;
  private fallbackNoiseBuffer: AudioBuffer | null = null;

  private loadPromise: Promise<void> | null = null;
  private didLogMissingAssetWarning = false;
  private variationState = 0x12345678;
  private hitThudNoisePool: AudioBuffer[] | null = null;
  private dryFireNoisePool: AudioBuffer[] | null = null;
  private combatFeedbackWarmed = false;

  private footstepNoiseBuffer: AudioBuffer | null = null;
  private footstepAlt = false;
  private reloadVoices = new Set<ReloadVoice>();
  /** The reload whose events are scheduled (or held by a pause); null when none is running. */
  private reloadRun: ReloadRun | null = null;

  // Ambient audio: low wind and distant marketplace chatter.
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientRunning = false;
  private marketplaceSource: AudioBufferSourceNode | null = null;
  private marketplaceGain: GainNode | null = null;
  private marketplaceLoadPromise: Promise<void> | null = null;

  ensureResumedFromGesture(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    this.ensureBuffersLoaded();
    this.prewarmCombatFeedback();
  }

  prewarmCombatFeedback(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor || this.combatFeedbackWarmed) return;

    this.combatFeedbackWarmed = true;
    if (!this.hitThudNoisePool) {
      this.hitThudNoisePool = this.buildNoisePool(ctx, 0.04);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";

    osc.connect(gain);
    gain.connect(highShelf);
    highShelf.connect(this.compressor);

    osc.disconnect();
    gain.disconnect();
    highShelf.disconnect();
  }

  playAk47Shot(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.masterGain || !this.compressor || !this.playerGunGain) return;

    this.ensureBuffersLoaded();

    if (ctx.state === "suspended") {
      return;
    }

    const now = ctx.currentTime;
    const variants = this.shotVariants;
    if (!variants) {
      this.playFallbackCrack(now, AK47_AUDIO_TUNING.player.layerGainScale, this.playerGunGain);
      return;
    }

    const index = this.pickVariant(this.lastPlayerVariant, variants.length);
    this.lastPlayerVariant = index;
    const variant = variants[index]!;
    const burst = this.playerBurst;
    // No attack fade, drive or presence cut: the rebuilt layers already carry
    // the crack, body, thump and mechanism at their final balance.
    this.startShotVoice(burst, "close", variant.close, now,
      variant.playbackRate * this.randRange(0.996, 1.004),
      variant.closeGain * this.randRange(0.93, 1), this.playerGunGain);
    this.startShotVoice(burst, "tail", variant.tail, now + variant.tailDelayS + this.randRange(-0.004, 0.004),
      variant.tailPlaybackRate * this.randRange(0.995, 1.005),
      variant.tailGain * this.randRange(0.88, 1.05), this.playerGunGain, now);
  }

  playAk47ShotQuiet(options: EnemyAk47ShotOptions): void {
    if (!Number.isFinite(options.distanceM)) return;
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.enemyGunGain || ctx.state === "suspended") return;
    this.ensureBuffersLoaded();
    const variants = this.shotVariants;
    if (!variants) return;

    const tuning = AK47_AUDIO_TUNING.enemy;
    const distanceM = Math.max(0, options.distanceM - tuning.distanceMinM);
    const distanceGain = Math.exp(-distanceM / tuning.distanceDecayM);
    const distanceNorm = clamp01(distanceM / (tuning.distanceMaxM - tuning.distanceMinM));
    const pan = Number.isFinite(options.pan) ? Math.max(-1, Math.min(1, options.pan!)) : 0;
    const behind = Number.isFinite(options.behind) ? clamp01(options.behind!) : 0;
    const burst = this.enemyBursts.get(options.sourceId) ?? {};
    this.enemyBursts.set(options.sourceId, burst);
    const index = this.pickVariant(burst.lastVariant ?? -1, variants.length);
    burst.lastVariant = index;
    const variant = variants[index]!;

    const now = ctx.currentTime;
    const lowpassHz = lerp(tuning.nearLowpassHz, tuning.farLowpassHz, distanceNorm)
      * lerp(1, tuning.behindLowpassScale, behind);
    const output = ctx.createGain();
    output.gain.value = distanceGain * lerp(1, tuning.behindGain, behind);
    output.connect(this.enemyGunGain);
    const nodes: AudioNode[] = [output];
    const chain = (panValue: number): AudioNode => {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = lowpassHz;
      lowpass.Q.value = 0.7;
      const panner = ctx.createStereoPanner();
      panner.pan.value = panValue;
      lowpass.connect(panner);
      panner.connect(output);
      nodes.push(lowpass, panner);
      return lowpass;
    };
    let pending = 2;
    const release = () => {
      pending -= 1;
      if (pending > 0) return;
      for (const node of nodes) node.disconnect();
      if (!burst.close && !burst.tail && this.enemyBursts.get(options.sourceId) === burst) {
        this.enemyBursts.delete(options.sourceId);
      }
    };
    const rate = variant.playbackRate * this.randRange(0.996, 1.004);
    this.startShotVoice(burst, "close", variant.enemyClose, now, rate,
      variant.closeGain * lerp(1, tuning.farCloseGain, distanceNorm), chain(pan), now, release);
    this.startShotVoice(burst, "tail", variant.enemyTail, now + variant.tailDelayS, variant.tailPlaybackRate,
      variant.tailGain * lerp(1, tuning.farTailGain, distanceNorm), chain(pan * tuning.tailPanScale), now, release);
  }

  /**
   * Starts one gunshot layer. A layer from the same shooter that is still
   * within the burst gap is ducked moderately, so sprays stay continuous while
   * the final round's body and tail ring out untouched.
   */
  private startShotVoice(
    burst: Ak47Burst,
    kind: "close" | "tail",
    buffer: AudioBuffer,
    startTime: number,
    playbackRate: number,
    level: number,
    destination: AudioNode,
    shotTime = startTime,
    onEnded?: () => void,
  ): void {
    const ctx = this.audioContext;
    if (!ctx) return;
    const tuning = AK47_AUDIO_TUNING.shot;
    const previous = burst[kind];
    if (previous && shotTime - previous.startTime < tuning.burstGapS) {
      const duck = kind === "close" ? tuning.closeDuckGain : tuning.tailDuckGain;
      const duckAt = Math.max(shotTime, previous.startTime);
      previous.gain.gain.setValueAtTime(previous.level, duckAt);
      previous.gain.gain.setTargetAtTime(previous.level * duck, duckAt, tuning.duckTimeConstantS);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, startTime);
    source.connect(gain);
    gain.connect(destination);
    const voice: Ak47Voice = { gain, startTime, level };
    burst[kind] = voice;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (burst[kind] === voice) delete burst[kind];
      onEnded?.();
    };
    source.start(startTime);
  }

  /** Random variation that never repeats the previous pick. */
  private pickVariant(previous: number, count: number): number {
    if (count <= 1) return 0;
    const exclude = previous >= 0 && previous < count;
    let index = Math.min(count - (exclude ? 2 : 1), Math.floor(this.randRange(0, exclude ? count - 1 : count)));
    if (exclude && index >= previous) index += 1;
    return index;
  }

  /**
   * Short soft thud played when a bullet hits an enemy (non-lethal).
   * Synthesized: noise burst bandpass-filtered to ~800-1200Hz (flesh impact zone),
   * with a brief 40ms envelope.
   */
  playHitThud(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    const now = ctx.currentTime;
    const DURATION_S = 0.04;

    if (!this.hitThudNoisePool) {
      this.hitThudNoisePool = this.buildNoisePool(ctx, DURATION_S);
    }

    const source = ctx.createBufferSource();
    source.buffer = this.pickPooledNoise(this.hitThudNoisePool);

    // Bandpass: flesh impact sits ~900Hz
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = this.randRange(800, 1100);
    bp.Q.value = 1.8;

    // Short fast-attack envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.randRange(0.28, 0.38), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_S);

    source.connect(bp);
    bp.connect(gain);
    gain.connect(this.compressor);

    source.start(now);
    source.stop(now + DURATION_S + 0.005);
    source.onended = () => {
      source.disconnect();
      bp.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Kill-confirm cue played on a confirmed enemy kill.
   * Prefers the shipped sample and falls back to the older synthesized ding if the asset fails to load.
   */
  playKillDing(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    const now = ctx.currentTime;
    if (this.killDingBuffer) {
      this.playBuffer(
        this.killDingBuffer,
        now,
        this.randRange(0.99, 1.01),
        1.2,
        {
          attackSeconds: 0,
          lowShelfGainDb: 0,
          highShelfFrequencyHz: 3400,
          highShelfGainDb: -1.5,
          driveCurve: KILL_DING_DRIVE_CURVE,
          lowpassFrequencyHz: 10000,
          offsetSeconds: KILL_DING_TRIM_START_S,
        },
      );
      return;
    }

    const FREQ = this.randRange(1180, 1260); // slight pitch variation
    const DURATION_S = 0.22;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(FREQ, now);
    // Slight pitch drop for a more organic feel
    osc.frequency.exponentialRampToValueAtTime(FREQ * 0.92, now + DURATION_S);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_S);

    // High-shelf boost to make it bright and cut through
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 3000;
    highShelf.gain.value = 4;

    osc.connect(gain);
    gain.connect(highShelf);
    highShelf.connect(this.compressor);

    osc.start(now);
    osc.stop(now + DURATION_S + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      highShelf.disconnect();
    };
  }

  playFootstep(speedNorm: number): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    if (!this.footstepNoiseBuffer) {
      this.footstepNoiseBuffer = this.createNoiseBuffer(ctx, 0.12); // 120ms noise
    }

    const now = ctx.currentTime;
    const gain = this.randRange(0.18, 0.26) * Math.max(0.4, speedNorm);
    // Alternate L/R: right foot slightly higher pitch for natural walking feel
    const pitchShift = this.footstepAlt ? 1.0 : 0.88;
    this.footstepAlt = !this.footstepAlt;

    this.playFootstepBurst(now, gain, pitchShift);
  }

  /**
   * Heavy landing thud — played when the player hits the ground after a fall.
   * Louder and lower-pitched than a footstep.
   */
  playLanding(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    if (!this.footstepNoiseBuffer) {
      this.footstepNoiseBuffer = this.createNoiseBuffer(ctx, 0.12);
    }

    const now = ctx.currentTime;
    // 2× louder than a run footstep, lower pitch for heavier impact
    this.playFootstepBurst(now, 0.55, 0.72);
    // Delayed secondary resonance for thick impact body
    this.playFootstepBurst(now + 0.018, 0.28, 0.58);
  }

  /**
   * Dry-fire click — played when trigger is pulled with an empty magazine.
   * Synthesized: short metallic click (highpass noise + triangle ping).
   */
  playDryFire(): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    const now = ctx.currentTime;
    if (!this.dryFireNoisePool) {
      this.dryFireNoisePool = this.buildNoisePool(ctx, 0.018);
    }

    // Metallic click transient: very short highpass noise burst
    const source = ctx.createBufferSource();
    source.buffer = this.pickPooledNoise(this.dryFireNoisePool);

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3200;
    hp.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);

    source.connect(hp);
    hp.connect(gain);
    gain.connect(this.compressor);

    source.start(now);
    source.stop(now + 0.02);
    source.onended = () => {
      source.disconnect();
      hp.disconnect();
      gain.disconnect();
    };

    // Tiny triangle ping (bolt hitting empty chamber)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.08, now + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(oscGain);
    oscGain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.045);
    osc.onended = () => {
      osc.disconnect();
      oscGain.disconnect();
    };
  }

  /**
   * Reload start: schedules every magazine-only reload event at its mark from
   * ak47ReloadMarks.ts, scaled by `durationSeconds / AK47_RELOAD_DURATION_S`.
   * Buffs change timing only: every voice plays at playbackRate 1. Levels are
   * set in dB against the measured player shot peak on the separate reload bus.
   */
  playReloadStart(durationSeconds: number): void {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.reloadGain) return;
    this.ensureBuffersLoaded();
    if (ctx.state === "suspended") return;
    // Until the foley has decoded, the synthesized set keeps the timeline intact.
    this.reloadFoley ??= this.createReloadFoley(ctx, null);
    this.stopReload();
    const tuning = AK47_AUDIO_TUNING.reload;
    const now = ctx.currentTime;
    const deviceLatency = ctx.outputLatency || ctx.baseLatency || 0;
    // Clips peak at AK47_DSP_PEAK: the bus maps that to the shot peak, each voice sets its dB offset.
    this.reloadGain.gain.setValueAtTime(this.playerShotPeak() * Math.pow(10, tuning.compressorOffsetDb / 20) / AK47_DSP_PEAK, now);
    this.reloadRun = {
      durationS: durationSeconds,
      latencyS: Math.min(tuning.latencyCompensationMaxS, Number.isFinite(deviceLatency) ? deviceLatency : 0),
      originTime: now,
      seatVariant: this.pickSeatVariant(this.reloadFoley.get("magSeat")?.buffers.length ?? 1),
      pausedAtS: null,
      foley: this.reloadFoley,
    };
    this.scheduleReloadEvents(ctx, this.reloadRun, null);
  }

  /**
   * Reload end. At the end of the timeline every event has been scheduled and
   * plays out. `finishedEarly` (a fire press held to the latch) drops only the
   * handguard return beat. Ak47Weapon emits it on the latch frame itself, when
   * the audio clock (quantised to the render quantum, and uncompensated on the
   * latch) can still be a few ms short of the seat, so the latch voices (seat
   * and settle) play whether or not their transient has been heard yet.
   */
  playReloadEnd(finishedEarly = false): void {
    if (finishedEarly) this.releaseReloadVoices((voice, heard) => heard || voice.mark === "latch");
    else this.reloadVoices.clear();
    this.reloadRun = null;
  }

  /**
   * Cancels the reload: scheduled events never start and playing ones fade
   * out over 5 ms. `roundsCommitted` is the weapon's own state, never the
   * audio clock (the game clamps frame dt, so after a hitch the audio clock
   * runs ahead of the simulation). Only when the caller says the rounds are
   * committed do the seat and settle play (even a few ms ahead of the audio
   * clock, as on the latch frame). Ak47Weapon emits onReloadCancel only before the latch
   * (a fire press) or on a reset, so the default fades everything.
   */
  stopReload(roundsCommitted = false): void {
    this.releaseReloadVoices((voice) => roundsCommitted && voice.mark === "latch");
    this.reloadRun = null;
  }

  /**
   * Freezes and resumes the reload audio together with the simulation. While
   * paused (pause menu, death, intermission, countdown) every reload voice
   * fades out over 5 ms and the reload position is held. On resume the events
   * not yet heard are rescheduled from that position, so the seat still lands
   * on the latch of the resumed visual reload. Idempotent: it may be called
   * every frame with the simulation-suspended flag. A reload cancelled or
   * finished while paused (respawn resets the weapon) stays silent.
   */
  setReloadPaused(paused: boolean): void {
    const run = this.reloadRun;
    const ctx = this.audioContext;
    if (!run || !ctx) return;
    if (paused) {
      if (run.pausedAtS !== null) return;
      run.pausedAtS = Math.max(0, ctx.currentTime - run.originTime);
      this.releaseReloadVoices(() => false);
      return;
    }
    if (run.pausedAtS === null) return;
    const elapsedS = run.pausedAtS;
    run.pausedAtS = null;
    run.originTime = ctx.currentTime - elapsedS;
    this.scheduleReloadEvents(ctx, run, elapsedS);
  }

  /**
   * Stops every tracked reload voice. Voices that `keep` accepts (it is told
   * whether the transient has been heard, hitTime <= now) play to their end,
   * untracked; the rest either never start or fade over 5 ms.
   */
  private releaseReloadVoices(keep: (voice: ReloadVoice, heard: boolean) => boolean): void {
    const ctx = this.audioContext;
    const tuning = AK47_AUDIO_TUNING.reload;
    const now = ctx?.currentTime ?? 0;
    for (const voice of this.reloadVoices) {
      if (ctx && keep(voice, voice.hitTime <= now)) continue;
      if (!ctx || voice.startTime >= now) {
        voice.source.onended = null;
        try {
          voice.source.stop();
        } catch {
          // Source may have already ended.
        }
        voice.source.disconnect();
        voice.gain.disconnect();
        continue;
      }
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.setTargetAtTime(0, now, tuning.cancelFadeTauS);
      try {
        // A voice still in its pre-roll stops before its transient.
        voice.source.stop(voice.hitTime > now ? Math.min(voice.hitTime, now + tuning.cancelStopAfterS) : now + tuning.cancelStopAfterS);
      } catch {
        // Source may have already ended.
      }
    }
    this.reloadVoices.clear();
  }

  /**
   * Schedules the run's events against its origin. `resumedFromS` is the
   * reload position a pause held; events heard before it are not replayed.
   */
  private scheduleReloadEvents(ctx: AudioContext, run: ReloadRun, resumedFromS: number | null): void {
    const bus = this.reloadGain;
    if (!bus) return;
    const tuning = AK47_AUDIO_TUNING.reload;
    const now = ctx.currentTime;
    for (const event of ak47ReloadAudioSchedule(run.durationS)) {
      const latencyS = ak47ReloadEventLatencyS(event.mark, run.latencyS);
      if (resumedFromS !== null && event.atS - latencyS <= resumedFromS) continue;
      const clip = run.foley.get(event.id);
      if (!clip || clip.buffers.length === 0) continue;
      const variant = event.id === "magSeat" ? Math.min(run.seatVariant, clip.buffers.length - 1) : 0;
      const buffer = clip.buffers[variant]!;
      const hitOffsetS = clip.hitOffsetsS[variant] ?? 0;
      const hitTime = run.originTime + event.atS - latencyS;
      // Align the clip's transient (not its pre-roll) with the mark; skip into it if that is already past.
      const idealStart = hitTime - hitOffsetS;
      const startTime = Math.max(now, idealStart);
      const offset = startTime - idealStart;
      if (offset >= buffer.duration) continue;
      const jitterDb = event.id === "magSeat" ? tuning.seatGainJitterDb : tuning.gainJitterDb;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1;
      const gain = ctx.createGain();
      gain.gain.value = Math.pow(10, (event.levelDb + this.randRange(-jitterDb, jitterDb)) / 20);
      source.connect(gain);
      gain.connect(bus);
      const voice: ReloadVoice = { id: event.id, mark: event.mark, hitTime, startTime, source, gain };
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        this.reloadVoices.delete(voice);
      };
      this.reloadVoices.add(voice);
      source.start(startTime, offset);
    }
  }

  /** Two-variant round robin for the hero seat. */
  private pickSeatVariant(count: number): number {
    this.lastSeatVariant = count > 1 ? (this.lastSeatVariant + 1) % count : 0;
    return this.lastSeatVariant;
  }

  /**
   * Peak of a player shot at the mix bus (loudest close layer, its gain and the
   * player bus gain), so reload levels follow any change to the shot audio.
   */
  private playerShotPeak(): number {
    const variants = this.shotVariants;
    if (!variants) return AK47_AUDIO_TUNING.reload.shotPeakFallback;
    if (this.shotPeakCache?.variants === variants) return this.shotPeakCache.peak;
    let peak = 0;
    for (const variant of variants) {
      for (let channel = 0; channel < variant.close.numberOfChannels; channel += 1) {
        const data = variant.close.getChannelData(channel);
        let channelPeak = 0;
        for (let i = 0; i < data.length; i += 1) channelPeak = Math.max(channelPeak, Math.abs(data[i]!));
        peak = Math.max(peak, channelPeak * variant.closeGain);
      }
    }
    peak *= AK47_AUDIO_TUNING.player.postGain;
    if (!(peak > 0)) peak = AK47_AUDIO_TUNING.reload.shotPeakFallback;
    this.shotPeakCache = { variants, peak };
    return peak;
  }

  /**
   * Enemy footstep — quieter, slightly muffled version of the player footstep.
   * distanceNorm: 0=close, 1=far.
   */
  playEnemyFootstep(distanceNorm: number): void {
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.compressor) return;
    if (ctx.state === "suspended") return;

    if (!this.footstepNoiseBuffer) {
      this.footstepNoiseBuffer = this.createNoiseBuffer(ctx, 0.12);
    }

    const now = ctx.currentTime;
    const falloff = 1 - Math.min(1, distanceNorm);
    // At close range ~0.15 gain; at max range ~0.03
    const gain = (0.03 + 0.12 * falloff) * this.randRange(0.8, 1.2);
    const pitch = this.randRange(0.78, 0.92);
    this.playFootstepBurst(now, gain, pitch);
  }

  /**
   * Start subtle wind and marketplace ambient loops.
   * Safe to call multiple times — only starts once.
   */
  startAmbient(): void {
    if (this.ambientRunning) return;
    const ctx = this.ensureAudioGraph();
    if (!ctx || !this.masterGain) return;
    // Schedule even while resume() is pending: the audio clock starts on unlock.
    this.ambientRunning = true;

    // A longer bed with slow overlapping gusts avoids a static wind drone.
    const AMBIENT_DURATION_S = 12.0;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(AMBIENT_DURATION_S * sampleRate);
    const buf = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buf.getChannelData(0);

    // Very slow, smooth noise (pink-ish: generated by 6 running sums for 1/f character)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
      const phase = (i / frameCount) * Math.PI * 2;
      const gust = 0.8 + 0.38 * Math.sin(phase) + 0.16 * Math.sin(phase * 3 + 0.7);
      data[i] = pink * gust;
    }

    // Smooth loop transition: fade first/last 0.1s
    const fadeLen = Math.floor(0.1 * sampleRate);
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      data[i]! *= t;
      data[frameCount - 1 - i]! *= t;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    // Soft air movement with enough upper body to read on smaller speakers.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.5;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.0; // start silent

    source.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start();
    this.ambientSource = source;
    this.ambientGain = gainNode;

    // Fade in gently; the master bus applies a further 0.1 gain.
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.09, now + 3.0);
    this.marketplaceLoadPromise ??= this.startMarketplace(ctx);
  }

  private async startMarketplace(ctx: AudioContext): Promise<void> {
    try {
      const response = await fetch("/assets/audio/ambient/market-chatter.wav");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      // A late load must not revive ambience after mute, disposal, or restart.
      if (this.audioContext !== ctx || !this.ambientRunning || !this.masterGain) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      // The asset is stored 100x louder; this and master 0.1 restore the approved level.
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 3);
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      this.marketplaceSource = source;
      this.marketplaceGain = gain;
    } catch (error) {
      if (this.audioContext === ctx) {
        console.warn("[WeaponAudio] marketplace ambience unavailable:", error);
      }
    }
  }

  dispose(): void {
    if (this.marketplaceSource) {
      this.marketplaceSource.stop();
      this.marketplaceSource.disconnect();
      this.marketplaceSource = null;
    }
    this.marketplaceGain?.disconnect();
    this.marketplaceGain = null;
    this.marketplaceLoadPromise = null;
    if (this.ambientSource) {
      try { this.ambientSource.stop(); } catch { /* already stopped */ }
      this.ambientSource.disconnect();
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
    this.ambientRunning = false;
    this.loadPromise = null;
    this.stopReload();
    this.shotVariants = null;
    this.reloadFoley = null;
    this.shotPeakCache = null;
    this.lastSeatVariant = -1;
    this.killDingBuffer = null;
    this.fallbackNoiseBuffer = null;
    this.hitThudNoisePool = null;
    this.dryFireNoisePool = null;
    this.footstepNoiseBuffer = null;
    for (const burst of [this.playerBurst, ...this.enemyBursts.values()]) {
      burst.close?.gain.disconnect();
      burst.tail?.gain.disconnect();
    }
    this.playerBurst = {};
    this.enemyBursts.clear();
    this.lastPlayerVariant = -1;

    this.masterGain?.disconnect();
    this.compressor?.disconnect();
    this.playerGunGain?.disconnect();
    this.enemyGunGain?.disconnect();
    this.enemyGunLimiter?.disconnect();
    this.reloadGain?.disconnect();

    this.masterGain = null;
    this.compressor = null;
    this.playerGunGain = null;
    this.enemyGunGain = null;
    this.enemyGunLimiter = null;
    this.reloadGain = null;

    if (this.audioContext) {
      const ctx = this.audioContext;
      this.audioContext = null;
      void ctx.close();
    }
  }

  /**
   * Silences all output. Muting tears down any existing graph so an already
   * running ambient loop stops rather than lingering.
   */
  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    if (muted) this.dispose();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureAudioGraph(): AudioContext | null {
    if (this.muted) return null;
    if (this.audioContext && this.masterGain && this.compressor) {
      return this.audioContext;
    }

    const AudioContextCtor =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    const ctx = new AudioContextCtor({ latencyHint: "interactive" });

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 14;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.09;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.1;
    const playerGunGain = ctx.createGain();
    playerGunGain.gain.value = AK47_AUDIO_TUNING.player.postGain;
    const enemyGunGain = ctx.createGain();
    enemyGunGain.gain.value = AK47_AUDIO_TUNING.enemy.postGain;
    // Bound the combined enemy bus, even when several nearby enemies fire together.
    const enemyGunLimiter = ctx.createWaveShaper();
    const peakLimit = AK47_AUDIO_TUNING.enemy.mixPeakLimit;
    enemyGunLimiter.curve = createDriveCurve(4096, 1 / peakLimit).map((value) => value * peakLimit);
    enemyGunLimiter.oversample = "2x";

    const reloadGain = ctx.createGain();
    // Set per reload from the measured shot peak (see scheduleReloadEvents).
    reloadGain.gain.value = AK47_AUDIO_TUNING.reload.shotPeakFallback / AK47_DSP_PEAK;

    playerGunGain.connect(compressor);
    reloadGain.connect(compressor);
    enemyGunGain.connect(enemyGunLimiter);
    enemyGunLimiter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.audioContext = ctx;
    this.compressor = compressor;
    this.masterGain = masterGain;
    this.playerGunGain = playerGunGain;
    this.enemyGunGain = enemyGunGain;
    this.enemyGunLimiter = enemyGunLimiter;
    this.reloadGain = reloadGain;
    return ctx;
  }

  private ensureBuffersLoaded(): void {
    if (this.loadPromise) return;

    const ctx = this.audioContext;
    if (!ctx) return;

    this.loadPromise = (async () => {
      const [closeLayer, tailLayer, reloadLayer, killDingLayer, reloadFoleyLayer] = await Promise.all([
        this.loadLayerWithExtensions(ctx, AK47_CLOSE_BASENAME),
        this.loadLayerWithExtensions(ctx, AK47_TAIL_BASENAME),
        this.loadLayerWithExtensions(ctx, AK47_RELOAD_BASENAME),
        this.loadLayerWithExtensions(ctx, KILL_DING_BASENAME),
        // Ships as WAV only (sample-accurate cut table); skip the mp3/ogg probes.
        this.loadLayerWithExtensions(ctx, AK47_RELOAD_FOLEY_BASENAME, [".wav"]),
      ]);

      if (this.audioContext !== ctx) return;
      this.killDingBuffer = killDingLayer.buffer;
      this.reloadFoley = this.createReloadFoley(ctx, reloadFoleyLayer.buffer);
      const variants = await this.buildShotVariants(ctx, closeLayer.buffer, tailLayer.buffer, reloadLayer.buffer);
      if (this.audioContext !== ctx) return;
      this.shotVariants = variants;

      if (!this.didLogMissingAssetWarning && !closeLayer.buffer) {
        console.warn(
          `[WeaponAudio] missing close-layer weapon audio assets (${closeLayer.triedUrls.join(", ")}). ` +
            "Using synthesized fallback for close shot.",
        );
        this.didLogMissingAssetWarning = true;
      }
    })().catch((error: unknown) => {
      if (!this.didLogMissingAssetWarning) {
        this.didLogMissingAssetWarning = true;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[WeaponAudio] failed loading weapon audio, using fallback: ${message}`);
      }
    });
  }

  /**
   * Decodes once, rebuilds every variation in Float32 and caches AudioBuffers.
   * Yields to the frame loop between variations to avoid a load-time hitch.
   */
  private async buildShotVariants(
    ctx: AudioContext,
    close: AudioBuffer | null,
    tail: AudioBuffer | null,
    reload: AudioBuffer | null,
  ): Promise<Ak47ShotVariant[] | null> {
    if (!close || !tail) return null;
    const sampleRate = close.sampleRate;
    const steps = ak47ShotVariantSteps(channelsOf(close), channelsOf(tail),
      reload ? channelsOf(reload) : null, sampleRate);
    let step = steps.next();
    while (!step.done) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (this.audioContext !== ctx) return null;
      step = steps.next();
    }
    return step.value.variants.map((variant) => ({
      close: toAudioBuffer(ctx, variant.close, sampleRate),
      enemyClose: toAudioBuffer(ctx, [variant.enemyClose], sampleRate),
      tail: toAudioBuffer(ctx, variant.tail, sampleRate),
      enemyTail: toAudioBuffer(ctx, [variant.enemyTail], sampleRate),
      playbackRate: variant.playbackRate,
      tailPlaybackRate: variant.tailPlaybackRate,
      tailDelayS: variant.tailDelayS,
      closeGain: variant.closeGain,
      tailGain: variant.tailGain,
    }));
  }

  /** Builds the reload events from the decoded foley, or synthesizes them when it is missing. */
  private createReloadFoley(ctx: AudioContext, foley: AudioBuffer | null): Map<Ak47ReloadEventId, ReloadClip> {
    const sampleRate = foley?.sampleRate ?? ctx.sampleRate;
    const mono = foley ? downmixToMono(foley) : null;
    const built: Ak47ReloadFoley = buildAk47ReloadFoley(mono, sampleRate);
    const result = new Map<Ak47ReloadEventId, ReloadClip>();
    for (const [id, clip] of Object.entries(built) as [Ak47ReloadEventId, Ak47ReloadFoley[Ak47ReloadEventId]][]) {
      result.set(id, {
        buffers: clip.variants.map((data) => toAudioBuffer(ctx, [data], sampleRate)),
        hitOffsetsS: clip.hitOffsetsS,
      });
    }
    return result;
  }

  private async loadLayerWithExtensions(
    ctx: AudioContext,
    baseUrl: string,
    extensions: readonly string[] = AUDIO_EXTENSIONS,
  ): Promise<LoadedLayer> {
    const triedUrls: string[] = [];

    for (const ext of extensions) {
      const url = `${baseUrl}${ext}`;
      triedUrls.push(url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }

        const encoded = await response.arrayBuffer();
        if (encoded.byteLength === 0) {
          continue;
        }

        const decoded = await ctx.decodeAudioData(encoded.slice(0));
        return {
          buffer: decoded,
          resolvedUrl: url,
          triedUrls,
        };
      } catch {
        // Try next extension.
      }
    }

    return {
      buffer: null,
      resolvedUrl: null,
      triedUrls,
    };
  }

  private playBuffer(
    buffer: AudioBuffer,
    startTime: number,
    playbackRate: number,
    gain: number,
    options: Ak47BufferPlaybackOptions = {},
  ): void {
    if (!this.audioContext || !this.compressor) return;
    const destination = options.destination ?? (this.compressor as AudioNode);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = this.audioContext.createGain();
    const peakGain = Math.max(0.0001, gain);
    const attackSeconds = Math.max(0, options.attackSeconds ?? 0);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    if (attackSeconds > 0) {
      gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + attackSeconds);
    } else {
      gainNode.gain.setValueAtTime(peakGain, startTime);
    }

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 60;
    highpass.Q.value = 0.7;

    const lowShelf = this.audioContext.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 120;
    lowShelf.gain.value = options.lowShelfGainDb ?? this.randRange(3.5, 5.5);

    const highShelf = this.audioContext.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = options.highShelfFrequencyHz ?? this.randRange(3500, 4800);
    highShelf.gain.value = options.highShelfGainDb ?? this.randRange(1.2, 2.8);

    const drive = this.audioContext.createWaveShaper();
    drive.curve = new Float32Array(options.driveCurve ?? DRIVE_CURVE);
    drive.oversample = "2x";

    const lowpassFrequencyHz = options.lowpassFrequencyHz;
    const lowpass =
      lowpassFrequencyHz === undefined
        ? null
        : this.audioContext.createBiquadFilter();
    if (lowpass) {
      lowpass.type = "lowpass";
      const resolvedLowpassFrequencyHz = lowpassFrequencyHz;
      if (resolvedLowpassFrequencyHz !== undefined) {
        lowpass.frequency.value = resolvedLowpassFrequencyHz;
      }
      lowpass.Q.value = 0.72;
    }

    source.connect(gainNode);
    gainNode.connect(highpass);
    highpass.connect(lowShelf);
    lowShelf.connect(highShelf);
    highShelf.connect(drive);
    if (lowpass) {
      drive.connect(lowpass);
      lowpass.connect(destination);
    } else {
      drive.connect(destination);
    }

    const offsetSeconds = Math.max(0, options.offsetSeconds ?? 0);
    source.start(startTime, Math.min(offsetSeconds, Math.max(0, buffer.duration - 0.001)));
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
      highpass.disconnect();
      lowShelf.disconnect();
      highShelf.disconnect();
      drive.disconnect();
      lowpass?.disconnect();
      options.onEnded?.();
    };
  }

  private playFallbackCrack(
    startTime: number,
    gainScale = 1,
    destination: AudioNode = this.compressor as AudioNode,
  ): void {
    if (!this.audioContext || !this.compressor) return;

    if (!this.fallbackNoiseBuffer) {
      this.fallbackNoiseBuffer = this.createNoiseBuffer(this.audioContext, FALLBACK_NOISE_SECONDS);
    }

    this.playFallbackTransientLayer(startTime, gainScale, destination);
    this.playFallbackBodyLayer(startTime, gainScale, destination);
    this.playFallbackTailLayer(startTime + this.randRange(0.01, 0.02), gainScale, destination);
  }

  private playFallbackTransientLayer(
    startTime: number,
    gainScale = 1,
    destination: AudioNode = this.compressor as AudioNode,
  ): void {
    if (!this.audioContext || !this.compressor || !this.fallbackNoiseBuffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.fallbackNoiseBuffer;
    source.playbackRate.value = this.randRange(1.0, 1.3);

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = this.randRange(1800, 2400);
    highpass.Q.value = 0.8;

    const gainNode = this.audioContext.createGain();
    const attack = 0.001;
    const decay = this.randRange(0.05, 0.072);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(this.randRange(0.85, 1.05) * gainScale, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    source.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(destination);

    source.start(startTime);
    source.stop(startTime + decay + 0.02);
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      gainNode.disconnect();
    };
  }

  private playFallbackBodyLayer(
    startTime: number,
    gainScale = 1,
    destination: AudioNode = this.compressor as AudioNode,
  ): void {
    if (!this.audioContext || !this.compressor) return;

    const osc = this.audioContext.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(this.randRange(220, 280), startTime);
    osc.frequency.exponentialRampToValueAtTime(this.randRange(95, 120), startTime + 0.095);

    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;
    lowpass.Q.value = 0.6;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(this.randRange(0.26, 0.38) * gainScale, startTime + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

    osc.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + 0.12);
    osc.onended = () => {
      osc.disconnect();
      lowpass.disconnect();
      gainNode.disconnect();
    };
  }

  private playFallbackTailLayer(
    startTime: number,
    gainScale = 1,
    destination: AudioNode = this.compressor as AudioNode,
  ): void {
    if (!this.audioContext || !this.compressor || !this.fallbackNoiseBuffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.fallbackNoiseBuffer;
    source.playbackRate.value = this.randRange(0.72, 0.88);

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = this.randRange(680, 940);
    bandpass.Q.value = 0.8;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(this.randRange(0.08, 0.12) * gainScale, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

    source.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(destination);

    source.start(startTime);
    source.stop(startTime + 0.17);
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      gainNode.disconnect();
    };
  }

  private playFootstepBurst(startTime: number, gain: number, pitchShift: number): void {
    if (!this.audioContext || !this.compressor || !this.footstepNoiseBuffer) return;

    const ctx = this.audioContext;
    const DURATION_S = 0.08; // 80ms thud

    const source = ctx.createBufferSource();
    source.buffer = this.footstepNoiseBuffer;
    source.playbackRate.value = pitchShift * this.randRange(0.95, 1.05);

    // Bandpass: centre energy in 140-200Hz footstep thud zone
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = this.randRange(140, 200);
    bandpass.Q.value = 1.2;

    // Low-shelf: add body below the bandpass
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 120;
    lowShelf.gain.value = 6;

    // Gain envelope: fast attack (6ms), decay to silence at 80ms
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + DURATION_S);

    // Drive: tanh saturation for physical impact punch
    const drive = ctx.createWaveShaper();
    drive.curve = DRIVE_CURVE as Float32Array<ArrayBuffer>;
    drive.oversample = "2x";

    source.connect(bandpass);
    bandpass.connect(lowShelf);
    lowShelf.connect(gainNode);
    gainNode.connect(drive);
    drive.connect(this.compressor);

    source.start(startTime);
    source.stop(startTime + DURATION_S + 0.01);
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      lowShelf.disconnect();
      gainNode.disconnect();
      drive.disconnect();
    };
  }

  private buildNoisePool(ctx: AudioContext, durationSeconds: number): AudioBuffer[] {
    const pool = new Array<AudioBuffer>(EVENT_NOISE_POOL_SIZE);
    for (let i = 0; i < EVENT_NOISE_POOL_SIZE; i += 1) {
      pool[i] = this.createNoiseBuffer(ctx, durationSeconds);
    }
    return pool;
  }

  private pickPooledNoise(pool: readonly AudioBuffer[]): AudioBuffer {
    const rawIndex = Math.floor(this.randRange(0, pool.length));
    const index = Math.min(pool.length - 1, Math.max(0, rawIndex));
    return pool[index]!;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(durationSeconds * sampleRate));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i += 1) {
      channel[i] = this.randRange(-1, 1);
    }

    return buffer;
  }

  private randRange(min: number, max: number): number {
    this.variationState = (Math.imul(this.variationState, 1664525) + 1013904223) >>> 0;
    const normalized = this.variationState / 0x1_0000_0000;
    return min + (max - min) * normalized;
  }
}

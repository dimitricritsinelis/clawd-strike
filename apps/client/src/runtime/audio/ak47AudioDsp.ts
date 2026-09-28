/**
 * Offline Float32 DSP that rebuilds the AK-47 gunshot layers from the shipped
 * recordings (fire_close_01, fire_tail_01, reload) and the magazine-only
 * reload events from the CC0 cuts in reload-foley.wav. It runs
 * once after decoding, has no Web Audio dependency, and is deterministic so a
 * node measurement script and the browser build identical buffers.
 */

export type Channels = Float32Array[];

export type Ak47ShotVariantData = {
  /** Player close layer: crack + natural body + sub thump + mechanical click. */
  close: Channels;
  /** Enemy close layer: crack + body only, mono so StereoPanner stays equal-power. */
  enemyClose: Float32Array;
  /** Room tail with a short Haas delay on the right channel. */
  tail: Channels;
  /** Mono room tail for enemies. */
  enemyTail: Float32Array;
  playbackRate: number;
  tailPlaybackRate: number;
  tailDelayS: number;
  closeGain: number;
  tailGain: number;
};

/** Magazine-only reload events (no charging handle, no bolt, no ground impact). */
export type Ak47ReloadEventId =
  | "liftCloth"
  | "magRelease"
  | "slideOut"
  | "dropSwish"
  | "grabCloth"
  | "hookTick"
  | "magSeat"
  | "settleRattle"
  | "readySlap"
  | "readyCloth";

/** One reload event: round-robin variants, each with the offset of its transient. */
export type Ak47ReloadEventClip = { variants: Float32Array[]; hitOffsetsS: number[] };
export type Ak47ReloadFoley = Record<Ak47ReloadEventId, Ak47ReloadEventClip>;

export type Ak47DspStats = {
  closeClippedSamples: number;
  tailClippedSamples: number;
  closeOnsetS: number;
  tailOnsetS: number;
};

/** Output peak after normalization: -1 dBFS of headroom. */
export const AK47_DSP_PEAK = 0.89;

type BiquadType = "lowpass" | "highpass" | "bandpass" | "highshelf" | "lowshelf";

/** RBJ-cookbook biquad applied in place (direct form I). */
export function biquadInPlace(
  data: Float32Array,
  sampleRate: number,
  type: BiquadType,
  frequencyHz: number,
  q = Math.SQRT1_2,
  gainDb = 0,
): Float32Array {
  const w0 = (2 * Math.PI * Math.min(frequencyHz, sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const a = Math.pow(10, gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  switch (type) {
    case "lowpass":
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "highpass":
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "bandpass":
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "highshelf": {
      const s = 2 * Math.sqrt(a) * alpha;
      b0 = a * ((a + 1) + (a - 1) * cos + s);
      b1 = -2 * a * ((a - 1) + (a + 1) * cos);
      b2 = a * ((a + 1) + (a - 1) * cos - s);
      a0 = (a + 1) - (a - 1) * cos + s;
      a1 = 2 * ((a - 1) - (a + 1) * cos);
      a2 = (a + 1) - (a - 1) * cos - s;
      break;
    }
    case "lowshelf": {
      const s = 2 * Math.sqrt(a) * alpha;
      b0 = a * ((a + 1) - (a - 1) * cos + s);
      b1 = 2 * a * ((a - 1) - (a + 1) * cos);
      b2 = a * ((a + 1) - (a - 1) * cos - s);
      a0 = (a + 1) + (a - 1) * cos + s;
      a1 = -2 * ((a - 1) + (a + 1) * cos);
      a2 = (a + 1) + (a - 1) * cos - s;
      break;
    }
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i += 1) {
    const x0 = data[i]!;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    data[i] = y0;
  }
  return data;
}

function peakOf(channels: readonly Float32Array[]): number {
  let peak = 0;
  for (const channel of channels) for (let i = 0; i < channel.length; i += 1) peak = Math.max(peak, Math.abs(channel[i]!));
  return peak;
}

function scaleInPlace(channels: readonly Float32Array[], gain: number): void {
  for (const channel of channels) for (let i = 0; i < channel.length; i += 1) channel[i] = channel[i]! * gain;
}

/**
 * Reconstructs runs of near-full-scale samples with a cubic Hermite spline
 * through the unclipped neighbours. The reconstructed value keeps the run's
 * sign and never falls below the flattened sample. Returns the repaired count.
 */
export function declipInPlace(data: Float32Array, relativeThreshold = 0.985): number {
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]!));
  if (peak < 0.5) return 0;
  const threshold = peak * relativeThreshold;
  // Brick-walled sources hide the true peak; cap overshoot at +3.5 dB.
  const ceiling = peak * 1.5;
  let repaired = 0;
  let i = 2;
  while (i < data.length - 2) {
    const value = data[i]!;
    if (Math.abs(value) < threshold) { i += 1; continue; }
    const sign = Math.sign(value);
    let end = i;
    while (end < data.length - 2 && Math.abs(data[end]!) >= threshold && Math.sign(data[end]!) === sign) end += 1;
    const before = i - 1;
    const after = end;
    const span = after - before;
    const y0 = data[before]!, y1 = data[after]!;
    const m0 = (y0 - data[before - 1]!) * span;
    const m1 = (data[Math.min(data.length - 1, after + 1)]! - y1) * span;
    for (let k = i; k < end; k += 1) {
      const t = (k - before) / span;
      const t2 = t * t, t3 = t2 * t;
      const hermite = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0
        + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
      const magnitude = Math.min(ceiling, Math.max(Math.abs(data[k]!), sign * hermite));
      data[k] = sign * magnitude;
      repaired += 1;
    }
    i = end;
  }
  return repaired;
}

function findOnset(channels: readonly Float32Array[], fraction = 0.1): number {
  const threshold = peakOf(channels) * fraction;
  const length = channels[0]!.length;
  for (let i = 0; i < length; i += 1) {
    for (const channel of channels) if (Math.abs(channel[i]!) > threshold) return i;
  }
  return 0;
}

function toStereo(channels: readonly Float32Array[]): Channels {
  const left = channels[0]!;
  const right = channels[1] ?? left;
  return [left.slice(), right.slice()];
}

function downmix(channels: readonly Float32Array[]): Float32Array {
  const out = new Float32Array(channels[0]!.length);
  for (const channel of channels) for (let i = 0; i < out.length; i += 1) out[i] = out[i]! + channel[i]! / channels.length;
  return out;
}

function slice(data: Float32Array, start: number, length: number): Float32Array {
  const out = new Float32Array(Math.max(1, length));
  for (let i = 0; i < out.length; i += 1) out[i] = data[start + i] ?? 0;
  return out;
}

/** Raised-cosine fades; a zero fade-in keeps the transient untouched. */
function fade(data: Float32Array, fadeInFrames: number, fadeOutFrames: number): Float32Array {
  const n = data.length;
  for (let i = 0; i < fadeInFrames && i < n; i += 1) data[i] = data[i]! * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeInFrames));
  for (let i = 0; i < fadeOutFrames && i < n; i += 1) {
    const index = n - 1 - i;
    data[index] = data[index]! * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOutFrames));
  }
  return data;
}

function mixInto(target: Float32Array, source: Float32Array, offset: number, gain: number): void {
  for (let i = 0; i < source.length; i += 1) {
    const index = offset + i;
    if (index < 0 || index >= target.length) continue;
    target[index] = target[index]! + source[i]! * gain;
  }
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type VariantRecipe = {
  crackOffsetS: number;
  crackLengthS: number;
  crackHighpassHz: number;
  crackTiltDb: number;
  crackGain: number;
  bodyLengthS: number;
  subStartHz: number;
  subEndHz: number;
  subDecayS: number;
  subGain: number;
  mechDelayS: number;
  mechGain: number;
  tailStartS: number;
  tailHaasS: number;
  tailDelayS: number;
  playbackRate: number;
  tailPlaybackRate: number;
  closeGain: number;
  tailGain: number;
};

/** Five hand-set variations: pitch ±3.5%, crack cut/EQ tilt, tail start and layer gains. */
export const AK47_SHOT_RECIPES: readonly VariantRecipe[] = [
  { crackOffsetS: 0, crackLengthS: 0.05, crackHighpassHz: 1400, crackTiltDb: 1.5, crackGain: 0.55, bodyLengthS: 1.6,
    subStartHz: 66, subEndHz: 47, subDecayS: 0.026, subGain: 0.42, mechDelayS: 0.014, mechGain: 0.13,
    tailStartS: 0.1, tailHaasS: 0.011, tailDelayS: 0.045, playbackRate: 1, tailPlaybackRate: 1, closeGain: 0.95, tailGain: 0.42 },
  { crackOffsetS: 0.0015, crackLengthS: 0.045, crackHighpassHz: 1800, crackTiltDb: 3, crackGain: 0.5, bodyLengthS: 1.5,
    subStartHz: 70, subEndHz: 50, subDecayS: 0.022, subGain: 0.38, mechDelayS: 0.02, mechGain: 0.11,
    tailStartS: 0.085, tailHaasS: 0.009, tailDelayS: 0.038, playbackRate: 1.035, tailPlaybackRate: 1.01, closeGain: 0.92, tailGain: 0.38 },
  { crackOffsetS: 0.003, crackLengthS: 0.058, crackHighpassHz: 1150, crackTiltDb: -1, crackGain: 0.6, bodyLengthS: 1.75,
    subStartHz: 60, subEndHz: 44, subDecayS: 0.03, subGain: 0.46, mechDelayS: 0.011, mechGain: 0.15,
    tailStartS: 0.115, tailHaasS: 0.013, tailDelayS: 0.055, playbackRate: 0.965, tailPlaybackRate: 0.985, closeGain: 1, tailGain: 0.46 },
  { crackOffsetS: 0.0045, crackLengthS: 0.052, crackHighpassHz: 1600, crackTiltDb: 0.5, crackGain: 0.52, bodyLengthS: 1.55,
    subStartHz: 64, subEndHz: 48, subDecayS: 0.024, subGain: 0.4, mechDelayS: 0.024, mechGain: 0.12,
    tailStartS: 0.095, tailHaasS: 0.008, tailDelayS: 0.05, playbackRate: 1.018, tailPlaybackRate: 0.995, closeGain: 0.9, tailGain: 0.4 },
  { crackOffsetS: 0.001, crackLengthS: 0.042, crackHighpassHz: 2000, crackTiltDb: 2, crackGain: 0.48, bodyLengthS: 1.65,
    subStartHz: 68, subEndHz: 46, subDecayS: 0.028, subGain: 0.44, mechDelayS: 0.017, mechGain: 0.1,
    tailStartS: 0.12, tailHaasS: 0.014, tailDelayS: 0.042, playbackRate: 0.982, tailPlaybackRate: 1.005, closeGain: 0.96, tailGain: 0.44 },
];

/** Source window (seconds, in reload.mp3) used as the gunshot mechanism layer. */
export const AK47_RELOAD_SOURCE_CUTS = {
  /** Shortest clean metallic click (6 ms decay) in the magazine rock-out rattle. */
  shotMech: { from: 0.2255, to: 0.2505 },
} as const;

function cutReloadClip(reload: Float32Array, sampleRate: number, from: number, to: number, fadeOutS: number): Float32Array {
  const preRoll = Math.round(0.002 * sampleRate);
  const start = Math.max(0, Math.round(from * sampleRate) - preRoll);
  const clip = slice(reload, start, Math.round(to * sampleRate) - start);
  biquadInPlace(clip, sampleRate, "highpass", 90);
  return fade(clip, Math.round(0.0015 * sampleRate), Math.round(fadeOutS * sampleRate));
}

function synthCloth(
  sampleRate: number,
  seed: number,
  durationS: number,
  centerHz: number,
  attackS: number,
): Float32Array {
  const rng = createRng(seed);
  const length = Math.round(durationS * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = rng() * 2 - 1;
  biquadInPlace(out, sampleRate, "bandpass", centerHz, 0.8);
  biquadInPlace(out, sampleRate, "lowpass", 4200);
  // Rustle texture: slow random amplitude grains on a soft swell and decay.
  const grainFrames = Math.max(1, Math.round(0.012 * sampleRate));
  let current = rng(), next = rng();
  for (let i = 0; i < length; i += 1) {
    if (i % grainFrames === 0) { current = next; next = rng(); }
    const grain = current + (next - current) * ((i % grainFrames) / grainFrames);
    const t = i / sampleRate;
    const envelope = t < attackS
      ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attackS)
      : Math.exp(-(t - attackS) / Math.max(0.01, (durationS - attackS) * 0.35));
    out[i] = out[i]! * envelope * (0.45 + 0.55 * grain);
  }
  return fade(out, 0, Math.round(0.01 * sampleRate));
}

/**
 * Cuts packed in reload-foley.wav (seconds at any decode rate). Built offline
 * from CC0 recordings, see assets/source/audio/reload-foley.provenance.json: each cut is filtered,
 * faded and peak-normalised to 0.89. hitS is the transient inside the cut
 * (0 for cloth, which is aligned by its start).
 */
export const AK47_RELOAD_FOLEY_LAYOUT = {
  liftCloth: { startS: 0.02, endS: 0.24, hitS: 0 },
  releaseClick: { startS: 0.26, endS: 0.309773, hitS: 0.001995 },
  slideOut: { startS: 0.329773, endS: 0.490635, hitS: 0.002812 },
  grabCloth: { startS: 0.510635, endS: 0.740635, hitS: 0 },
  hookTick: { startS: 0.760635, endS: 0.796463, hitS: 0.002109 },
  seatClickA: { startS: 0.816463, endS: 0.843469, hitS: 0.000658 },
  seatChunkA: { startS: 0.863469, endS: 0.966463, hitS: 0.001746 },
  seatClickB: { startS: 0.986463, endS: 1.013469, hitS: 0.000499 },
  seatChunkB: { startS: 1.033469, endS: 1.100159, hitS: 0.002562 },
  settleRattle: { startS: 1.120159, endS: 1.28542, hitS: 0.001973 },
  readySlap: { startS: 1.30542, endS: 1.422018, hitS: 0.001995 },
  readyCloth: { startS: 1.442018, endS: 1.642018, hitS: 0 },
} as const;

export type Ak47ReloadFoleyCut = keyof typeof AK47_RELOAD_FOLEY_LAYOUT;

/**
 * Hero magazine seat ("ka-CHUNK"), layered on the recorded steel click (1.0):
 * the recorded magazine hit for the chunk, a short falling thump for weight, a
 * band-passed knock for the polymer/steel body and a faint steel ring. Thump
 * and knock stay short (tau <= 18 ms) so the body never reads as a kick drum.
 */
export const AK47_SEAT_RECIPE = {
  preRollS: 0.002,
  lengthS: 0.2,
  chunkGain: 1,
  /** Extra decay on the recorded chunk after its hit, so the seat stops dead. */
  chunkTauS: 0.04,
  thump: { startHz: 260, endHz: 170, sweepTauS: 0.012, tauS: 0.018, gain: 0.7, delayS: 0.0015 },
  knock: { centerHz: 380, q: 1.2, tauS: 0.011, gain: 0.55 },
  ring: { partials: [[2369, 1], [991, 0.5], [6029, 0.25]] as const, tauS: 0.045, gain: 0.18 },
} as const;

type TimedClip = { data: Float32Array; hitS: number };

function normalizeTo(data: Float32Array, peak: number): Float32Array {
  scaleInPlace([data], peak / Math.max(1e-9, peakOf([data])));
  return data;
}

function firstHitS(data: Float32Array, sampleRate: number): number {
  const threshold = peakOf([data]) * 0.35;
  for (let i = 0; i < data.length; i += 1) if (Math.abs(data[i]!) >= threshold) return i / sampleRate;
  return 0;
}

function spriteCut(sprite: Float32Array, sampleRate: number, id: Ak47ReloadFoleyCut): TimedClip {
  const cut = AK47_RELOAD_FOLEY_LAYOUT[id];
  const start = Math.round(cut.startS * sampleRate);
  return { data: slice(sprite, start, Math.round(cut.endS * sampleRate) - start), hitS: cut.hitS };
}

/** Decaying exponential envelope with a 0.3 ms raised-cosine onset. */
function decay(t: number, tauS: number): number {
  const onset = t < 0.0003 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.0003) : 1;
  return onset * Math.exp(-t / tauS);
}

/** Noise click for the synthesized fallback: filtered burst plus a short ring. */
function synthClick(sampleRate: number, seed: number, highpassHz: number, tauS: number, ringHz: number, lengthS = 0.06): TimedClip {
  const rng = createRng(seed);
  const pre = Math.round(0.002 * sampleRate);
  const data = new Float32Array(Math.round(lengthS * sampleRate));
  for (let i = pre; i < data.length; i += 1) data[i] = rng() * 2 - 1;
  biquadInPlace(data, sampleRate, "highpass", highpassHz);
  for (let i = pre; i < data.length; i += 1) {
    const t = (i - pre) / sampleRate;
    data[i] = data[i]! * decay(t, tauS) + 0.25 * Math.sin(2 * Math.PI * ringHz * t) * decay(t, tauS * 3);
  }
  return { data: fade(data, 0, Math.round(0.008 * sampleRate)), hitS: pre / sampleRate };
}

/** Airy toss swish: band-passed noise sweeping up, soft swell, no impact. */
function synthSwish(sampleRate: number, seed: number): Float32Array {
  const rng = createRng(seed);
  const length = Math.round(0.2 * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = rng() * 2 - 1;
  // Two overlapping bands give a moving "whff" without a pitched sweep.
  const low = biquadInPlace(out.slice(), sampleRate, "bandpass", 900, 0.9);
  const high = biquadInPlace(out, sampleRate, "bandpass", 2600, 0.9);
  for (let i = 0; i < length; i += 1) {
    const u = i / length;
    const swell = Math.sin(Math.PI * Math.min(1, u / 0.7)) ** 2 * (u < 0.7 ? 1 : Math.exp(-(u - 0.7) * 12));
    out[i] = swell * ((1 - u) * low[i]! + (0.35 + u) * high[i]!);
  }
  biquadInPlace(out, sampleRate, "lowpass", 5000);
  return fade(out, Math.round(0.01 * sampleRate), Math.round(0.02 * sampleRate));
}

/** Builds the hero seat from a click and an optional recorded chunk, aligned on their transients. */
export function buildAk47MagSeat(click: TimedClip, chunk: TimedClip | null, sampleRate: number, seed: number): TimedClip {
  const recipe = AK47_SEAT_RECIPE;
  const pre = Math.round(recipe.preRollS * sampleRate);
  const out = new Float32Array(Math.round(recipe.lengthS * sampleRate));
  mixInto(out, normalizeTo(click.data.slice(), 1), pre - Math.round(click.hitS * sampleRate), 1);
  if (chunk) {
    const data = normalizeTo(chunk.data.slice(), 1);
    const hit = Math.round(chunk.hitS * sampleRate);
    for (let i = hit; i < data.length; i += 1) data[i] = data[i]! * Math.exp(-(i - hit) / sampleRate / recipe.chunkTauS);
    mixInto(out, data, pre - hit, recipe.chunkGain);
  }

  const { thump, knock, ring } = recipe;
  let phase = 0;
  const thumpStart = pre + Math.round(thump.delayS * sampleRate);
  for (let i = thumpStart; i < out.length; i += 1) {
    const t = (i - thumpStart) / sampleRate;
    const frequency = thump.endHz + (thump.startHz - thump.endHz) * Math.exp(-t / thump.sweepTauS);
    phase += (2 * Math.PI * frequency) / sampleRate;
    out[i] = out[i]! + thump.gain * decay(t, thump.tauS) * Math.sin(phase);
  }
  const rng = createRng(seed);
  const noise = new Float32Array(out.length - pre);
  for (let i = 0; i < noise.length; i += 1) noise[i] = rng() * 2 - 1;
  normalizeTo(biquadInPlace(noise, sampleRate, "bandpass", knock.centerHz, knock.q), 1);
  const ringNorm = ring.partials.reduce((sum, [, weight]) => sum + weight, 0);
  for (let i = 0; i < noise.length; i += 1) {
    const t = i / sampleRate;
    let tone = 0;
    for (const [hz, weight] of ring.partials) tone += weight * Math.sin(2 * Math.PI * hz * t);
    out[pre + i] = out[pre + i]! + knock.gain * decay(t, knock.tauS) * noise[i]!
      + ring.gain * decay(t, ring.tauS) * (tone / ringNorm);
  }
  fade(out, 0, Math.round(0.012 * sampleRate));
  normalizeTo(out, AK47_DSP_PEAK);
  return { data: out, hitS: firstHitS(out, sampleRate) };
}

/**
 * Builds every reload event from reload-foley.wav (mono). Each clip is
 * normalised to AK47_DSP_PEAK so the runtime can set event levels in dB
 * against the shot peak. Without the sprite every event is synthesized.
 */
export function buildAk47ReloadFoley(sprite: Float32Array | null, sampleRate: number): Ak47ReloadFoley {
  const cut = (id: Ak47ReloadFoleyCut, fallback: () => TimedClip): TimedClip => (sprite ? spriteCut(sprite, sampleRate, id) : fallback());
  const cloth = (seed: number, centerHz: number): TimedClip => ({ data: synthCloth(sampleRate, seed, 0.2, centerHz, 0.03), hitS: 0 });
  const seats = sprite
    ? [
      buildAk47MagSeat(spriteCut(sprite, sampleRate, "seatClickA"), spriteCut(sprite, sampleRate, "seatChunkA"), sampleRate, 71),
      buildAk47MagSeat(spriteCut(sprite, sampleRate, "seatClickB"), spriteCut(sprite, sampleRate, "seatChunkB"), sampleRate, 73),
    ]
    : [
      buildAk47MagSeat(synthClick(sampleRate, 71, 1500, 0.004, 2369), null, sampleRate, 71),
      buildAk47MagSeat(synthClick(sampleRate, 73, 1700, 0.0035, 2410), null, sampleRate, 73),
    ];
  const single = (clip: TimedClip): Ak47ReloadEventClip => ({
    variants: [normalizeTo(clip.data, AK47_DSP_PEAK)], hitOffsetsS: [clip.hitS],
  });
  return {
    liftCloth: single(cut("liftCloth", () => cloth(11, 1500))),
    magRelease: single(cut("releaseClick", () => synthClick(sampleRate, 13, 1800, 0.004, 2400))),
    slideOut: single(cut("slideOut", () => ({ data: synthCloth(sampleRate, 17, 0.15, 2500, 0.004), hitS: 0.002 }))),
    dropSwish: single({ data: synthSwish(sampleRate, 23), hitS: 0 }),
    grabCloth: single(cut("grabCloth", () => cloth(37, 1700))),
    hookTick: single(cut("hookTick", () => synthClick(sampleRate, 29, 2500, 0.003, 3200))),
    magSeat: { variants: seats.map((seat) => seat.data), hitOffsetsS: seats.map((seat) => seat.hitS) },
    settleRattle: single(cut("settleRattle", () => synthClick(sampleRate, 31, 1200, 0.012, 1850, 0.12))),
    readySlap: single(cut("readySlap", () => synthClick(sampleRate, 41, 250, 0.02, 520, 0.1))),
    readyCloth: single(cut("readyCloth", () => cloth(43, 900))),
  };
}

export type Ak47ShotBuildResult = { variants: Ak47ShotVariantData[]; stats: Ak47DspStats };

/** Synchronous build (node measurement scripts). */
export function buildAk47ShotVariants(
  closeInput: readonly Float32Array[],
  tailInput: readonly Float32Array[],
  reloadInput: readonly Float32Array[] | null,
  sampleRate: number,
): Ak47ShotBuildResult {
  const steps = ak47ShotVariantSteps(closeInput, tailInput, reloadInput, sampleRate);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

/**
 * The same build split into ~10 ms steps (one per variation) so the runtime
 * can yield to the frame loop between them.
 */
export function* ak47ShotVariantSteps(
  closeInput: readonly Float32Array[],
  tailInput: readonly Float32Array[],
  reloadInput: readonly Float32Array[] | null,
  sampleRate: number,
): Generator<void, Ak47ShotBuildResult, void> {
  const close = toStereo(closeInput);
  const closeClipped = close.reduce((sum, channel) => sum + declipInPlace(channel), 0);
  scaleInPlace(close, AK47_DSP_PEAK / Math.max(1e-6, peakOf(close)));
  const tailMono = downmix(toStereo(tailInput));
  const tailClipped = declipInPlace(tailMono);
  scaleInPlace([tailMono], AK47_DSP_PEAK / Math.max(1e-6, peakOf([tailMono])));

  const preRoll = Math.round(0.0008 * sampleRate);
  const closeOnset = Math.max(0, findOnset(close) - preRoll);
  const tailOnset = Math.max(0, findOnset([tailMono]) - preRoll);

  let mech: Float32Array | null = null;
  if (reloadInput) {
    const cut = AK47_RELOAD_SOURCE_CUTS.shotMech;
    mech = cutReloadClip(downmix(reloadInput), sampleRate, cut.from, cut.to, 0.008);
    biquadInPlace(mech, sampleRate, "highpass", 1800);
    biquadInPlace(mech, sampleRate, "highpass", 1800);
    scaleInPlace([mech], 1 / Math.max(1e-6, peakOf([mech])));
  }

  yield;
  const rng = createRng(0x4b47);
  const variants: Ak47ShotVariantData[] = [];
  const playerCloses: Channels[] = [];
  const enemyCloses: Float32Array[] = [];
  const tails: Channels[] = [];
  const enemyTails: Float32Array[] = [];
  for (const recipe of AK47_SHOT_RECIPES) {
    const bodyFrames = Math.round(recipe.bodyLengthS * sampleRate);
    const body = close.map((channel) => fade(slice(channel, closeOnset, bodyFrames), 0, Math.round(0.16 * sampleRate)));

    // Crack: the first ~50 ms, high-passed with a per-variant tilt, no fade-in.
    const crackStart = closeOnset + Math.round(recipe.crackOffsetS * sampleRate);
    const crackFrames = Math.round(recipe.crackLengthS * sampleRate);
    const enemyMix = body.map((channel, index) => {
      const crack = slice(close[index]!, crackStart, crackFrames);
      biquadInPlace(crack, sampleRate, "highpass", recipe.crackHighpassHz);
      biquadInPlace(crack, sampleRate, "highshelf", 4200, Math.SQRT1_2, recipe.crackTiltDb);
      fade(crack, 0, Math.round(0.015 * sampleRate));
      const mixed = channel.slice();
      mixInto(mixed, crack, 0, recipe.crackGain);
      return mixed;
    });

    // Sub thump: a falling sine plus low-passed noise for chest punch.
    const subFrames = Math.round(0.16 * sampleRate);
    const sub = new Float32Array(subFrames);
    const noise = new Float32Array(subFrames);
    for (let i = 0; i < subFrames; i += 1) noise[i] = rng() * 2 - 1;
    biquadInPlace(noise, sampleRate, "lowpass", 160);
    biquadInPlace(noise, sampleRate, "lowpass", 160);
    const noisePeak = Math.max(1e-6, peakOf([noise]));
    let phase = 0;
    for (let i = 0; i < subFrames; i += 1) {
      const t = i / sampleRate;
      const frequency = recipe.subEndHz + (recipe.subStartHz - recipe.subEndHz) * Math.exp(-t / 0.035);
      phase += (2 * Math.PI * frequency) / sampleRate;
      const envelope = Math.exp(-t / recipe.subDecayS);
      sub[i] = envelope * (Math.sin(phase) + 0.35 * (noise[i]! / noisePeak));
    }
    fade(sub, Math.round(0.0004 * sampleRate), Math.round(0.02 * sampleRate));

    const player = enemyMix.map((channel, index) => {
      const mixed = channel.slice();
      mixInto(mixed, sub, 0, recipe.subGain * AK47_DSP_PEAK);
      if (mech) mixInto(mixed, mech, Math.round(recipe.mechDelayS * sampleRate), recipe.mechGain * AK47_DSP_PEAK * (index === 0 ? 1 : 0.85));
      return mixed;
    });

    // Tail: the second recording after its own transient, faded in so it
    // reads as reflections, not as a second shot.
    const tailFrames = Math.round(1.9 * sampleRate);
    const tail = slice(tailMono, tailOnset + Math.round(recipe.tailStartS * sampleRate), tailFrames);
    biquadInPlace(tail, sampleRate, "highpass", 110);
    biquadInPlace(tail, sampleRate, "lowpass", 7500);
    fade(tail, Math.round(0.025 * sampleRate), Math.round(0.35 * sampleRate));
    const haasFrames = Math.round(recipe.tailHaasS * sampleRate);
    const tailRight = new Float32Array(tail.length);
    for (let i = haasFrames; i < tail.length; i += 1) tailRight[i] = tail[i - haasFrames]! * 0.92;

    playerCloses.push(player);
    enemyCloses.push(downmix(enemyMix));
    tails.push([tail, tailRight]);
    enemyTails.push(tail.slice());
    variants.push({
      close: player,
      enemyClose: enemyCloses.at(-1)!,
      tail: tails.at(-1)!,
      enemyTail: enemyTails.at(-1)!,
      playbackRate: recipe.playbackRate,
      tailPlaybackRate: recipe.tailPlaybackRate,
      tailDelayS: recipe.tailDelayS,
      closeGain: recipe.closeGain,
      tailGain: recipe.tailGain,
    });
    yield;
  }
  // One shared factor per layer family keeps the variants' relative balance.
  const normalize = (channels: Float32Array[]) => scaleInPlace(channels, AK47_DSP_PEAK / Math.max(1e-6, peakOf(channels)));
  normalize(playerCloses.flat());
  normalize(enemyCloses);
  normalize(tails.flat());
  normalize(enemyTails);

  return {
    variants,
    stats: {
      closeClippedSamples: closeClipped,
      tailClippedSamples: tailClipped,
      closeOnsetS: closeOnset / sampleRate,
      tailOnsetS: tailOnset / sampleRate,
    },
  };
}

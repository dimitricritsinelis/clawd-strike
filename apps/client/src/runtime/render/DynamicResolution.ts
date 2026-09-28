/**
 * Frame-rate guard for the high tier: trades render resolution for frame rate
 * only while the frame rate is actually missing its floor.
 *
 * Hardware that holds the target never leaves full resolution. On slower GPUs
 * the pixel ratio steps down one level at a time (never below `minPixelRatio`,
 * the standard tier's budget) and probes back up after the frame rate has
 * held, backing off exponentially when a probe fails. A step that does not
 * improve the frame rate is undone, because a CPU-bound frame gains nothing
 * from fewer pixels.
 *
 * Pure logic: feed it frame intervals and read `pixelRatio`.
 */
export type DynamicResolutionOptions = {
  maxPixelRatio: number;
  minPixelRatio: number;
  /** Ratio change per level. */
  step?: number;
  /** Frame interval to hold, in ms (60 fps). */
  targetFrameMs?: number;
};

const WINDOW_MS = 1000;
const WARMUP_MS = 3000;
const HOLD_MS = 3000;
const MAX_BACKOFF_MS = 60_000;
const IGNORED_INTERVAL_MS = 250;

export class DynamicResolution {
  readonly levels: readonly number[];
  private level = 0;
  private readonly targetFrameMs: number;
  private samples: number[] = [];
  private windowStartMs: number | null = null;
  private startedAtMs: number | null = null;
  private lastChangeAtMs = 0;
  private holdMs = HOLD_MS;
  private pending: { from: number; beforeMs: number; kind: "down" | "up" } | null = null;
  private cpuBoundUntilMs = 0;

  constructor(options: DynamicResolutionOptions) {
    const step = options.step ?? 0.25;
    const levels: number[] = [options.maxPixelRatio];
    for (let ratio = options.maxPixelRatio - step; ratio > options.minPixelRatio + 1e-6; ratio -= step) {
      levels.push(Math.round(ratio * 100) / 100);
    }
    if (options.minPixelRatio < options.maxPixelRatio) levels.push(options.minPixelRatio);
    this.levels = levels;
    this.targetFrameMs = options.targetFrameMs ?? 1000 / 60;
  }

  get pixelRatio(): number {
    return this.levels[this.level]!;
  }

  /** Records one presented frame. Returns true when `pixelRatio` changed. */
  sample(intervalMs: number, nowMs: number): boolean {
    this.startedAtMs ??= nowMs;
    if (!(intervalMs > 0) || intervalMs > IGNORED_INTERVAL_MS || nowMs - this.startedAtMs < WARMUP_MS) return false;
    this.windowStartMs ??= nowMs;
    this.samples.push(intervalMs);
    if (nowMs - this.windowStartMs < WINDOW_MS) return false;
    const sorted = this.samples.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    this.samples = [];
    this.windowStartMs = nowMs;
    return this.decide(median, nowMs);
  }

  private decide(medianMs: number, nowMs: number): boolean {
    const slow = medianMs > this.targetFrameMs * 1.12;
    const holding = medianMs <= this.targetFrameMs * 1.03;

    if (this.pending) {
      const { from, beforeMs, kind } = this.pending;
      this.pending = null;
      if (kind === "down" && medianMs > beforeMs * 0.93) {
        // Fewer pixels did not help: the frame is CPU-bound. Undo and wait.
        this.cpuBoundUntilMs = nowMs + MAX_BACKOFF_MS / 2;
        return this.setLevel(from, nowMs);
      }
      if (kind === "up" && slow) {
        this.holdMs = Math.min(this.holdMs * 2, MAX_BACKOFF_MS);
        return this.setLevel(from, nowMs);
      }
      if (kind === "up") this.holdMs = HOLD_MS;
      return false;
    }

    if (slow && this.level < this.levels.length - 1 && nowMs >= this.cpuBoundUntilMs) {
      this.pending = { from: this.level, beforeMs: medianMs, kind: "down" };
      return this.setLevel(this.level + 1, nowMs);
    }
    if (holding && this.level > 0 && nowMs - this.lastChangeAtMs >= this.holdMs) {
      this.pending = { from: this.level, beforeMs: medianMs, kind: "up" };
      return this.setLevel(this.level - 1, nowMs);
    }
    return false;
  }

  private setLevel(level: number, nowMs: number): boolean {
    this.lastChangeAtMs = nowMs;
    if (level === this.level) return false;
    this.level = level;
    return true;
  }
}

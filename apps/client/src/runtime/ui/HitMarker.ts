import { clamp01 } from "../utils/math";
/**
 * HitMarker — the X that pops over the crosshair when a shot lands.
 *
 * Hit:  scale 1.2 -> 1.0 over 50 ms, full opacity for 0.05 s, then a linear
 *       fade over 0.15 s (0.20 s total). At 600 RPM a new hit restarts it
 *       every 0.1 s, so the marker never strobes off during a spray.
 * Kill: red X (#ff3b30, 26 px x 3 px), start scale 1.6, 0.35 s total.
 * Headshot: gold ring that expands 26 -> 34 px over the marker's life. A
 *       headshot kill shows the gold ring and the red X together.
 *
 * The frame that triggers the marker renders its start pose: the first
 * update() after trigger() does not advance time, so the pop is never skipped
 * when the feedback drain runs before update() in the same step.
 */

export type HitMarkerMode = "hit" | "kill";

type HitMarkerPhaseTiming = Readonly<{
  startScale: number;
  popS: number;
  holdS: number;
  fadeS: number;
}>;

const HIT_MARKER_TIMING = Object.freeze({
  hit: Object.freeze({ startScale: 1.2, popS: 0.05, holdS: 0.05, fadeS: 0.15 }),
  kill: Object.freeze({ startScale: 1.6, popS: 0.1, holdS: 0.2, fadeS: 0.15 }),
  ringStartPx: 26,
  ringEndPx: 34,
});

export const HIT_MARKER_STYLE = Object.freeze({
  boxPx: 18,
  hitColor: "rgba(255, 255, 255, 0.95)",
  hitArmPx: 20,
  hitThicknessPx: 2,
  headshotColor: "rgba(255, 230, 80, 0.98)",
  headshotArmPx: 24,
  ringColor: "rgba(255, 230, 80, 0.85)",
  killColor: "#ff3b30",
  killArmPx: 26,
  killThicknessPx: 3,
});

type HitMarkerFrame = Readonly<{
  opacity: number;
  scale: number;
  ringSizePx: number;
}>;

function easeOutQuad(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv;
}

function timingFor(mode: HitMarkerMode): HitMarkerPhaseTiming {
  return mode === "kill" ? HIT_MARKER_TIMING.kill : HIT_MARKER_TIMING.hit;
}

/** Total visible lifetime of a marker in the given mode, in seconds. */
export function hitMarkerDurationS(mode: HitMarkerMode): number {
  const timing = timingFor(mode);
  return timing.holdS + timing.fadeS;
}

/** Scale at `elapsedS` after the trigger: ease-out from startScale to 1.0. */
export function hitMarkerScale(mode: HitMarkerMode, elapsedS: number): number {
  const timing = timingFor(mode);
  const t = clamp01(elapsedS / timing.popS);
  return timing.startScale + (1 - timing.startScale) * easeOutQuad(t);
}

/** Opacity at `elapsedS`: 1 through the hold, then linear to 0 over the fade. */
export function hitMarkerOpacity(mode: HitMarkerMode, elapsedS: number): number {
  const timing = timingFor(mode);
  if (elapsedS <= timing.holdS) return 1;
  return 1 - clamp01((elapsedS - timing.holdS) / timing.fadeS);
}

/** Headshot ring diameter at `elapsedS`: 26 -> 34 px over the marker's life. */
export function hitMarkerRingSizePx(mode: HitMarkerMode, elapsedS: number): number {
  const t = clamp01(elapsedS / hitMarkerDurationS(mode));
  const { ringStartPx, ringEndPx } = HIT_MARKER_TIMING;
  return ringStartPx + (ringEndPx - ringStartPx) * easeOutQuad(t);
}

function sampleHitMarker(mode: HitMarkerMode, elapsedS: number): HitMarkerFrame {
  return {
    opacity: hitMarkerOpacity(mode, elapsedS),
    scale: hitMarkerScale(mode, elapsedS),
    ringSizePx: hitMarkerRingSizePx(mode, elapsedS),
  };
}

export class HitMarker {
  private readonly root: HTMLDivElement;
  private readonly arm1: HTMLDivElement;
  private readonly arm2: HTMLDivElement;
  private readonly ring: HTMLDivElement;
  private mode: HitMarkerMode | null = null;
  private elapsedS = 0;
  private headshot = false;
  private freshTrigger = false;

  constructor(crosshairEl: HTMLElement) {
    const box = `${HIT_MARKER_STYLE.boxPx}px`;
    this.root = document.createElement("div");
    this.root.style.position = "absolute";
    this.root.style.left = "0";
    this.root.style.top = "0";
    this.root.style.width = box;
    this.root.style.height = box;
    this.root.style.pointerEvents = "none";
    this.root.style.zIndex = "17";
    this.root.style.opacity = "0";
    this.root.style.transform = "scale(1)";
    this.root.style.transformOrigin = "center center";

    // Outer ring — visible only on headshots
    this.ring = document.createElement("div");
    this.ring.style.position = "absolute";
    this.ring.style.borderRadius = "50%";
    this.ring.style.border = `2px solid ${HIT_MARKER_STYLE.ringColor}`;
    this.ring.style.boxSizing = "border-box";
    this.ring.style.display = "none";
    this.applyRingSize(HIT_MARKER_TIMING.ringStartPx);

    // Two arms forming an X over the existing + crosshair
    this.arm1 = this.createArm(45);
    this.arm2 = this.createArm(-45);
    this.applyArmStyle(HIT_MARKER_STYLE.hitColor, HIT_MARKER_STYLE.hitArmPx, HIT_MARKER_STYLE.hitThicknessPx, false);

    this.root.append(this.ring, this.arm1, this.arm2);
    crosshairEl.append(this.root);
  }

  /**
   * Show the marker. `isKill` switches to the red kill X. Call the kill
   * trigger after the hit trigger in the same drain. A plain hit that lands
   * during the kill X's full-opacity hold keeps the kill X (it only adds the
   * headshot ring when the hit is a headshot) so the kill stays readable. A
   * hit that lands once the kill X has started to fade restarts as a fresh
   * hit marker, so a spray carried onto the next enemy never blinks off.
   */
  trigger(isHeadshot = false, isKill = false): void {
    if (!isKill && this.mode === "kill" && this.elapsedS <= HIT_MARKER_TIMING.kill.holdS) {
      if (isHeadshot && !this.headshot) {
        this.headshot = true;
        this.ring.style.display = "block";
        this.render();
      }
      return;
    }

    this.mode = isKill ? "kill" : "hit";
    this.elapsedS = 0;
    this.freshTrigger = true;
    this.headshot = isHeadshot;

    if (isKill) {
      this.applyArmStyle(HIT_MARKER_STYLE.killColor, HIT_MARKER_STYLE.killArmPx, HIT_MARKER_STYLE.killThicknessPx, true);
    } else if (isHeadshot) {
      this.applyArmStyle(HIT_MARKER_STYLE.headshotColor, HIT_MARKER_STYLE.headshotArmPx, HIT_MARKER_STYLE.hitThicknessPx, false);
    } else {
      this.applyArmStyle(HIT_MARKER_STYLE.hitColor, HIT_MARKER_STYLE.hitArmPx, HIT_MARKER_STYLE.hitThicknessPx, false);
    }
    this.ring.style.display = isHeadshot ? "block" : "none";
    this.render();
  }

  update(deltaSeconds: number): void {
    if (this.mode === null) return;
    if (this.freshTrigger) {
      // Hold the start pose for the frame that triggered it.
      this.freshTrigger = false;
      return;
    }

    this.elapsedS += Math.max(0, deltaSeconds);
    if (this.elapsedS >= hitMarkerDurationS(this.mode)) {
      this.hide();
      return;
    }
    this.render();
  }

  /** Current animation state, for tests and debug readouts. */
  getState(): Readonly<{ mode: HitMarkerMode | null; elapsedS: number; headshot: boolean }> {
    return { mode: this.mode, elapsedS: this.elapsedS, headshot: this.headshot };
  }

  clear(): void {
    this.hide();
  }

  dispose(): void {
    this.root.remove();
  }

  private hide(): void {
    this.mode = null;
    this.elapsedS = 0;
    this.headshot = false;
    this.freshTrigger = false;
    this.root.style.opacity = "0";
    this.root.style.transform = "scale(1)";
    this.ring.style.display = "none";
    this.ring.style.opacity = "0";
  }

  private render(): void {
    if (this.mode === null) return;
    const frame = sampleHitMarker(this.mode, this.elapsedS);
    const opacity = frame.opacity.toFixed(3);
    this.root.style.opacity = opacity;
    this.root.style.transform = `scale(${frame.scale.toFixed(3)})`;
    if (this.headshot) {
      this.applyRingSize(frame.ringSizePx);
      this.ring.style.opacity = opacity;
    }
  }

  private createArm(angleDeg: number): HTMLDivElement {
    const arm = document.createElement("div");
    arm.style.position = "absolute";
    arm.style.transform = `rotate(${angleDeg}deg)`;
    arm.style.transformOrigin = "center center";
    return arm;
  }

  private applyArmStyle(color: string, lengthPx: number, thicknessPx: number, outlined: boolean): void {
    const box = HIT_MARKER_STYLE.boxPx;
    for (const arm of [this.arm1, this.arm2]) {
      arm.style.width = `${lengthPx}px`;
      arm.style.height = `${thicknessPx}px`;
      arm.style.left = `${(box - lengthPx) / 2}px`;
      arm.style.top = `${(box - thicknessPx) / 2}px`;
      arm.style.background = color;
      arm.style.borderRadius = `${thicknessPx / 2}px`;
      arm.style.boxShadow = outlined ? "0 0 2px rgba(0, 0, 0, 0.65)" : "none";
    }
  }

  private applyRingSize(sizePx: number): void {
    const offset = (HIT_MARKER_STYLE.boxPx - sizePx) / 2;
    const size = `${sizePx.toFixed(2)}px`;
    this.ring.style.width = size;
    this.ring.style.height = size;
    this.ring.style.left = `${offset.toFixed(2)}px`;
    this.ring.style.top = `${offset.toFixed(2)}px`;
  }
}

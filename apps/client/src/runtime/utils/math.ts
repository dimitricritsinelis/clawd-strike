/** Scalar helpers shared by rendering, simulation and UI. No browser dependencies. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

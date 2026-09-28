import { DeterministicRng } from "../utils/Rng";

/**
 * Procedural bullet-hole atlas: one row per surface class, several variants
 * per row. Each cell is authored as a height field (the actual crater, spall
 * flakes, splinters or cracks) from which the albedo shading, tangent-space
 * normal map and parallax depth are all derived, so the lit hole reads as a
 * real cavity instead of a painted sticker.
 *
 * Local cell coordinates run x,y in [-1, 1] with +x along the texture U axis
 * (wood grain) and +y along V. Data rows start at v = 0 (DataTexture, no flip).
 */

export type DecalSurfaceClass = "masonry" | "wood" | "metal" | "glass" | "soft";

/** Atlas row order. Kept here (no three.js import) so the atlas worker stays small. */
export const DECAL_SURFACE_CLASSES: readonly DecalSurfaceClass[] = ["masonry", "wood", "metal", "glass", "soft"];

export const BULLET_HOLE_ATLAS_CELL_PX = 256;
export const BULLET_HOLE_ATLAS_VARIANTS = 4;
export const BULLET_HOLE_ATLAS_ROWS = DECAL_SURFACE_CLASSES.length;

/** Deepest cavity any class may encode, as a fraction of the decal edge length. */
export const BULLET_HOLE_MAX_DEPTH_UV = 0.11;

/**
 * Physical cavity depth per class as a fraction of the decal edge length.
 * Masonry spalls deep; sheet metal dents shallowly; glass and cloth are
 * nearly flat.
 */
const CLASS_DEPTH_UV: Record<DecalSurfaceClass, number> = {
  masonry: 0.11,
  wood: 0.085,
  metal: 0.05,
  glass: 0.012,
  soft: 0.03,
};

const CLASS_ROUGHNESS: Record<DecalSurfaceClass, number> = {
  masonry: 0.95,
  wood: 0.9,
  metal: 0.55,
  glass: 0.08,
  soft: 1,
};

/** Colour written under fully transparent texels so filtering never fringes. */
const CLASS_FILL_RGB: Record<DecalSurfaceClass, readonly [number, number, number]> = {
  masonry: [0.96, 0.95, 0.93],
  wood: [0.32, 0.28, 0.24],
  metal: [0.3, 0.25, 0.21],
  glass: [0.95, 0.96, 0.97],
  soft: [0.4, 0.4, 0.4],
};

export type BulletHoleAtlas = {
  width: number;
  height: number;
  cellPx: number;
  columns: number;
  rows: number;
  /** sRGB colour + coverage. */
  albedo: Uint8Array;
  /** Tangent-space normal (RGB) + surface height (A: 255 = flush, 0 = deepest). */
  normalHeight: Uint8Array;
  /** glTF packing: G = roughness, B = metalness. */
  surface: Uint8Array;
};

export function bulletHoleAtlasRow(surface: DecalSurfaceClass): number {
  return DECAL_SURFACE_CLASSES.indexOf(surface);
}

// ── Noise ────────────────────────────────────────────────────────────────────

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 0x1_0000_0000;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}

/** Fractal noise in roughly [-1, 1]. */
function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += (valueNoise(x * f, y * f, seed + o * 101) * 2 - 1) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const ANGLE_TABLE_SIZE = 1024;

/** Samples a periodic function of angle into a table for fast per-pixel lookup. */
function tabulateAngle(fn: (theta: number) => number): (theta: number) => number {
  const table = new Float32Array(ANGLE_TABLE_SIZE + 1);
  for (let i = 0; i <= ANGLE_TABLE_SIZE; i++) table[i] = fn((i / ANGLE_TABLE_SIZE) * Math.PI * 2);
  const scale = ANGLE_TABLE_SIZE / (Math.PI * 2);
  return (theta) => {
    let t = theta * scale;
    t -= Math.floor(t / ANGLE_TABLE_SIZE) * ANGLE_TABLE_SIZE;
    const i = t | 0;
    const f = t - i;
    return table[i]! + (table[i + 1]! - table[i]!) * f;
  };
}

/** Smooth periodic noise over an angle, roughly [-1, 1]. */
function makeAngularNoise(rng: DeterministicRng, minHarmonic: number, maxHarmonic: number): (theta: number) => number {
  const terms: { k: number; phase: number; amp: number }[] = [];
  let norm = 0;
  for (let k = minHarmonic; k <= maxHarmonic; k++) {
    const amp = (1 / Math.sqrt(k)) * rng.range(0.4, 1);
    terms.push({ k, phase: rng.range(0, Math.PI * 2), amp });
    norm += amp;
  }
  return tabulateAngle((theta) => {
    let sum = 0;
    for (const term of terms) sum += Math.sin(theta * term.k + term.phase) * term.amp;
    return sum / norm * 1.6;
  });
}

/** Closed polar polygon: radius at an angle by linear interpolation of vertices. */
function makeChippedOutline(rng: DeterministicRng, vertices: number, radius: number, jitter: number): (theta: number) => number {
  const angles: number[] = [];
  for (let i = 0; i < vertices; i++) {
    angles.push(((i + rng.range(-0.35, 0.35)) / vertices) * Math.PI * 2);
  }
  angles.sort((a, b) => a - b);
  const radii = angles.map(() => radius * rng.range(1 - jitter, 1 + jitter * 0.6));
  return tabulateAngle((theta) => {
    let t = theta;
    while (t < angles[0]!) t += Math.PI * 2;
    while (t >= angles[0]! + Math.PI * 2) t -= Math.PI * 2;
    for (let i = 0; i < vertices; i++) {
      const a0 = angles[i]!;
      const a1 = i + 1 < vertices ? angles[i + 1]! : angles[0]! + Math.PI * 2;
      if (t >= a0 && t < a1) {
        const f = (t - a0) / (a1 - a0);
        return radii[i]! + (radii[(i + 1) % vertices]! - radii[i]!) * f;
      }
    }
    return radii[0]!;
  });
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Quantize a [0, 255] value. */
function q(x: number): number {
  return (x + 0.5) | 0;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// ── Cell canvas ──────────────────────────────────────────────────────────────

class Cell {
  readonly n: number;
  /** Local units per pixel. */
  readonly px: number;
  readonly height: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  readonly a: Float32Array;
  readonly rough: Float32Array;
  readonly metal: Float32Array;

  constructor(n: number, roughness: number) {
    this.n = n;
    this.px = 2 / n;
    const size = n * n;
    this.height = new Float32Array(size);
    this.r = new Float32Array(size);
    this.g = new Float32Array(size);
    this.b = new Float32Array(size);
    this.a = new Float32Array(size);
    this.rough = new Float32Array(size).fill(roughness);
    this.metal = new Float32Array(size);
  }

  x(i: number): number {
    return ((i + 0.5) / this.n) * 2 - 1;
  }

  /** Straight-alpha "over" composite of one layer onto the pixel. */
  over(index: number, r: number, g: number, b: number, alpha: number): void {
    if (alpha <= 0) return;
    const a0 = this.a[index]!;
    const outA = alpha + a0 * (1 - alpha);
    const w0 = (a0 * (1 - alpha)) / outA;
    const w1 = alpha / outA;
    this.r[index] = r * w1 + this.r[index]! * w0;
    this.g[index] = g * w1 + this.g[index]! * w0;
    this.b[index] = b * w1 + this.b[index]! * w0;
    this.a[index] = outA;
  }

  /**
   * Stamps a tapered stroke along a polyline. `paint` receives the pixel index,
   * the stroke coverage (0-1) and the position along the stroke (0-1).
   */
  stroke(
    points: readonly (readonly [number, number])[],
    width0: number,
    width1: number,
    paint: (index: number, coverage: number, along: number) => void,
  ): void {
    let total = 0;
    const lengths: number[] = [0];
    for (let s = 1; s < points.length; s++) {
      total += Math.hypot(points[s]![0] - points[s - 1]![0], points[s]![1] - points[s - 1]![1]);
      lengths.push(total);
    }
    if (total <= 0) return;
    const coverage = new Map<number, { c: number; along: number }>();
    for (let s = 1; s < points.length; s++) {
      const [ax, ay] = points[s - 1]!;
      const [bx, by] = points[s]!;
      const maxW = Math.max(width0, width1);
      const i0 = Math.max(0, Math.floor(((Math.min(ax, bx) - maxW + 1) / 2) * this.n) - 1);
      const i1 = Math.min(this.n - 1, Math.ceil(((Math.max(ax, bx) + maxW + 1) / 2) * this.n) + 1);
      const j0 = Math.max(0, Math.floor(((Math.min(ay, by) - maxW + 1) / 2) * this.n) - 1);
      const j1 = Math.min(this.n - 1, Math.ceil(((Math.max(ay, by) + maxW + 1) / 2) * this.n) + 1);
      const sx = bx - ax;
      const sy = by - ay;
      const len2 = sx * sx + sy * sy || 1e-12;
      for (let j = j0; j <= j1; j++) {
        const y = this.x(j);
        for (let i = i0; i <= i1; i++) {
          const x = this.x(i);
          const t = Math.min(1, Math.max(0, ((x - ax) * sx + (y - ay) * sy) / len2));
          const ex = x - (ax + sx * t);
          const ey = y - (ay + sy * t);
          const d = Math.sqrt(ex * ex + ey * ey);
          const along = (lengths[s - 1]! + t * Math.sqrt(len2)) / total;
          const halfWidth = (width0 + (width1 - width0) * along) * 0.5;
          const c = clamp01((halfWidth - d) / this.px + 0.5);
          if (c <= 0) continue;
          const index = j * this.n + i;
          const prev = coverage.get(index);
          if (!prev || prev.c < c) coverage.set(index, { c, along });
        }
      }
    }
    for (const [index, value] of coverage) paint(index, value.c, value.along);
  }
}

/** Jagged random walk from a start point, heading `angle`, ~`length` long. */
function crackPath(
  rng: DeterministicRng,
  x: number,
  y: number,
  angle: number,
  length: number,
  step: number,
  wander: number,
): [number, number][] {
  const points: [number, number][] = [[x, y]];
  let heading = angle;
  let travelled = 0;
  while (travelled < length) {
    heading += rng.range(-wander, wander) + (angle - heading) * 0.25;
    const s = step * rng.range(0.6, 1.4);
    x += Math.cos(heading) * s;
    y += Math.sin(heading) * s;
    travelled += s;
    points.push([x, y]);
  }
  return points;
}

// ── Surface painters ─────────────────────────────────────────────────────────

function paintMasonry(cell: Cell, rng: DeterministicRng, seed: number): void {
  const { n, px } = cell;
  const coreR = rng.range(0.095, 0.115);
  const coreNoise = makeAngularNoise(rng, 3, 7);
  const craterR = rng.range(0.25, 0.32);
  const craterEdge = makeChippedOutline(rng, rng.int(7, 12), craterR, 0.3);
  const edgeNoise = makeAngularNoise(rng, 9, 18);
  const edgeAt = (theta: number) => craterEdge(theta) * (1 + edgeNoise(theta) * 0.06);

  // Conchoidal spall flakes: each Voronoi facet has its own tilt and tone.
  const facets: { x: number; y: number; gx: number; gy: number; tone: number }[] = [];
  const facetCount = rng.int(9, 15);
  for (let f = 0; f < facetCount; f++) {
    const theta = rng.range(0, Math.PI * 2);
    const radius = rng.range(coreR, edgeAt(theta));
    facets.push({
      x: Math.cos(theta) * radius,
      y: Math.sin(theta) * radius,
      gx: rng.range(-0.9, 0.9),
      gy: rng.range(-0.9, 0.9),
      tone: rng.range(0.86, 1.06),
    });
  }

  // Spall flakes knocked off the crater lip: wedge-shaped, deepest on the
  // side facing the crater and feathering out to the face.
  const chips: { x: number; y: number; ux: number; uy: number; size: number; outline: (t: number) => number; depth: number; tone: number }[] = [];
  const chipCount = rng.int(0, 3);
  for (let c = 0; c < chipCount; c++) {
    const theta = rng.range(0, Math.PI * 2);
    const size = rng.range(0.035, 0.08);
    const distance = edgeAt(theta) + size * rng.range(0.1, 0.6);
    chips.push({
      x: Math.cos(theta) * distance,
      y: Math.sin(theta) * distance,
      ux: Math.cos(theta),
      uy: Math.sin(theta),
      size,
      outline: makeChippedOutline(rng, rng.int(3, 6), size, 0.5),
      depth: rng.range(0.12, 0.26),
      tone: rng.range(0.9, 1.04),
    });
  }

  const haloR = rng.range(0.7, 0.86);
  for (let j = 0; j < n; j++) {
    const y = cell.x(j);
    for (let i = 0; i < n; i++) {
      const x = cell.x(i);
      const index = j * n + i;
      const r = Math.sqrt(x * x + y * y);
      if (r >= haloR) continue;
      const theta = Math.atan2(y, x);
      const edge = edgeAt(theta);
      const grain = fbm(x * 38, y * 38, seed + 7, 2);

      // Powder halo: fine pulverised material blown out around the impact.
      // Radially smooth so it never echoes the chipped crater outline.
      const falloff = Math.pow(1 - smoothstep(craterR * 0.8, haloR, r), 2);
      const speckle = 0.5 + 0.5 * fbm(x * 22, y * 22, seed + 3, 3);
      cell.over(index, 1, 1, 1, 0.12 * falloff * speckle);
      // Bullet wipe: grey lead/soot smudge ringing the crater, which is what
      // makes a hole read from across a street.
      const wipe = Math.pow(1 - smoothstep(craterR * 0.85, craterR * 1.7, r), 1.4);
      if (wipe > 0) cell.over(index, 0.2, 0.19, 0.18, 0.3 * wipe * (0.7 + 0.3 * speckle));

      // Chips (shallow flakes).
      for (const chip of chips) {
        const dx = x - chip.x;
        const dy = y - chip.y;
        // Flakes shear off along the lip: squash them radially, stretch them
        // around the crater.
        const radial = dx * chip.ux + dy * chip.uy;
        const around = -dx * chip.uy + dy * chip.ux;
        const cx = radial / 0.55;
        const cy = around;
        const cr = Math.sqrt(cx * cx + cy * cy);
        const outline = chip.outline(Math.atan2(cy, cx));
        if (cr > outline + px) continue;
        const coverage = clamp01((outline - cr) / px + 0.5);
        // 1 at the crater-side edge of the flake, 0 at its outer edge.
        const wedge = clamp01(0.5 - radial / (chip.size * 1.1));
        const depth = chip.depth * (0.25 + 0.75 * wedge) + grain * 0.02;
        cell.height[index] = Math.min(cell.height[index]!, -depth * coverage);
        const shade = chip.tone * (1 - depth * 0.55) * (0.94 + grain * 0.06);
        cell.over(index, 0.92 * shade, 0.92 * shade, 0.91 * shade, coverage);
      }

      // Main crater.
      if (r < edge + px) {
        const coverage = clamp01((edge - r) / px + 0.5);
        const core = coreR * (1 + coreNoise(theta) * 0.18);
        const s = clamp01((r - core) / Math.max(1e-4, edge - core));
        let nearest = facets[0]!;
        let nearestD = Infinity;
        for (const facet of facets) {
          const d = (x - facet.x) ** 2 + (y - facet.y) ** 2;
          if (d < nearestD) {
            nearestD = d;
            nearest = facet;
          }
        }
        const facetTilt = (nearest.gx * (x - nearest.x) + nearest.gy * (y - nearest.y)) * 0.55;
        let depth = 0.22 + 0.62 * Math.pow(1 - s, 1.5) + facetTilt + grain * 0.035;
        depth = Math.min(0.9, Math.max(0.12, depth));
        cell.height[index] = Math.min(cell.height[index]!, -depth * coverage);
        // Freshly exposed material is lighter than the weathered face; deeper
        // walls sit in their own shadow.
        // A crisp, light fracture edge right at the lip.
        const lip = 1 - clamp01((edge - r) / (px * 2.5));
        const shade = nearest.tone * (1 - depth * 0.72) * (0.93 + grain * 0.07) * (1 + lip * 0.18);
        cell.over(index, 0.97 * shade, 0.95 * shade, 0.92 * shade, coverage);

        // Punched core: the bullet's own channel, black and deepest.
        const coreCoverage = clamp01((core - r) / (px * 1.5) + 0.5);
        if (coreCoverage > 0) {
          cell.height[index] = -1 * coreCoverage + cell.height[index]! * (1 - coreCoverage);
          cell.over(index, 0.028, 0.025, 0.022, coreCoverage);
          cell.rough[index] = 1;
        }
        // Soot/shadow falloff into the throat.
        const throat = 1 - smoothstep(core, core + 0.08, r);
        if (throat > 0 && coreCoverage < 1) cell.over(index, 0.06, 0.055, 0.05, throat * throat * 0.7);
      }
    }
  }

  // Hairline cracks running out from the crater lip.
  const crackCount = rng.int(0, 4);
  for (let c = 0; c < crackCount; c++) {
    const theta = rng.range(0, Math.PI * 2);
    const start = edgeAt(theta) * 0.9;
    const path = crackPath(rng, Math.cos(theta) * start, Math.sin(theta) * start, theta, rng.range(0.08, 0.26), 0.016, 0.35);
    cell.stroke(path, px * 1.7, px * 0.4, (index, coverage, along) => {
      const fade = coverage * (1 - along * 0.6);
      cell.height[index] = Math.min(cell.height[index]!, -0.18 * fade);
      cell.over(index, 0.14, 0.13, 0.12, 0.7 * fade);
    });
  }

  // Loose grit and powder specks.
  const specks = rng.int(18, 36);
  for (let s = 0; s < specks; s++) {
    const theta = rng.range(0, Math.PI * 2);
    const radius = rng.range(0.28, 0.66);
    const x = Math.cos(theta) * radius;
    const y = Math.sin(theta) * radius;
    const dark = rng.next() < 0.45;
    const size = px * rng.range(0.8, 2.2);
    cell.stroke([[x, y], [x + px * 0.3, y]], size, size, (index, coverage) => {
      if (dark) cell.over(index, 0.2, 0.19, 0.17, 0.55 * coverage);
      else cell.over(index, 1, 1, 0.98, 0.5 * coverage);
    });
  }
}

function paintWood(cell: Cell, rng: DeterministicRng, seed: number): void {
  const { n, px } = cell;
  const coreRx = rng.range(0.07, 0.085);
  const coreRy = rng.range(0.048, 0.06);
  const coreNoise = makeAngularNoise(rng, 3, 8);
  const tornRx = rng.range(0.19, 0.28);
  const tornRy = rng.range(0.1, 0.14);
  const tornNoise = makeAngularNoise(rng, 10, 26);

  for (let j = 0; j < n; j++) {
    const y = cell.x(j);
    for (let i = 0; i < n; i++) {
      const x = cell.x(i);
      const index = j * n + i;
      const theta = Math.atan2(y, x);
      const tx = x / tornRx;
      const ty = y / tornRy;
      const torn = Math.sqrt(tx * tx + ty * ty) / (1 + tornNoise(theta) * 0.22);
      if (torn > 1.8) continue;
      const fibre = fbm(x * 5, y * 70, seed + 11, 3);

      // Dirty scuff where the round dragged fibres outward.
      const smudge = 1 - smoothstep(0.9, 1.7, torn);
      if (smudge > 0) cell.over(index, 0.18, 0.15, 0.12, smudge * 0.22 * (0.7 + 0.3 * fibre));

      if (torn < 1 + px * 4) {
        const coverage = clamp01((1 - torn) / (px * 4) + 0.5);
        const depth = Math.min(0.85, 0.2 + 0.55 * Math.pow(clamp01(1 - torn), 1.2) + fibre * 0.12);
        cell.height[index] = Math.min(cell.height[index]!, -depth * coverage);
        const shade = (1 - depth * 0.6) * (0.84 + fibre * 0.16);
        cell.over(index, 0.95 * shade, 0.9 * shade, 0.82 * shade, coverage);
        cell.rough[index] = 0.9;
      }

      const kx = x / coreRx;
      const ky = y / coreRy;
      const core = Math.sqrt(kx * kx + ky * ky) / (1 + coreNoise(theta) * 0.2);
      const coreCoverage = clamp01((1 - core) / (px * 12) + 0.5);
      if (coreCoverage > 0) {
        cell.height[index] = -coreCoverage + cell.height[index]! * (1 - coreCoverage);
        cell.over(index, 0.03, 0.025, 0.02, coreCoverage);
        cell.rough[index] = 1;
      }
    }
  }

  // Splinters: torn fibres lifted along the grain, each casting a thin shadow.
  const splinters = rng.int(4, 9);
  for (let s = 0; s < splinters; s++) {
    const alongGrain = rng.next() < 0.8;
    const base = alongGrain ? (rng.next() < 0.5 ? 0 : Math.PI) : (rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const theta = base + rng.range(-0.45, 0.45) * (alongGrain ? 1 : 0.6);
    const startR = Math.hypot(Math.cos(theta) * tornRx, Math.sin(theta) * tornRy) * rng.range(0.55, 0.95);
    const length = rng.range(0.06, alongGrain ? 0.26 : 0.1);
    const path = crackPath(rng, Math.cos(theta) * startR, Math.sin(theta) * startR, theta, length, 0.03, 0.12);
    const width = rng.range(0.012, 0.026);
    const shadowPath = path.map(([px0, py0]) => [px0 + 0.006, py0 - 0.012] as [number, number]);
    cell.stroke(shadowPath, width * 1.1, px * 0.5, (index, coverage) => {
      cell.over(index, 0.08, 0.07, 0.06, 0.45 * coverage);
    });
    const tone = rng.range(0.82, 1);
    cell.stroke(path, width, px * 0.4, (index, coverage, along) => {
      cell.height[index] = Math.max(cell.height[index]!, 0.35 * coverage * (1 - along));
      const shade = tone * (0.9 + 0.1 * (1 - along));
      cell.over(index, 0.96 * shade, 0.9 * shade, 0.8 * shade, coverage);
      cell.rough[index] = 0.85;
    });
  }
}

function paintMetal(cell: Cell, rng: DeterministicRng, seed: number): void {
  const { n, px } = cell;
  const coreR = rng.range(0.058, 0.07);
  const coreNoise = makeAngularNoise(rng, 3, 6);
  const dentR = rng.range(0.2, 0.26);
  const bareR = rng.range(0.12, 0.16);
  const bareNoise = makeAngularNoise(rng, 4, 14);
  const oxideR = bareR * rng.range(1.6, 1.9);
  const streakSeed = seed + 17;

  for (let j = 0; j < n; j++) {
    const y = cell.x(j);
    for (let i = 0; i < n; i++) {
      const x = cell.x(i);
      const index = j * n + i;
      const r = Math.sqrt(x * x + y * y);
      if (r > oxideR + px && r > dentR) continue;
      const theta = Math.atan2(y, x);

      // Smooth dent: sheet metal is pushed in, not chipped out.
      const dent = Math.pow(1 - smoothstep(coreR, dentR, r), 1.6);
      cell.height[index] = -0.6 * dent;

      // Heat-tint / oxide ring.
      const oxide = 1 - smoothstep(bareR, oxideR, r);
      if (oxide > 0) {
        const warm = fbm(x * 18, y * 18, seed + 5, 2) * 0.5 + 0.5;
        cell.over(index, 0.26 + warm * 0.08, 0.2 + warm * 0.04, 0.17, 0.42 * oxide);
        cell.rough[index] = 0.55;
        cell.metal[index] = 0.5 * oxide;
      }

      // Bare, burnished steel where the paint/scale was blasted off.
      const bare = bareR * (1 + bareNoise(theta) * 0.22);
      if (r < bare + px) {
        const coverage = clamp01((bare - r) / px + 0.5);
        const streak = fbm(theta * 14, r * 6, streakSeed, 2);
        const shade = (0.82 + streak * 0.14) * (1 - dent * 0.25);
        cell.over(index, 0.66 * shade, 0.67 * shade, 0.69 * shade, coverage);
        cell.rough[index] = 0.28 + (streak * 0.5 + 0.5) * 0.14;
        cell.metal[index] = 1;
        // Paint thickness shows as a thin dark lip at the edge of the bare patch.
        const lip = 1 - Math.min(1, Math.abs(bare - r) / (px * 1.4));
        if (lip > 0) cell.over(index, 0.12, 0.11, 0.1, lip * 0.6);
      }

      const core = coreR * (1 + coreNoise(theta) * 0.08);
      const coreCoverage = clamp01((core - r) / px + 0.5);
      if (coreCoverage > 0) {
        cell.height[index] = -coreCoverage + cell.height[index]! * (1 - coreCoverage);
        cell.over(index, 0.02, 0.02, 0.022, coreCoverage);
        cell.rough[index] = 1;
        cell.metal[index] = 0;
      }
    }
  }

  // Petal tears at the rim of the puncture.
  const petals = rng.int(3, 6);
  for (let p = 0; p < petals; p++) {
    const theta = rng.range(0, Math.PI * 2);
    const path = crackPath(rng, Math.cos(theta) * coreR * 0.9, Math.sin(theta) * coreR * 0.9, theta, rng.range(0.025, 0.05), 0.012, 0.3);
    cell.stroke(path, px * 2, px * 0.5, (index, coverage) => {
      cell.over(index, 0.03, 0.03, 0.03, coverage);
      cell.height[index] = Math.min(cell.height[index]!, -0.8 * coverage);
    });
  }
}

function paintGlass(cell: Cell, rng: DeterministicRng, seed: number): void {
  const { n, px } = cell;
  const coreR = rng.range(0.045, 0.058);
  const coreNoise = makeAngularNoise(rng, 5, 12);
  const crushR = rng.range(0.11, 0.15);
  const crushNoise = makeAngularNoise(rng, 6, 16);

  // Radial fractures with occasional branches.
  const radials = rng.int(10, 16);
  for (let c = 0; c < radials; c++) {
    const theta = (c / radials) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const path = crackPath(rng, Math.cos(theta) * coreR, Math.sin(theta) * coreR, theta, rng.range(0.4, 0.86), 0.03, 0.18);
    cell.stroke(path, px * 1.3, px * 0.6, (index, coverage, along) => {
      cell.over(index, 0.97, 0.98, 1, 0.82 * coverage * (1 - along * 0.55));
      cell.height[index] = Math.min(cell.height[index]!, -0.25 * coverage);
    });
    if (rng.next() < 0.4) {
      const from = path[Math.floor(path.length * rng.range(0.3, 0.7))]!;
      const branch = crackPath(rng, from[0], from[1], theta + rng.range(-0.8, 0.8), rng.range(0.08, 0.2), 0.025, 0.2);
      cell.stroke(branch, px, px * 0.5, (index, coverage, along) => {
        cell.over(index, 0.97, 0.98, 1, 0.6 * coverage * (1 - along * 0.6));
      });
    }
  }

  // Concentric fractures bridging neighbouring radials.
  const rings = rng.int(1, 3);
  for (let ring = 0; ring < rings; ring++) {
    const radius = rng.range(0.2, 0.42);
    for (let c = 0; c < radials; c++) {
      if (rng.next() < 0.3) continue;
      const a0 = (c / radials) * Math.PI * 2;
      const a1 = ((c + 1) / radials) * Math.PI * 2;
      const points: [number, number][] = [];
      for (let k = 0; k <= 4; k++) {
        const a = a0 + (a1 - a0) * (k / 4);
        const rr = radius * rng.range(0.93, 1.07);
        points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      cell.stroke(points, px * 1.1, px * 0.9, (index, coverage) => {
        cell.over(index, 0.96, 0.97, 1, 0.55 * coverage);
      });
    }
  }

  // Crushed zone and hole last, so no fracture line crosses the opening.
  for (let j = 0; j < n; j++) {
    const y = cell.x(j);
    for (let i = 0; i < n; i++) {
      const x = cell.x(i);
      const index = j * n + i;
      const r = Math.sqrt(x * x + y * y);
      if (r > crushR * 1.4) continue;
      const theta = Math.atan2(y, x);
      const crush = crushR * (1 + crushNoise(theta) * 0.25);
      if (r < crush + px) {
        const coverage = clamp01((crush - r) / px + 0.5);
        const frost = 0.7 + 0.3 * fbm(x * 60, y * 60, seed + 9, 2);
        cell.height[index] = -0.6 * coverage;
        cell.over(index, 0.9, 0.92, 0.93, 0.72 * frost * coverage);
        cell.rough[index] = 0.55;
      }
      const core = coreR * (1 + coreNoise(theta) * 0.2);
      const coreCoverage = clamp01((core - r) / px + 0.5);
      if (coreCoverage > 0) {
        cell.height[index] = -coreCoverage;
        cell.over(index, 0.04, 0.045, 0.05, 0.94 * coreCoverage);
        cell.rough[index] = 1;
      }
    }
  }
}

function paintSoft(cell: Cell, rng: DeterministicRng, seed: number): void {
  const { n, px } = cell;
  const holeR = rng.range(0.09, 0.12);
  const holeNoise = makeAngularNoise(rng, 5, 16);
  const frayR = holeR * rng.range(1.7, 2.1);

  for (let j = 0; j < n; j++) {
    const y = cell.x(j);
    for (let i = 0; i < n; i++) {
      const x = cell.x(i);
      const index = j * n + i;
      const r = Math.sqrt(x * x + y * y);
      if (r > frayR) continue;
      const theta = Math.atan2(y, x);
      const weave = (Math.sin(x * 190) * Math.sin(y * 190)) * 0.5 + 0.5;
      const fray = 1 - smoothstep(holeR, frayR, r);
      if (fray > 0) {
        cell.height[index] = -0.35 * fray;
        const shade = 0.55 + 0.25 * weave + fbm(x * 30, y * 30, seed + 4, 2) * 0.1;
        cell.over(index, 0.6 * shade, 0.58 * shade, 0.56 * shade, 0.45 * fray);
      }
      const hole = holeR * (1 + holeNoise(theta) * 0.14);
      const coverage = clamp01((hole - r) / px + 0.5);
      if (coverage > 0) {
        cell.height[index] = -coverage + cell.height[index]! * (1 - coverage);
        cell.over(index, 0.025, 0.022, 0.02, coverage);
      }
    }
  }

  // Loose threads hanging into the hole along warp and weft.
  const threads = rng.int(10, 18);
  for (let t = 0; t < threads; t++) {
    const theta = rng.range(0, Math.PI * 2);
    const start = holeR * (1 + holeNoise(theta) * 0.14) * 1.05;
    const inward = Math.abs(Math.cos(theta)) > Math.abs(Math.sin(theta))
      ? (Math.cos(theta) > 0 ? Math.PI : 0)
      : (Math.sin(theta) > 0 ? -Math.PI / 2 : Math.PI / 2);
    const path = crackPath(rng, Math.cos(theta) * start, Math.sin(theta) * start, inward + rng.range(-0.3, 0.3), rng.range(0.02, 0.06), 0.01, 0.25);
    const tone = rng.range(0.8, 1);
    cell.stroke(path, px * 1.6, px * 0.9, (index, coverage) => {
      cell.over(index, tone, tone * 0.98, tone * 0.95, 0.9 * coverage);
      cell.height[index] = Math.max(cell.height[index]!, -0.2);
    });
  }
}

const PAINTERS: Record<DecalSurfaceClass, (cell: Cell, rng: DeterministicRng, seed: number) => void> = {
  masonry: paintMasonry,
  wood: paintWood,
  metal: paintMetal,
  glass: paintGlass,
  soft: paintSoft,
};

// ── Atlas assembly ───────────────────────────────────────────────────────────

export function generateBulletHoleAtlas(seed = 1, cellPx = BULLET_HOLE_ATLAS_CELL_PX): BulletHoleAtlas {
  const columns = BULLET_HOLE_ATLAS_VARIANTS;
  const rows = BULLET_HOLE_ATLAS_ROWS;
  const width = columns * cellPx;
  const height = rows * cellPx;
  const albedo = new Uint8Array(width * height * 4);
  const normalHeight = new Uint8Array(width * height * 4);
  const surface = new Uint8Array(width * height * 4);

  for (let row = 0; row < rows; row++) {
    const surfaceClass = DECAL_SURFACE_CLASSES[row]!;
    const depthScale = CLASS_DEPTH_UV[surfaceClass] / BULLET_HOLE_MAX_DEPTH_UV;
    // Height step of 1 = CLASS_DEPTH_UV of the decal edge; one pixel = 1/cellPx.
    const slopeScale = CLASS_DEPTH_UV[surfaceClass] * cellPx;
    const fill = CLASS_FILL_RGB[surfaceClass];
    for (let column = 0; column < columns; column++) {
      const cellSeed = (seed * 7919 + row * 131 + column * 17) >>> 0;
      const rng = new DeterministicRng(cellSeed || 1);
      const cell = new Cell(cellPx, CLASS_ROUGHNESS[surfaceClass]);
      PAINTERS[surfaceClass](cell, rng, cellSeed);

      for (let j = 0; j < cellPx; j++) {
        const y = cell.x(j);
        for (let i = 0; i < cellPx; i++) {
          const x = cell.x(i);
          const index = j * cellPx + i;
          // Keep a transparent gutter so neighbouring cells never bleed.
          const gutter = 1 - smoothstep(0.88, 0.97, Math.max(Math.abs(x), Math.abs(y)));
          const alpha = cell.a[index]! * gutter;
          const out = ((row * cellPx + j) * width + column * cellPx + i) * 4;
          const visible = alpha > 1 / 255;
          albedo[out] = q(clamp01(visible ? cell.r[index]! : fill[0]) * 255);
          albedo[out + 1] = q(clamp01(visible ? cell.g[index]! : fill[1]) * 255);
          albedo[out + 2] = q(clamp01(visible ? cell.b[index]! : fill[2]) * 255);
          albedo[out + 3] = q(clamp01(alpha) * 255);

          const hL = cell.height[j * cellPx + Math.max(0, i - 1)]!;
          const hR = cell.height[j * cellPx + Math.min(cellPx - 1, i + 1)]!;
          const hD = cell.height[Math.max(0, j - 1) * cellPx + i]!;
          const hU = cell.height[Math.min(cellPx - 1, j + 1) * cellPx + i]!;
          const nx = -(hR - hL) * 0.5 * slopeScale;
          const ny = -(hU - hD) * 0.5 * slopeScale;
          const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
          normalHeight[out] = q((nx * inv * 0.5 + 0.5) * 255);
          normalHeight[out + 1] = q((ny * inv * 0.5 + 0.5) * 255);
          normalHeight[out + 2] = q((inv * 0.5 + 0.5) * 255);
          const depth = clamp01(-cell.height[index]!) * depthScale;
          normalHeight[out + 3] = q((1 - depth) * 255);

          surface[out] = 255;
          surface[out + 1] = q(clamp01(cell.rough[index]!) * 255);
          surface[out + 2] = q(clamp01(cell.metal[index]!) * 255);
          surface[out + 3] = 255;
        }
      }
    }
  }

  return { width, height, cellPx, columns, rows, albedo, normalHeight, surface };
}

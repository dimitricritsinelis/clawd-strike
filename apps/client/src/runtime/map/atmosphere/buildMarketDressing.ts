import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { DeterministicRng } from "../../utils/Rng";
import {
  Batches, box, catenary, cylinder, srgb, tube, w, wallFrame,
  type AtmosphereMaterialFactory, type Vec2, type Vec3,
} from "./buildStreetAtmosphere";

/**
 * R8.1 market touches: hanging kilims beside rug and textile shops, rugs
 * airing over upper sills, zellige tile friezes over civic doors, brass plates,
 * pierced-brass lantern clusters and goods on the free part of existing
 * counters. Records come from the frozen atmosphere overlay (see
 * buildR8Atmosphere.ts), which keeps the clearance contract; everything here
 * is render-only and procedural (no downloaded art, no script).
 */

type WallArt = {
  id: string; kind: "rug" | "sill_rug" | "tile_panel" | "brass_plates"; center: Vec2; inward: Vec2;
  zTop: number; widthM: number; heightM: number; projectionM: number; variant: number; seed: number;
};
type LanternCluster = {
  id: string; center: Vec2; inward: Vec2; mountZ: number; armM: number; bottomAboveFloorM: number;
  lanterns: { outM: number; chainM: number; heightM: number; radiusM: number; glass: string }[];
};
type CounterGoods = {
  id: string; group: string; kind: "spice_cone" | "grain_sack" | "dates_basket" | "jar_row" | "tea_tray" | "bowl_stack" | "rug_stack";
  pos: Vec3; inward: Vec2; seed: number; projectionM: number; counterFrontM: number;
};
export type MarketDressing = { wallArt: WallArt[]; lanterns: LanternCluster[]; counterGoods: CounterGoods[] };

// ── Procedural textures ─────────────────────────────────────────────

const RUG_VARIANTS = 6;
const RUG_W = 96;
const RUG_H = 192;

/** Kilim palettes: ground, field, motif, accent, light. Madder, indigo, saffron, walnut. */
const RUG_PALETTES: readonly (readonly string[])[] = [
  ["#7a1f1a", "#9c2b22", "#1f2f4f", "#d9a441", "#e8dcc2"],
  ["#1f2f4f", "#27406a", "#9c2b22", "#d9a441", "#e3d6bb"],
  ["#8a3a1c", "#b0512a", "#2d3b2a", "#e0b25a", "#efe2c6"],
  ["#5a2430", "#7a2f3a", "#d9a441", "#2f5f5a", "#e6d8bd"],
  ["#2e3b30", "#3f5140", "#a8321f", "#d8b056", "#e9dcc0"],
  ["#6e3b1f", "#94522a", "#1e2a44", "#c9892f", "#ebdfc5"],
];

function rgb(hex: string): [number, number, number] {
  const c = new Color(hex);
  // DataTexture data is authored in sRGB and tagged as such.
  c.convertLinearToSRGB();
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

/** Flat-woven kilim: striped borders, stepped lozenge medallions, hooked edges. */
function kilimColor(u: number, v: number, variant: number, rng: DeterministicRng): [number, number, number] {
  const p = RUG_PALETTES[variant % RUG_PALETTES.length]!.map(rgb);
  const [ground, field, motif, accent, light] = p as [typeof p[0], typeof p[0], typeof p[0], typeof p[0], typeof p[0]];
  // Woven grid: motifs step in whole knots.
  const gx = Math.floor(u * 40) / 40;
  const gy = Math.floor(v * 80) / 80;
  const border = Math.min(gx, 1 - gx, gy * 0.5, (1 - gy) * 0.5);
  let c: [number, number, number];
  if (border < 0.035) c = ground;
  else if (border < 0.055) c = light;
  else if (border < 0.085) {
    // Running-dog border band.
    const t = (gx + gy) * 24;
    c = Math.floor(t) % 2 === 0 ? accent : ground;
  } else if (border < 0.1) c = light;
  else {
    c = field;
    const medallions = 3 + (variant % 2);
    const cy = (Math.floor(gy * medallions) + 0.5) / medallions;
    const dx = Math.abs(gx - 0.5) / 0.36;
    const dy = Math.abs(gy - cy) / (0.46 / medallions);
    const d = dx + dy;
    if (d < 1) {
      // Concentric stepped diamonds.
      const ring = Math.floor(d * 4);
      c = ring === 0 ? accent : ring === 1 ? light : ring === 2 ? motif : ground;
      if (ring === 3 && Math.abs(gx - 0.5) < 0.03) c = light;
    } else if (Math.abs(gx - 0.5) < 0.012 * (1 + (variant % 3))) {
      c = motif;
    } else if (((Math.floor(gx * 12) + Math.floor(gy * 24)) % 7 === 0) && d > 1.25) {
      c = accent;
    }
  }
  // Abrash: wool dyed in batches drifts in tone along the weave.
  const drift = 0.9 + 0.12 * Math.sin(gy * 23 + variant) + 0.06 * (rng.next() - 0.5);
  return [Math.min(255, c[0] * drift), Math.min(255, c[1] * drift), Math.min(255, c[2] * drift)];
}

function createRugAtlas(): DataTexture {
  const width = RUG_W * RUG_VARIANTS;
  const data = new Uint8Array(width * RUG_H * 4);
  for (let variant = 0; variant < RUG_VARIANTS; variant += 1) {
    const rng = new DeterministicRng(4099 + variant * 131);
    for (let y = 0; y < RUG_H; y += 1) {
      for (let x = 0; x < RUG_W; x += 1) {
        const [r, g, b] = kilimColor((x + 0.5) / RUG_W, (y + 0.5) / RUG_H, variant, rng);
        const i = (y * width + variant * RUG_W + x) * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
  }
  const texture = new DataTexture(data, width, RUG_H, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Zellige palettes: star, interlace field, grout, border. */
const TILE_PALETTES: readonly (readonly string[])[] = [
  ["#1f4e8c", "#2f8f86", "#efe8d8", "#c9892f"],
  ["#2f7a4f", "#1f4e8c", "#efe8d8", "#b8402c"],
  ["#b8402c", "#1f3f6a", "#efe8d8", "#d9a441"],
];

/** One repeat cell of an eight-point star field with grout lines, as used in zellige friezes. */
function createTileTexture(variant: number): DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const [star, fieldColor, grout, accent] = TILE_PALETTES[variant % TILE_PALETTES.length]!.map(rgb) as unknown as [number[], number[], number[], number[]];
  const rng = new DeterministicRng(733 + variant);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size - 0.5;
      const py = (y + 0.5) / size - 0.5;
      // Eight-point star: union of an axis square and a 45-degree square.
      const square = Math.max(Math.abs(px), Math.abs(py));
      const diamond = (Math.abs(px) + Math.abs(py)) / Math.SQRT2;
      const s = Math.min(square, diamond);
      // Corner quarter-stars meet at the cell edges to form cross-shaped interlace.
      const cx = 0.5 - Math.abs(px);
      const cy = 0.5 - Math.abs(py);
      const corner = Math.max(cx, cy) < 0.14 || (cx + cy) / Math.SQRT2 < 0.13;
      let c: number[];
      if (Math.abs(s - 0.27) < 0.018 || (corner && Math.abs(Math.min(Math.max(cx, cy), (cx + cy) / Math.SQRT2) - 0.12) < 0.02)) c = grout;
      else if (s < 0.27) c = s < 0.1 ? accent : star;
      else if (corner) c = accent;
      else c = fieldColor;
      // Hand-cut glaze: each piece varies slightly in tone.
      const glaze = 0.92 + 0.1 * rng.next();
      const i = (y * size + x) * 4;
      data[i] = Math.min(255, c[0]! * glaze); data[i + 1] = Math.min(255, c[1]! * glaze); data[i + 2] = Math.min(255, c[2]! * glaze); data[i + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Pierced-brass lantern skin: star and teardrop cut-outs in rows. */
function createPiercedAlpha(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = ((x + 0.5) / size) * 4 % 1 - 0.5;
      const v = ((y + 0.5) / size) * 4 % 1 - 0.5;
      const star = Math.min(Math.max(Math.abs(u), Math.abs(v)), (Math.abs(u) + Math.abs(v)) / Math.SQRT2);
      const hole = star < 0.22 && star > 0.08;
      const value = hole ? 0 : 255;
      const i = (y * size + x) * 4;
      data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = value;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

// ── Geometry helpers ────────────────────────────────────────────────

function setUvRect(g: BufferGeometry, u0: number, u1: number, v0 = 0, v1 = 1): BufferGeometry {
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return g;
}

function lathe(profile: [number, number][], segments = 16): BufferGeometry {
  return new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), segments);
}

/** Vertex colours with a small per-vertex jitter so heaped goods read as grains, not plastic. */
function jitterColor(g: BufferGeometry, color: Color, amount: number, rng: DeterministicRng): BufferGeometry {
  const geometry = g.index ? g.toNonIndexed() : g;
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const k = 1 + (rng.next() - 0.5) * amount;
    colors[i * 3] = color.r * k; colors[i * 3 + 1] = color.g * k; colors[i * 3 + 2] = color.b * k;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** Wall frame with local Y up: X along the wall, Z out into the street. */
function frameAt(center: Vec2, z: number, inward: Vec2): Matrix4 {
  return wallFrame(w(center[0], center[1], z), inward);
}

// ── Wall art ────────────────────────────────────────────────────────

function hangingRug(batches: Batches, a: WallArt): void {
  const frame = frameAt(a.center, a.zTop, a.inward);
  const rng = new DeterministicRng(a.seed);
  const u0 = a.variant / RUG_VARIANTS;
  const u1 = (a.variant + 1) / RUG_VARIANTS;
  // A hung kilim bellies slightly between its pegs.
  const plane = new PlaneGeometry(a.widthM, a.heightM, 6, 10);
  const pos = plane.getAttribute("position");
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (a.heightM / 2 - y) / a.heightM;
    pos.setZ(i, 0.035 + 0.012 * Math.sin((x / a.widthM) * Math.PI * 4 + rng.range(0, 0.4)) * t);
  }
  plane.translate(0, -a.heightM / 2 - 0.04, 0);
  plane.computeVertexNormals();
  batches.add("rug", setUvRect(plane, u0, u1), frame);
  // Fringe: a short pale band cut from the rug's light border.
  const fringe = new PlaneGeometry(a.widthM * 0.94, 0.07);
  fringe.translate(0, -a.heightM - 0.075, 0.036);
  batches.add("rug", setUvRect(fringe, u0 + (u1 - u0) * 0.45, u0 + (u1 - u0) * 0.55, 0.02, 0.03), frame);
  // Receiver: timber batten on two iron pegs.
  batches.add("timber", box(a.widthM + 0.12, 0.05, 0.05, 0, -0.02, 0.028), frame);
  for (const side of [-1, 1]) batches.add("iron", box(0.025, 0.025, 0.06, side * (a.widthM / 2 - 0.05), -0.02, 0.03), frame);
}

function sillRug(batches: Batches, a: WallArt): void {
  const frame = frameAt(a.center, a.zTop, a.inward);
  const rng = new DeterministicRng(a.seed);
  const u0 = a.variant / RUG_VARIANTS;
  const u1 = (a.variant + 1) / RUG_VARIANTS;
  // Profile (out, down): over the sill, round its nose, then hang against the wall.
  const profile: [number, number][] = [[0.0, 0.0], [0.1, 0.0], [0.145, -0.03], [0.15, -0.09]];
  const hang = a.heightM;
  for (let i = 1; i <= 8; i += 1) {
    const t = i / 8;
    profile.push([0.15 - 0.03 * t + 0.01 * Math.sin(t * 5 + rng.range(0, 1)), -0.09 - (hang - 0.09) * t]);
  }
  let total = 0;
  const lengths = [0];
  for (let i = 1; i < profile.length; i += 1) {
    total += Math.hypot(profile[i]![0] - profile[i - 1]![0], profile[i]![1] - profile[i - 1]![1]);
    lengths.push(total);
  }
  const columns = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row < profile.length - 1; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const quad = [[col, row], [col + 1, row], [col, row + 1], [col + 1, row], [col + 1, row + 1], [col, row + 1]] as const;
      for (const [c, rIndex] of quad) {
        const [out, down] = profile[rIndex]!;
        const x = (c / columns - 0.5) * a.widthM;
        positions.push(x, down, out);
        uvs.push(u0 + (c / columns) * (u1 - u0), 1 - lengths[rIndex]! / total);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  batches.add("rug", g, frame);
}

function tilePanel(batches: Batches, a: WallArt): void {
  const frame = frameAt(a.center, a.zTop - a.heightM / 2, a.inward);
  const border = 0.06;
  const innerW = a.widthM - border * 2;
  const innerH = a.heightM - border * 2;
  const plane = new PlaneGeometry(innerW, innerH);
  // Square stars: one cell per inner height, repeated along the frieze.
  setUvRect(plane, 0, innerW / innerH, 0, 1);
  plane.translate(0, 0, 0.032);
  batches.add(`tile${a.variant % TILE_PALETTES.length}`, plane, frame);
  // Carved stone surround.
  batches.add("trim", box(a.widthM, border, 0.06, 0, a.heightM / 2 - border / 2, 0.03), frame);
  batches.add("trim", box(a.widthM, border, 0.06, 0, -a.heightM / 2 + border / 2, 0.03), frame);
  batches.add("trim", box(border, innerH, 0.06, -a.widthM / 2 + border / 2, 0, 0.03), frame);
  batches.add("trim", box(border, innerH, 0.06, a.widthM / 2 - border / 2, 0, 0.03), frame);
}

/** Dished plate facing out of the wall, with engraved rings as darker bands. */
function brassPlate(batches: Batches, frame: Matrix4, x: number, y: number, radius: number, rng: DeterministicRng): void {
  const profile: [number, number][] = [[0, 0.012], [radius * 0.55, 0.012], [radius * 0.7, 0.018], [radius * 0.92, 0.03], [radius, 0.034], [radius * 0.99, 0.024], [radius * 0.9, 0.006]];
  const g = lathe(profile, 28);
  g.rotateX(Math.PI / 2);
  const geometry = g.toNonIndexed();
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const base = new Color("#d8b45c");
  const phase = rng.range(0, 1);
  for (let i = 0; i < pos.count; i += 1) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / radius;
    const band = Math.sin((r * 7 + phase) * Math.PI) > 0.72 ? 0.6 : 1;
    colors[i * 3] = base.r * band; colors[i * 3 + 1] = base.g * band; colors[i * 3 + 2] = base.b * band;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.translate(x, y, 0.012);
  batches.add("brass", geometry, frame);
  batches.add("iron", box(0.02, 0.03, 0.03, x, y + radius + 0.01, 0.015), frame);
}

function brassPlates(batches: Batches, a: WallArt): void {
  const frame = frameAt(a.center, a.zTop - a.heightM / 2, a.inward);
  const rng = new DeterministicRng(a.seed);
  brassPlate(batches, frame, 0, 0.2, 0.3, rng);
  brassPlate(batches, frame, -0.4, -0.26, 0.21, rng);
  brassPlate(batches, frame, 0.41, -0.28, 0.2, rng);
}

// ── Lanterns ───────────────────────────────────────────────────────

function lanternCluster(batches: Batches, c: LanternCluster): void {
  const frame = frameAt(c.center, c.mountZ, c.inward);
  // Wrought bracket: backplate, arm, diagonal brace and a scroll at the tip.
  batches.add("iron", box(0.12, 0.3, 0.02, 0, -0.1, 0.01), frame);
  batches.add("iron", box(0.03, 0.03, c.armM, 0, 0, c.armM / 2), frame);
  batches.add("iron", tube([new Vector3(0, -0.28, 0.02), new Vector3(0, -0.14, c.armM * 0.3), new Vector3(0, -0.02, c.armM * 0.62)], 0.012, 5), frame);
  batches.add("iron", tube([new Vector3(0, 0, c.armM), new Vector3(0, 0.06, c.armM + 0.05), new Vector3(0, 0.02, c.armM + 0.09), new Vector3(0, -0.03, c.armM + 0.05)], 0.01, 5), frame);
  for (const l of c.lanterns) {
    const top = new Vector3(0, 0, l.outM);
    const hang = new Vector3(0, -l.chainM, l.outM);
    batches.add("iron", tube(catenary(top, hang, 0, 4), 0.006, 4), frame);
    const r = l.radiusM;
    const h = l.heightM;
    const y0 = -l.chainM;
    const m = new Matrix4().makeTranslation(0, y0, l.outM);
    const place = (g: BufferGeometry): BufferGeometry => g.applyMatrix4(m);
    // Moroccan silhouette, top down: ring, onion dome, neck band, pierced
    // bulb that swells then pinches, collar and drop finial.
    const dome: [number, number][] = [[0.0, 0.0], [0.012, -0.004], [0.012, -0.03], [r * 0.35, -0.05], [r * 0.8, -h * 0.16], [r * 0.95, -h * 0.24], [r * 0.7, -h * 0.27]];
    batches.add("brass", place(lathe([...dome].reverse(), 8).rotateY(Math.PI / 8)), frame);
    const bulbTop = -h * 0.27;
    const bulbH = h * 0.56;
    const bulb: [number, number][] = [[r * 0.7, bulbTop - bulbH], [r * 0.95, bulbTop - bulbH * 0.8], [r, bulbTop - bulbH * 0.45], [r * 0.9, bulbTop - bulbH * 0.12], [r * 0.7, bulbTop]];
    const skin = lathe(bulb, 8).rotateY(Math.PI / 8);
    const uv = skin.getAttribute("uv");
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.5);
    batches.add("pierced", place(skin), frame);
    batches.tinted("glass", place(lathe(bulb.map(([x, y]) => [x * 0.84, y] as [number, number]), 8)), srgb(l.glass), frame);
    const collar: [number, number][] = [[0.0, -h * 0.97], [r * 0.25, -h * 0.9], [r * 0.55, bulbTop - bulbH - 0.01], [r * 0.72, bulbTop - bulbH + 0.005]];
    batches.add("brass", place(lathe(collar, 8).rotateY(Math.PI / 8)), frame);
    batches.add("brass", place(new SphereGeometry(0.016, 6, 4).translate(0, -h - 0.004, 0)), frame);
  }
}

// ── Counter goods ───────────────────────────────────────────────────

const SPICES = ["#b5361c", "#d99a1e", "#6e2a2a", "#8a5a2b", "#55702f", "#c85a1a", "#caa25a"];
const GRAINS = ["#c9793a", "#e5d6b0", "#efe8da", "#8a4a2a", "#9c9a52"];
const GLAZES = ["#1f4e8c", "#2f8f86", "#b8402c", "#d9a441", "#efe8d8"];

function counterGoods(batches: Batches, g: CounterGoods): void {
  const rng = new DeterministicRng(g.seed);
  const frame = frameAt([g.pos[0], g.pos[1]], g.pos[2], g.inward);
  const yaw = new Matrix4().makeRotationY(rng.range(-0.4, 0.4));
  const add = (key: string, geometry: BufferGeometry, color?: Color): void => {
    geometry.applyMatrix4(yaw);
    if (color) batches.tinted(key, geometry, color, frame);
    else batches.add(key, geometry, frame);
  };
  switch (g.kind) {
    case "spice_cone": {
      add("brass", cylinder(0.14, 0.025, 20).translate(0, 0.0125, 0));
      // Hand-packed spice pyramid, the stall's signature.
      const h = rng.range(0.24, 0.34);
      const cone = lathe([[0, h], [0.018, h - 0.012], [0.07, h * 0.5], [0.125, 0.04], [0.13, 0.025]], 18);
      batches.add("stock", jitterColor(cone.applyMatrix4(yaw), srgb(SPICES[rng.int(0, SPICES.length)]!), 0.25, rng), frame);
      break;
    }
    case "grain_sack": {
      add("sack", lathe([[0.0, 0.0], [0.15, 0.0], [0.165, 0.12], [0.16, 0.26], [0.175, 0.3], [0.19, 0.31], [0.17, 0.29]], 14));
      const heap = new SphereGeometry(0.155, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.42, 1).translate(0, 0.27, 0);
      batches.add("stock", jitterColor(heap.applyMatrix4(yaw), srgb(GRAINS[rng.int(0, GRAINS.length)]!), 0.3, rng), frame);
      break;
    }
    case "dates_basket": {
      add("sack", lathe([[0.0, 0.0], [0.11, 0.0], [0.15, 0.06], [0.165, 0.1], [0.155, 0.1]], 16), srgb("#8a6a40"));
      for (let i = 0; i < 16; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const rr = Math.sqrt(rng.next()) * 0.12;
        const date = new SphereGeometry(0.018, 6, 4).scale(1, 0.7, 1.6).rotateY(rng.range(0, 3))
          .translate(Math.cos(a) * rr, 0.095 + (0.12 - rr) * 0.25, Math.sin(a) * rr);
        add("stock", date, srgb("#3b1c0c").multiplyScalar(rng.range(0.8, 1.2)));
      }
      break;
    }
    case "jar_row": {
      for (let i = 0; i < 3; i += 1) {
        const h = rng.range(0.14, 0.2);
        const jar = lathe([[0, 0], [0.045, 0], [0.055, h * 0.3], [0.05, h * 0.85], [0.035, h * 0.92], [0.038, h]], 12).translate(-0.12 + i * 0.12, 0, 0);
        add("ceramic", jar, srgb(GLAZES[rng.int(0, GLAZES.length)]!));
        add("timber", cylinder(0.03, 0.02, 10).translate(-0.12 + i * 0.12, h + 0.01, 0));
      }
      break;
    }
    case "tea_tray": {
      add("brass", cylinder(0.2, 0.015, 24).translate(0, 0.008, 0));
      add("brass", lathe([[0, 0.015], [0.06, 0.015], [0.075, 0.1], [0.04, 0.17], [0.03, 0.24], [0.05, 0.27], [0.0, 0.3]], 14).translate(-0.06, 0, 0));
      add("brass", tube([new Vector3(-0.0, 0.1, 0), new Vector3(0.04, 0.17, 0), new Vector3(0.07, 0.24, 0)], 0.008, 5));
      for (let i = 0; i < 4; i += 1) add("glass", cylinder(0.022, 0.07, 8, 0.018).translate(0.07 + (i % 2) * 0.06, 0.05, -0.05 + Math.floor(i / 2) * 0.1), srgb("#c8742c"));
      break;
    }
    case "bowl_stack": {
      let y = 0;
      for (let i = 0; i < 3; i += 1) {
        const r = 0.13 - i * 0.012;
        add("ceramic", lathe([[0, y], [r * 0.5, y], [r, y + 0.06], [r * 0.96, y + 0.065]], 18), srgb(GLAZES[rng.int(0, GLAZES.length)]!));
        y += 0.035;
      }
      break;
    }
    case "rug_stack": {
      let y = 0;
      const layers = rng.int(3, 5);
      for (let i = 0; i < layers; i += 1) {
        const variant = rng.int(0, RUG_VARIANTS);
        const fold = new BoxGeometry(0.52, 0.06, 0.4);
        setUvRect(fold, variant / RUG_VARIANTS, (variant + 1) / RUG_VARIANTS);
        fold.translate(rng.range(-0.02, 0.02), y + 0.03, rng.range(-0.02, 0.02));
        fold.rotateY(rng.range(-0.08, 0.08));
        add("rug", fold);
        y += 0.06;
      }
      break;
    }
  }
}

// ── Materials and entry ─────────────────────────────────────────────

function marketMaterials(factory: AtmosphereMaterialFactory): Record<string, MeshStandardMaterial> {
  const { std, packed } = factory;
  const rug = std("r8_market_rug", "#ffffff", 0.95, 0, { map: createRugAtlas(), side: DoubleSide, vertexColors: false });
  const tiles = Object.fromEntries(TILE_PALETTES.map((_, i) => [
    `tile${i}`, std("r8_market_tile", "#ffffff", 0.28, 0, { map: createTileTexture(i), vertexColors: false }),
  ]));
  return {
    rug,
    ...tiles,
    trim: packed("ph_bz04_stone_trim_sandstone", "r8_market_trim_stone", "#c9b08a"),
    timber: packed("ph_bz04_weathered_brown_planks", "r8_market_timber", "#6b4f36", { tint: "#9a7a5c", tileScale: 0.6 }),
    iron: packed("ph_rusty_metal_02", "r8_market_iron", "#2e2924", { tint: "#5a5048", tileScale: 0.35, roughness: 0.75, metalness: 0.45 }),
    // Aged, hand-polished brass rather than new gilt.
    brass: std("r8_market_brass", "#ffffff", 0.42, 0.8, { color: srgb("#a8843e"), side: DoubleSide }),
    pierced: std("r8_market_lantern", "#8c6a34", 0.5, 0.75, { alphaMap: createPiercedAlpha(), alphaTest: 0.5, side: DoubleSide, vertexColors: false }),
    glass: std("r8_market_glass", "#ffffff", 0.25, 0, { emissive: srgb("#7a4a1c"), emissiveIntensity: 0.9, side: DoubleSide }),
    stock: std("r8_market_stock", "#ffffff", 1),
    ceramic: std("r8_market_ceramic", "#ffffff", 0.3),
    sack: packed("ph_hessian_230", "r8_market_sack", "#c8b08a", { tint: "#ffffff", gain: 2.2, tileScale: 0.8 }),
  };
}

const MARKET_SHADOW_CASTERS = new Set(["rug", "timber", "brass", "pierced", "iron", "stock", "sack", "ceramic", "trim"]);

export function buildMarketDressing(data: MarketDressing, factory: AtmosphereMaterialFactory): Group {
  const root = new Group();
  root.name = "r8-market";
  const batches = new Batches();
  for (const a of data.wallArt) {
    if (a.kind === "rug") hangingRug(batches, a);
    else if (a.kind === "sill_rug") sillRug(batches, a);
    else if (a.kind === "tile_panel") tilePanel(batches, a);
    else brassPlates(batches, a);
  }
  for (const c of data.lanterns) lanternCluster(batches, c);
  for (const g of data.counterGoods) counterGoods(batches, g);
  batches.build(root, marketMaterials(factory), MARKET_SHADOW_CASTERS);
  return root;
}

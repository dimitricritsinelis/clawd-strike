import {
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  BackSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { createBvhTriangleHit, GeometryBvh, type BvhTriangleHit } from "./decalSurfaceBvh";

/**
 * Finds the rendered surface a bullet strikes so its hole sits exactly on the
 * visible wall, floor or prop instead of on the gameplay collider box (which
 * can be up to metres in front of or behind the art). Also classifies the
 * surface and samples its local albedo so the hole can match it.
 */

import { DECAL_SURFACE_CLASSES, type DecalSurfaceClass } from "./bulletHoleAtlas";

export { DECAL_SURFACE_CLASSES, type DecalSurfaceClass };

type Vec3Like = { x: number; y: number; z: number };

// Labels are split into lowercase words ("bz10_textile_sand-cast" ->
// bz, textile, sand, cast) and matched by word prefix, so "environment" never
// reads as iron nor "textile" as tile. The first matching rule wins: zone
// words ("rug", "textile") appear in facade names, so explicit material words
// are checked before the softer ones.
type SurfaceRule = { surface: DecalSurfaceClass | null; prefixes: readonly string[]; words?: readonly string[] };

const SURFACE_RULES: readonly SurfaceRule[] = [
  {
    surface: null,
    prefixes: ["frond", "leaf", "leaves", "foliage", "grass", "cable", "wire", "rope", "water", "bath", "contact", "stain", "damp", "accumulation", "shadow", "decal"],
    words: ["plant", "plants"],
  },
  { surface: "glass", prefixes: ["glass", "lens"] },
  {
    surface: "metal",
    prefixes: ["metal", "iron", "steel", "brass", "bronze", "copper", "tank", "pipe", "grille", "rebar", "appliance", "spout", "lantern", "chain", "hinge", "rust"],
  },
  {
    surface: "wood",
    prefixes: ["timber", "wood", "plank", "pine", "crate", "barrel", "door", "shutter", "worktop", "beam", "slat", "lattice", "stool", "bench", "trunk", "crown"],
  },
  {
    surface: "masonry",
    prefixes: ["plaster", "stone", "sand", "lime", "ochre", "earth", "brick", "paving", "flag", "tile", "concrete", "ceramic", "porcelain", "stoneware", "soil", "coping", "clay", "mud", "planter"],
    words: ["red", "pot"],
  },
  {
    surface: "soft",
    prefixes: ["cloth", "linen", "fabric", "rug", "carpet", "tarp", "awning", "canvas", "sack", "wicker", "basket", "cushion", "pillow", "grain", "stock", "woven"],
  },
];

/**
 * Surface class for a material label, or null for surfaces that should never
 * carry a hole: foliage, ropes and cables (too thin), water, and transparent
 * overlays such as contact shadows, stains and sand drifts.
 */
export function classifyDecalSurfaceLabel(label: string): DecalSurfaceClass | null {
  const words = label.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const rule of SURFACE_RULES) {
    for (const word of words) {
      if (rule.words?.includes(word) || rule.prefixes.some((prefix) => word.startsWith(prefix))) {
        return rule.surface;
      }
    }
  }
  return "masonry";
}

function materialLabel(material: Material, object: Object3D): string {
  const data = material.userData as Record<string, unknown>;
  const ids = [data.kitPbrMaterialId, data.wallDetailPbrMaterialId, data.propModelId]
    .filter((value): value is string => typeof value === "string");
  return [material.name, ...ids, object.name].join(" ");
}

function classifyMaterial(material: Material, object: Object3D): DecalSurfaceClass | null {
  if (!material.visible || material.colorWrite === false) return null;
  if (object.userData.noBulletDecals === true || material.userData.noBulletDecals === true) return null;
  if (material.transparent && material.opacity < 0.6) return null;
  return classifyDecalSurfaceLabel(materialLabel(material, object));
}

type SurfaceEntry = {
  object: Mesh;
  instanceId: number | null;
  geometry: BufferGeometry;
  materials: Material[];
  classes: (DecalSurfaceClass | null)[];
  matrix: Matrix4;
  inverse: Matrix4;
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
};

export type DecalSurfaceHit = {
  distance: number;
  point: Vector3;
  /** Unit geometric normal, facing back toward the shooter. */
  normal: Vector3;
  /** Unit world direction of the surface texture's U axis (grain), or zero. */
  tangent: Vector3;
  surface: DecalSurfaceClass;
  /** Linear-space albedo of the struck surface at the hit point. */
  color: Color;
  objectName: string;
};

export function createDecalSurfaceHit(): DecalSurfaceHit {
  return {
    distance: 0,
    point: new Vector3(),
    normal: new Vector3(0, 0, 1),
    tangent: new Vector3(),
    surface: "masonry",
    color: new Color(1, 1, 1),
    objectName: "",
  };
}

type SampledTexture = { width: number; height: number; data: Uint8ClampedArray } | null;

const TEXTURE_SAMPLE_SIZE = 64;
const MAX_SKIP_ITERATIONS = 6;
const SKIP_EPSILON_M = 1e-4;

const _box = new Box3();
const _instanceMatrix = new Matrix4();
const _instanceColor = new Color();
const _texel = new Color();
const _uv = new Vector3();
const _triHit: BvhTriangleHit = createBvhTriangleHit();
const _bestHit: BvhTriangleHit = createBvhTriangleHit();
const _candidates: { near: number; entry: SurfaceEntry }[] = [];
const _probeHit = createDecalSurfaceHit();

function isVisibleInHierarchy(object: Object3D): boolean {
  let node: Object3D | null = object;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}

export class BulletDecalSurfaces {
  readonly roots: readonly Object3D[];
  private readonly entries: SurfaceEntry[] = [];
  private readonly bvhs = new Map<BufferGeometry, GeometryBvh | null>();
  private readonly pendingGeometries: BufferGeometry[] = [];
  private readonly textureSamples = new Map<Texture, SampledTexture>();
  private sampleCanvas: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null | undefined;

  constructor(roots: readonly Object3D[]) {
    this.roots = roots;
    for (const root of roots) {
      root.updateMatrixWorld(true);
      root.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh || !mesh.geometry || !isVisibleInHierarchy(mesh)) return;
        this.addMesh(mesh);
      });
    }
    const seen = new Set<BufferGeometry>();
    for (const entry of this.entries) {
      if (seen.has(entry.geometry)) continue;
      seen.add(entry.geometry);
      this.pendingGeometries.push(entry.geometry);
    }
    // Biggest geometries first: they are the most likely to be struck and the
    // most expensive to build on demand.
    this.pendingGeometries.sort((a, b) => triangleCountOf(b) - triangleCountOf(a));
  }

  get entryCount(): number {
    return this.entries.length;
  }

  get pendingBuildCount(): number {
    return this.pendingGeometries.length;
  }

  private addMesh(mesh: Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const classes = materials.map((material) => (material ? classifyMaterial(material, mesh) : null));
    if (classes.every((surface) => surface === null)) return;
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return;

    if (mesh instanceof InstancedMesh) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, _instanceMatrix);
        this.pushEntry(mesh, i, geometry, materials, classes, new Matrix4().multiplyMatrices(mesh.matrixWorld, _instanceMatrix));
      }
      return;
    }
    this.pushEntry(mesh, null, geometry, materials, classes, mesh.matrixWorld.clone());
  }

  private pushEntry(
    object: Mesh,
    instanceId: number | null,
    geometry: BufferGeometry,
    materials: Material[],
    classes: (DecalSurfaceClass | null)[],
    matrix: Matrix4,
  ): void {
    // Zero-scale instances are hidden slots; they cannot be struck.
    if (Math.abs(matrix.determinant()) < 1e-12) return;
    _box.copy(geometry.boundingBox!).applyMatrix4(matrix);
    this.entries.push({
      object,
      instanceId,
      geometry,
      materials,
      classes,
      matrix,
      inverse: matrix.clone().invert(),
      minX: _box.min.x, minY: _box.min.y, minZ: _box.min.z,
      maxX: _box.max.x, maxY: _box.max.y, maxZ: _box.max.z,
    });
  }

  private bvhFor(geometry: BufferGeometry): GeometryBvh | null {
    let bvh = this.bvhs.get(geometry);
    if (bvh === undefined) {
      bvh = GeometryBvh.fromGeometry(geometry);
      this.bvhs.set(geometry, bvh);
    }
    return bvh;
  }

  /**
   * Builds pending BVHs until the time budget is spent so on-demand builds
   * rarely stall a shot. Returns true once every geometry is ready.
   */
  prebuild(budgetMs: number): boolean {
    const start = performance.now();
    while (this.pendingGeometries.length > 0) {
      const geometry = this.pendingGeometries.pop()!;
      this.bvhFor(geometry);
      if (performance.now() - start >= budgetMs) break;
    }
    return this.pendingGeometries.length === 0;
  }

  /**
   * Nearest decal-receiving surface along a unit direction within [near, far].
   * Excluded materials and faces culled by the material side are passed through.
   */
  raycast(
    origin: Vec3Like,
    direction: Vec3Like,
    near: number,
    far: number,
    out: DecalSurfaceHit,
    resolveAppearance = true,
  ): boolean {
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dx = direction.x, dy = direction.y, dz = direction.z;
    const invX = 1 / (dx === 0 ? 1e-12 : dx);
    const invY = 1 / (dy === 0 ? 1e-12 : dy);
    const invZ = 1 / (dz === 0 ? 1e-12 : dz);

    _candidates.length = 0;
    for (const entry of this.entries) {
      let t0 = (entry.minX - ox) * invX;
      let t1 = (entry.maxX - ox) * invX;
      let tNear = Math.min(t0, t1);
      let tFar = Math.max(t0, t1);
      t0 = (entry.minY - oy) * invY;
      t1 = (entry.maxY - oy) * invY;
      tNear = Math.max(tNear, Math.min(t0, t1));
      tFar = Math.min(tFar, Math.max(t0, t1));
      t0 = (entry.minZ - oz) * invZ;
      t1 = (entry.maxZ - oz) * invZ;
      tNear = Math.max(tNear, Math.min(t0, t1));
      tFar = Math.min(tFar, Math.max(t0, t1));
      if (!(tFar >= tNear) || tFar < near || tNear > far) continue;
      _candidates.push({ near: Math.max(tNear, near), entry });
    }
    _candidates.sort((a, b) => a.near - b.near);

    let best = far;
    let bestEntry: SurfaceEntry | null = null;
    for (const candidate of _candidates) {
      if (candidate.near > best) break;
      const entry = candidate.entry;
      if (this.raycastEntry(entry, ox, oy, oz, dx, dy, dz, near, best)) {
        best = _triHit.t;
        bestEntry = entry;
        _bestHit.t = _triHit.t;
        _bestHit.triangle = _triHit.triangle;
        _bestHit.u = _triHit.u;
        _bestHit.v = _triHit.v;
        _bestHit.frontFacing = _triHit.frontFacing;
      }
    }
    _candidates.length = 0;
    if (!bestEntry) return false;
    this.resolveHit(bestEntry, _bestHit, ox, oy, oz, dx, dy, dz, out, resolveAppearance);
    return true;
  }

  private raycastEntry(
    entry: SurfaceEntry,
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    near: number, far: number,
  ): boolean {
    const bvh = this.bvhFor(entry.geometry);
    if (!bvh) return false;
    const e = entry.inverse.elements;
    const lox = e[0]! * ox + e[4]! * oy + e[8]! * oz + e[12]!;
    const loy = e[1]! * ox + e[5]! * oy + e[9]! * oz + e[13]!;
    const loz = e[2]! * ox + e[6]! * oy + e[10]! * oz + e[14]!;
    // Unnormalized local direction keeps t in world metres.
    const ldx = e[0]! * dx + e[4]! * dy + e[8]! * dz;
    const ldy = e[1]! * dx + e[5]! * dy + e[9]! * dz;
    const ldz = e[2]! * dx + e[6]! * dy + e[10]! * dz;

    let tMin = near;
    for (let iteration = 0; iteration < MAX_SKIP_ITERATIONS; iteration++) {
      if (!bvh.raycast(lox, loy, loz, ldx, ldy, ldz, tMin, far, _triHit)) return false;
      const materialIndex = this.materialIndexFor(entry, _triHit.triangle);
      const material = entry.materials[materialIndex];
      const surface = entry.classes[materialIndex] ?? null;
      const side = material?.side;
      const culled = side === DoubleSide ? false : side === BackSide ? _triHit.frontFacing : !_triHit.frontFacing;
      if (surface !== null && !culled) return true;
      tMin = _triHit.t + SKIP_EPSILON_M;
    }
    return false;
  }

  private materialIndexFor(entry: SurfaceEntry, triangle: number): number {
    const groups = entry.geometry.groups;
    if (entry.materials.length <= 1 || groups.length === 0) return 0;
    const start = triangle * 3;
    for (const group of groups) {
      if (start >= group.start && start < group.start + group.count) {
        return group.materialIndex ?? 0;
      }
    }
    return 0;
  }

  private resolveHit(
    entry: SurfaceEntry,
    hit: BvhTriangleHit,
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    out: DecalSurfaceHit,
    resolveAppearance: boolean,
  ): void {
    const bvh = this.bvhs.get(entry.geometry)!;
    const tri = hit.triangle;
    const a = bvh.triangleVertices[tri * 3]!;
    const b = bvh.triangleVertices[tri * 3 + 1]!;
    const c = bvh.triangleVertices[tri * 3 + 2]!;
    const p = bvh.positions;
    const e1x = p[b * 3]! - p[a * 3]!, e1y = p[b * 3 + 1]! - p[a * 3 + 1]!, e1z = p[b * 3 + 2]! - p[a * 3 + 2]!;
    const e2x = p[c * 3]! - p[a * 3]!, e2y = p[c * 3 + 1]! - p[a * 3 + 1]!, e2z = p[c * 3 + 2]! - p[a * 3 + 2]!;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    // Normal matrix = transpose(inverse(M)).
    const inv = entry.inverse.elements;
    out.normal.set(
      inv[0]! * nx + inv[1]! * ny + inv[2]! * nz,
      inv[4]! * nx + inv[5]! * ny + inv[6]! * nz,
      inv[8]! * nx + inv[9]! * ny + inv[10]! * nz,
    ).normalize();
    if (out.normal.x * dx + out.normal.y * dy + out.normal.z * dz > 0) out.normal.negate();

    out.distance = hit.t;
    out.point.set(ox + dx * hit.t, oy + dy * hit.t, oz + dz * hit.t);
    const materialIndex = this.materialIndexFor(entry, tri);
    out.surface = entry.classes[materialIndex] ?? "masonry";
    out.objectName = entry.object.name;
    if (!resolveAppearance) return;

    this.resolveTangent(entry, a, b, c, e1x, e1y, e1z, e2x, e2y, e2z, out);
    this.sampleColor(entry, entry.materials[materialIndex], a, b, c, hit.u, hit.v, out.color);
  }

  private resolveTangent(
    entry: SurfaceEntry,
    a: number, b: number, c: number,
    e1x: number, e1y: number, e1z: number,
    e2x: number, e2y: number, e2z: number,
    out: DecalSurfaceHit,
  ): void {
    out.tangent.set(0, 0, 0);
    const uv = entry.geometry.getAttribute("uv");
    if (!uv) return;
    const du1 = uv.getX(b) - uv.getX(a);
    const dv1 = uv.getY(b) - uv.getY(a);
    const du2 = uv.getX(c) - uv.getX(a);
    const dv2 = uv.getY(c) - uv.getY(a);
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) return;
    const tx = (e1x * dv2 - e2x * dv1) / det;
    const ty = (e1y * dv2 - e2y * dv1) / det;
    const tz = (e1z * dv2 - e2z * dv1) / det;
    const m = entry.matrix.elements;
    out.tangent.set(
      m[0]! * tx + m[4]! * ty + m[8]! * tz,
      m[1]! * tx + m[5]! * ty + m[9]! * tz,
      m[2]! * tx + m[6]! * ty + m[10]! * tz,
    );
    // Project into the surface plane.
    out.tangent.addScaledVector(out.normal, -out.tangent.dot(out.normal));
    if (out.tangent.lengthSq() < 1e-12) {
      out.tangent.set(0, 0, 0);
      return;
    }
    out.tangent.normalize();
  }

  private sampleColor(
    entry: SurfaceEntry,
    material: Material | undefined,
    a: number, b: number, c: number,
    u: number, v: number,
    out: Color,
  ): void {
    const w0 = 1 - u - v;
    const record = material as (Material & { color?: Color; map?: Texture | null; vertexColors?: boolean }) | undefined;
    if (record?.color instanceof Color) out.copy(record.color);
    else out.setRGB(1, 1, 1);

    const map = record?.map ?? null;
    if (map) {
      const channelName = map.channel > 0 ? `uv${map.channel}` : "uv";
      const uvAttr = entry.geometry.getAttribute(channelName);
      if (uvAttr && this.sampleTexture(
        map,
        uvAttr.getX(a) * w0 + uvAttr.getX(b) * u + uvAttr.getX(c) * v,
        uvAttr.getY(a) * w0 + uvAttr.getY(b) * u + uvAttr.getY(c) * v,
        _texel,
      )) {
        out.multiply(_texel);
      }
    }

    if (record?.vertexColors) {
      const colors = entry.geometry.getAttribute("color");
      if (colors) {
        out.r *= colors.getX(a) * w0 + colors.getX(b) * u + colors.getX(c) * v;
        out.g *= colors.getY(a) * w0 + colors.getY(b) * u + colors.getY(c) * v;
        out.b *= colors.getZ(a) * w0 + colors.getZ(b) * u + colors.getZ(c) * v;
      }
    }

    const mesh = entry.object;
    if (entry.instanceId !== null && mesh instanceof InstancedMesh && mesh.instanceColor) {
      mesh.getColorAt(entry.instanceId, _instanceColor);
      out.multiply(_instanceColor);
    }
  }

  private sampleTexture(texture: Texture, u: number, v: number, out: Color): boolean {
    let sampled = this.textureSamples.get(texture);
    if (sampled === undefined) {
      sampled = this.downsampleTexture(texture);
      this.textureSamples.set(texture, sampled);
    }
    if (!sampled) return false;

    _uv.set(u, v, 1).applyMatrix3(texture.matrix);
    let su = _uv.x - Math.floor(_uv.x);
    let sv = _uv.y - Math.floor(_uv.y);
    if (texture.flipY) sv = 1 - sv;
    su = Math.min(sampled.width - 1, Math.max(0, Math.floor(su * sampled.width)));
    sv = Math.min(sampled.height - 1, Math.max(0, Math.floor(sv * sampled.height)));

    // 3x3 box around the texel: the hole should match the local tone, not a
    // single mortar line or speck.
    let r = 0, g = 0, bl = 0, n = 0;
    for (let y = -1; y <= 1; y++) {
      const row = (sv + y + sampled.height) % sampled.height;
      for (let x = -1; x <= 1; x++) {
        const col = (su + x + sampled.width) % sampled.width;
        const i = (row * sampled.width + col) * 4;
        r += sampled.data[i]!;
        g += sampled.data[i + 1]!;
        bl += sampled.data[i + 2]!;
        n++;
      }
    }
    out.setRGB(r / (n * 255), g / (n * 255), bl / (n * 255), SRGBColorSpace);
    return true;
  }

  private downsampleTexture(texture: Texture): SampledTexture {
    const image = texture.image as (CanvasImageSource & { width?: number; height?: number }) | null | undefined;
    if (!image || (texture as Texture & { isCompressedTexture?: boolean }).isCompressedTexture) return null;
    if (typeof document === "undefined") return null;
    if (!(
      (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
      || (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement)
      || (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement)
    )) {
      return null;
    }
    if (this.sampleCanvas === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = TEXTURE_SAMPLE_SIZE;
      canvas.height = TEXTURE_SAMPLE_SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      this.sampleCanvas = ctx ? { canvas, ctx } : null;
    }
    if (!this.sampleCanvas) return null;
    const { ctx } = this.sampleCanvas;
    try {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, TEXTURE_SAMPLE_SIZE, TEXTURE_SAMPLE_SIZE);
      ctx.drawImage(image, 0, 0, TEXTURE_SAMPLE_SIZE, TEXTURE_SAMPLE_SIZE);
      const pixels = ctx.getImageData(0, 0, TEXTURE_SAMPLE_SIZE, TEXTURE_SAMPLE_SIZE);
      return { width: TEXTURE_SAMPLE_SIZE, height: TEXTURE_SAMPLE_SIZE, data: pixels.data };
    } catch {
      return null;
    }
  }

  /**
   * True when every probe point on a ring of `radius` around `center` lands
   * on surface that is flush with the hole or stands proud of it. Proud
   * neighbours (a stone, trim or post) simply occlude part of the decal
   * through the depth test; only surface that falls away (an outside corner,
   * a column's curve, the lip of a step, open air) would leave the decal
   * hanging, so those shrink it.
   */
  ringIsSupported(center: Vector3, normal: Vector3, tangent: Vector3, bitangent: Vector3, radius: number, probes: number): boolean {
    const lift = 0.15;
    const recessTolerance = 0.02;
    for (let i = 0; i < probes; i++) {
      const angle = (i / probes) * Math.PI * 2;
      const cos = Math.cos(angle) * radius;
      const sin = Math.sin(angle) * radius;
      const origin = {
        x: center.x + tangent.x * cos + bitangent.x * sin + normal.x * lift,
        y: center.y + tangent.y * cos + bitangent.y * sin + normal.y * lift,
        z: center.z + tangent.z * cos + bitangent.z * sin + normal.z * lift,
      };
      const direction = { x: -normal.x, y: -normal.y, z: -normal.z };
      if (!this.raycast(origin, direction, 0, lift + recessTolerance, _probeHit, false)) return false;
      const flush = _probeHit.distance > lift - recessTolerance;
      // A flush hit that is steeply turned away is a bevel or curve edge.
      if (flush && _probeHit.normal.dot(normal) < 0.7) return false;
    }
    return true;
  }
}

function triangleCountOf(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  return (index ? index.count : position?.count ?? 0) / 3;
}

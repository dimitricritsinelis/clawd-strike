import {
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Material,
  type Object3D,
  type Side,
  Vector3,
} from "three";

/**
 * Coplanar surface arbitration for the assembled map.
 *
 * Section GLBs, roof bundles, procedural walls and props are authored
 * independently, so neighbours sometimes model the same face: a shared wall
 * end, a roof parapet over a facade, a base course a few millimetres proud of
 * its wall. Two same-facing surfaces that close together z-fight: the depth
 * test flips between their textures per pixel and the pattern crawls as the
 * camera moves.
 *
 * After the world is built, this pass finds overlapping same-facing opaque
 * triangles within MAX_SEPARATION_M of each other and clips the covered part
 * out of the losing triangle. The surface in front wins; for exactly
 * coincident faces the smaller (detail) triangle wins over the larger (base)
 * one. Only render geometry changes. Colliders are separate.
 */

const MAX_SEPARATION_M = 0.0065;
const FRONT_EPSILON_M = 0.0003;
const MIN_TRIANGLE_AREA_M2 = 1e-5;
const MIN_OVERLAP_M2 = 1e-6;
const MIN_PIECE_AREA_M2 = 1e-8;
const NORMAL_BINS = 64;
const NORMAL_SPAN = NORMAL_BINS * 2 + 1;
const PLANE_BIN_M = 0.005;
const PLANE_BIN_OFFSET = 1 << 20;
const PLANE_BIN_SPAN = 1 << 21;
const PLANE_NEIGHBOUR_BINS = Math.ceil(MAX_SEPARATION_M / PLANE_BIN_M);
const GRID_CELL_M = 1;
const GRID_OFFSET = 4096;
const GRID_SPAN = 8192;
/** Coarse plane-local cells that decide which triangles are contested at all. */
const COARSE_CELL_M = 2;
const COARSE_OFFSET = 128;
const COARSE_SPAN = 256;
/** Plane keys stay below 2^43; the modulus keeps key × cells inside 2^53. Collisions only over-select. */
const COARSE_PLANE_MODULUS = 2 ** 36;

export type CoplanarResolveStats = {
  surfaces: number;
  trianglesScanned: number;
  contestedTriangles: number;
  conflicts: number;
  unresolvedConflicts: number;
  trianglesRemoved: number;
  trianglesClipped: number;
  trianglesAdded: number;
  meshesRewritten: number;
  instancesExtracted: number;
  shadowProxies: number;
  elapsedMs: number;
};

type Surface = {
  mesh: Mesh;
  start: number;
  end: number;
  canLose: boolean;
  castsShadow: boolean;
  instanced: boolean;
  /** First owner id; instance k of an InstancedMesh is owner `ownerBase + k`. */
  ownerBase: number;
};

type Point2 = readonly [number, number];
type Polygon = readonly Point2[];

type Tri = {
  surface: number;
  /** Surface and instance together: two instances of one mesh can overlap. */
  owner: number;
  instance: number;
  /** First index-buffer slot of the triangle (first vertex when non-indexed). */
  slot: number;
  d: number;
  area: number;
  axis: 0 | 1 | 2;
  /** Projected world vertices in index order. */
  p0: Point2;
  p1: Point2;
  p2: Point2;
  /** Counter-clockwise copy for clipping. */
  ccw: Polygon;
  minU: number;
  minV: number;
  maxU: number;
  maxV: number;
};

type LoserEntry = { tri: Tri; covers: Polygon[]; shadowHole: boolean };
type Bucket = { tris: Tri[]; grid: Map<number, number[]> | null };

function isOpaqueMaterial(material: Material): boolean {
  const m = material as Material & { alphaMap?: unknown };
  return !m.transparent
    && m.alphaTest <= 0
    && !m.alphaMap
    && m.opacity >= 1
    && m.visible
    && m.colorWrite !== false
    && m.depthTest !== false
    && m.depthWrite !== false
    && !m.polygonOffset;
}

function isVisibleWithin(object: Object3D, roots: ReadonlySet<Object3D>): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
    if (roots.has(node)) return true;
  }
  return true;
}

function collectSurfaces(roots: readonly Object3D[]): Surface[] {
  const surfaces: Surface[] = [];
  let owners = 0;
  const rootSet = new Set(roots);
  for (const root of roots) {
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
      if (!isVisibleWithin(mesh, rootSet)) return;
      const geometry = mesh.geometry as BufferGeometry | undefined;
      const position = geometry?.getAttribute("position");
      if (!geometry || !position || position.itemSize !== 3) return;
      const count = geometry.index ? geometry.index.count : position.count;
      const hasMorphs = Object.keys(geometry.morphAttributes).length > 0;
      const instanced = (mesh as InstancedMesh).isInstancedMesh === true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const groups = geometry.groups.length > 0 ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
      for (const group of groups) {
        const material = materials[group.materialIndex ?? 0];
        if (!material || !isOpaqueMaterial(material)) continue;
        surfaces.push({
          mesh,
          start: group.start,
          end: Math.min(count, group.start + group.count),
          // Morph targets cannot lose area without opening a hole elsewhere.
          // Two-sided section materials are glTF export defaults on closed
          // solids, so they may lose area.
          // A losing instance is lifted into its own mesh and clipped there.
          canLose: !hasMorphs,
          castsShadow: mesh.castShadow,
          instanced,
          ownerBase: owners,
        });
        owners += instanced ? (mesh as InstancedMesh).count : 1;
      }
    });
  }
  return surfaces;
}

/** World-space vertex positions per instance (one entry for a plain mesh), cached per mesh. */
function worldPositions(mesh: Mesh, cache: Map<Mesh, Float32Array[]>): Float32Array[] {
  const cached = cache.get(mesh);
  if (cached) return cached;
  const position = (mesh.geometry as BufferGeometry).getAttribute("position");
  const local = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    local[i * 3] = position.getX(i);
    local[i * 3 + 1] = position.getY(i);
    local[i * 3 + 2] = position.getZ(i);
  }
  const matrices: Matrix4[] = [];
  const instanced = mesh as InstancedMesh;
  if (instanced.isInstancedMesh) {
    const instance = new Matrix4();
    for (let i = 0; i < instanced.count; i += 1) {
      instanced.getMatrixAt(i, instance);
      matrices.push(new Matrix4().multiplyMatrices(mesh.matrixWorld, instance));
    }
  } else {
    matrices.push(mesh.matrixWorld);
  }
  const out = matrices.map((matrix) => {
    const e = matrix.elements;
    const m0 = e[0]!, m1 = e[1]!, m2 = e[2]!, m4 = e[4]!, m5 = e[5]!, m6 = e[6]!;
    const m8 = e[8]!, m9 = e[9]!, m10 = e[10]!, m12 = e[12]!, m13 = e[13]!, m14 = e[14]!;
    const world = new Float32Array(local.length);
    for (let i = 0; i < local.length; i += 3) {
      const x = local[i]!, y = local[i + 1]!, z = local[i + 2]!;
      world[i] = m0 * x + m4 * y + m8 * z + m12;
      world[i + 1] = m1 * x + m5 * y + m9 * z + m13;
      world[i + 2] = m2 * x + m6 * y + m10 * z + m14;
    }
    return world;
  });
  cache.set(mesh, out);
  return out;
}

/** Visits each triangle as nine world coordinates (a, b, c). */
type TriangleVisitor = (slot: number, instance: number, v: Float64Array) => void;

function forEachWorldTriangle(surface: Surface, instances: readonly Float32Array[], visit: TriangleVisitor): void {
  const index = (surface.mesh.geometry as BufferGeometry).index;
  const indices = index ? (index.array as ArrayLike<number>) : null;
  const v = new Float64Array(9);
  instances.forEach((world, instance) => {
    for (let slot = surface.start; slot + 2 < surface.end; slot += 3) {
      for (let k = 0; k < 3; k += 1) {
        const vertex = (indices ? indices[slot + k]! : slot + k) * 3;
        v[k * 3] = world[vertex]!;
        v[k * 3 + 1] = world[vertex + 1]!;
        v[k * 3 + 2] = world[vertex + 2]!;
      }
      visit(slot, instance, v);
    }
  });
}

function polygonArea(points: Polygon): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area * 0.5;
}

/** Keeps the part of a convex polygon on the left of a→b, or on the right when `keepLeft` is false. */
function clipHalfPlane(points: Polygon, a: Point2, b: Point2, keepLeft: boolean): Point2[] {
  const out: Point2[] = [];
  const side = (p: Point2): number => {
    const s = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    return keepLeft ? s : -s;
  };
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

function intersectConvex(subject: Polygon, clip: Polygon): Polygon {
  let out: Polygon = subject;
  for (let i = 0; i < clip.length && out.length > 0; i += 1) {
    out = clipHalfPlane(out, clip[i]!, clip[(i + 1) % clip.length]!, true);
  }
  return out;
}

/** Convex pieces of `subject` that lie outside the convex counter-clockwise `hole`. */
function subtractConvexPolygon(subject: Polygon, hole: Polygon): Polygon[] {
  const pieces: Polygon[] = [];
  let rest: Polygon = subject;
  for (let i = 0; i < hole.length && rest.length >= 3; i += 1) {
    const a = hole[i]!;
    const b = hole[(i + 1) % hole.length]!;
    const outside = clipHalfPlane(rest, a, b, false);
    if (outside.length >= 3 && polygonArea(outside) > MIN_PIECE_AREA_M2) pieces.push(outside);
    rest = clipHalfPlane(rest, a, b, true);
  }
  return pieces;
}

function projectTriangle(surface: number, owner: number, instance: number, slot: number, v: Float64Array, axis: 0 | 1 | 2, d: number, area: number): Tri {
  const i = (axis + 1) % 3;
  const j = (axis + 2) % 3;
  const p0: Point2 = [v[i]!, v[j]!];
  const p1: Point2 = [v[3 + i]!, v[3 + j]!];
  const p2: Point2 = [v[6 + i]!, v[6 + j]!];
  return {
    surface, owner, instance, slot, d, area, axis, p0, p1, p2,
    ccw: polygonArea([p0, p1, p2]) >= 0 ? [p0, p1, p2] : [p0, p2, p1],
    minU: Math.min(p0[0], p1[0], p2[0]),
    minV: Math.min(p0[1], p1[1], p2[1]),
    maxU: Math.max(p0[0], p1[0], p2[0]),
    maxV: Math.max(p0[1], p1[1], p2[1]),
  };
}

function gridKey(u: number, v: number): number {
  return (u + GRID_OFFSET) * GRID_SPAN + (v + GRID_OFFSET);
}

function bucketGrid(bucket: Bucket): Map<number, number[]> {
  if (bucket.grid) return bucket.grid;
  const grid = new Map<number, number[]>();
  bucket.tris.forEach((tri, index) => {
    for (let u = Math.floor(tri.minU / GRID_CELL_M); u <= Math.floor(tri.maxU / GRID_CELL_M); u += 1) {
      for (let v = Math.floor(tri.minV / GRID_CELL_M); v <= Math.floor(tri.maxV / GRID_CELL_M); v += 1) {
        const cell = grid.get(gridKey(u, v));
        if (cell) cell.push(index);
        else grid.set(gridKey(u, v), [index]);
      }
    }
  });
  bucket.grid = grid;
  return grid;
}

/**
 * True when `a` should stay visible over `b`, or null for flush faces that
 * need a per-surface-pair decision.
 */
function beats(a: Tri, b: Tri, surfaces: readonly Surface[]): boolean | null {
  const separation = a.d - b.d;
  if (separation > FRONT_EPSILON_M) return true;
  if (separation < -FRONT_EPSILON_M) return false;
  const sa = surfaces[a.surface]!;
  const sb = surfaces[b.surface]!;
  if (sa.canLose !== sb.canLose) return !sa.canLose;
  // Clipping a plain mesh is cheaper than lifting an instance out.
  if (sa.instanced !== sb.instanced) return sa.instanced;
  return null;
}

/** World-space triangles, by material side, that must keep casting shadows. */
type ShadowTriangles = Map<Side, number[]>;

function rebuildGeometry(mesh: Mesh, entries: readonly LoserEntry[], stats: CoplanarResolveStats, shadows: ShadowTriangles): void {
  const source = mesh.geometry as BufferGeometry;
  const sourcePosition = source.getAttribute("position");
  const count = source.index ? source.index.count : sourcePosition.count;
  const indexOf = (slot: number): number => (source.index ? source.index.getX(slot) : slot);
  const bySlot = new Map<number, LoserEntry>();
  for (const entry of entries) bySlot.set(entry.tri.slot, entry);

  const names = Object.keys(source.attributes);
  const attributes = names.map((name) => source.getAttribute(name));
  const added: number[][] = names.map(() => []);
  let vertexCount = sourcePosition.count;
  const addVertex = (i0: number, i1: number, i2: number, w0: number, w1: number, w2: number): number => {
    attributes.forEach((attribute, a) => {
      const name = names[a];
      const values: number[] = [];
      for (let c = 0; c < attribute.itemSize; c += 1) {
        values.push(attribute.getComponent(i0, c) * w0 + attribute.getComponent(i1, c) * w1 + attribute.getComponent(i2, c) * w2);
      }
      if ((name === "normal" || name === "tangent") && values.length >= 3) {
        const length = Math.hypot(values[0]!, values[1]!, values[2]!) || 1;
        for (let c = 0; c < 3; c += 1) values[c] = values[c]! / length;
        if (name === "tangent" && values.length === 4) values[3] = attribute.getComponent(i0, 3);
      }
      added[a]!.push(...values);
    });
    return vertexCount++;
  };

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const corner = new Vector3();
  const newIndex: number[] = [];
  const groups = source.groups.length > 0 ? source.groups : [{ start: 0, count, materialIndex: 0 }];
  const newGroups: { start: number; count: number; materialIndex: number | undefined }[] = [];
  for (const group of groups) {
    const groupStart = newIndex.length;
    const end = Math.min(count, group.start + group.count);
    for (let slot = group.start; slot + 2 < end; slot += 3) {
      const i0 = indexOf(slot);
      const i1 = indexOf(slot + 1);
      const i2 = indexOf(slot + 2);
      const entry = bySlot.get(slot);
      if (!entry) {
        newIndex.push(i0, i1, i2);
        continue;
      }
      let pieces: Polygon[] = [entry.tri.ccw];
      for (const cover of entry.covers) {
        const next: Polygon[] = [];
        for (const piece of pieces) {
          if (polygonArea(intersectConvex(piece, cover)) <= MIN_PIECE_AREA_M2) next.push(piece);
          else next.push(...subtractConvexPolygon(piece, cover));
        }
        pieces = next;
      }
      const { p0, p1, p2 } = entry.tri;
      const signedArea = polygonArea([p0, p1, p2]);
      const remaining = pieces.reduce((sum, piece) => sum + polygonArea(piece), 0);
      if (Math.abs(signedArea) - remaining <= MIN_OVERLAP_M2) {
        newIndex.push(i0, i1, i2);
        continue;
      }
      if (entry.shadowHole) {
        const side = materials[group.materialIndex ?? 0]?.side ?? FrontSide;
        const target = shadows.get(side) ?? [];
        shadows.set(side, target);
        for (const i of [i0, i1, i2]) {
          corner.fromBufferAttribute(sourcePosition, i).applyMatrix4(mesh.matrixWorld);
          target.push(corner.x, corner.y, corner.z);
        }
      }
      if (pieces.length === 0) {
        stats.trianglesRemoved += 1;
        continue;
      }
      stats.trianglesClipped += 1;
      // Barycentric weights against the original projected triangle carry
      // every attribute (UVs, normals, colours) across unchanged.
      const det = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]);
      const reversed = signedArea < 0;
      for (const piece of pieces) {
        const ids = piece.map((q) => {
          const w0 = ((p1[1] - p2[1]) * (q[0] - p2[0]) + (p2[0] - p1[0]) * (q[1] - p2[1])) / det;
          const w1 = ((p2[1] - p0[1]) * (q[0] - p2[0]) + (p0[0] - p2[0]) * (q[1] - p2[1])) / det;
          return addVertex(i0, i1, i2, w0, w1, 1 - w0 - w1);
        });
        for (let k = 1; k + 1 < ids.length; k += 1) {
          if (reversed) newIndex.push(ids[0]!, ids[k + 1]!, ids[k]!);
          else newIndex.push(ids[0]!, ids[k]!, ids[k + 1]!);
          stats.trianglesAdded += 1;
        }
      }
    }
    newGroups.push({ start: groupStart, count: newIndex.length - groupStart, materialIndex: group.materialIndex });
  }

  // Section and prop templates share geometry between clones; rewrite a copy.
  const geometry = new BufferGeometry();
  geometry.name = source.name;
  geometry.userData = { ...source.userData };
  attributes.forEach((attribute, a) => {
    const ArrayType = attribute.array.constructor as new (length: number) => typeof attribute.array;
    const next = new BufferAttribute(new ArrayType(vertexCount * attribute.itemSize), attribute.itemSize, attribute.normalized);
    if (attribute instanceof BufferAttribute) {
      (next.array as unknown as { set(values: ArrayLike<number>): void }).set(attribute.array);
    } else {
      for (let i = 0; i < attribute.count; i += 1) {
        for (let c = 0; c < attribute.itemSize; c += 1) next.setComponent(i, c, attribute.getComponent(i, c));
      }
    }
    const extra = added[a]!;
    for (let i = 0; i < extra.length; i += 1) {
      next.setComponent(attribute.count + Math.floor(i / attribute.itemSize), i % attribute.itemSize, extra[i]!);
    }
    geometry.setAttribute(names[a]!, next);
  });
  geometry.setIndex(newIndex);
  if (source.groups.length > 0) {
    for (const group of newGroups) geometry.addGroup(group.start, group.count, group.materialIndex);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  mesh.geometry = geometry;
  stats.meshesRewritten += 1;
}

/**
 * A caster that loses a face to a non-casting cover keeps its shadow through
 * an invisible proxy, so no light leaks through the clipped area. One proxy
 * per material side keeps the original shadow-face culling.
 */
function addShadowProxies(root: Object3D, shadows: ShadowTriangles, stats: CoplanarResolveStats): void {
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  for (const [side, positions] of shadows) {
    if (positions.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.applyMatrix4(toRoot);
    const proxy = new Mesh(geometry, new MeshBasicMaterial({ colorWrite: false, depthWrite: false, side }));
    proxy.name = "coplanar-shadow-proxy";
    proxy.castShadow = true;
    proxy.receiveShadow = false;
    proxy.raycast = () => {};
    root.add(proxy);
    stats.shadowProxies += 1;
  }
}

/**
 * Lifts one instance out of an InstancedMesh into a single-instance child
 * with the instance transform baked into its own geometry, keeping the shared
 * material and the instance colour, and collapses the original instance.
 */
function extractInstance(mesh: InstancedMesh, instance: number): InstancedMesh {
  const matrix = new Matrix4();
  mesh.getMatrixAt(instance, matrix);
  const extracted = new InstancedMesh((mesh.geometry as BufferGeometry).clone().applyMatrix4(matrix), mesh.material, 1);
  extracted.name = `${mesh.name}-coplanar-extract-${instance}`;
  extracted.castShadow = mesh.castShadow;
  extracted.receiveShadow = mesh.receiveShadow;
  extracted.renderOrder = mesh.renderOrder;
  extracted.layers.mask = mesh.layers.mask;
  if (mesh.instanceColor) {
    const color = new Color();
    mesh.getColorAt(instance, color);
    extracted.setColorAt(0, color);
  }
  mesh.add(extracted);
  mesh.setMatrixAt(instance, new Matrix4().makeScale(0, 0, 0));
  mesh.instanceMatrix.needsUpdate = true;
  return extracted;
}

/**
 * Open-addressing table from non-negative integer keys (< 2^53) to surface
 * ids. Plain Maps with keys above 2^31 box every key and dominate the scan.
 */
class CellTable {
  keys: Float64Array;
  owners: Int32Array;
  contested: Uint8Array;
  size = 0;

  constructor(capacity: number) {
    this.keys = new Float64Array(capacity).fill(-1);
    this.owners = new Int32Array(capacity);
    this.contested = new Uint8Array(capacity);
  }

  private slotFor(key: number): number {
    const mask = this.keys.length - 1;
    const lo = key % 0x4000000;
    const hi = Math.floor(key / 0x4000000);
    let slot = (Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b) >>> 0) & mask;
    while (this.keys[slot] !== -1 && this.keys[slot] !== key) slot = (slot + 1) & mask;
    return slot;
  }

  find(key: number): number {
    const slot = this.slotFor(key);
    return this.keys[slot] === key ? slot : -1;
  }

  /**
   * Records `surface` in the cell; a second, different surface marks it shared
   * (-1). Returns true when the table grew and earlier slots moved.
   */
  add(key: number, surface: number): boolean {
    const grew = this.size * 2 >= this.keys.length;
    if (grew) this.grow();
    const slot = this.slotFor(key);
    if (this.keys[slot] === -1) {
      this.keys[slot] = key;
      this.owners[slot] = surface;
      this.size += 1;
    } else if (this.owners[slot] !== surface) {
      this.owners[slot] = -1;
    }
    this.lastSlot = slot;
    return grew;
  }

  lastSlot = -1;

  private grow(): void {
    const { keys, owners } = this;
    this.keys = new Float64Array(keys.length * 2).fill(-1);
    this.owners = new Int32Array(keys.length * 2);
    this.contested = new Uint8Array(keys.length * 2);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]!;
      if (key === -1) continue;
      const slot = this.slotFor(key);
      this.keys[slot] = key;
      this.owners[slot] = owners[i]!;
    }
  }
}

/**
 * Removes z-fighting between the static render meshes under `roots`. Call it
 * once the world is assembled; it rewrites only the losing meshes' geometry.
 */
export function resolveCoplanarSurfaces(roots: readonly Object3D[]): CoplanarResolveStats {
  const startedAt = performance.now();
  const stats: CoplanarResolveStats = {
    surfaces: 0,
    trianglesScanned: 0,
    contestedTriangles: 0,
    conflicts: 0,
    unresolvedConflicts: 0,
    trianglesRemoved: 0,
    trianglesClipped: 0,
    trianglesAdded: 0,
    meshesRewritten: 0,
    instancesExtracted: 0,
    shadowProxies: 0,
    elapsedMs: 0,
  };
  for (const root of roots) root.updateMatrixWorld(true);
  const surfaces = collectSurfaces(roots);
  stats.surfaces = surfaces.length;
  const lastSurface = surfaces[surfaces.length - 1];
  const ownerCount = lastSurface ? lastSurface.ownerBase + (lastSurface.instanced ? (lastSurface.mesh as InstancedMesh).count : 1) : 0;
  const positionCache = new Map<Mesh, Float32Array[]>();

  type Visit = (surface: number, owner: number, instance: number, slot: number, key: number, v: Float64Array, d: number, area: number, axis: 0 | 1 | 2) => void;
  const scan = (visit: Visit): void => {
    surfaces.forEach((surface, s) => {
      forEachWorldTriangle(surface, worldPositions(surface.mesh, positionCache), (slot, instance, v) => {
        const ux = v[3]! - v[0]!, uy = v[4]! - v[1]!, uz = v[5]! - v[2]!;
        const wx = v[6]! - v[0]!, wy = v[7]! - v[1]!, wz = v[8]! - v[2]!;
        let nx = uy * wz - uz * wy;
        let ny = uz * wx - ux * wz;
        let nz = ux * wy - uy * wx;
        const length = Math.hypot(nx, ny, nz);
        if (length < MIN_TRIANGLE_AREA_M2 * 2) return;
        nx /= length;
        ny /= length;
        nz /= length;
        const d = nx * v[0]! + ny * v[1]! + nz * v[2]!;
        const normalKey = ((Math.round(nx * NORMAL_BINS) + NORMAL_BINS) * NORMAL_SPAN + Math.round(ny * NORMAL_BINS) + NORMAL_BINS) * NORMAL_SPAN
          + Math.round(nz * NORMAL_BINS) + NORMAL_BINS;
        // The projection axis comes from the quantised normal so every
        // triangle in a plane bin projects the same way, even at 45°.
        const qx = Math.abs(Math.round(nx * NORMAL_BINS)), qy = Math.abs(Math.round(ny * NORMAL_BINS)), qz = Math.abs(Math.round(nz * NORMAL_BINS));
        const axis: 0 | 1 | 2 = qx >= qy && qx >= qz ? 0 : qy >= qz ? 1 : 2;
        visit(s, surface.ownerBase + instance, instance, slot, normalKey * PLANE_BIN_SPAN + Math.round(d / PLANE_BIN_M) + PLANE_BIN_OFFSET, v, d, length * 0.5, axis);
      });
    });
  };

  // Pass 1: mark coarse plane cells shared by more than one surface. A
  // triangle registers in every cell its projected bounds touch.
  const coarseKey = (key: number, u: number, v: number): number =>
    (key % COARSE_PLANE_MODULUS) * (COARSE_SPAN * COARSE_SPAN) + (u + COARSE_OFFSET) * COARSE_SPAN + (v + COARSE_OFFSET);
  const forEachCoarseCell = (v: Float64Array, axis: 0 | 1 | 2, visit: (u: number, w: number) => void): void => {
    const i = (axis + 1) % 3;
    const j = (axis + 2) % 3;
    const u0 = Math.floor(Math.min(v[i]!, v[3 + i]!, v[6 + i]!) / COARSE_CELL_M);
    const u1 = Math.floor(Math.max(v[i]!, v[3 + i]!, v[6 + i]!) / COARSE_CELL_M);
    const w0 = Math.floor(Math.min(v[j]!, v[3 + j]!, v[6 + j]!) / COARSE_CELL_M);
    const w1 = Math.floor(Math.max(v[j]!, v[3 + j]!, v[6 + j]!) / COARSE_CELL_M);
    for (let u = u0; u <= u1; u += 1) for (let w = w0; w <= w1; w += 1) visit(u, w);
  };
  // Most triangles fit one cell; remember that cell's slot so pass 2 can skip
  // rehashing. Growth moves slots, so a grow invalidates the earlier ones.
  const cells = new CellTable(1 << 20);
  const triangleSlots: number[] = [];
  let validSlotsFrom = 0;
  scan((_surface, owner, _instance, _slot, key, v, _d, _area, axis) => {
    let cellsTouched = 0;
    forEachCoarseCell(v, axis, (u, w) => {
      if (cells.add(coarseKey(key, u, w), owner)) validSlotsFrom = stats.trianglesScanned;
      cellsTouched += 1;
    });
    triangleSlots.push(cellsTouched === 1 ? cells.lastSlot : -1);
    stats.trianglesScanned += 1;
  });
  // A neighbouring plane bin in the same cell sits COARSE_SPAN² keys away.
  const planeStride = COARSE_SPAN * COARSE_SPAN;
  let contestedCount = 0;
  for (let slot = 0; slot < cells.keys.length; slot += 1) {
    const cell = cells.keys[slot]!;
    if (cell === -1) continue;
    const owner = cells.owners[slot]!;
    if (owner === -1) {
      cells.contested[slot] = 1;
      contestedCount += 1;
    }
    for (let step = 1; step <= PLANE_NEIGHBOUR_BINS; step += 1) {
      const neighbour = cells.find(cell + step * planeStride);
      if (neighbour !== -1 && (cells.owners[neighbour] !== owner || owner === -1)) {
        cells.contested[slot] = 1;
        cells.contested[neighbour] = 1;
        contestedCount += 1;
      }
    }
  }
  let ordinal = 0;
  const isContested = (key: number, v: Float64Array, axis: 0 | 1 | 2): boolean => {
    const cached = triangleSlots[ordinal] ?? -1;
    ordinal += 1;
    if (cached !== -1 && ordinal > validSlotsFrom) return cells.contested[cached] === 1;
    let hit = false;
    forEachCoarseCell(v, axis, (u, w) => {
      if (hit) return;
      const slot = cells.find(coarseKey(key, u, w));
      if (slot !== -1 && cells.contested[slot] === 1) hit = true;
    });
    return hit;
  };

  // Pass 2: gather contested triangles per plane bin.
  const buckets = new Map<number, Bucket>();
  if (contestedCount > 0) {
    scan((surface, owner, instance, slot, key, v, d, area, axis) => {
      if (!isContested(key, v, axis)) return;
      const tri = projectTriangle(surface, owner, instance, slot, v, axis, d, area);
      const bucket = buckets.get(key);
      if (bucket) bucket.tris.push(tri);
      else buckets.set(key, { tris: [tri], grid: null });
      stats.contestedTriangles += 1;
    });
  }

  // Losers per mesh, keyed by instance then slot (instance 0 for plain meshes).
  const losers = new Map<Mesh, Map<number, Map<number, LoserEntry>>>();
  const record = (winner: Tri, loser: Tri): void => {
    const surface = surfaces[loser.surface]!;
    if (!surface.canLose) {
      stats.unresolvedConflicts += 1;
      return;
    }
    let byInstance = losers.get(surface.mesh);
    if (!byInstance) {
      byInstance = new Map();
      losers.set(surface.mesh, byInstance);
    }
    let bySlot = byInstance.get(loser.instance);
    if (!bySlot) {
      bySlot = new Map();
      byInstance.set(loser.instance, bySlot);
    }
    let entry = bySlot.get(loser.slot);
    if (!entry) {
      entry = { tri: loser, covers: [], shadowHole: false };
      bySlot.set(loser.slot, entry);
    }
    entry.covers.push(winner.ccw);
    if (surface.castsShadow && !surfaces[winner.surface]!.castsShadow) entry.shadowHole = true;
  };
  const compare = (a: Tri, b: Tri): void => {
    if (a.owner === b.owner || a.axis !== b.axis || Math.abs(a.d - b.d) > MAX_SEPARATION_M) return;
    if (a.maxU <= b.minU || b.maxU <= a.minU || a.maxV <= b.minV || b.maxV <= a.minV) return;
    const overlap = intersectConvex(a.ccw, b.ccw);
    if (overlap.length < 3 || polygonArea(overlap) < MIN_OVERLAP_M2) return;
    stats.conflicts += 1;
    const verdict = beats(a, b, surfaces);
    if (verdict === null) {
      // Deciding flush faces triangle by triangle leaves a patchwork of both
      // finishes. Tally each side's involved area and decide per surface pair.
      const [lo, hi] = a.owner < b.owner ? [a, b] : [b, a];
      const pairKey = lo.owner * ownerCount + hi.owner;
      let pair = flushPairs.get(pairKey);
      if (!pair) {
        pair = { loArea: 0, hiArea: 0, seen: new Set() };
        flushPairs.set(pairKey, pair);
      }
      if (!pair.seen.has(lo)) { pair.seen.add(lo); pair.loArea += lo.area; }
      if (!pair.seen.has(hi)) { pair.seen.add(hi); pair.hiArea += hi.area; }
      flushConflicts.push([lo, hi, pairKey]);
    } else if (verdict) record(a, b);
    else record(b, a);
  };
  type FlushPair = { loArea: number; hiArea: number; seen: Set<Tri> };
  const flushPairs = new Map<number, FlushPair>();
  const flushConflicts: [Tri, Tri, number][] = [];
  for (const [key, bucket] of buckets) {
    const grid = bucketGrid(bucket);
    for (let step = 0; step <= PLANE_NEIGHBOUR_BINS; step += 1) {
      const other = step === 0 ? bucket : buckets.get(key + step);
      if (!other) continue;
      other.tris.forEach((b, bi) => {
        const seen = new Set<number>();
        for (let u = Math.floor(b.minU / GRID_CELL_M); u <= Math.floor(b.maxU / GRID_CELL_M); u += 1) {
          for (let v = Math.floor(b.minV / GRID_CELL_M); v <= Math.floor(b.maxV / GRID_CELL_M); v += 1) {
            for (const ai of grid.get(gridKey(u, v)) ?? []) {
              if (seen.has(ai) || (step === 0 && ai >= bi)) continue;
              seen.add(ai);
              compare(bucket.tris[ai]!, b);
            }
          }
        }
      });
    }
  }

  // The side with less involved area is the applied detail (a trim or pier
  // over a wall run) and stays visible. Ties keep the earlier owner.
  for (const [lo, hi, pairKey] of flushConflicts) {
    const pair = flushPairs.get(pairKey)!;
    if (pair.hiArea < pair.loArea * 0.99) record(hi, lo);
    else record(lo, hi);
  }
  const shadows: ShadowTriangles = new Map();
  for (const [mesh, byInstance] of losers) {
    if (!(mesh as InstancedMesh).isInstancedMesh) {
      rebuildGeometry(mesh, [...(byInstance.get(0) ?? new Map<number, LoserEntry>()).values()], stats, shadows);
      continue;
    }
    for (const [instance, bySlot] of byInstance) {
      const extracted = extractInstance(mesh as InstancedMesh, instance);
      extracted.updateMatrixWorld(true);
      rebuildGeometry(extracted, [...bySlot.values()], stats, shadows);
      stats.instancesExtracted += 1;
    }
    (mesh as InstancedMesh).computeBoundingBox();
    (mesh as InstancedMesh).computeBoundingSphere();
  }
  if (roots[0]) addShadowProxies(roots[0], shadows, stats);
  stats.elapsedMs = performance.now() - startedAt;
  return stats;
}

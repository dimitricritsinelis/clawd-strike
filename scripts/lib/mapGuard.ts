// Protected-gameplay guard for map_spec.json, driven by scripts/map-guard.ts:
// the projection of spec fields that shape gameplay, the protected source
// files, and the envelope that render-only authored placements must stay in.
import { createHash } from "node:crypto";

type JsonRecord = Record<string, unknown>;

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MapZone = {
  id: string;
  type: string;
  label: string;
  rect: Rect;
  surfaceId?: string;
  districtId?: string;
  macroLane?: string;
  clearWidthM?: number;
};

export type TraversalSurface = {
  id: string;
  zoneId: string;
  kind: "flat" | "ramp";
  rect: Rect;
  elevationM?: number;
  axis?: "x" | "y";
  startElevationM?: number;
  endElevationM?: number;
};

export type MapSpec = JsonRecord & {
  zones: MapZone[];
  traversal_surfaces?: TraversalSurface[];
};

const PROTECTED_TOP_LEVEL_KEYS = Object.freeze([
  "global_dimensions",
  "map_center",
  "traversal_surfaces",
  "tactical_lanes",
  "explicit_connectivity",
  "authored_spawns",
  "constraints",
  "composition_rules",
  "lanes",
  "connectivity",
]);

const PROTECTED_FILE_PATTERNS = Object.freeze([
  /^apps\/client\/src\/runtime\/sim\//,
  /^apps\/client\/src\/runtime\/(?:combat|tuning)\//,
  /^apps\/client\/src\/runtime\/enemies\/TacticalGraph(?:\.test)?\.ts$/,
  /^apps\/client\/src\/runtime\/enemies\/enemyLineOfSight\.ts$/,
  /^apps\/client\/src\/runtime\/game\/Game\.ts$/,
  /^apps\/client\/src\/runtime\/bootstrap\.ts$/,
  /^apps\/client\/src\/global\.d\.ts$/,
]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateMapSpec(value: unknown): MapSpec {
  if (!isRecord(value) || !Array.isArray(value.zones) || value.zones.length === 0) {
    throw new Error("map_spec.json must contain a non-empty zones array");
  }
  const ids = new Set<string>();
  for (const [index, rawZone] of value.zones.entries()) {
    if (!isRecord(rawZone) || !nonEmptyString(rawZone.id) || !nonEmptyString(rawZone.type)) {
      throw new Error(`zones[${index}] must contain string id and type`);
    }
    if (!nonEmptyString(rawZone.label) || !isRecord(rawZone.rect)) {
      throw new Error(`zones[${index}] must contain label and rect`);
    }
    if ([rawZone.rect.x, rawZone.rect.y, rawZone.rect.w, rawZone.rect.h].some((entry) => !finiteNumber(entry))) {
      throw new Error(`zones[${index}].rect must contain finite x, y, w, h`);
    }
    if ((rawZone.rect.w as number) <= 0 || (rawZone.rect.h as number) <= 0) {
      throw new Error(`zones[${index}].rect dimensions must be positive`);
    }
    const zoneId = rawZone.id.trim();
    if (rawZone.id !== zoneId) {
      throw new Error(`zones[${index}].id must not contain surrounding whitespace`);
    }
    if (ids.has(zoneId)) throw new Error(`duplicate authored zone '${zoneId}'`);
    ids.add(zoneId);
  }
  return value as MapSpec;
}

export function hashMapAuthority(source: string | Buffer): string {
  return createHash("sha256").update(source).digest("hex");
}

function hasProjectedContent(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : isRecord(value) && Object.keys(value).length > 0;
}

/**
 * Projects only the named (protected) fields out of a nested structure. Empty
 * containers are pruned at every level: a nested array or object that carries
 * no protected field must not leak its shape or length into the projection,
 * otherwise a purely visual edit (for example an authored facade layout that
 * adds `columns`/`bays` arrays) reads as a protected-authority change.
 */
function projectNamedFields(value: unknown, names: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => projectNamedFields(entry, names))
      .filter((entry) => hasProjectedContent(entry));
  }
  if (!isRecord(value)) return undefined;
  const projected: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    if (names.has(key)) {
      projected[key] = entry;
      continue;
    }
    const child = projectNamedFields(entry, names);
    if (hasProjectedContent(child)) projected[key] = child;
  }
  return projected;
}

export function protectedDomainProjection(specInput: MapSpec): JsonRecord {
  const spec = validateMapSpec(specInput);
  const projection: JsonRecord = {};
  for (const key of PROTECTED_TOP_LEVEL_KEYS) projection[key] = spec[key] ?? null;
  projection.zones = spec.zones.map((zone) => ({
    id: zone.id,
    type: zone.type,
    rect: zone.rect,
    surfaceId: zone.surfaceId ?? null,
    districtId: zone.districtId ?? null,
    macroLane: zone.macroLane ?? null,
    clearWidthM: zone.clearWidthM ?? null,
  }));
  const dimensionalNames = new Set([
    "doorWidthM",
    "doorHeightM",
    "openingWidthM",
    "openingHeightM",
    "collisionOpening",
  ]);
  projection.wallDoorwayDimensions = projectNamedFields(spec.wall_details ?? null, dimensionalNames);
  projection.frontageCollisionOpenings = projectNamedFields(spec.frontages ?? null, dimensionalNames);
  projection.facadeModuleOpenings = (Array.isArray(spec.facade_modules) ? spec.facade_modules : [])
    .filter((entry) => isRecord(entry) && (entry.openingType !== undefined || entry.collisionOpening !== undefined))
    .map((entry) => ({
      id: entry.id,
      openingType: entry.openingType,
      dimensionsM: entry.dimensionsM,
      collisionOpening: entry.collisionOpening,
    }));
  const registry = Array.isArray(spec.asset_registry) ? spec.asset_registry : [];
  const clusters = (Array.isArray(spec.dressing_clusters) ? spec.dressing_clusters : []).filter(isRecord);
  const gameplayClusters = clusters.filter((entry) => entry.classification === "gameplay_cover");
  const gameplayAssetIds = new Set(gameplayClusters.flatMap((entry) => Array.isArray(entry.assetIds) ? entry.assetIds : []));
  const gameplayClusterIds = new Set(gameplayClusters.map((entry) => entry.id));
  projection.gameplayDressingClusters = gameplayClusters.map(({ id, zoneId, surfaceId, anchors, assetIds }) => ({
    id, zoneId, surfaceId, anchors, assetIds,
  }));
  const collidingAssetIds = new Set(
    registry
      // Compiled visual placements do not create colliders. Preserve gameplay-cover
      // dimensions, but allow soft_visual/overhead dressing to be composed freely.
      .filter((entry) => isRecord(entry) && gameplayAssetIds.has(String(entry.id)))
      .map((entry) => String((entry as JsonRecord).id)),
  );
  projection.collidingAssetAuthority = registry
    .filter((entry) => isRecord(entry) && collidingAssetIds.has(String(entry.id)))
    .map((entry) => ({
      id: entry.id,
      collisionClass: entry.collisionClass,
      dimensionsM: entry.dimensionsM,
      runtimeId: isRecord(entry.runtime) ? entry.runtime.id : null,
      transform: entry.transform,
    }));
  const placements = Array.isArray(spec.dressing_placements) ? spec.dressing_placements : [];
  projection.collidingDressingPlacements = placements
    .filter((entry) => isRecord(entry) && gameplayClusterIds.has(entry.clusterId))
    .map((entry) => ({
      id: entry.id,
      assetId: entry.assetId,
      clusterId: entry.clusterId,
      anchorIds: entry.anchorIds,
      offsetM: entry.offsetM,
      scale: entry.scale,
      yawOffsetDeg: entry.yawOffsetDeg,
    }));
  const anchors = Array.isArray(spec.anchors) ? spec.anchors : [];
  const classificationByAnchor = new Map(clusters.flatMap((entry) =>
    (Array.isArray(entry.anchors) ? entry.anchors : []).map((id) => [String(id), entry.classification] as const)));
  projection.gameplayAnchors = anchors.filter(isRecord)
    .filter((entry) => {
      // open_node affects the tactical graph; landmark's fountain collider ignores
      // cluster classification. Shop/hero anchors otherwise honor visual classes.
      if (["cover_cluster", "spawn_cover", "open_node", "landmark"].includes(String(entry.type))) return true;
      const classification = classificationByAnchor.get(String(entry.id));
      return ["shopfront_anchor", "hero_landmark"].includes(String(entry.type))
        && classification !== "soft_visual" && classification !== "overhead";
    })
    .map(({ notes: _notes, ...authority }) => authority);
  return projection;
}

export function detectProtectedChanges(
  baseSpec: MapSpec,
  currentSpec: MapSpec,
  touchedFiles: readonly string[],
): string[] {
  const reasons = touchedFiles
    .filter((file) => PROTECTED_FILE_PATTERNS.some((pattern) => pattern.test(file)))
    .map((file) => `protected gameplay file changed: ${file}`);
  const base = protectedDomainProjection(baseSpec);
  const current = protectedDomainProjection(currentSpec);
  for (const key of Object.keys(base)) {
    if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) reasons.push(`protected map authority changed: ${key}`);
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Authored placement guard. Free render-only GLBs (`authored_placements`) have
// no colliders, so any part the player could reach must hug a wall or sit
// overhead, and a base near the ground must touch it. map:check enforces it.
// ---------------------------------------------------------------------------
export const RELIEF_MAX_HEIGHT_M = 2.2;
export const WALL_BAND_M = 0.35;
const FLOAT_MAX_M = 0.5;
const CONTACT_TOLERANCE_M = 0.05;
const SINK_TOLERANCE_M = 0.1;
const SAMPLE_STEP_M = 0.1;
const EPSILON_M = 1e-6;

export type Bounds3 = { min: [number, number, number]; max: [number, number, number] };
export type AuthoredPlacement = {
  id: string;
  modelId: string;
  position: { x: number; y: number; z: number };
  yawDeg?: number;
  role?: string;
};
export type WallSegment = { orientation: "vertical" | "horizontal"; coord: number; start: number; end: number };

type Mat4 = number[]; // glTF column-major 4x4
type Vec3 = [number, number, number];
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) out[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!;
    }
  }
  return out;
}
function nodeMatrix(node: { matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }): Mat4 {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.map(Number);
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  const [qx = 0, qy = 0, qz = 0, qw = 1] = node.rotation ?? [];
  const [sx = 1, sy = 1, sz = 1] = node.scale ?? [];
  const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
  ];
}
function extend(bounds: Bounds3 | null, p: Vec3): Bounds3 {
  if (!bounds) return { min: [p[0], p[1], p[2]], max: [p[0], p[1], p[2]] };
  for (let i = 0; i < 3; i += 1) {
    bounds.min[i] = Math.min(bounds.min[i]!, p[i]!);
    bounds.max[i] = Math.max(bounds.max[i]!, p[i]!);
  }
  return bounds;
}
function corners(b: Bounds3): Vec3[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]]);
}

/** Bounds of every POSITION accessor in a GLB with node transforms applied, in the file's own Y-up metres. Null when the file has no geometry. */
export function glbBounds(bytes: Buffer): Bounds3 | null {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error("GLB has no JSON chunk");
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")) as {
    nodes?: { children?: number[]; mesh?: number; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
    scenes?: { nodes?: number[] }[];
    scene?: number;
    meshes?: { primitives?: { attributes?: { POSITION?: number } }[] }[];
    accessors?: { min?: number[]; max?: number[] }[];
  };
  const nodes = gltf.nodes ?? [];
  const children = new Set(nodes.flatMap((node) => node.children ?? []));
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? nodes.map((_, index) => index).filter((index) => !children.has(index));
  let bounds: Bounds3 | null = null;
  const visit = (index: number, parent: Mat4, depth: number): void => {
    const node = nodes[index];
    if (!node || depth > 64) return;
    const world = multiply(parent, nodeMatrix(node));
    const mesh = typeof node.mesh === "number" ? gltf.meshes?.[node.mesh] : undefined;
    for (const primitive of mesh?.primitives ?? []) {
      const position = primitive.attributes?.POSITION;
      const accessor = typeof position === "number" ? gltf.accessors?.[position] : undefined;
      if (!accessor?.min || !accessor?.max || accessor.min.length < 3 || accessor.max.length < 3) continue;
      const local: Bounds3 = { min: [accessor.min[0]!, accessor.min[1]!, accessor.min[2]!], max: [accessor.max[0]!, accessor.max[1]!, accessor.max[2]!] };
      for (const corner of corners(local)) bounds = extend(bounds, transformPoint(world, corner));
    }
    for (const child of node.children ?? []) visit(child, world, depth + 1);
  };
  for (const root of roots) visit(root, IDENTITY, 0);
  return bounds;
}

/** Conservative bounds per rendered triangle, with node transforms applied.
 * Disconnected geometry must not turn the empty space between parts into solid cover.
 * Unsupported buffers fail closed; accessor min/max alone is not geometry evidence.
 */
export function glbTriangleBounds(bytes: Buffer, onVertex?: (vertex: Vec3) => void): Bounds3[] {
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  const length = bytes.readUInt32LE(12);
  const g = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  if (bytes.readUInt32LE(20 + length + 4) !== 0x004e4942) throw new Error("GLB has no binary geometry chunk");
  const binary = bytes.subarray(28 + length);
  const read = (index: number, width: number): number[][] => {
    const a = g.accessors?.[index], v = g.bufferViews?.[a?.bufferView];
    if (!a || !v || a.sparse || a.normalized || v.extensions?.EXT_meshopt_compression || (width===3 && a.componentType!==5126) || (v.buffer ?? 0) !== 0) throw new Error("unsupported GLB geometry accessor");
    const size = ({5121:1,5123:2,5125:4,5126:4} as Record<number,number>)[a.componentType];
    if (!size || a.type !== (width === 3 ? "VEC3" : "SCALAR")) throw new Error("unsupported GLB geometry component");
    const stride = v.byteStride ?? width * size, offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (!Number.isInteger(a.count) || a.count < 0 || stride < width*size || offset < 0
      || offset + Math.max(0,a.count-1)*stride + (a.count ? width*size : 0) > binary.length) throw new Error("GLB geometry accessor outside binary buffer");
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>{
      const at=offset+i*stride+j*size;
      const value=a.componentType===5126?binary.readFloatLE(at):size===4?binary.readUInt32LE(at):size===2?binary.readUInt16LE(at):binary.readUInt8(at);
      if(!Number.isFinite(value))throw new Error("non-finite GLB geometry");
      return value;
    }));
  };
  const nodes=g.nodes??[], children=new Set<number>(nodes.flatMap((n: {children?:number[]})=>n.children??[]));
  const roots=g.scenes?.[g.scene??0]?.nodes??nodes.map((_:unknown,i:number)=>i).filter((i:number)=>!children.has(i));
  const result:Bounds3[]=[];
  const visit=(index:number,parent:Mat4,ancestors:Set<number>):void=>{
    if(ancestors.has(index)||ancestors.size>64||!nodes[index])throw new Error("invalid GLB node hierarchy");
    const node=nodes[index], world=multiply(parent,nodeMatrix(node));
    if(!world.every(Number.isFinite))throw new Error("non-finite GLB node transform");
    for(const p of g.meshes?.[node.mesh]?.primitives??[]){
      if((p.mode??4)!==4 || p.extensions?.KHR_draco_mesh_compression)throw new Error("unsupported GLB triangle encoding");
      const vertices=read(p.attributes.POSITION,3).map(v=>transformPoint(world,v as Vec3));
      const indices=p.indices===undefined?vertices.map((_:Vec3,i:number)=>i):read(p.indices,1).map(v=>v[0]!);
      if(indices.length%3)throw new Error("incomplete GLB triangle");
      for(let i=0;i<indices.length;i+=3){
        let bounds:Bounds3|null=null;
        for(const id of indices.slice(i,i+3)){
          if(!Number.isInteger(id)||!vertices[id])throw new Error("GLB triangle index outside vertices");
          bounds=extend(bounds,vertices[id]!);
          onVertex?.(vertices[id]!);
        }
        result.push(bounds!);
      }
    }
    for(const child of node.children??[])visit(child,world,new Set([...ancestors,index]));
  };
  for(const root of roots)visit(root,IDENTITY,new Set());
  return result;
}

/**
 * Placement bounds in design metres (x east, y north, z up), mirroring
 * buildAuthoredPlacements: world x = x, world y = z, world z = y, and the
 * model turns about the up axis by (yawDeg + 180) degrees.
 */
function placementDesignPoint([gx, gy, gz]: Vec3, placement: AuthoredPlacement): Vec3 {
  const theta = ((placement.yawDeg ?? 0) + 180) * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [placement.position.x + gx * cos + gz * sin,
    placement.position.y - gx * sin + gz * cos, placement.position.z + gy];
}

export function placementDesignBounds(local: Bounds3, placement: AuthoredPlacement): Bounds3 {
  let bounds: Bounds3 | null = null;
  for (const point of corners(local)) bounds = extend(bounds, placementDesignPoint(point, placement));
  return bounds!;
}

/** Boundary of the union of walkable rects: where the blockout stands a wall. A shared edge between two rects is an opening, not a wall. */
export function walkableBoundarySegments(rects: readonly Rect[]): WallSegment[] {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  const inside = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i]! + xs[i + 1]!) / 2;
    const cy = (ys[j]! + ys[j + 1]!) / 2;
    return rects.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h);
  };
  const segments: WallSegment[] = [];
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      if (inside(i - 1, j) !== inside(i, j)) segments.push({ orientation: "vertical", coord: xs[i]!, start: ys[j]!, end: ys[j + 1]! });
    }
  }
  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length - 1; i += 1) {
      if (inside(i, j - 1) !== inside(i, j)) segments.push({ orientation: "horizontal", coord: ys[j]!, start: xs[i]!, end: xs[i + 1]! });
    }
  }
  return segments;
}
function distanceToSegment(x: number, y: number, s: WallSegment): number {
  const [along, across] = s.orientation === "vertical" ? [y, x] : [x, y];
  return Math.hypot(across - s.coord, along - Math.min(Math.max(along, s.start), s.end));
}
function insideAny(rects: readonly Rect[], x: number, y: number): boolean {
  return rects.some((r) => x >= r.x - EPSILON_M && x <= r.x + r.w + EPSILON_M && y >= r.y - EPSILON_M && y <= r.y + r.h + EPSILON_M);
}
function groundAt(surfaces: readonly TraversalSurface[], x: number, y: number): { surface: TraversalSurface; elevationM: number } | null {
  const surface = surfaces.find((s) => insideAny([s.rect], x, y));
  if (!surface) return null;
  if (surface.kind === "ramp" && surface.axis) {
    const t = surface.axis === "x" ? (x - surface.rect.x) / surface.rect.w : (y - surface.rect.y) / surface.rect.h;
    const start = surface.startElevationM ?? 0;
    const end = surface.endElevationM ?? start;
    return { surface, elevationM: start + (end - start) * Math.min(1, Math.max(0, t)) };
  }
  return { surface, elevationM: surface.elevationM ?? 0 };
}
function samples(lo: number, hi: number): number[] {
  const out = [lo];
  for (let v = lo + SAMPLE_STEP_M; v < hi; v += SAMPLE_STEP_M) out.push(v);
  if (hi > lo) out.push(hi);
  return out;
}

/**
 * Reasons an authored placement breaks the render-only envelope: geometry
 * below RELIEF_MAX_HEIGHT_M must stay within WALL_BAND_M of a wall (the player
 * walks through anything else), and a base near the ground must touch it.
 */
export function authoredPlacementReasons(
  spec: MapSpec,
  boundsOf: (modelId: string) => Bounds3 | null,
  rects: readonly Rect[] = (spec.traversal_surfaces ?? []).map((s) => s.rect),
  segments: readonly WallSegment[] = walkableBoundarySegments(rects),
  geometryBoundsOf?: (modelId: string) => readonly Bounds3[],
  geometryVerticesOf?: (modelId: string) => readonly Vec3[],
): string[] {
  const reasons: string[] = [];
  const surfaces = spec.traversal_surfaces ?? [];
  for (const placement of (spec.authored_placements as AuthoredPlacement[] | undefined) ?? []) {
    const local = boundsOf(placement.modelId);
    if (!local) continue;
    const box = placementDesignBounds(local, placement);
    const label = `placement ${placement.id} (${placement.modelId})`;
    const vertices = geometryVerticesOf?.(placement.modelId);
    // Compare each actual vertex to the floor at that same coordinate. A
    // sloped base's global minimum does not lie at the bounding-box centre.
    const points: Vec3[] = vertices?.length ? vertices.map(v => placementDesignPoint(v, placement))
      : [[(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, box.min[2]]];
    let contact = { point: points[0]!, ground: groundAt(surfaces, points[0]![0], points[0]![1]), lift: Infinity };
    for (const point of points) {
      const ground = groundAt(surfaces, point[0], point[1]);
      const lift = point[2] - (ground?.elevationM ?? 0);
      if (lift < contact.lift) contact = { point, ground, lift };
    }
    const [cx, cy] = contact.point;
    const { ground, lift } = contact;
    const groundM = ground?.elevationM ?? 0;
    const where = `at x ${cx.toFixed(2)} y ${cy.toFixed(2)}`;
    const on = ground ? `${ground.surface.id} at ${groundM.toFixed(2)} m` : "no traversal surface, ground taken as 0 m";
    if (lift > CONTACT_TOLERANCE_M && lift <= FLOAT_MAX_M) {
      reasons.push(`${label} floats ${lift.toFixed(2)} m above the ground ${where} (${on}); author the origin at the base and set position.z to the surface elevation`);
    }
    if (lift < -SINK_TOLERANCE_M) reasons.push(`${label} sinks ${(-lift).toFixed(2)} m into the ground ${where} (${on})`);
    let worst: { x: number; y: number; distance: number } | null = null;
    const parts = geometryBoundsOf ? geometryBoundsOf(placement.modelId).map(b=>placementDesignBounds(b,placement)) : [box];
    for (const part of parts) {
      for (const rect of rects) {
        const x0=Math.max(part.min[0],rect.x), x1=Math.min(part.max[0],rect.x+rect.w);
        const y0=Math.max(part.min[1],rect.y), y1=Math.min(part.max[1],rect.y+rect.h);
        if(x0>x1 || y0>y1)continue;
        const highestGround=Math.max(...[[x0,y0],[x1,y1],[x0,y1],[x1,y0]].map(([x,y])=>groundAt(surfaces,x!,y!)?.elevationM??0));
        if(part.min[2]>=highestGround+RELIEF_MAX_HEIGHT_M)continue;
        for (const x of samples(x0,x1)) for (const y of samples(y0,y1)) {
          const distance=segments.reduce((best,s)=>Math.min(best,distanceToSegment(x,y,s)),Infinity);
          if(distance>WALL_BAND_M && (!worst||distance>worst.distance))worst={x,y,distance};
        }
      }
    }
    if (worst) {
      reasons.push(`${label} has geometry below ${RELIEF_MAX_HEIGHT_M} m standing ${worst.distance.toFixed(2)} m from the nearest wall at x ${worst.x.toFixed(2)} y ${worst.y.toFixed(2)}; render-only props stay within ${WALL_BAND_M} m of a wall or above ${RELIEF_MAX_HEIGHT_M} m, anything else needs a collider through the spec`);
    }
  }
  return reasons;
}

import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from "three";
import type { FloorMaterialLibrary, FloorTextureQuality } from "../render/materials/FloorMaterialLibrary";
import { applyFloorShaderTweaks } from "../render/materials/applyFloorShaderTweaks";
import { deriveSubSeed } from "../utils/Rng";
import { resolveFloorMaterialIdForZone } from "./floorMaterialAssignment";
import type {
  RuntimeBlockoutSpec,
  RuntimeBlockoutZone,
  RuntimeRect,
  RuntimeTraversalSurface,
} from "./types";

const INCLUDED_ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "cut",
  "connector",
]);

export type FloorMaterialId =
  | "large_sandstone_blocks_01"
  | "grey_tiles"
  | "cobblestone_pavement"
  | "cobblestone_color"
  | "red_sandstone_pavement"
  | "patterned_cobblestone"
  | "sand_01";

const UV_QUARTER_TURNS: 0 | 1 | 2 | 3 = 0;
const UV_OFFSET_U = 0;
const UV_OFFSET_V = 0;
const V3_FORMAT = /^3(?:\.|$)/;
const EDGE_EPSILON_M = 1e-4;
const ELEVATION_EPSILON_M = 0.015;
const MATERIAL_THRESHOLD_WIDTH_M = 0.24;
const MATERIAL_THRESHOLD_RISE_M = 0.012;
const ELEVATION_THRESHOLD_WIDTH_M = 0.12;
const ELEVATION_THRESHOLD_RISE_M = 0.002;
const ELEVATED_FASCIA_DEPTH_M = 0.18;
const ELEVATED_FASCIA_OUTSET_M = 0.002;
const ELEVATED_FASCIA_MIN_HEIGHT_M = 0.025;
const ELEVATED_FASCIA_MAX_SEGMENT_M = 1;
const STAIR_TREAD_LIFT_M = 0.003;
const STAIR_TREAD_OVERLAP_M = 0.012;

type MaterialBatch = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
};

type FloorRegion = {
  zoneId: string;
  rect: RuntimeRect;
  materialId: FloorMaterialId;
  uvQuarterTurns: 0 | 1 | 2 | 3;
  uvOffsetU: number;
  uvOffsetV: number;
  surface?: RuntimeTraversalSurface;
};

type EdgeSide = "west" | "east" | "south" | "north";

type SurfaceEdge = {
  region: FloorRegion;
  side: EdgeSide;
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
};

type SharedEdge = {
  a: SurfaceEdge;
  b: SurfaceEdge;
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
};

type FloorPolishStats = {
  transitionBandCount: number;
  materialTransitionCount: number;
  elevationJoinCount: number;
  elevationThresholdCount: number;
  sameMaterialWeldCount: number;
  fasciaQuadCount: number;
  stairTreadCount: number;
  stairRiserCount: number;
};

type BuildPbrFloorsOptions = {
  seed: number;
  quality: FloorTextureQuality;
  manifest: FloorMaterialLibrary;
  patchSizeM: number;
  floorTopY: number;
};

const MATERIAL_ORDER: FloorMaterialId[] = [
  "large_sandstone_blocks_01",
  "grey_tiles",
  "cobblestone_pavement",
  "cobblestone_color",
  "red_sandstone_pavement",
  "patterned_cobblestone",
  "sand_01",
];

const FLOOR_MACRO_SETTINGS: Record<
  FloorMaterialId,
  { colorAmplitude: number; roughnessAmplitude: number; frequency: number }
> = {
  large_sandstone_blocks_01: {
    colorAmplitude: 0.04,
    roughnessAmplitude: 0.035,
    frequency: 0.035,
  },
  grey_tiles: {
    colorAmplitude: 0.03,
    roughnessAmplitude: 0.025,
    frequency: 0.045,
  },
  cobblestone_pavement: {
    colorAmplitude: 0.04,
    roughnessAmplitude: 0.03,
    frequency: 0.04,
  },
  cobblestone_color: {
    colorAmplitude: 0.14,
    roughnessAmplitude: 0.13,
    frequency: 0.14,
  },
  red_sandstone_pavement: {
    colorAmplitude: 0.18,
    roughnessAmplitude: 0.16,
    frequency: 0.16,
  },
  patterned_cobblestone: {
    colorAmplitude: 0.18,
    roughnessAmplitude: 0.16,
    frequency: 0.14,
  },
  sand_01: {
    colorAmplitude: 0.06,
    roughnessAmplitude: 0.05,
    frequency: 0.025,
  },
};

function getBatch(map: Map<FloorMaterialId, MaterialBatch>, materialId: FloorMaterialId): MaterialBatch {
  const existing = map.get(materialId);
  if (existing) return existing;
  const next: MaterialBatch = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    vertexCount: 0,
  };
  map.set(materialId, next);
  return next;
}

function rotateUv(u: number, v: number, quarterTurns: 0 | 1 | 2 | 3): { u: number; v: number } {
  if (quarterTurns === 1) {
    return { u: -v, v: u };
  }
  if (quarterTurns === 2) {
    return { u: -u, v: -v };
  }
  if (quarterTurns === 3) {
    return { u: v, v: -u };
  }
  return { u, v };
}

function resolveZoneUvVariation(
  seed: number,
  zoneId: string,
): { quarterTurns: 0 | 1 | 2 | 3; offsetU: number; offsetV: number } {
  const variationSeed = deriveSubSeed(seed, `floor-uv:${zoneId}`);
  return {
    quarterTurns: (variationSeed & 3) as 0 | 1 | 2 | 3,
    offsetU: ((variationSeed >>> 2) & 1023) / 1024,
    offsetV: ((variationSeed >>> 12) & 1023) / 1024,
  };
}

function pushVertex(
  batch: MaterialBatch,
  x: number,
  y: number,
  z: number,
  u: number,
  v: number,
  normal: { x: number; y: number; z: number },
): void {
  batch.positions.push(x, y, z);
  batch.normals.push(normal.x, normal.y, normal.z);
  batch.uvs.push(u, v);
}

function sampleSurface(
  surface: RuntimeTraversalSurface | undefined,
  x: number,
  z: number,
  fallbackY: number,
): { elevationM: number; normal: { x: number; y: number; z: number } } {
  if (!surface || surface.kind === "flat") {
    return {
      elevationM: surface?.elevationM ?? fallbackY,
      normal: { x: 0, y: 1, z: 0 },
    };
  }

  const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
  const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const axisCoord = surface.axis === "x" ? x : z;
  const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, 1e-6)));
  const slope = (surface.endElevationM - surface.startElevationM) / Math.max(axisLength, 1e-6);
  const nx = surface.axis === "x" ? -slope : 0;
  const nz = surface.axis === "y" ? -slope : 0;
  const invLength = 1 / Math.hypot(nx, 1, nz);
  return {
    elevationM: surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t,
    normal: { x: nx * invLength, y: invLength, z: nz * invLength },
  };
}

function appendPatchQuad(
  batch: MaterialBatch,
  rect: RuntimeRect,
  surface: RuntimeTraversalSurface | undefined,
  fallbackY: number,
  tileSizeM: number,
  quarterTurns: 0 | 1 | 2 | 3,
  offsetU: number,
  offsetV: number,
  elevationOffsetM = 0,
): void {
  const x0 = rect.x;
  const x1 = rect.x + rect.w;
  const z0 = rect.y;
  const z1 = rect.y + rect.h;
  const invTile = 1 / tileSizeM;
  const baseIndex = batch.vertexCount;

  const sampleUv = (x: number, z: number): { u: number; v: number } => {
    const baseU = x * invTile;
    const baseV = z * invTile;
    const rotated = rotateUv(baseU, baseV, quarterTurns);
    return {
      u: rotated.u + offsetU,
      v: rotated.v + offsetV,
    };
  };

  const uv0 = sampleUv(x0, z0);
  const uv1 = sampleUv(x1, z0);
  const uv2 = sampleUv(x1, z1);
  const uv3 = sampleUv(x0, z1);

  const sample0 = sampleSurface(surface, x0, z0, fallbackY);
  const sample1 = sampleSurface(surface, x1, z0, fallbackY);
  const sample2 = sampleSurface(surface, x1, z1, fallbackY);
  const sample3 = sampleSurface(surface, x0, z1, fallbackY);
  pushVertex(batch, x0, sample0.elevationM + elevationOffsetM, z0, uv0.u, uv0.v, sample0.normal);
  pushVertex(batch, x1, sample1.elevationM + elevationOffsetM, z0, uv1.u, uv1.v, sample1.normal);
  pushVertex(batch, x1, sample2.elevationM + elevationOffsetM, z1, uv2.u, uv2.v, sample2.normal);
  pushVertex(batch, x0, sample3.elevationM + elevationOffsetM, z1, uv3.u, uv3.v, sample3.normal);

  batch.indices.push(
    baseIndex,
    baseIndex + 2,
    baseIndex + 1,
    baseIndex,
    baseIndex + 3,
    baseIndex + 2,
  );

  batch.vertexCount += 4;
}

function appendFlatPatchQuad(
  batch: MaterialBatch,
  rect: RuntimeRect,
  elevationM: number,
  tileSizeM: number,
): void {
  const x0 = rect.x;
  const x1 = rect.x + rect.w;
  const z0 = rect.y;
  const z1 = rect.y + rect.h;
  const invTile = 1 / tileSizeM;
  const baseIndex = batch.vertexCount;

  pushVertex(batch, x0, elevationM, z0, x0 * invTile, z0 * invTile, { x: 0, y: 1, z: 0 });
  pushVertex(batch, x1, elevationM, z0, x1 * invTile, z0 * invTile, { x: 0, y: 1, z: 0 });
  pushVertex(batch, x1, elevationM, z1, x1 * invTile, z1 * invTile, { x: 0, y: 1, z: 0 });
  pushVertex(batch, x0, elevationM, z1, x0 * invTile, z1 * invTile, { x: 0, y: 1, z: 0 });
  batch.indices.push(
    baseIndex,
    baseIndex + 2,
    baseIndex + 1,
    baseIndex,
    baseIndex + 3,
    baseIndex + 2,
  );
  batch.vertexCount += 4;
}

function appendStairRiserQuad(
  batch: MaterialBatch,
  surface: Extract<RuntimeTraversalSurface, { kind: "ramp" }>,
  axisCoord: number,
  bottomY: number,
  topY: number,
  normalSign: -1 | 1,
  tileSizeM: number,
): void {
  if (topY - bottomY <= EDGE_EPSILON_M) return;
  const baseIndex = batch.vertexCount;
  if (surface.axis === "y") {
    const x0 = surface.rect.x;
    const x1 = surface.rect.x + surface.rect.w;
    const normal = { x: 0, y: 0, z: normalSign };
    pushVertex(batch, x0, bottomY, axisCoord, x0 / tileSizeM, bottomY / tileSizeM, normal);
    pushVertex(batch, x1, bottomY, axisCoord, x1 / tileSizeM, bottomY / tileSizeM, normal);
    pushVertex(batch, x1, topY, axisCoord, x1 / tileSizeM, topY / tileSizeM, normal);
    pushVertex(batch, x0, topY, axisCoord, x0 / tileSizeM, topY / tileSizeM, normal);
    if (normalSign > 0) {
      batch.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
    } else {
      batch.indices.push(baseIndex, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2);
    }
  } else {
    const z0 = surface.rect.y;
    const z1 = surface.rect.y + surface.rect.h;
    const normal = { x: normalSign, y: 0, z: 0 };
    pushVertex(batch, axisCoord, bottomY, z0, z0 / tileSizeM, bottomY / tileSizeM, normal);
    pushVertex(batch, axisCoord, bottomY, z1, z1 / tileSizeM, bottomY / tileSizeM, normal);
    pushVertex(batch, axisCoord, topY, z1, z1 / tileSizeM, topY / tileSizeM, normal);
    pushVertex(batch, axisCoord, topY, z0, z0 / tileSizeM, topY / tileSizeM, normal);
    if (normalSign < 0) {
      batch.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
    } else {
      batch.indices.push(baseIndex, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2);
    }
  }
  batch.vertexCount += 4;
}

function appendV3PbrStairs(
  regions: readonly FloorRegion[],
  batches: Map<FloorMaterialId, MaterialBatch>,
  opts: BuildPbrFloorsOptions,
  stats: FloorPolishStats,
): void {
  for (const region of regions) {
    const surface = region.surface;
    if (!surface || surface.kind !== "ramp" || surface.visualStyle !== "stairs") continue;
    const stepCount = surface.stepCount ?? 10;
    const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
    const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const stepLength = axisLength / stepCount;
    const elevationDelta = surface.endElevationM - surface.startElevationM;
    const batch = getBatch(batches, region.materialId);
    const tileSizeM = opts.manifest.getTileSizeM(region.materialId);

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const t0 = stepIndex / stepCount;
      const t1 = (stepIndex + 1) / stepCount;
      const elevation0 = surface.startElevationM + elevationDelta * t0;
      const elevation1 = surface.startElevationM + elevationDelta * t1;
      const topY = Math.max(elevation0, elevation1) + STAIR_TREAD_LIFT_M;
      const bottomY = Math.min(elevation0, elevation1);
      const rawStart = axisStart + stepLength * stepIndex;
      const rawEnd = rawStart + stepLength;
      const visualStart = Math.max(axisStart, rawStart - (stepIndex > 0 ? STAIR_TREAD_OVERLAP_M : 0));
      const visualEnd = Math.min(axisStart + axisLength, rawEnd + (stepIndex < stepCount - 1 ? STAIR_TREAD_OVERLAP_M : 0));
      const treadRect = surface.axis === "x"
        ? { x: visualStart, y: surface.rect.y, w: visualEnd - visualStart, h: surface.rect.h }
        : { x: surface.rect.x, y: visualStart, w: surface.rect.w, h: visualEnd - visualStart };
      appendFlatPatchQuad(batch, treadRect, topY, tileSizeM);

      const descendsAlongAxis = elevationDelta < 0;
      const riserCoord = descendsAlongAxis ? rawEnd : rawStart;
      appendStairRiserQuad(
        batch,
        surface,
        riserCoord,
        bottomY,
        topY,
        descendsAlongAxis ? 1 : -1,
        tileSizeM,
      );
      stats.stairTreadCount += 1;
      stats.stairRiserCount += 1;
    }
  }
}

function isFloorMaterialId(value: string | undefined): value is FloorMaterialId {
  return typeof value === "string" && MATERIAL_ORDER.includes(value as FloorMaterialId);
}

function resolveZoneMaterialId(zone: RuntimeBlockoutZone, isV3: boolean): FloorMaterialId {
  if (isFloorMaterialId(zone.floorMaterialId)) return zone.floorMaterialId;
  if (isV3) {
    throw new Error(
      `[buildPbrFloors] v3 walkable zone '${zone.id}' has unresolved floor material '${zone.floorMaterialId ?? "missing"}'`,
    );
  }
  return resolveFloorMaterialIdForZone(zone.id);
}

function resolveZoneSurface(
  zone: RuntimeBlockoutZone,
  surfacesById: ReadonlyMap<string, RuntimeTraversalSurface>,
  isV3: boolean,
): RuntimeTraversalSurface | undefined {
  const surface = zone.surfaceId ? surfacesById.get(zone.surfaceId) : undefined;
  if (!isV3) return surface;
  if (!surface) {
    throw new Error(
      `[buildPbrFloors] v3 walkable zone '${zone.id}' has unresolved traversal surface '${zone.surfaceId ?? "missing"}'`,
    );
  }
  if (surface.zoneId !== zone.id) {
    throw new Error(
      `[buildPbrFloors] v3 zone '${zone.id}' references surface '${surface.id}' owned by '${surface.zoneId}'`,
    );
  }
  return surface;
}

function intersectRect(a: RuntimeRect, b: RuntimeRect): RuntimeRect | null {
  const minX = Math.max(a.x, b.x);
  const maxX = Math.min(a.x + a.w, b.x + b.w);
  const minZ = Math.max(a.y, b.y);
  const maxZ = Math.min(a.y + a.h, b.y + b.h);
  const width = maxX - minX;
  const height = maxZ - minZ;
  if (width <= 1e-6 || height <= 1e-6) return null;
  return {
    x: minX,
    y: minZ,
    w: width,
    h: height,
  };
}

function finalizeGeometry(batch: MaterialBatch): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(batch.positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(batch.normals, 3));

  const uv = new Float32BufferAttribute(batch.uvs, 2);
  geometry.setAttribute("uv", uv);
  geometry.setAttribute("uv2", new Float32BufferAttribute([...batch.uvs], 2));

  geometry.setIndex(batch.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function subtractRect(rect: RuntimeRect, cutter: RuntimeRect): RuntimeRect[] {
  const overlap = intersectRect(rect, cutter);
  if (!overlap) return [rect];
  const pieces: RuntimeRect[] = [];
  const rectMaxX = rect.x + rect.w;
  const rectMaxZ = rect.y + rect.h;
  const overlapMaxX = overlap.x + overlap.w;
  const overlapMaxZ = overlap.y + overlap.h;
  if (overlap.x > rect.x) {
    pieces.push({ x: rect.x, y: rect.y, w: overlap.x - rect.x, h: rect.h });
  }
  if (overlapMaxX < rectMaxX) {
    pieces.push({ x: overlapMaxX, y: rect.y, w: rectMaxX - overlapMaxX, h: rect.h });
  }
  if (overlap.y > rect.y) {
    pieces.push({ x: overlap.x, y: rect.y, w: overlap.w, h: overlap.y - rect.y });
  }
  if (overlapMaxZ < rectMaxZ) {
    pieces.push({ x: overlap.x, y: overlapMaxZ, w: overlap.w, h: rectMaxZ - overlapMaxZ });
  }
  return pieces;
}

function regionEdges(region: FloorRegion): SurfaceEdge[] {
  const { rect } = region;
  return [
    {
      region,
      side: "west",
      orientation: "vertical",
      coord: rect.x,
      start: rect.y,
      end: rect.y + rect.h,
    },
    {
      region,
      side: "east",
      orientation: "vertical",
      coord: rect.x + rect.w,
      start: rect.y,
      end: rect.y + rect.h,
    },
    {
      region,
      side: "south",
      orientation: "horizontal",
      coord: rect.y,
      start: rect.x,
      end: rect.x + rect.w,
    },
    {
      region,
      side: "north",
      orientation: "horizontal",
      coord: rect.y + rect.h,
      start: rect.x,
      end: rect.x + rect.w,
    },
  ];
}

function areOppositeSides(a: EdgeSide, b: EdgeSide): boolean {
  return (a === "west" && b === "east")
    || (a === "east" && b === "west")
    || (a === "south" && b === "north")
    || (a === "north" && b === "south");
}

function sharedEdgeBetween(a: FloorRegion, b: FloorRegion): SharedEdge | null {
  for (const edgeA of regionEdges(a)) {
    for (const edgeB of regionEdges(b)) {
      if (edgeA.orientation !== edgeB.orientation) continue;
      if (!areOppositeSides(edgeA.side, edgeB.side)) continue;
      if (Math.abs(edgeA.coord - edgeB.coord) > EDGE_EPSILON_M) continue;
      const start = Math.max(edgeA.start, edgeB.start);
      const end = Math.min(edgeA.end, edgeB.end);
      if (end - start <= EDGE_EPSILON_M) continue;
      return {
        a: edgeA,
        b: edgeB,
        orientation: edgeA.orientation,
        coord: (edgeA.coord + edgeB.coord) * 0.5,
        start,
        end,
      };
    }
  }
  return null;
}

function pointOnEdge(edge: SurfaceEdge, along: number): { x: number; z: number } {
  return edge.orientation === "vertical"
    ? { x: edge.coord, z: along }
    : { x: along, z: edge.coord };
}

function sampleRegionElevation(region: FloorRegion, x: number, z: number, fallbackY: number): number {
  return sampleSurface(region.surface, x, z, fallbackY).elevationM;
}

function sharedEdgeHasMatchingElevation(shared: SharedEdge, fallbackY: number): boolean {
  for (const along of [shared.start, shared.end, (shared.start + shared.end) * 0.5]) {
    const pointA = pointOnEdge(shared.a, along);
    const pointB = pointOnEdge(shared.b, along);
    const elevationA = sampleRegionElevation(shared.a.region, pointA.x, pointA.z, fallbackY);
    const elevationB = sampleRegionElevation(shared.b.region, pointB.x, pointB.z, fallbackY);
    if (Math.abs(elevationA - elevationB) > ELEVATION_EPSILON_M) return false;
  }
  return true;
}

function isElevatedRegion(region: FloorRegion, fallbackY: number): boolean {
  const { rect } = region;
  const elevations = [
    sampleRegionElevation(region, rect.x, rect.y, fallbackY),
    sampleRegionElevation(region, rect.x + rect.w, rect.y, fallbackY),
    sampleRegionElevation(region, rect.x + rect.w, rect.y + rect.h, fallbackY),
    sampleRegionElevation(region, rect.x, rect.y + rect.h, fallbackY),
  ];
  return Math.max(...elevations) > fallbackY + ELEVATED_FASCIA_MIN_HEIGHT_M;
}

function isElevationJoin(shared: SharedEdge, fallbackY: number): boolean {
  return shared.a.region.surface?.kind === "ramp"
    || shared.b.region.surface?.kind === "ramp"
    || isElevatedRegion(shared.a.region, fallbackY)
    || isElevatedRegion(shared.b.region, fallbackY);
}

function thresholdRectForEdgeSide(shared: SharedEdge, side: EdgeSide, halfWidthM: number): RuntimeRect {
  if (shared.orientation === "vertical") {
    return {
      x: side === "east" ? shared.coord - halfWidthM : shared.coord,
      y: shared.start,
      w: halfWidthM,
      h: shared.end - shared.start,
    };
  }
  return {
    x: shared.start,
    y: side === "north" ? shared.coord - halfWidthM : shared.coord,
    w: shared.end - shared.start,
    h: halfWidthM,
  };
}

function resolveThresholdMaterialId(_a: FloorMaterialId, _b: FloorMaterialId): FloorMaterialId {
  // A material change is an architectural joint, not a half-width extension
  // of either paving field. One world-scaled flagstone course gives every
  // court, lane and ramp transition the same readable construction language.
  return "large_sandstone_blocks_01";
}

function appendV3TransitionBands(
  regions: readonly FloorRegion[],
  batches: Map<FloorMaterialId, MaterialBatch>,
  opts: BuildPbrFloorsOptions,
  stats: FloorPolishStats,
): void {
  for (let aIndex = 0; aIndex < regions.length; aIndex += 1) {
    const a = regions[aIndex]!;
    for (let bIndex = aIndex + 1; bIndex < regions.length; bIndex += 1) {
      const b = regions[bIndex]!;
      const shared = sharedEdgeBetween(a, b);
      if (!shared || !sharedEdgeHasMatchingElevation(shared, opts.floorTopY)) continue;

      const materialChanges = a.materialId !== b.materialId;
      const elevationChanges = isElevationJoin(shared, opts.floorTopY);
      if (!materialChanges && !elevationChanges) continue;
      if (elevationChanges) stats.elevationJoinCount += 1;

      if (!materialChanges) {
        stats.sameMaterialWeldCount += 1;
        if (elevationChanges) {
          // The surfaces remain analytically welded, while one narrow, nearly
          // flush grey-stone threshold makes the terrace/ramp construction
          // intentional. This replaces the former pale same-material overlay.
          const thresholdMaterialId: FloorMaterialId = "grey_tiles";
          const batch = getBatch(batches, thresholdMaterialId);
          const tileSizeM = opts.manifest.getTileSizeM(thresholdMaterialId);
          for (const edge of [shared.a, shared.b]) {
            appendPatchQuad(
              batch,
              thresholdRectForEdgeSide(shared, edge.side, ELEVATION_THRESHOLD_WIDTH_M * 0.5),
              edge.region.surface,
              opts.floorTopY,
              tileSizeM,
              UV_QUARTER_TURNS,
              UV_OFFSET_U,
              UV_OFFSET_V,
              ELEVATION_THRESHOLD_RISE_M,
            );
          }
          stats.transitionBandCount += 1;
          stats.elevationThresholdCount += 1;
        }
        continue;
      }

      const widthM = MATERIAL_THRESHOLD_WIDTH_M;
      const riseM = MATERIAL_THRESHOLD_RISE_M;
      const materialId = resolveThresholdMaterialId(a.materialId, b.materialId);
      const batch = getBatch(batches, materialId);
      const tileSizeM = opts.manifest.getTileSizeM(materialId);

      for (const edge of [shared.a, shared.b]) {
        appendPatchQuad(
          batch,
          thresholdRectForEdgeSide(shared, edge.side, widthM * 0.5),
          edge.region.surface,
          opts.floorTopY,
          tileSizeM,
          UV_QUARTER_TURNS,
          UV_OFFSET_U,
          UV_OFFSET_V,
          riseM,
        );
      }

      stats.transitionBandCount += 1;
      if (materialChanges) stats.materialTransitionCount += 1;
    }
  }
}

function subtractIntervals(
  interval: { start: number; end: number },
  cutters: readonly { start: number; end: number }[],
): Array<{ start: number; end: number }> {
  return cutters.reduce<Array<{ start: number; end: number }>>(
    (parts, cutter) => parts.flatMap((part) => {
      const start = Math.max(part.start, cutter.start);
      const end = Math.min(part.end, cutter.end);
      if (end - start <= EDGE_EPSILON_M) return [part];
      const next: Array<{ start: number; end: number }> = [];
      if (start - part.start > EDGE_EPSILON_M) next.push({ start: part.start, end: start });
      if (part.end - end > EDGE_EPSILON_M) next.push({ start: end, end: part.end });
      return next;
    }),
    [interval],
  );
}

function appendFasciaQuad(
  batch: MaterialBatch,
  edge: SurfaceEdge,
  start: number,
  end: number,
  fallbackY: number,
  tileSizeM: number,
): boolean {
  const forward = edge.side === "west" || edge.side === "north";
  const along0 = forward ? start : end;
  const along1 = forward ? end : start;
  const point0 = pointOnEdge(edge, along0);
  const point1 = pointOnEdge(edge, along1);
  const outwardX = edge.side === "west" ? -1 : edge.side === "east" ? 1 : 0;
  const outwardZ = edge.side === "south" ? -1 : edge.side === "north" ? 1 : 0;
  point0.x += outwardX * ELEVATED_FASCIA_OUTSET_M;
  point0.z += outwardZ * ELEVATED_FASCIA_OUTSET_M;
  point1.x += outwardX * ELEVATED_FASCIA_OUTSET_M;
  point1.z += outwardZ * ELEVATED_FASCIA_OUTSET_M;

  const top0 = sampleRegionElevation(edge.region, point0.x, point0.z, fallbackY);
  const top1 = sampleRegionElevation(edge.region, point1.x, point1.z, fallbackY);
  if (Math.max(top0, top1) <= fallbackY + ELEVATED_FASCIA_MIN_HEIGHT_M) return false;
  const bottom0 = Math.max(fallbackY - 0.01, top0 - ELEVATED_FASCIA_DEPTH_M);
  const bottom1 = Math.max(fallbackY - 0.01, top1 - ELEVATED_FASCIA_DEPTH_M);
  const normal = { x: outwardX, y: 0, z: outwardZ };
  const baseIndex = batch.vertexCount;
  const u0 = along0 / tileSizeM;
  const u1 = along1 / tileSizeM;

  pushVertex(batch, point0.x, bottom0, point0.z, u0, bottom0 / tileSizeM, normal);
  pushVertex(batch, point1.x, bottom1, point1.z, u1, bottom1 / tileSizeM, normal);
  pushVertex(batch, point1.x, top1, point1.z, u1, top1 / tileSizeM, normal);
  pushVertex(batch, point0.x, top0, point0.z, u0, top0 / tileSizeM, normal);
  batch.indices.push(
    baseIndex,
    baseIndex + 1,
    baseIndex + 2,
    baseIndex,
    baseIndex + 2,
    baseIndex + 3,
  );
  batch.vertexCount += 4;
  return true;
}

function appendV3ElevatedFascias(
  regions: readonly FloorRegion[],
  fasciaBatches: Map<FloorMaterialId, MaterialBatch>,
  opts: BuildPbrFloorsOptions,
  stats: FloorPolishStats,
): void {
  const allEdges = regions.flatMap(regionEdges);
  for (const edge of allEdges) {
    if (!isElevatedRegion(edge.region, opts.floorTopY)) continue;
    const connectedIntervals: Array<{ start: number; end: number }> = [];
    for (const other of allEdges) {
      if (other.region === edge.region) continue;
      if (other.orientation !== edge.orientation || !areOppositeSides(edge.side, other.side)) continue;
      if (Math.abs(edge.coord - other.coord) > EDGE_EPSILON_M) continue;
      const start = Math.max(edge.start, other.start);
      const end = Math.min(edge.end, other.end);
      if (end - start <= EDGE_EPSILON_M) continue;
      const shared: SharedEdge = {
        a: edge,
        b: other,
        orientation: edge.orientation,
        coord: edge.coord,
        start,
        end,
      };
      if (sharedEdgeHasMatchingElevation(shared, opts.floorTopY)) {
        connectedIntervals.push({ start, end });
      }
    }

    const exposedIntervals = subtractIntervals(
      { start: edge.start, end: edge.end },
      connectedIntervals,
    );
    const tileSizeM = opts.manifest.getTileSizeM(edge.region.materialId);
    const batch = getBatch(fasciaBatches, edge.region.materialId);
    for (const exposed of exposedIntervals) {
      const segmentCount = Math.max(
        1,
        Math.ceil((exposed.end - exposed.start) / ELEVATED_FASCIA_MAX_SEGMENT_M),
      );
      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const start = exposed.start
          + ((exposed.end - exposed.start) * segmentIndex) / segmentCount;
        const end = exposed.start
          + ((exposed.end - exposed.start) * (segmentIndex + 1)) / segmentCount;
        if (appendFasciaQuad(batch, edge, start, end, opts.floorTopY, tileSizeM)) {
          stats.fasciaQuadCount += 1;
        }
      }
    }
  }
}

function createFloorMaterial(
  materialId: FloorMaterialId,
  opts: BuildPbrFloorsOptions,
  namePrefix: string,
) {
  const material = opts.manifest.createStandardMaterial(materialId, opts.quality);
  material.name = `${namePrefix}-${materialId}-${opts.quality}`;
  const albedoBoost =
    typeof material.userData.floorAlbedoBoost === "number" && Number.isFinite(material.userData.floorAlbedoBoost)
      ? material.userData.floorAlbedoBoost
      : 1;
  const albedoGamma =
    typeof material.userData.floorAlbedoGamma === "number" && Number.isFinite(material.userData.floorAlbedoGamma)
      ? material.userData.floorAlbedoGamma
      : 1;
  const dustStrength =
    typeof material.userData.floorDustStrength === "number" && Number.isFinite(material.userData.floorDustStrength)
      ? material.userData.floorDustStrength
      : 0;
  const macro = FLOOR_MACRO_SETTINGS[materialId];
  applyFloorShaderTweaks(material, {
    albedoBoost,
    albedoGamma,
    dustStrength,
    macroColorAmplitude: macro.colorAmplitude,
    macroRoughnessAmplitude: macro.roughnessAmplitude,
    macroFrequency: macro.frequency,
    macroSeed: deriveSubSeed(opts.seed, `floor-macro:${materialId}`),
  });
  return material;
}

export function buildPbrFloors(spec: RuntimeBlockoutSpec, opts: BuildPbrFloorsOptions): Group {
  const root = new Group();
  root.name = "map-pbr-floors";

  const batches = new Map<FloorMaterialId, MaterialBatch>();
  const fasciaBatches = new Map<FloorMaterialId, MaterialBatch>();
  const patchSizeM = Math.max(0.25, opts.patchSizeM);
  const gridOriginX = spec.playable_boundary.x;
  const gridOriginZ = spec.playable_boundary.y;
  const surfacesById = new Map((spec.traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  const occupiedFloorRects: RuntimeRect[] = [];
  const regions: FloorRegion[] = [];
  const isV3 = V3_FORMAT.test(spec.formatVersion ?? "");
  const polishStats: FloorPolishStats = {
    transitionBandCount: 0,
    materialTransitionCount: 0,
    elevationJoinCount: 0,
    elevationThresholdCount: 0,
    sameMaterialWeldCount: 0,
    fasciaQuadCount: 0,
    stairTreadCount: 0,
    stairRiserCount: 0,
  };

  for (const zone of spec.zones) {
    if (!INCLUDED_ZONE_TYPES.has(zone.type)) continue;

    const materialId = resolveZoneMaterialId(zone, isV3);
    const tileSizeM = opts.manifest.getTileSizeM(materialId);
    const batch = getBatch(batches, materialId);
    const zoneFloorRects = occupiedFloorRects.reduce<RuntimeRect[]>(
      (parts, occupied) => parts.flatMap((part) => subtractRect(part, occupied)),
      [zone.rect],
    );
    occupiedFloorRects.push(zone.rect);
    const surface = resolveZoneSurface(zone, surfacesById, isV3);
    const uvVariation = resolveZoneUvVariation(opts.seed, zone.id);
    regions.push({
      zoneId: zone.id,
      rect: zone.rect,
      materialId,
      uvQuarterTurns: uvVariation.quarterTurns,
      uvOffsetU: uvVariation.offsetU,
      uvOffsetV: uvVariation.offsetV,
      ...(surface ? { surface } : {}),
    });
    for (const rect of zoneFloorRects) {
      const cellXStart = Math.floor((rect.x - gridOriginX) / patchSizeM);
      const cellXEnd = Math.ceil((rect.x + rect.w - gridOriginX) / patchSizeM) - 1;
      const cellZStart = Math.floor((rect.y - gridOriginZ) / patchSizeM);
      const cellZEnd = Math.ceil((rect.y + rect.h - gridOriginZ) / patchSizeM) - 1;

      for (let cellZ = cellZStart; cellZ <= cellZEnd; cellZ += 1) {
        for (let cellX = cellXStart; cellX <= cellXEnd; cellX += 1) {
          const cellRect: RuntimeRect = {
            x: gridOriginX + cellX * patchSizeM,
            y: gridOriginZ + cellZ * patchSizeM,
            w: patchSizeM,
            h: patchSizeM,
          };
          const patchRect = intersectRect(rect, cellRect);
          if (!patchRect) continue;

          appendPatchQuad(
            batch,
            patchRect,
            surface,
            opts.floorTopY,
            tileSizeM,
            uvVariation.quarterTurns,
            uvVariation.offsetU,
            uvVariation.offsetV,
          );
        }
      }
    }
  }

  if (isV3) {
    appendV3TransitionBands(regions, batches, opts, polishStats);
    appendV3PbrStairs(regions, batches, opts, polishStats);
    appendV3ElevatedFascias(regions, fasciaBatches, opts, polishStats);
    root.userData.floorPolish = Object.freeze({ formatVersion: spec.formatVersion, ...polishStats });
  }

  for (const materialId of MATERIAL_ORDER) {
    const batch = batches.get(materialId);
    if (!batch || batch.vertexCount === 0) continue;

    const geometry = finalizeGeometry(batch);
    const material = createFloorMaterial(materialId, opts, "floor");

    const mesh = new Mesh(geometry, material);
    mesh.name = `floor-${materialId}`;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  for (const materialId of MATERIAL_ORDER) {
    const batch = fasciaBatches.get(materialId);
    if (!batch || batch.vertexCount === 0) continue;
    const geometry = finalizeGeometry(batch);
    const material = createFloorMaterial(materialId, opts, "floor-edge-fascia");
    const mesh = new Mesh(geometry, material);
    mesh.name = `floor-edge-fascia-${materialId}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  return root;
}

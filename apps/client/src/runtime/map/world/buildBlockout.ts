import { courtyardVisualSegments, roofFragments, sectionVisualSegments, readSectionBoundaryCoverage, type SectionBoundaryCoverage } from "../sections/sectionRetirement";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import type { FloorMaterialLibrary } from "../../render/materials/FloorMaterialLibrary";
import type { WallMaterialLibrary, WallTextureQuality } from "../../render/materials/WallMaterialLibrary";
import type {
  RuntimeAnchorsSpec,
  RuntimeBlockoutSpec,
  RuntimeBlockoutZone,
  RuntimeRampTraversalSurface,
  RuntimeRect,
  RuntimeTraversalSurface,
} from "../spec/types";
import type { RuntimeColliderAabb } from "../../sim/collision/WorldColliders";
import { TraversalSurfaceResolver } from "../../sim/TraversalSurfaceResolver";
import { BLOCKOUT_PALETTE } from "../../render/BlockoutMaterials";
import type { RuntimeFloorMode, RuntimeFloorQuality, RuntimeWallMode } from "../../utils/UrlParams";
import { buildPbrFloors } from "../floors/buildPbrFloors";
import { buildFloorWearDecals } from "../floors/floorWearDecals";
import { buildSandAccumulation } from "../floors/buildSandAccumulation";
import { buildWallBaseDebris } from "../walls/buildWallBaseDebris";
import { buildPbrWalls } from "../walls/buildPbrWalls";
import { buildWallDetailMeshes } from "../architecture/wallDetailKit";
import { buildAuthoredPlacements, buildSectionModels, validateSectionBounds } from "../sections/buildFacadeModels";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { buildArchitecture, type WallDetailPlacementStats } from "../architecture/architecture";
import { planVisualWallSegments } from "../architecture/visualWallSegments";
import { applyWallShaderTweaks } from "../../render/materials/applyWallShaderTweaks";
import { applySurfaceWeathering, createSurfaceDetailSet } from "../../render/materials/surfaceWeathering";
import { buildStreetAtmosphere, STREET_DETAIL_MATERIAL_IDS, atmosphereAppliesTo } from "../atmosphere/buildStreetAtmosphere";
import { resolveWallShaderProfile } from "../walls/wallShaderProfiles";
import { DeterministicRng, deriveSubSeed } from "../../utils/Rng";

const WALKABLE_ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "cut",
  "connector",
]);

const STALL_STRIP_ZONE_TYPE = "stall_strip";
const CLEAR_TRAVEL_ZONE_TYPE = "clear_travel_zone";

const BASE_FLOOR_THICKNESS_M = 0.06;
const OVERLAY_FLOOR_THICKNESS_M = 0.02;

function resolveWallTextureQuality(floorQuality: RuntimeFloorQuality): WallTextureQuality {
  if (floorQuality === "1k") return "1k";
  return "2k";
}

export type BoundarySegment = {
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
  outward: -1 | 1;
};

export type BlockoutBuildResult = {
  root: Group;
  colliders: RuntimeColliderAabb[];
  wallDetailStats: WallDetailPlacementStats;
};

export type BlockoutBuildOptions = {
  seed: number;
  floorMode: RuntimeFloorMode;
  wallMode: RuntimeWallMode;
  floorQuality: RuntimeFloorQuality;
  floorMaterials: FloorMaterialLibrary | null;
  wallMaterials: WallMaterialLibrary | null;
  anchors: RuntimeAnchorsSpec | null;
  /** Authored section and placement GLBs (facades/models.json). */
  facadeModels?: PropModelLibrary | null;
};

export function usesAuthoredVisualWallOwnership(
  wallMode: RuntimeWallMode,
  wallDetailStyle: string,
): boolean {
  return wallMode === "pbr"
    && wallDetailStyle === "bazaar";
}

function rectContainsPoint(rect: RuntimeRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function collectAxisCoordinates(rects: RuntimeRect[], boundary: RuntimeRect): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([boundary.x, boundary.x + boundary.w]);
  const ys = new Set<number>([boundary.y, boundary.y + boundary.h]);

  for (const rect of rects) {
    xs.add(rect.x);
    xs.add(rect.x + rect.w);
    ys.add(rect.y);
    ys.add(rect.y + rect.h);
  }

  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
  };
}

function buildInsideGrid(walkableRects: RuntimeRect[], xs: number[], ys: number[]): boolean[][] {
  const rows = ys.length - 1;
  const cols = xs.length - 1;
  const inside: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < cols; xIndex += 1) {
      const centerX = (xs[xIndex]! + xs[xIndex + 1]!) * 0.5;
      const centerY = (ys[yIndex]! + ys[yIndex + 1]!) * 0.5;
      inside[yIndex]![xIndex] = walkableRects.some((rect) => rectContainsPoint(rect, centerX, centerY));
    }
  }

  return inside;
}

function extractBoundarySegments(inside: boolean[][], xs: number[], ys: number[]): BoundarySegment[] {
  const rows = inside.length;
  const cols = inside[0]?.length ?? 0;
  const segments: BoundarySegment[] = [];

  const isInside = (xIndex: number, yIndex: number): boolean => {
    if (xIndex < 0 || yIndex < 0 || xIndex >= cols || yIndex >= rows) return false;
    return inside[yIndex]?.[xIndex] ?? false;
  };

  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < cols; xIndex += 1) {
      if (!inside[yIndex]?.[xIndex]) continue;

      const x0 = xs[xIndex]!;
      const x1 = xs[xIndex + 1]!;
      const y0 = ys[yIndex]!;
      const y1 = ys[yIndex + 1]!;

      if (!isInside(xIndex - 1, yIndex)) {
        segments.push({ orientation: "vertical", coord: x0, start: y0, end: y1, outward: -1 });
      }
      if (!isInside(xIndex + 1, yIndex)) {
        segments.push({ orientation: "vertical", coord: x1, start: y0, end: y1, outward: 1 });
      }
      if (!isInside(xIndex, yIndex - 1)) {
        segments.push({ orientation: "horizontal", coord: y0, start: x0, end: x1, outward: -1 });
      }
      if (!isInside(xIndex, yIndex + 1)) {
        segments.push({ orientation: "horizontal", coord: y1, start: x0, end: x1, outward: 1 });
      }
    }
  }

  return segments;
}

function mergeBoundarySegments(segments: BoundarySegment[]): BoundarySegment[] {
  const EPS = 1e-6;
  const sorted = [...segments].sort((a, b) => {
    if (a.orientation !== b.orientation) return a.orientation.localeCompare(b.orientation);
    if (a.coord !== b.coord) return a.coord - b.coord;
    if (a.outward !== b.outward) return a.outward - b.outward;
    return a.start - b.start;
  });

  const merged: BoundarySegment[] = [];
  for (const segment of sorted) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.orientation === segment.orientation &&
      Math.abs(previous.coord - segment.coord) < EPS &&
      previous.outward === segment.outward &&
      Math.abs(previous.end - segment.start) < EPS
    ) {
      previous.end = segment.end;
      continue;
    }
    merged.push({ ...segment });
  }

  return merged;
}

const SURFACE_EDGE_EPSILON_M = 1e-5;
const RAMP_WALL_MAX_SLICE_M = 1;
const BOUNDARY_COPING_HEIGHT_M = 0.32;
const BOUNDARY_COPING_OUTSET_M = 0.12;
const BOUNDARY_COPING_MIN_RUN_M = 5.5;
const BOUNDARY_COPING_FIREWALL_MIN_HEIGHT_M = 7;
const BOUNDARY_BASE_HEIGHT_M = 0.48;
const BOUNDARY_BASE_OUTSET_M = 0.08;
const BOUNDARY_TERMINAL_RETURN_DEPTH_M = 0.04;
const BOUNDARY_CORNER_JUNCTION_WIDTH_M = 0.39;
const BOUNDARY_CORNICE_FASCIA_HEIGHT_M = 0.48;
const BOUNDARY_CORNICE_FASCIA_DEPTH_M = 0.08;
// These locked-layout boundary runs are fully covered by authored Spawn-B
// frontage contact courses. Emitting both owners creates the audited stacked
// white streaks; the collision walls remain unchanged.
const ARCHITECTURE_OWNED_BASE_SOURCE_LABELS = new Set([34, 36, 79, 103]);

export function splitBoundarySegmentsAtTraversalSurfaceEdges(
  segments: readonly BoundarySegment[],
  surfaces: readonly RuntimeTraversalSurface[],
): BoundarySegment[] {
  if (surfaces.length === 0) return segments.map((segment) => ({ ...segment }));

  return segments.flatMap((segment) => {
    const cuts = new Set<number>([segment.start, segment.end]);
    for (const surface of surfaces) {
      const rect = surface.rect;
      const isSurfaceEdge = segment.orientation === "vertical"
        ? Math.abs(segment.coord - rect.x) <= SURFACE_EDGE_EPSILON_M
          || Math.abs(segment.coord - (rect.x + rect.w)) <= SURFACE_EDGE_EPSILON_M
        : Math.abs(segment.coord - rect.y) <= SURFACE_EDGE_EPSILON_M
          || Math.abs(segment.coord - (rect.y + rect.h)) <= SURFACE_EDGE_EPSILON_M;
      if (!isSurfaceEdge) continue;

      const surfaceStart = segment.orientation === "vertical" ? rect.y : rect.x;
      const surfaceEnd = segment.orientation === "vertical" ? rect.y + rect.h : rect.x + rect.w;
      const overlapStart = Math.max(segment.start, surfaceStart);
      const overlapEnd = Math.min(segment.end, surfaceEnd);
      if (overlapEnd - overlapStart <= SURFACE_EDGE_EPSILON_M) continue;
      cuts.add(overlapStart);
      cuts.add(overlapEnd);

      const rampRunsAlongSegment = surface.kind === "ramp"
        && ((segment.orientation === "vertical" && surface.axis === "y")
          || (segment.orientation === "horizontal" && surface.axis === "x"));
      if (!rampRunsAlongSegment) continue;
      const stepCount = surface.visualStyle === "stairs" && typeof surface.stepCount === "number"
        ? surface.stepCount
        : Math.max(1, Math.ceil((surfaceEnd - surfaceStart) / RAMP_WALL_MAX_SLICE_M));
      for (let index = 1; index < stepCount; index += 1) {
        const cut = surfaceStart + ((surfaceEnd - surfaceStart) * index) / stepCount;
        if (cut > overlapStart + SURFACE_EDGE_EPSILON_M && cut < overlapEnd - SURFACE_EDGE_EPSILON_M) {
          cuts.add(cut);
        }
      }
    }

    const sortedCuts = [...cuts]
      .filter((cut) => cut >= segment.start - SURFACE_EDGE_EPSILON_M && cut <= segment.end + SURFACE_EDGE_EPSILON_M)
      .sort((left, right) => left - right);
    const split: BoundarySegment[] = [];
    for (let index = 0; index < sortedCuts.length - 1; index += 1) {
      const start = sortedCuts[index]!;
      const end = sortedCuts[index + 1]!;
      if (end - start <= SURFACE_EDGE_EPSILON_M) continue;
      split.push({ ...segment, start, end });
    }
    return split;
  });
}

export function deriveBlockoutWallSegments(spec: RuntimeBlockoutSpec): BoundarySegment[] {
  const walkableRects = spec.zones
    .filter((zone) => WALKABLE_ZONE_TYPES.has(zone.type))
    .map((zone) => zone.rect);
  const axes = collectAxisCoordinates(walkableRects, spec.playable_boundary);
  const inside = buildInsideGrid(walkableRects, axes.xs, axes.ys);
  return splitBoundarySegmentsAtTraversalSurfaceEdges(
    mergeBoundarySegments([
      ...extractBoundarySegments(inside, axes.xs, axes.ys),
      ...spec.exterior_wall_patches,
    ]),
    spec.traversalSurfaces ?? [],
  );
}

export type SegmentElevationEnvelope = {
  minY: number;
  maxY: number;
};

export function resolveSegmentElevationEnvelopes(
  segments: readonly BoundarySegment[],
  surfaces: readonly RuntimeTraversalSurface[],
  fallbackY: number,
): SegmentElevationEnvelope[] {
  if (surfaces.length === 0) return segments.map(() => ({ minY: fallbackY, maxY: fallbackY }));
  const resolver = new TraversalSurfaceResolver(surfaces);
  return segments.map((segment) => {
    const inwardProbeM = 0.08;
    const insetAlongM = Math.min(0.002, Math.max(0, (segment.end - segment.start) * 0.1));
    const alongSamples = [
      segment.start + insetAlongM,
      (segment.start + segment.end) * 0.5,
      segment.end - insetAlongM,
    ];
    const elevations = alongSamples.map((along) => {
      const x = segment.orientation === "vertical"
        ? segment.coord - segment.outward * inwardProbeM
        : along;
      const z = segment.orientation === "horizontal"
        ? segment.coord - segment.outward * inwardProbeM
        : along;
      return resolver.sample(x, z)?.elevationM ?? fallbackY;
    });
    return { minY: Math.min(...elevations), maxY: Math.max(...elevations) };
  });
}

function createFloorInstances(
  rects: RuntimeRect[],
  material: MeshLambertMaterial,
  thicknessM: number,
  topY: number,
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  if (rects.length === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, rects.length);
  mesh.frustumCulled = false;

  const dummy = new Object3D();
  const centerY = topY - thicknessM * 0.5;

  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i]!;
    dummy.position.set(rect.x + rect.w * 0.5, centerY, rect.y + rect.h * 0.5);
    dummy.scale.set(rect.w, thicknessM, rect.h);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createTraversalFloorGroup(
  zones: readonly RuntimeBlockoutZone[],
  surfaces: readonly RuntimeTraversalSurface[],
  material: MeshLambertMaterial,
  thicknessM: number,
  fallbackTopY: number,
  topOffsetM = 0,
): Group | null {
  if (zones.length === 0) return null;

  const root = new Group();
  const geometry = new BoxGeometry(1, 1, 1);
  const surfacesById = new Map(surfaces.map((surface) => [surface.id, surface]));

  for (const zone of zones) {
    const surface = zone.surfaceId ? surfacesById.get(zone.surfaceId) : undefined;
    const rect = zone.rect;
    const mesh = new Mesh(geometry, material);
    mesh.name = `surface-floor-${zone.id}`;
    mesh.receiveShadow = topOffsetM <= 0;
    mesh.castShadow = false;

    if (!surface || surface.kind === "flat") {
      const topY = (surface?.elevationM ?? fallbackTopY) + topOffsetM;
      mesh.position.set(
        rect.x + rect.w * 0.5,
        topY - thicknessM * 0.5,
        rect.y + rect.h * 0.5,
      );
      mesh.scale.set(rect.w, thicknessM, rect.h);
    } else {
      const delta = surface.endElevationM - surface.startElevationM;
      const horizontalLength = surface.axis === "x" ? rect.w : rect.h;
      const slopedLength = Math.hypot(horizontalLength, delta);
      mesh.position.set(
        rect.x + rect.w * 0.5,
        (surface.startElevationM + surface.endElevationM) * 0.5 + topOffsetM - thicknessM * 0.5,
        rect.y + rect.h * 0.5,
      );
      if (surface.axis === "x") {
        mesh.rotation.z = Math.atan2(delta, horizontalLength);
        mesh.scale.set(slopedLength, thicknessM, rect.h);
      } else {
        mesh.rotation.x = -Math.atan2(delta, horizontalLength);
        mesh.scale.set(rect.w, thicknessM, slopedLength);
      }
    }
    root.add(mesh);
  }

  return root.children.length > 0 ? root : null;
}

function createVisualStairTreads(
  surfaces: readonly RuntimeTraversalSurface[],
  material: MeshLambertMaterial,
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  const stairSurfaces = surfaces.filter(
    (surface): surface is RuntimeRampTraversalSurface => (
      surface.kind === "ramp" && surface.visualStyle === "stairs"
    ),
  );
  const totalSteps = stairSurfaces.reduce((sum, surface) => sum + (surface.stepCount ?? 10), 0);
  if (totalSteps === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, totalSteps);
  mesh.name = "map-visual-stair-treads";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const dummy = new Object3D();
  const treadThicknessM = 0.06;
  let instanceIndex = 0;

  for (const surface of stairSurfaces) {
    if (surface.kind !== "ramp") continue;
    const stepCount = surface.stepCount ?? 10;
    const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const stepLength = axisLength / stepCount;
    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const t0 = stepIndex / stepCount;
      const t1 = (stepIndex + 1) / stepCount;
      const elevation0 = surface.startElevationM
        + (surface.endElevationM - surface.startElevationM) * t0;
      const elevation1 = surface.startElevationM
        + (surface.endElevationM - surface.startElevationM) * t1;
      const stepRiseM = Math.abs(elevation1 - elevation0);
      // Use the higher edge as the tread top in both traversal directions and
      // extend the visual box through the full riser. The former fixed 6 cm
      // slab left dark open bands on the authored 14 cm descent steps even
      // though movement correctly used the underlying analytic ramp.
      const topY = Math.max(elevation0, elevation1) + 0.025;
      const visualStepHeightM = stepRiseM + treadThicknessM;
      const x = surface.axis === "x"
        ? surface.rect.x + axisLength * (t0 + t1) * 0.5
        : surface.rect.x + surface.rect.w * 0.5;
      const z = surface.axis === "y"
        ? surface.rect.y + axisLength * (t0 + t1) * 0.5
        : surface.rect.y + surface.rect.h * 0.5;
      dummy.position.set(x, topY - visualStepHeightM * 0.5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(
        surface.axis === "x" ? stepLength + 0.025 : surface.rect.w,
        visualStepHeightM,
        surface.axis === "y" ? stepLength + 0.025 : surface.rect.h,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      instanceIndex += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createWallInstances(
  segments: BoundarySegment[],
  material: MeshLambertMaterial,
  wallHeightM: number,
  wallThicknessM: number,
  floorTopY: number,
  segmentHeights?: readonly number[],
  segmentBaseYs?: readonly number[],
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  if (segments.length === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, segments.length);
  mesh.frustumCulled = false;

  const dummy = new Object3D();

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    const lengthM = segment.end - segment.start;
    const segHeight = segmentHeights?.[i] ?? wallHeightM;
    const centerY = (segmentBaseYs?.[i] ?? floorTopY) + segHeight * 0.5;

    let centerX = 0;
    let centerZ = 0;
    let sizeX = 0;
    let sizeZ = 0;

    if (segment.orientation === "vertical") {
      centerX = segment.coord + segment.outward * (wallThicknessM * 0.5);
      centerZ = (segment.start + segment.end) * 0.5;
      sizeX = wallThicknessM;
      sizeZ = lengthM;
    } else {
      centerX = (segment.start + segment.end) * 0.5;
      centerZ = segment.coord + segment.outward * (wallThicknessM * 0.5);
      sizeX = lengthM;
      sizeZ = wallThicknessM;
    }

    dummy.position.set(centerX, centerY, centerZ);
    dummy.scale.set(sizeX, segHeight, sizeZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function appendWallSegmentColliders(
  segments: BoundarySegment[],
  wallHeightM: number,
  wallThicknessM: number,
  floorTopY: number,
  colliders: RuntimeColliderAabb[],
  segmentHeights?: readonly number[],
  segmentBaseYs?: readonly number[],
): void {
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    const segmentHeightM = segmentHeights?.[i] ?? wallHeightM;
    const segmentBaseY = segmentBaseYs?.[i] ?? floorTopY;
    const centerY = segmentBaseY + segmentHeightM * 0.5;
    const lengthM = segment.end - segment.start;
    let centerX = 0;
    let centerZ = 0;
    let sizeX = 0;
    let sizeZ = 0;

    if (segment.orientation === "vertical") {
      centerX = segment.coord + segment.outward * (wallThicknessM * 0.5);
      centerZ = (segment.start + segment.end) * 0.5;
      sizeX = wallThicknessM;
      sizeZ = lengthM;
    } else {
      centerX = (segment.start + segment.end) * 0.5;
      centerZ = segment.coord + segment.outward * (wallThicknessM * 0.5);
      sizeX = lengthM;
      sizeZ = wallThicknessM;
    }

    colliders.push({
      id: `wall-${i + 1}`,
      kind: "wall",
      min: {
        x: centerX - sizeX * 0.5,
        y: centerY - segmentHeightM * 0.5,
        z: centerZ - sizeZ * 0.5,
      },
      max: {
        x: centerX + sizeX * 0.5,
        y: centerY + segmentHeightM * 0.5,
        z: centerZ + sizeZ * 0.5,
      },
    });
  }
}

type BoundaryFinishBox = {
  placementId: string;
  semanticClass:
    | "structural_wall_coping"
    | "structural_wall_cornice_fascia"
    | "structural_wall_base_course"
    | "structural_wall_terminal_return"
    | "structural_wall_corner_junction";
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  face?: { widthM: number; heightM: number; yawRad: number };
};

type BoundaryFinishRun = {
  segment: BoundarySegment;
  baseY: number;
  topY: number;
  sourceIndices: number[];
};

function mergeBoundaryFinishRuns(
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
): BoundaryFinishRun[] {
  const candidates = segments.map((segment, index) => ({
    segment: { ...segment },
    baseY: segmentBaseYs[index]!,
    topY: segmentBaseYs[index]! + segmentHeights[index]!,
    sourceIndices: [index],
  })).sort((left, right) => (
    left.segment.orientation.localeCompare(right.segment.orientation)
    || left.segment.coord - right.segment.coord
    || left.segment.outward - right.segment.outward
    || left.baseY - right.baseY
    || left.topY - right.topY
    || left.segment.start - right.segment.start
  ));
  const runs: BoundaryFinishRun[] = [];
  for (const candidate of candidates) {
    const previous = runs[runs.length - 1];
    if (
      previous
      && previous.segment.orientation === candidate.segment.orientation
      && previous.segment.outward === candidate.segment.outward
      && Math.abs(previous.segment.coord - candidate.segment.coord) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.segment.end - candidate.segment.start) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.baseY - candidate.baseY) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.topY - candidate.topY) <= SURFACE_EDGE_EPSILON_M
    ) {
      previous.segment.end = candidate.segment.end;
      previous.sourceIndices.push(...candidate.sourceIndices);
      continue;
    }
    runs.push(candidate);
  }
  return runs;
}

export function createBoundaryFinishTrim(
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
  wallThicknessM: number,
  material: MeshStandardMaterial,
  seed: number,
  receiverCoverage: readonly SectionBoundaryCoverage[] = [],
): Group | null {
  if (segments.length === 0) return null;
  const copings: BoundaryFinishBox[] = [];
  const corniceFascias: BoundaryFinishBox[] = [];
  const bases: BoundaryFinishBox[] = [];
  const endpointGroups = new Map<string, Array<{
    orientation: BoundarySegment["orientation"];
    outward: BoundarySegment["outward"];
    baseY: number;
    topY: number;
    x: number;
    z: number;
  }>>();
  const endpointKey = (x: number, z: number): string => `${x.toFixed(4)}:${z.toFixed(4)}`;

  const runs = mergeBoundaryFinishRuns(segments, segmentHeights, segmentBaseYs);
  for (const run of runs) {
    const { segment, baseY, topY } = run;
    const sourceLabel = run.sourceIndices.length === 1
      ? `${run.sourceIndices[0]! + 1}`
      : `${run.sourceIndices[0]! + 1}-${run.sourceIndices.at(-1)! + 1}`;
    const lengthM = segment.end - segment.start;
    const wallCenterOffsetM = segment.outward * wallThicknessM * 0.5;
    const horizontal = segment.orientation === "horizontal";
    const centerX = horizontal ? (segment.start + segment.end) * 0.5 : segment.coord + wallCenterOffsetM;
    const centerZ = horizontal ? segment.coord + wallCenterOffsetM : (segment.start + segment.end) * 0.5;
    const inwardFaceYawRad = horizontal
      ? (segment.outward < 0 ? 0 : Math.PI)
      : (segment.outward < 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
    const alongScaleM = lengthM + BOUNDARY_COPING_OUTSET_M * 2;
    const crossScaleM = wallThicknessM + BOUNDARY_COPING_OUTSET_M * 2;
    // Short, low visual fragments usually terminate behind an authored facade
    // or portal. Capping those independently exposes a floating sliver above
    // the occluding mass. Tall firewall fragments remain skyline architecture
    // even when short, so they own the same continuous cap as long runs.
    if (
      lengthM >= BOUNDARY_COPING_MIN_RUN_M
      || topY - baseY >= BOUNDARY_COPING_FIREWALL_MIN_HEIGHT_M
    ) {
      copings.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:coping`,
        semanticClass: "structural_wall_coping",
        position: { x: centerX, y: topY + BOUNDARY_COPING_HEIGHT_M * 0.5, z: centerZ },
        scale: horizontal
          ? { x: alongScaleM, y: BOUNDARY_COPING_HEIGHT_M, z: crossScaleM }
          : { x: crossScaleM, y: BOUNDARY_COPING_HEIGHT_M, z: alongScaleM },
      });
      const inwardFaceOffsetM = -segment.outward * BOUNDARY_CORNICE_FASCIA_DEPTH_M * 0.42;
      corniceFascias.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:cornice-fascia`,
        semanticClass: "structural_wall_cornice_fascia",
        position: horizontal
          ? {
              x: (segment.start + segment.end) * 0.5,
              y: topY - BOUNDARY_CORNICE_FASCIA_HEIGHT_M * 0.5,
              z: segment.coord + inwardFaceOffsetM,
            }
          : {
              x: segment.coord + inwardFaceOffsetM,
              y: topY - BOUNDARY_CORNICE_FASCIA_HEIGHT_M * 0.5,
              z: (segment.start + segment.end) * 0.5,
            },
        scale: horizontal
          ? {
              x: lengthM,
              y: BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
              z: BOUNDARY_CORNICE_FASCIA_DEPTH_M,
            }
          : {
              x: BOUNDARY_CORNICE_FASCIA_DEPTH_M,
              y: BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
              z: lengthM,
            },
        face: {
          widthM: lengthM,
          heightM: BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
          yawRad: inwardFaceYawRad,
        },
      });
    }
    const architectureOwnsBase = run.sourceIndices.some((sourceIndex) => (
      ARCHITECTURE_OWNED_BASE_SOURCE_LABELS.has(sourceIndex + 1)
    ));
    if (!architectureOwnsBase) {
      bases.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:base`,
        semanticClass: "structural_wall_base_course",
        position: horizontal
          ? {
              x: (segment.start + segment.end) * 0.5,
              y: baseY + BOUNDARY_BASE_HEIGHT_M * 0.5,
              z: segment.coord - segment.outward * 0.006,
            }
          : {
              x: segment.coord - segment.outward * 0.006,
              y: baseY + BOUNDARY_BASE_HEIGHT_M * 0.5,
              z: (segment.start + segment.end) * 0.5,
            },
        scale: horizontal
          ? {
              x: lengthM + BOUNDARY_BASE_OUTSET_M * 2,
              y: BOUNDARY_BASE_HEIGHT_M,
              z: wallThicknessM + BOUNDARY_BASE_OUTSET_M * 2,
            }
          : {
              x: wallThicknessM + BOUNDARY_BASE_OUTSET_M * 2,
              y: BOUNDARY_BASE_HEIGHT_M,
              z: lengthM + BOUNDARY_BASE_OUTSET_M * 2,
            },
        face: {
          widthM: lengthM + BOUNDARY_BASE_OUTSET_M * 2,
          heightM: BOUNDARY_BASE_HEIGHT_M,
          yawRad: inwardFaceYawRad,
        },
      });
    }

    const endpoints = horizontal
      ? [{ x: segment.start, z: segment.coord }, { x: segment.end, z: segment.coord }]
      : [{ x: segment.coord, z: segment.start }, { x: segment.coord, z: segment.end }];
    for (const endpoint of endpoints) {
      const key = endpointKey(endpoint.x, endpoint.z);
      const group = endpointGroups.get(key);
      const entry = {
        orientation: segment.orientation,
        outward: segment.outward,
        baseY,
        topY,
        ...endpoint,
      };
      if (group) group.push(entry);
      else endpointGroups.set(key, [entry]);
    }
  }

  // A true wall terminal needs a thin return across the wall thickness. The
  // earlier full-height square "quoin" at every corner projected past the wall
  // plane and became the raw vertical fins visible above the Rug Gate and
  // Covered Souk roofs. Perpendicular walls already close constructed corners;
  // collinear split points likewise need no extra volume.
  const terminalReturns: BoundaryFinishBox[] = [];
  const cornerJunctions: BoundaryFinishBox[] = [];
  for (const [key, endpoints] of endpointGroups) {
    const orientations = new Set(endpoints.map((endpoint) => endpoint.orientation));
    if (endpoints.length > 1 && orientations.size === 2) {
      const baseY = Math.min(...endpoints.map((endpoint) => endpoint.baseY));
      const topY = Math.min(...endpoints.map((endpoint) => endpoint.topY));
      if (topY - baseY >= BOUNDARY_BASE_HEIGHT_M) {
        const endpoint = endpoints[0]!;
        const junctionBottomY = baseY + BOUNDARY_BASE_HEIGHT_M;
        cornerJunctions.push({
          placementId: `V3_BOUNDARY_FINISH:${key}:corner-junction`,
          semanticClass: "structural_wall_corner_junction",
          position: {
            x: endpoint.x,
            y: (junctionBottomY + topY) * 0.5,
            z: endpoint.z,
          },
          scale: {
            x: BOUNDARY_CORNER_JUNCTION_WIDTH_M,
            y: topY - junctionBottomY,
            z: BOUNDARY_CORNER_JUNCTION_WIDTH_M,
          },
        });
      }
      continue;
    }
    if (endpoints.length !== 1) continue;
    const endpoint = endpoints[0]!;
    // Retirement can expose an endpoint whose connecting wall is now owned
    // by a checked receiver. That junction is not a new free wall terminal.
    if (receiverCoverage.some(span => span.orientation === "horizontal"
      ? Math.abs(endpoint.z-span.coord) <= .001 && endpoint.x >= span.start-.001 && endpoint.x <= span.end+.001
      : Math.abs(endpoint.x-span.coord) <= .001 && endpoint.z >= span.start-.001 && endpoint.z <= span.end+.001)) continue;
    const { baseY, topY } = endpoint;
    if (topY - baseY < BOUNDARY_BASE_HEIGHT_M) continue;
    const cappedTopY = topY + BOUNDARY_COPING_HEIGHT_M;
    const returnBottomY = baseY + BOUNDARY_BASE_HEIGHT_M;
    const horizontal = endpoint.orientation === "horizontal";
    terminalReturns.push({
      placementId: `V3_BOUNDARY_FINISH:${key}:terminal-return`,
      semanticClass: "structural_wall_terminal_return",
      position: {
        x: endpoint.x + (horizontal ? 0 : endpoint.outward * wallThicknessM * 0.5),
        y: (returnBottomY + cappedTopY) * 0.5,
        z: endpoint.z + (horizontal ? endpoint.outward * wallThicknessM * 0.5 : 0),
      },
      scale: horizontal
        ? {
            x: BOUNDARY_TERMINAL_RETURN_DEPTH_M,
            y: cappedTopY - returnBottomY,
            z: wallThicknessM + BOUNDARY_COPING_OUTSET_M * 2,
          }
        : {
            x: wallThicknessM + BOUNDARY_COPING_OUTSET_M * 2,
            y: cappedTopY - returnBottomY,
            z: BOUNDARY_TERMINAL_RETURN_DEPTH_M,
          },
    });
  }

  const root = new Group();
  root.name = "map-pbr-boundary-finish-trim";
  const addBatch = (
    name: string,
    boxes: readonly BoundaryFinishBox[],
    castShadow: boolean,
  ): void => {
    if (boxes.length === 0) return;
    // These finish courses total only a few thousand triangles across the
    // entire map. Splitting them into spatial chunks produced dozens of tiny
    // draws whose CPU cost outweighed the negligible off-camera geometry.
    // Keep face and volume geometry separate, but merge each compatible class
    // globally so the boundary finish remains a small fixed draw budget.
    const chunks = new Map<"face" | "volume", BoundaryFinishBox[]>();
    for (const box of boxes) {
      const key = box.face ? "face" : "volume";
      const chunk = chunks.get(key);
      if (chunk) chunk.push(box);
      else chunks.set(key, [box]);
    }
    for (const [geometryClass, chunkBoxes] of chunks) {
      const faceBatch = chunkBoxes.every((box) => box.face !== undefined);
      const mesh = new InstancedMesh(
        faceBatch ? new PlaneGeometry(1, 1) : new BoxGeometry(1, 1, 1),
        material,
        chunkBoxes.length,
      );
      const dummy = new Object3D();
      // Repeated members are cut from the same quarry but not the same block.
      // Without per-instance tone every pier and coping in a run rendered as
      // one continuous extruded ribbon; a narrow seeded band breaks that while
      // staying inside the material's own value range.
      const toneRng = new DeterministicRng(deriveSubSeed(seed, `boundary-finish-tone:${name}:${geometryClass}`));
      const tone = new Color();
      for (let index = 0; index < chunkBoxes.length; index += 1) {
        const box = chunkBoxes[index]!;
        dummy.position.set(box.position.x, box.position.y, box.position.z);
        if (box.face) {
          dummy.scale.set(box.face.widthM, box.face.heightM, 1);
          dummy.rotation.set(0, box.face.yawRad, 0);
        } else {
          dummy.scale.set(box.scale.x, box.scale.y, box.scale.z);
          dummy.rotation.set(0, 0, 0);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        const value = 0.94 + toneRng.next() * 0.12;
        const warmth = (toneRng.next() - 0.5) * 0.03;
        tone.setRGB(value * (1 + warmth), value, value * (1 - warmth));
        mesh.setColorAt(index, tone);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.name = `map-pbr-boundary-${name}-${geometryClass}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      mesh.userData.visualQa = {
        moduleId: `boundary_${name}`,
        semanticClass: "structural_boundary_finish",
        representation: "module",
        materialMode: "pbr",
        shadowMode: castShadow ? "cast_receive" : "receive_only",
      };
      mesh.userData.visualQaInstances = chunkBoxes.map((box) => ({
        placementId: box.placementId,
        moduleId: `boundary_${name}`,
        semanticClass: box.semanticClass,
        representation: "module",
        materialMode: "pbr",
        dimensions: box.scale,
        groundingGapM: 0,
        structurallyBacked: true,
        shadowMode: castShadow ? "cast_receive" : "receive_only",
      }));
      root.add(mesh);
    }
  };
  addBatch("copings", copings, false);
  addBatch("cornice-fascias", corniceFascias, false);
  addBatch("base-courses", bases, false);
  addBatch("terminal-returns", terminalReturns, false);
  addBatch("corner-junctions", cornerJunctions, false);
  return root.children.length > 0 ? root : null;
}

export function buildBlockout(spec: RuntimeBlockoutSpec, options: BlockoutBuildOptions): BlockoutBuildResult {
  const root = new Group();
  root.name = "map-blockout";
  const palette = BLOCKOUT_PALETTE;
  const wallTextureQuality = resolveWallTextureQuality(options.floorQuality);

  const walkableZones = spec.zones.filter((zone) => WALKABLE_ZONE_TYPES.has(zone.type));
  const stallZones = spec.zones.filter((zone) => zone.type === STALL_STRIP_ZONE_TYPE);
  const clearZones = spec.zones.filter((zone) => zone.type === CLEAR_TRAVEL_ZONE_TYPE);
  const walkableRects = walkableZones.map((zone) => zone.rect);
  const stallRects = stallZones.map((zone) => zone.rect);
  const clearRects = clearZones.map((zone) => zone.rect);
  const traversalSurfaces = spec.traversalSurfaces ?? [];
  const wallSegments = deriveBlockoutWallSegments(spec);
  const courtyardModel = spec.sectionModels?.find(s => s.zoneId === "SPAWN_B_COURTYARD");
  const bz04Courtyard = Boolean(courtyardModel && options.facadeModels?.hasModel(courtyardModel.modelId)
    && options.facadeModels.instantiate(courtyardModel.modelId).userData.bz04VisualBounds);
  if (bz04Courtyard) validateSectionBounds(options.facadeModels!.instantiate(courtyardModel!.modelId), courtyardModel!.modelId);
  const bz04BoundaryCoverage: SectionBoundaryCoverage[] = [];
  const bz04FloorTreatments: unknown[] = [];
  for (const section of spec.sectionModels ?? []) {
    if (!options.facadeModels?.hasModel(section.modelId)) continue;
    const model = options.facadeModels.instantiate(section.modelId);
    if (!model.userData.bz04BoundaryCoverage) continue;
    validateSectionBounds(model, section.modelId);
    bz04BoundaryCoverage.push(...readSectionBoundaryCoverage(model.userData.bz04BoundaryCoverage));
    if (model.userData.bz04FloorTreatment) bz04FloorTreatments.push(model.userData.bz04FloorTreatment);
  }
  const visualSegments = (segment: BoundarySegment) => (
    (bz04Courtyard ? courtyardVisualSegments(segment) : [segment])
      .flatMap(part => sectionVisualSegments(part, bz04BoundaryCoverage))
  );
  const bz04RoofCoverage: number[][] = [];
  for (const placement of spec.authoredPlacements ?? []) {
    if (!options.facadeModels?.hasModel(placement.modelId)) continue;
    const model=options.facadeModels.instantiate(placement.modelId);
    if (model.userData.bz04BoundaryCoverage) {
      validateSectionBounds(model,placement.modelId);
      bz04BoundaryCoverage.push(...readSectionBoundaryCoverage(model.userData.bz04BoundaryCoverage));
    }
    if (!model.userData.bz04RoofBundle) continue;
    validateSectionBounds(model,placement.modelId);
    bz04RoofCoverage.push(...model.userData.bz04RetirementCoverage);
  }
  const bz04Environment = (spec.authoredPlacements ?? []).some(p => p.modelId === "bz04_shared_environment" && options.facadeModels?.hasModel(p.modelId));
  if (bz04Environment) validateSectionBounds(options.facadeModels!.instantiate("bz04_shared_environment"),"bz04_shared_environment");

  const wallThicknessM = Math.max(0.05, spec.defaults.wall_thickness);

  const floorTopY = spec.defaults.floor_height;
  const segmentElevationEnvelopes = resolveSegmentElevationEnvelopes(
    wallSegments,
    traversalSurfaces,
    floorTopY,
  );
  const segmentBaseYs = segmentElevationEnvelopes.map((envelope) => envelope.minY);
  if (options.floorMode === "pbr" && options.floorMaterials) {
    const pbrFloors = buildPbrFloors(spec, {
      seed: options.seed,
      quality: options.floorQuality,
      manifest: options.floorMaterials,
      patchSizeM: 2,
      floorTopY,
      bz04FloorTreatments,
    });
    root.add(pbrFloors);

    const floorWearDecals = buildFloorWearDecals(spec, options.seed, floorTopY);
    if (floorWearDecals) root.add(floorWearDecals);

    const sandAccumulation = buildSandAccumulation({
      wallSegments: wallSegments.flatMap(visualSegments),
      seed: options.seed,
      floorTopY,
      manifest: options.floorMaterials,
      quality: options.floorQuality,
    });
    root.add(sandAccumulation);

    const wallBaseDebris = buildWallBaseDebris({
      wallSegments: wallSegments.flatMap(visualSegments),
      seed: options.seed,
      floorTopY,
      manifest: options.floorMaterials,
      quality: options.floorQuality,
    });
    root.add(wallBaseDebris);
  } else {
    const walkableFloor = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          walkableZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorBase }),
          BASE_FLOOR_THICKNESS_M,
          floorTopY,
        )
      : createFloorInstances(
          walkableRects,
          new MeshLambertMaterial({ color: palette.floorBase }),
          BASE_FLOOR_THICKNESS_M,
          floorTopY,
        );
    const stallOverlay = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          stallZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorStallOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY,
          0.02,
        )
      : createFloorInstances(
          stallRects,
          new MeshLambertMaterial({ color: palette.floorStallOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY + 0.02,
        );
    const clearOverlay = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          clearZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorClearOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY,
          0.03,
        )
      : createFloorInstances(
          clearRects,
          new MeshLambertMaterial({ color: palette.floorClearOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY + 0.03,
        );
    if (walkableFloor) walkableFloor.receiveShadow = true;
    if (stallOverlay) stallOverlay.receiveShadow = false;
    if (clearOverlay) clearOverlay.receiveShadow = false;

    if (walkableFloor) root.add(walkableFloor);
    if (stallOverlay) root.add(stallOverlay);
    if (clearOverlay) root.add(clearOverlay);
  }
  // Final PBR floors own their authored, world-scaled stair treads. The legacy
  // tan Lambert boxes are retained only for explicit blockout/fallback mode.
  const visualStairs = options.floorMode === "pbr" && options.floorMaterials
    ? null
    : createVisualStairTreads(
        traversalSurfaces,
        new MeshLambertMaterial({ color: 0xb79a6b }),
      );
  if (visualStairs) root.add(visualStairs);

  const colliders: RuntimeColliderAabb[] = [];

  // Run wall detail placements first — they compute per-segment heights
  // that the wall geometry builder needs for varied building silhouettes.
  const useAuthoredVisualWallOwnership = options.wallMaterials !== null
    && usesAuthoredVisualWallOwnership(
      options.wallMode,
      spec.wall_details.style,
    );
  // Validate render ownership before the architecture pass. A malformed
  // frontage must fail atomically instead of exposing the collision wall.
  const authoredVisualWallPlan = useAuthoredVisualWallOwnership
    ? planVisualWallSegments({
        segments: wallSegments,
        zones: spec.zones,
        placements: spec.architecturePlacements ?? [],
        playableBoundary: spec.playable_boundary,
      })
    : null;
  const wallDetailPlacements = buildArchitecture({
    placements: spec.architecturePlacements ?? [],
    massingProfiles: spec.massingProfiles ?? [],
    facadeProfiles: spec.facadeProfiles ?? [],
    segments: wallSegments,
    zones: spec.zones,
    traversalSurfaces,
    wallHeightM: spec.defaults.wall_height,
    validateCutoutMassing: useAuthoredVisualWallOwnership,
    bz04BoundaryCoverage,
  });

  const segmentHeights = wallDetailPlacements.segmentHeights.map((heightM, index) => (
    heightM + (segmentElevationEnvelopes[index]!.maxY - segmentElevationEnvelopes[index]!.minY)
  ));
  appendWallSegmentColliders(
    wallSegments,
    spec.defaults.wall_height,
    wallThicknessM,
    floorTopY,
    colliders,
    segmentHeights,
    segmentBaseYs,
  );

  if (options.wallMode === "pbr" && options.wallMaterials) {
    // Collision remains authoritative and uses the untouched wallSegments
    // above. In final v3 PBR, compiler-authored massing owns its validated
    // lane-facing surface, so only the uncovered parent-wall remainders render.
    const visualWallPlan = authoredVisualWallPlan ?? {
          segments: wallSegments.map((segment) => ({ ...segment })),
          sourceSegmentIndices: wallSegments.map((_, index) => index),
        };
    const primaryVisualEntries = visualWallPlan.segments
      .map((segment, index) => ({
        segment,
        sourceIndex: visualWallPlan.sourceSegmentIndices[index]!,
      }))
      .flatMap(entry => visualSegments(entry.segment).map(segment => ({...entry,segment})));
    const visualSegmentHeights = primaryVisualEntries.map(({ sourceIndex }) => (
      segmentHeights[sourceIndex]!
    ));
    const visualSegmentBaseYs = primaryVisualEntries.map(({ sourceIndex }) => (
      segmentBaseYs[sourceIndex]!
    ));
    const primaryVisualSegments = primaryVisualEntries.map((entry) => entry.segment);
    const primaryVisualSourceIndices = primaryVisualEntries.map((entry) => entry.sourceIndex);
    const pbrWalls = buildPbrWalls({
      segments: primaryVisualSegments,
      sourceSegments: wallSegments,
      segmentSourceIndices: primaryVisualSourceIndices,
      zones: spec.zones,
      frontages: spec.frontages ?? [],
      facadeProfiles: spec.facadeProfiles ?? [],
      seed: options.seed,
      quality: wallTextureQuality,
      manifest: options.wallMaterials,
      wallHeightM: spec.defaults.wall_height,
      floorTopY,
      segmentHeights: visualSegmentHeights,
      segmentBaseYs: visualSegmentBaseYs,
    });
    // Boundary segments are collision-backed wall volumes even when a camera
    // sees them obliquely from the nominally outward side. Rendering their
    // material on both faces prevents a valid wall from disappearing while
    // its coping remains visible as an unsupported beam.
    pbrWalls.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.side = DoubleSide;
        material.needsUpdate = true;
      }
    });
    root.add(pbrWalls);

    const boundaryFinishMaterialId = "ph_stone_trim_sandstone";
    const boundaryFinishMaterial = options.wallMaterials.createStandardMaterial(
      boundaryFinishMaterialId,
      wallTextureQuality,
    );
    boundaryFinishMaterial.userData.materialId = boundaryFinishMaterialId;
    // The finish family is instanced from unit boxes at wildly different
    // scales — a 92 m coping run and a 0.39 x 6.5 m corner pier share one
    // geometry. Without world projection each instance stretched a single
    // 2 m tile across its own box, which squeezed the coursing into vertical
    // streaks on every tall thin member and read as pale straw planking on
    // the piers, gate corners and portal posts. Project in world meters so
    // one course is one course everywhere.
    boundaryFinishMaterial.userData.wallUvProjection = "world";
    applyWallShaderTweaks(boundaryFinishMaterial, {
      albedoBoost:
        typeof boundaryFinishMaterial.userData.wallAlbedoBoost === "number"
        && Number.isFinite(boundaryFinishMaterial.userData.wallAlbedoBoost)
          ? boundaryFinishMaterial.userData.wallAlbedoBoost
          : 1,
      tileSizeM: options.wallMaterials.getTileSizeM(boundaryFinishMaterialId),
      uvOffset: { x: 0, y: 0 },
      floorTopY,
      ...resolveWallShaderProfile(boundaryFinishMaterialId, "detail"),
    });
    const boundaryFinish = createBoundaryFinishTrim(
      primaryVisualSegments,
      visualSegmentHeights,
      visualSegmentBaseYs,
      wallThicknessM,
      boundaryFinishMaterial,
      options.seed,
      bz04BoundaryCoverage,
    );
    if (boundaryFinish) root.add(boundaryFinish);
  } else {
    const flatVisualEntries = wallSegments.flatMap((segment,index) =>
      visualSegments(segment).map(part => ({segment:part,index})));
    const wallInstances = createWallInstances(
      flatVisualEntries.map(entry => entry.segment),
      new MeshLambertMaterial({ color: palette.wall }),
      spec.defaults.wall_height,
      wallThicknessM,
      floorTopY,
      flatVisualEntries.map(entry => segmentHeights[entry.index]!),
      flatVisualEntries.map(entry => segmentBaseYs[entry.index]!),
    );
    if (wallInstances) {
      wallInstances.castShadow = true;
      wallInstances.receiveShadow = false;
      root.add(wallInstances);
    }
  }

  if (wallDetailPlacements.instances.length > 0) {
    const detailRoot = buildWallDetailMeshes(wallDetailPlacements.instances.flatMap(instance => roofFragments(instance, bz04RoofCoverage)), {
      wallMode: options.wallMode,
      wallMaterials: options.wallMaterials,
      quality: wallTextureQuality,
      seed: options.seed,
    });
    root.add(detailRoot);
  }

  const packBinding = { wallMaterials: options.wallMaterials, quality: wallTextureQuality, seed: options.seed };
  if (options.facadeModels && spec.sectionModels?.length) {
    root.add(buildSectionModels(spec.sectionModels, options.facadeModels, packBinding));
  }
  if (options.facadeModels && spec.authoredPlacements?.length) {
    root.add(buildAuthoredPlacements(spec.authoredPlacements, options.facadeModels, packBinding));
  }

  if (traversalSurfaces.length === 0) {
    colliders.push({
      id: "floor-slab",
      kind: "floor_slab",
      min: {
        x: spec.playable_boundary.x,
        y: -1,
        z: spec.playable_boundary.y,
      },
      max: {
        x: spec.playable_boundary.x + spec.playable_boundary.w,
        y: 0,
        z: spec.playable_boundary.y + spec.playable_boundary.h,
      },
    });
  }

  // ── Perimeter cage walls — hard backstop so enemies/players can't escape the map ──
  {
    const CAGE_T = 0.5;   // thickness in metres
    const maxReachableElevationM = traversalSurfaces.reduce((max, surface) => {
      const surfaceMax = surface.kind === "flat"
        ? surface.elevationM
        : Math.max(surface.startElevationM, surface.endElevationM);
      return Math.max(max, surfaceMax);
    }, 0);
    const CAGE_H = maxReachableElevationM + Math.max(4.0, spec.defaults.wall_height);
    const pbX = spec.playable_boundary.x;
    const pbZ = spec.playable_boundary.y;  // spec stores Z-axis extent in .y
    const pbW = spec.playable_boundary.w;
    const pbD = spec.playable_boundary.h;  // spec stores depth (Z-size) in .h
    colliders.push(
      // South wall
      { id: "cage-S", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ - CAGE_T }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ } },
      // North wall
      { id: "cage-N", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ + pbD }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ + pbD + CAGE_T } },
      // West wall
      { id: "cage-W", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ }, max: { x: pbX, y: CAGE_H, z: pbZ + pbD } },
      // East wall
      { id: "cage-E", kind: "wall", min: { x: pbX + pbW, y: 0, z: pbZ }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ + pbD } },
    );
  }

  // R8 art direction: render-only street life and surface history on the
  // finished golden-lighting build. No colliders are created here.
  const r8 = atmosphereAppliesTo(spec.mapId) && options.wallMode === "pbr";
  if (r8 && options.facadeModels) {
    root.add(buildStreetAtmosphere({
      seed: options.seed,
      wallMaterials: options.wallMaterials,
      wallQuality: wallTextureQuality,
      palmQuality: wallTextureQuality,
      floorTopY,
    }));
  }
  if (r8) {
    const detail = { plaster: createSurfaceDetailSet(0.9), stone: createSurfaceDetailSet(1.0) };
    if (options.wallMaterials) {
      for (const layer of ["plaster", "stone"] as const) {
        options.wallMaterials.loadTextureSet(STREET_DETAIL_MATERIAL_IDS[layer], wallTextureQuality)
          .then((set) => {
            detail[layer].normal.value = set.normal;
            detail[layer].grunge.value = set.albedo;
          })
          .catch((error: unknown) => console.warn(`[r8] detail textures unavailable: ${String(error)}`));
      }
    }
    applySurfaceWeathering(root, { traversalSurfaces, detail });
  }

  return { root, colliders, wallDetailStats: wallDetailPlacements.stats };
}

import type {
  RuntimeArchitectureMassingPlacement,
  RuntimeArchitecturePlacement,
  RuntimeBlockoutZone,
  RuntimeFacadeFace,
  RuntimeRect,
} from "./types";
import type { BoundarySegment } from "./buildBlockout";

const PLANE_EPSILON_M = 1e-5;
const MIN_VISUAL_SEGMENT_M = 1e-3;

export type V3ArchitectureOwnedWallFrontage = {
  placementId: string;
  frontageId: string;
  zoneId: string;
  face: RuntimeFacadeFace;
  orientation: BoundarySegment["orientation"];
  coord: number;
  outward: BoundarySegment["outward"];
  start: number;
  end: number;
};

export type V3VisualWallSegmentPlan = {
  /** Render-only wall pieces left after authored massing takes ownership. */
  segments: BoundarySegment[];
  /** Index into the untouched collision-wall array for each render-only piece. */
  sourceSegmentIndices: number[];
  /** Explicit hand-off contract for v3Architecture's lane-facing shell. */
  architectureOwnedFrontages: V3ArchitectureOwnedWallFrontage[];
};

export type PlanV3VisualWallSegmentsOptions = {
  segments: readonly BoundarySegment[];
  zones: readonly RuntimeBlockoutZone[];
  placements: readonly RuntimeArchitecturePlacement[];
  playableBoundary: RuntimeRect;
};

function fail(message: string): never {
  throw new Error(`[v3 visual walls] ${message}`);
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) fail(`${label} must be finite`);
}

function requirePositive(value: number, label: string): void {
  requireFinite(value, label);
  if (value <= 0) fail(`${label} must be positive`);
}

function faceProjection(placement: RuntimeArchitectureMassingPlacement): Omit<
  V3ArchitectureOwnedWallFrontage,
  "placementId" | "frontageId" | "zoneId"
> {
  requireFinite(placement.center.x, `massing '${placement.id}' center.x`);
  requireFinite(placement.center.y, `massing '${placement.id}' center.y`);
  requirePositive(placement.sizeM.width, `massing '${placement.id}' width`);
  requirePositive(placement.sizeM.depth, `massing '${placement.id}' depth`);

  const halfWidth = placement.sizeM.width * 0.5;
  switch (placement.face) {
    case "west":
      return {
        face: placement.face,
        orientation: "vertical",
        coord: placement.center.x + placement.sizeM.depth * 0.5,
        outward: -1,
        start: placement.center.y - halfWidth,
        end: placement.center.y + halfWidth,
      };
    case "east":
      return {
        face: placement.face,
        orientation: "vertical",
        coord: placement.center.x - placement.sizeM.depth * 0.5,
        outward: 1,
        start: placement.center.y - halfWidth,
        end: placement.center.y + halfWidth,
      };
    case "south":
      return {
        face: placement.face,
        orientation: "horizontal",
        coord: placement.center.y + placement.sizeM.depth * 0.5,
        outward: -1,
        start: placement.center.x - halfWidth,
        end: placement.center.x + halfWidth,
      };
    case "north":
      return {
        face: placement.face,
        orientation: "horizontal",
        coord: placement.center.y - placement.sizeM.depth * 0.5,
        outward: 1,
        start: placement.center.x - halfWidth,
        end: placement.center.x + halfWidth,
      };
  }
}

function zoneFaceProjection(
  zone: RuntimeBlockoutZone,
  face: RuntimeFacadeFace,
): Pick<V3ArchitectureOwnedWallFrontage, "orientation" | "coord" | "outward" | "start" | "end"> {
  switch (face) {
    case "west":
      return {
        orientation: "vertical",
        coord: zone.rect.x,
        outward: -1,
        start: zone.rect.y,
        end: zone.rect.y + zone.rect.h,
      };
    case "east":
      return {
        orientation: "vertical",
        coord: zone.rect.x + zone.rect.w,
        outward: 1,
        start: zone.rect.y,
        end: zone.rect.y + zone.rect.h,
      };
    case "south":
      return {
        orientation: "horizontal",
        coord: zone.rect.y,
        outward: -1,
        start: zone.rect.x,
        end: zone.rect.x + zone.rect.w,
      };
    case "north":
      return {
        orientation: "horizontal",
        coord: zone.rect.y + zone.rect.h,
        outward: 1,
        start: zone.rect.x,
        end: zone.rect.x + zone.rect.w,
      };
  }
}

function isPlayablePerimeter(
  projection: Pick<V3ArchitectureOwnedWallFrontage, "orientation" | "coord">,
  boundary: RuntimeRect,
): boolean {
  const boundaryCoords = projection.orientation === "vertical"
    ? [boundary.x, boundary.x + boundary.w]
    : [boundary.y, boundary.y + boundary.h];
  return boundaryCoords.some((coord) => Math.abs(projection.coord - coord) <= PLANE_EPSILON_M);
}

function isSamePlane(
  segment: BoundarySegment,
  projection: V3ArchitectureOwnedWallFrontage,
): boolean {
  return segment.orientation === projection.orientation
    && segment.outward === projection.outward
    && Math.abs(segment.coord - projection.coord) <= PLANE_EPSILON_M;
}

function intervalsOverlap(
  left: Pick<BoundarySegment, "start" | "end">,
  right: Pick<BoundarySegment, "start" | "end">,
): boolean {
  return Math.min(left.end, right.end) - Math.max(left.start, right.start) > PLANE_EPSILON_M;
}

function assertFullySupported(
  ownership: V3ArchitectureOwnedWallFrontage,
  segments: readonly BoundarySegment[],
): void {
  const support = segments
    .filter((segment) => isSamePlane(segment, ownership) && intervalsOverlap(segment, ownership))
    .map((segment) => ({ start: segment.start, end: segment.end }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  if (support.length === 0) {
    fail(
      `massing '${ownership.placementId}' is non-coplanar with the collision wall on ${ownership.face} face`,
    );
  }

  let cursor = ownership.start;
  for (const interval of support) {
    if (interval.end <= cursor + PLANE_EPSILON_M) continue;
    if (interval.start > cursor + PLANE_EPSILON_M) {
      fail(
        `massing '${ownership.placementId}' frontage is only partially supported; gap ${cursor.toFixed(4)}..${interval.start.toFixed(4)}`,
      );
    }
    cursor = Math.max(cursor, interval.end);
    if (cursor >= ownership.end - PLANE_EPSILON_M) return;
  }
  fail(
    `massing '${ownership.placementId}' frontage is only partially supported; coverage ends at ${cursor.toFixed(4)} before ${ownership.end.toFixed(4)}`,
  );
}

function resolveOwnerships(options: PlanV3VisualWallSegmentsOptions): V3ArchitectureOwnedWallFrontage[] {
  const zonesById = new Map(options.zones.map((zone) => [zone.id, zone]));
  const ownerships = options.placements
    .filter((placement): placement is RuntimeArchitectureMassingPlacement => placement.kind === "massing")
    .map((placement) => {
      const zone = zonesById.get(placement.zoneId)
        ?? fail(`massing '${placement.id}' references unknown zone '${placement.zoneId}'`);
      const projected = faceProjection(placement);
      const zoneFace = zoneFaceProjection(zone, placement.face);
      if (
        projected.orientation !== zoneFace.orientation
        || projected.outward !== zoneFace.outward
        || Math.abs(projected.coord - zoneFace.coord) > PLANE_EPSILON_M
      ) {
        fail(
          `massing '${placement.id}' is non-coplanar with zone '${zone.id}' ${placement.face} face`,
        );
      }
      if (
        projected.start < zoneFace.start - PLANE_EPSILON_M
        || projected.end > zoneFace.end + PLANE_EPSILON_M
      ) {
        fail(
          `massing '${placement.id}' frontage ${projected.start.toFixed(4)}..${projected.end.toFixed(4)} extends outside zone face ${zoneFace.start.toFixed(4)}..${zoneFace.end.toFixed(4)}`,
        );
      }
      if (isPlayablePerimeter(projected, options.playableBoundary)) {
        fail(`massing '${placement.id}' cannot take visual ownership of the sealed playable perimeter`);
      }
      const ownership: V3ArchitectureOwnedWallFrontage = {
        placementId: placement.id,
        frontageId: placement.frontageId,
        zoneId: placement.zoneId,
        ...projected,
      };
      assertFullySupported(ownership, options.segments);
      return ownership;
    })
    .sort((left, right) => (
      left.orientation.localeCompare(right.orientation)
      || left.coord - right.coord
      || left.outward - right.outward
      || left.start - right.start
      || left.end - right.end
      || left.placementId.localeCompare(right.placementId)
    ));

  for (let index = 0; index < ownerships.length; index += 1) {
    const current = ownerships[index]!;
    for (let nextIndex = index + 1; nextIndex < ownerships.length; nextIndex += 1) {
      const next = ownerships[nextIndex]!;
      if (
        current.orientation !== next.orientation
        || current.outward !== next.outward
        || Math.abs(current.coord - next.coord) > PLANE_EPSILON_M
      ) {
        continue;
      }
      if (intervalsOverlap(current, next)) {
        fail(
          `massings '${current.placementId}' and '${next.placementId}' claim overlapping visual frontage`,
        );
      }
    }
  }
  return ownerships;
}

function appendRemainder(
  result: V3VisualWallSegmentPlan,
  source: BoundarySegment,
  sourceSegmentIndex: number,
  start: number,
  end: number,
): void {
  const lengthM = end - start;
  if (lengthM <= PLANE_EPSILON_M) return;
  if (lengthM < MIN_VISUAL_SEGMENT_M) {
    fail(
      `subtraction from source segment ${sourceSegmentIndex} produced a ${lengthM.toFixed(6)}m sliver`,
    );
  }
  result.segments.push({ ...source, start, end });
  result.sourceSegmentIndices.push(sourceSegmentIndex);
}

/**
 * Produces a render-only v3 wall list. The input remains the sole collision
 * authority; every remainder points back to its parent for elevation,
 * material assignment, and deterministic UV seeding.
 */
export function planV3VisualWallSegments(
  options: PlanV3VisualWallSegmentsOptions,
): V3VisualWallSegmentPlan {
  const architectureOwnedFrontages = resolveOwnerships(options);
  const result: V3VisualWallSegmentPlan = {
    segments: [],
    sourceSegmentIndices: [],
    architectureOwnedFrontages,
  };

  for (let sourceSegmentIndex = 0; sourceSegmentIndex < options.segments.length; sourceSegmentIndex += 1) {
    const source = options.segments[sourceSegmentIndex]!;
    requireFinite(source.coord, `source segment ${sourceSegmentIndex} coord`);
    requireFinite(source.start, `source segment ${sourceSegmentIndex} start`);
    requireFinite(source.end, `source segment ${sourceSegmentIndex} end`);
    if (source.end - source.start < MIN_VISUAL_SEGMENT_M) {
      fail(`source segment ${sourceSegmentIndex} is zero-length or a sliver`);
    }

    const subtractors = architectureOwnedFrontages
      .filter((ownership) => isSamePlane(source, ownership) && intervalsOverlap(source, ownership))
      .sort((left, right) => left.start - right.start || left.end - right.end);
    if (subtractors.length === 0) {
      appendRemainder(result, source, sourceSegmentIndex, source.start, source.end);
      continue;
    }

    let cursor = source.start;
    for (const subtractor of subtractors) {
      const overlapStart = Math.max(source.start, subtractor.start);
      const overlapEnd = Math.min(source.end, subtractor.end);
      if (overlapStart > cursor + PLANE_EPSILON_M) {
        appendRemainder(result, source, sourceSegmentIndex, cursor, overlapStart);
      }
      cursor = Math.max(cursor, overlapEnd);
    }
    if (source.end > cursor + PLANE_EPSILON_M) {
      appendRemainder(result, source, sourceSegmentIndex, cursor, source.end);
    }
  }

  return result;
}

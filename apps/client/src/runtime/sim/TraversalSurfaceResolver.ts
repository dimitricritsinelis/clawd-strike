import type { RuntimeRect } from "../map/types";

const SURFACE_EPSILON_M = 0.001;
const RAY_EPSILON = 1e-7;

export type FlatTraversalSurfaceLike = {
  id: string;
  zoneId: string;
  kind: "flat";
  rect: RuntimeRect;
  elevationM: number;
};

export type RampTraversalSurfaceLike = {
  id: string;
  zoneId: string;
  kind: "ramp";
  rect: RuntimeRect;
  axis: "x" | "y";
  startElevationM: number;
  endElevationM: number;
};

export type TraversalSurfaceLike = FlatTraversalSurfaceLike | RampTraversalSurfaceLike;

export type TraversalSurfaceSample = {
  surfaceId: string;
  zoneId: string;
  elevationM: number;
  normal: { x: number; y: number; z: number };
};

export type TraversalSurfaceRayHit = TraversalSurfaceSample & {
  distance: number;
  point: { x: number; y: number; z: number };
};

function containsPoint(rect: RuntimeRect, x: number, z: number): boolean {
  return (
    x >= rect.x - SURFACE_EPSILON_M
    && x <= rect.x + rect.w + SURFACE_EPSILON_M
    && z >= rect.y - SURFACE_EPSILON_M
    && z <= rect.y + rect.h + SURFACE_EPSILON_M
  );
}

function sampleSurface(surface: TraversalSurfaceLike, x: number, z: number): TraversalSurfaceSample | null {
  if (!containsPoint(surface.rect, x, z)) return null;

  if (surface.kind === "flat") {
    return {
      surfaceId: surface.id,
      zoneId: surface.zoneId,
      elevationM: surface.elevationM,
      normal: { x: 0, y: 1, z: 0 },
    };
  }

  const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
  const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const axisCoord = surface.axis === "x" ? x : z;
  const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, SURFACE_EPSILON_M)));
  const elevationM = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t;
  const slope = (surface.endElevationM - surface.startElevationM) / Math.max(axisLength, SURFACE_EPSILON_M);
  const nx = surface.axis === "x" ? -slope : 0;
  const nz = surface.axis === "y" ? -slope : 0;
  const invLength = 1 / Math.hypot(nx, 1, nz);

  return {
    surfaceId: surface.id,
    zoneId: surface.zoneId,
    elevationM,
    normal: { x: nx * invLength, y: invLength, z: nz * invLength },
  };
}

function planeSlope(surface: TraversalSurfaceLike): { slopeX: number; slopeZ: number; intercept: number } {
  if (surface.kind === "flat") {
    return { slopeX: 0, slopeZ: 0, intercept: surface.elevationM };
  }

  const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const slope = (surface.endElevationM - surface.startElevationM) / Math.max(axisLength, SURFACE_EPSILON_M);
  if (surface.axis === "x") {
    return {
      slopeX: slope,
      slopeZ: 0,
      intercept: surface.startElevationM - slope * surface.rect.x,
    };
  }
  return {
    slopeX: 0,
    slopeZ: slope,
    intercept: surface.startElevationM - slope * surface.rect.y,
  };
}

/**
 * Deterministic height-field resolver for the authored non-overlapping walkable
 * surfaces. It intentionally does not support stacked floors; a reference Y is
 * accepted only to make malformed overlaps deterministic and debuggable.
 */
export class TraversalSurfaceResolver {
  readonly surfaces: readonly TraversalSurfaceLike[];
  readonly maxElevationM: number;

  constructor(surfaces: readonly TraversalSurfaceLike[]) {
    this.surfaces = [...surfaces].sort((a, b) => a.id.localeCompare(b.id));
    this.maxElevationM = this.surfaces.reduce((max, surface) => {
      const surfaceMax = surface.kind === "flat"
        ? surface.elevationM
        : Math.max(surface.startElevationM, surface.endElevationM);
      return Math.max(max, surfaceMax);
    }, 0);
  }

  sample(x: number, z: number, referenceY: number | null = null): TraversalSurfaceSample | null {
    let best: TraversalSurfaceSample | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (const surface of this.surfaces) {
      const sample = sampleSurface(surface, x, z);
      if (!sample) continue;
      if (referenceY === null) {
        if (!best || sample.elevationM > best.elevationM) best = sample;
        continue;
      }

      const delta = Math.abs(sample.elevationM - referenceY);
      if (delta < bestDelta - SURFACE_EPSILON_M) {
        best = sample;
        bestDelta = delta;
      }
    }

    return best;
  }

  raycast(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxDistance: number,
  ): TraversalSurfaceRayHit | null {
    let nearest: TraversalSurfaceRayHit | null = null;

    for (const surface of this.surfaces) {
      const plane = planeSlope(surface);
      const denominator = dir.y - plane.slopeX * dir.x - plane.slopeZ * dir.z;
      if (Math.abs(denominator) <= RAY_EPSILON) continue;

      const numerator = plane.slopeX * origin.x + plane.slopeZ * origin.z + plane.intercept - origin.y;
      const distance = numerator / denominator;
      if (distance < 0 || distance > maxDistance) continue;
      if (nearest && distance >= nearest.distance) continue;

      const x = origin.x + dir.x * distance;
      const y = origin.y + dir.y * distance;
      const z = origin.z + dir.z * distance;
      const sample = sampleSurface(surface, x, z);
      if (!sample) continue;

      nearest = {
        ...sample,
        distance,
        point: { x, y, z },
      };
    }

    return nearest;
  }
}

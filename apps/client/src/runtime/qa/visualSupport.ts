export type VisualSupportBounds = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

export type VisualSupportCandidate = {
  placementId: string;
  bounds: VisualSupportBounds;
};

export type VisualSupportResolution = {
  supportPlacementId: string;
  gapM: number;
  overlapAreaM2: number;
};

function overlapLength(minA: number, maxA: number, minB: number, maxB: number): number {
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
}

/**
 * Resolve an authored prop resting on another rendered prop instead of on the
 * traversal surface. The comparison uses actual world bounds, not category or
 * anchor guesses, and accepts only a narrow vertical contact tolerance.
 */
export function resolveVisualSupport(
  placementId: string,
  bounds: VisualSupportBounds,
  candidates: readonly VisualSupportCandidate[],
  maxContactGapM = 0.03,
  minOverlapAreaM2 = 0.0025,
): VisualSupportResolution | null {
  let best: VisualSupportResolution | null = null;
  for (const candidate of candidates) {
    if (candidate.placementId === placementId) continue;
    const verticalGapM = bounds.min.y - candidate.bounds.max.y;
    if (verticalGapM < -maxContactGapM || verticalGapM > maxContactGapM) continue;
    const overlapX = overlapLength(bounds.min.x, bounds.max.x, candidate.bounds.min.x, candidate.bounds.max.x);
    const overlapZ = overlapLength(bounds.min.z, bounds.max.z, candidate.bounds.min.z, candidate.bounds.max.z);
    const overlapAreaM2 = overlapX * overlapZ;
    if (overlapAreaM2 < minOverlapAreaM2) continue;
    const resolution = {
      supportPlacementId: candidate.placementId,
      gapM: Math.max(0, verticalGapM),
      overlapAreaM2,
    };
    if (
      !best
      || resolution.gapM < best.gapM
      || (resolution.gapM === best.gapM && resolution.overlapAreaM2 > best.overlapAreaM2)
      || (
        resolution.gapM === best.gapM
        && resolution.overlapAreaM2 === best.overlapAreaM2
        && resolution.supportPlacementId.localeCompare(best.supportPlacementId) < 0
      )
    ) {
      best = resolution;
    }
  }
  return best;
}

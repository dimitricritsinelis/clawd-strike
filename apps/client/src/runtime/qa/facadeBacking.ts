export type FacadeBackingDimensions = {
  width: number;
  depth: number;
  height: number;
};

export type FacadeBackingPlacement = {
  placementId: string;
  moduleId?: string;
  semanticClass: string;
  dimensionsM: FacadeBackingDimensions;
  backingPlacementId?: string;
  structurallyBacked?: boolean;
};

export type FacadeBackingFailureReason =
  | "not-explicitly-backed"
  | "missing-backing-id"
  | "missing-backing-placement"
  | "invalid-backing-volume";

export type FacadeBackingFailure = {
  placementId: string;
  backingPlacementId?: string;
  reason: FacadeBackingFailureReason;
  artifactTag: "exposed-shell";
};

function isSegmentedFacadeSheet(placement: FacadeBackingPlacement): boolean {
  return placement.semanticClass === "facade_wall_infill"
    || placement.moduleId === "facade_wall_infill"
    || placement.semanticClass.endsWith("_segmented_facade")
    || placement.moduleId?.endsWith("_segmented_facade") === true;
}

function hasPositiveBackingVolume(placement: FacadeBackingPlacement): boolean {
  const { width, depth, height } = placement.dimensionsM;
  return [width, depth, height].every((value) => Number.isFinite(value) && value > 0)
    && width * depth * height > 0;
}

/**
 * Audit only facade sheets that are actually visible in the reviewed frame,
 * but resolve their claimed backing against the complete rendered placement
 * inventory. Visibility is never evidence of quality: every sheet must make
 * an explicit, valid structural claim or it emits the canonical exposed-shell
 * artifact.
 */
export function auditVisibleFacadeBacking(
  visiblePlacements: readonly FacadeBackingPlacement[],
  fullPlacementInventory: readonly FacadeBackingPlacement[],
): FacadeBackingFailure[] {
  const inventoryById = new Map<string, FacadeBackingPlacement[]>();
  for (const placement of fullPlacementInventory) {
    const entries = inventoryById.get(placement.placementId) ?? [];
    entries.push(placement);
    inventoryById.set(placement.placementId, entries);
  }

  const failures: FacadeBackingFailure[] = [];
  for (const placement of visiblePlacements) {
    if (!isSegmentedFacadeSheet(placement)) continue;
    if (placement.structurallyBacked !== true) {
      failures.push({
        placementId: placement.placementId,
        ...(placement.backingPlacementId ? { backingPlacementId: placement.backingPlacementId } : {}),
        reason: "not-explicitly-backed",
        artifactTag: "exposed-shell",
      });
      continue;
    }
    const backingPlacementId = placement.backingPlacementId?.trim();
    if (!backingPlacementId) {
      failures.push({
        placementId: placement.placementId,
        reason: "missing-backing-id",
        artifactTag: "exposed-shell",
      });
      continue;
    }
    const backingPlacements = inventoryById.get(backingPlacementId);
    if (!backingPlacements || backingPlacements.length === 0) {
      failures.push({
        placementId: placement.placementId,
        backingPlacementId,
        reason: "missing-backing-placement",
        artifactTag: "exposed-shell",
      });
      continue;
    }
    if (!backingPlacements.some(hasPositiveBackingVolume)) {
      failures.push({
        placementId: placement.placementId,
        backingPlacementId,
        reason: "invalid-backing-volume",
        artifactTag: "exposed-shell",
      });
    }
  }

  return failures.sort((left, right) => (
    left.placementId.localeCompare(right.placementId)
    || left.reason.localeCompare(right.reason)
    || (left.backingPlacementId ?? "").localeCompare(right.backingPlacementId ?? "")
  ));
}

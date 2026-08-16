import assert from "node:assert/strict";
import test from "node:test";

import {
  auditVisibleFacadeBacking,
  type FacadeBackingPlacement,
} from "./facadeBacking";

function placement(
  placementId: string,
  semanticClass: string,
  overrides: Partial<FacadeBackingPlacement> = {},
): FacadeBackingPlacement {
  return {
    placementId,
    semanticClass,
    moduleId: semanticClass,
    dimensionsM: { width: 2, depth: 0.2, height: 3 },
    ...overrides,
  };
}

test("accepts an explicitly backed visible segmented facade sheet", () => {
  const backing = placement("MASSING_A", "segmented_massing_backing_volume", {
    dimensionsM: { width: 5, depth: 3.4, height: 7 },
  });
  const sheet = placement("INFILL_A", "facade_wall_infill", {
    moduleId: "quiet_residential_segmented_facade",
    structurallyBacked: true,
    backingPlacementId: backing.placementId,
  });
  assert.deepEqual(auditVisibleFacadeBacking([sheet], [sheet, backing]), []);
});

test("flags every missing or non-explicit backing claim as exposed-shell", () => {
  const backing = placement("MASSING_A", "segmented_massing_backing_volume");
  const visible = [
    placement("NO_FLAG", "facade_wall_infill", { backingPlacementId: backing.placementId }),
    placement("NO_ID", "facade_wall_infill", { structurallyBacked: true }),
    placement("UNKNOWN_ID", "facade_wall_infill", {
      structurallyBacked: true,
      backingPlacementId: "DOES_NOT_EXIST",
    }),
  ];
  assert.deepEqual(
    auditVisibleFacadeBacking(visible, [...visible, backing]),
    [
      {
        placementId: "NO_FLAG",
        backingPlacementId: "MASSING_A",
        reason: "not-explicitly-backed",
        artifactTag: "exposed-shell",
      },
      {
        placementId: "NO_ID",
        reason: "missing-backing-id",
        artifactTag: "exposed-shell",
      },
      {
        placementId: "UNKNOWN_ID",
        backingPlacementId: "DOES_NOT_EXIST",
        reason: "missing-backing-placement",
        artifactTag: "exposed-shell",
      },
    ],
  );
});

test("rejects a claimed backing placement with zero, negative, or non-finite volume", () => {
  for (const [name, dimensionsM] of [
    ["zero", { width: 5, depth: 0, height: 7 }],
    ["negative", { width: 5, depth: -0.1, height: 7 }],
    ["nonfinite", { width: 5, depth: Number.NaN, height: 7 }],
  ] as const) {
    const backing = placement(`BACKING_${name}`, "segmented_massing_backing_volume", { dimensionsM });
    const sheet = placement(`SHEET_${name}`, "facade_wall_infill", {
      structurallyBacked: true,
      backingPlacementId: backing.placementId,
    });
    assert.deepEqual(auditVisibleFacadeBacking([sheet], [sheet, backing]), [{
      placementId: sheet.placementId,
      backingPlacementId: backing.placementId,
      reason: "invalid-backing-volume",
      artifactTag: "exposed-shell",
    }]);
  }
});

test("recognizes module-named segmented sheets but ignores grilles, doors, and cloth", () => {
  const backing = placement("MASSING", "segmented_massing_backing_volume");
  const namedSheet = placement("NAMED_SHEET", "facade_module", {
    moduleId: "active_merchant_segmented_facade",
  });
  const legitimate = [
    placement("GRILLE", "arcade_arch_complete_grille"),
    placement("DOOR", "hero_arch_closed_double_door"),
    placement("CLOTH", "canopy_valance"),
  ];
  assert.deepEqual(auditVisibleFacadeBacking([namedSheet, ...legitimate], [namedSheet, backing, ...legitimate]), [{
    placementId: "NAMED_SHEET",
    reason: "not-explicitly-backed",
    artifactTag: "exposed-shell",
  }]);
});

test("does not let a non-visible bad sheet contaminate the reviewed frame", () => {
  const hiddenSheet = placement("HIDDEN", "facade_wall_infill");
  const visibleDoor = placement("VISIBLE_DOOR", "door");
  assert.deepEqual(auditVisibleFacadeBacking([visibleDoor], [visibleDoor, hiddenSheet]), []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateFixtureCenterlines } from "./facade-layout-grammar.mjs";
import { emptyCompositionWaiverRegistry } from "./composition-waivers.mjs";
import {
  normalizeCompositionRules,
  validateCanopyOpeningClearance,
  validateCompiledFixtureAxes,
  validateDecorationOpeningBuffers,
  validateFixtureBuffers,
  validateHardPlacementAabbs,
  validateOpeningServiceability,
  validateSpanDerivedFenestration,
  validateWallPlacementBudgets,
  validateZoneDensityBudgets,
} from "./composition-validators.mjs";

const zones = [{ id: "COURT", rect: { x: 0, y: 0, w: 10, h: 10 } }];
const doorModule = {
  id: "DOOR",
  kind: "door",
  dimensionsM: { width: 1.2, depth: 0.2, height: 2.4 },
};
const windowModule = {
  id: "WINDOW",
  kind: "window",
  dimensionsM: { width: 1.2, depth: 0.2, height: 1.4 },
};
const columnModule = {
  id: "COLUMN",
  kind: "column",
  dimensionsM: { width: 0.5, depth: 0.2, height: 2.4 },
};
const blindNicheModule = {
  id: "BLIND_NICHE",
  kind: "blind_niche",
  dimensionsM: { width: 1.2, depth: 0.2, height: 1.8 },
};
const moduleById = new Map([
  [doorModule.id, doorModule],
  [windowModule.id, windowModule],
  [columnModule.id, columnModule],
  [blindNicheModule.id, blindNicheModule],
]);

function makeRules(overrides = {}) {
  const waiverRegistry = emptyCompositionWaiverRegistry();
  for (const [index, entry] of (overrides.waivers ?? []).entries()) {
    waiverRegistry.byKind[entry.kind].push({
      ...entry.match,
      waiver: {
        waiverId: `CW-TEST${String(index).padStart(8, "0")}`,
        reasonCode: "test-conflict",
        approvalStatus: "approved",
        approver: "test-owner",
        ticket: `TEST-${index + 1}`,
      },
    });
  }
  return normalizeCompositionRules({
    clearances: {
      door_service_m: 0.8,
      opening_lateral_buffer_m: 0.08,
      canopy_opening_buffer_m: 0.12,
      placement_aabb_buffer_m: 0.05,
      fixture_buffer_m: 0.08,
      fixture_axis_tolerance_m: 0.02,
      ...overrides.clearances,
    },
    wall_budgets: {
      fixture_spacing_m: 2,
      symmetry_tolerance: 0.1,
      small_wall_max_m: 2.5,
      small_wall_max_fixtures: 1,
      ...overrides.wall_budgets,
    },
    zone_density_budgets: {
      COURT: 4,
      ...overrides.zone_density_budgets,
    },
  }, zones, waiverRegistry);
}

function hardPlacement(id, anchorId, x, y) {
  return {
    id,
    anchorId,
    zoneId: "COURT",
    classification: "gameplay_cover",
    collisionClass: "hard",
    position: { x, y, z: 0 },
    yawDeg: 0,
    dimensionsM: { width: 0.6, depth: 0.6, height: 1 },
  };
}

function fixturePlacement(id, anchorId, x, y) {
  return {
    id,
    anchorId,
    zoneId: "COURT",
    classification: "soft_visual",
    collisionClass: "soft",
    position: { x, y, z: 1 },
    yawDeg: 0,
    dimensionsM: { width: 0.8, depth: 0.2, height: 0.8 },
  };
}

function canopyPlacement(id, anchorId, x, y, z = 3.1) {
  return {
    ...fixturePlacement(id, anchorId, x, y),
    classification: "overhead",
    position: { x, y, z },
    dimensionsM: { width: 2, depth: 4, height: 0.4 },
    spanSeats: {
      start: { x, y: y - 2, z },
      end: { x, y: y + 2, z },
    },
  };
}

test("seeded serviceability violation rejects hard cover inside a door clearance", () => {
  const architecturePlacements = [{
    id: "ARCH_DOOR",
    kind: "facade_module",
    moduleKind: "door",
    zoneId: "COURT",
    face: "west",
    center: { x: 0.1, y: 5, z: 1.2 },
    sizeM: { width: 1.2, depth: 0.2, height: 2.4 },
  }];
  assert.throws(
    () => validateOpeningServiceability({
      architecturePlacements,
      dressingPlacements: [{
        ...hardPlacement("BLOCKER", "BLOCKER_ANCHOR", 0.4, 5),
        zoneId: "ADJACENT_ZONE",
      }],
      rules: makeRules(),
    }),
    /block service clearance/,
  );
});

test("seeded serviceability violation rejects non-fixture soft dressing inside an opening", () => {
  assert.throws(
    () => validateOpeningServiceability({
      architecturePlacements: [{
        id: "ARCH_DOOR",
        kind: "facade_module",
        moduleKind: "door",
        zoneId: "COURT",
        face: "west",
        center: { x: 0.1, y: 5, z: 1.2 },
        sizeM: { width: 1.2, depth: 0.2, height: 2.4 },
      }],
      dressingPlacements: [fixturePlacement("SOFT_BLOCKER", "FREE_SOFT_ANCHOR", 0.4, 5)],
      rules: makeRules(),
    }),
    /block service clearance/,
  );
});

test("seeded serviceability violation also rejects tall cover across an elevated window", () => {
  const architecturePlacements = [{
    id: "ARCH_WINDOW",
    kind: "facade_module",
    moduleKind: "window",
    zoneId: "COURT",
    face: "west",
    center: { x: 0.1, y: 5, z: 3.5 },
    sizeM: { width: 1.2, depth: 0.2, height: 1.4 },
  }];
  assert.throws(
    () => validateOpeningServiceability({
      architecturePlacements,
      dressingPlacements: [{
        ...hardPlacement("TALL_BLOCKER", "BLOCKER_ANCHOR", 0.4, 5),
        dimensionsM: { width: 0.6, depth: 0.6, height: 4.5 },
      }],
      rules: makeRules(),
    }),
    /block service clearance/,
  );
});

test("opening-service exemptions bind an exact soft-placement/opening conflict", () => {
  const architecturePlacements = [{
    id: "ARCH_DOOR",
    kind: "facade_module",
    moduleKind: "door",
    zoneId: "COURT",
    face: "west",
    center: { x: 0.1, y: 5, z: 1.2 },
    sizeM: { width: 1.2, depth: 0.2, height: 2.4 },
  }];
  const dressingPlacements = [fixturePlacement("SOFT_BLOCKER", "FREE_SOFT_ANCHOR", 0.4, 5)];
  const rules = makeRules({
    waivers: [{
      kind: "opening-service",
      match: {
        placementId: "SOFT_BLOCKER",
        openingId: "ARCH_DOOR",
      },
    }],
  });
  assert.deepEqual(
    validateOpeningServiceability({ architecturePlacements, dressingPlacements, rules }),
    [{
      placementId: "SOFT_BLOCKER",
      openingId: "ARCH_DOOR",
      waiverId: "CW-TEST00000000",
      reasonCode: "test-conflict",
      approvalStatus: "approved",
      approver: "test-owner",
      ticket: "TEST-1",
    }],
  );
});

test("seeded placement AABB violation rejects same-anchor overlaps across zone labels", () => {
  const left = hardPlacement("HARD_A", "SHARED_ANCHOR", 4, 4);
  const right = {
    ...hardPlacement("HARD_B", "SHARED_ANCHOR", 4.4, 4),
    zoneId: "ADJACENT_ZONE",
  };
  assert.throws(
    () => validateHardPlacementAabbs({
      dressingPlacements: [left, right],
      rules: makeRules(),
    }),
    /overlap their buffered AABBs/,
  );
});

test("seeded fixture-axis violation rejects a sign that drifts from its served opening", () => {
  const frontage = {
    id: "COURT_WEST",
    bays: [{
      id: "GROUND_01",
      moduleId: "DOOR",
      along: 0.5,
      baseElevationM: 0,
      datumId: "GROUND_HEAD_2.40",
    }],
    layout: { signBandBottomM: 2.5, signBandTopM: 3.2 },
  };
  assert.throws(
    () => validateFixtureCenterlines({
      frontage,
      moduleById,
      anchors: [{
        id: "DRIFTED_SIGN",
        type: "signage_anchor",
        frontageId: frontage.id,
        servedBayId: "GROUND_01",
        along: 0.58,
        vertical_offset_m: 2.8,
        width_m: 1.44,
      }],
    }),
    /not centered on served bay/,
  );
});

test("seeded compiled-axis violation rejects placement offset after an aligned anchor", () => {
  assert.throws(
    () => validateCompiledFixtureAxes({
      zones,
      rules: makeRules(),
      frontages: [{
        id: "COURT_WEST",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 1,
        bays: [{ id: "GROUND_01", along: 0.5 }],
      }],
      anchors: [{
        id: "SIGN",
        type: "signage_anchor",
        frontageId: "COURT_WEST",
        servedBayId: "GROUND_01",
        along: 0.5,
      }],
      dressingPlacements: [fixturePlacement("SIGN_PLACE", "SIGN", 0, 5.2)],
    }),
    /off their served-opening axes/,
  );
});

test("seeded decoration-buffer violation rejects same-bay fixtures separated only by an undersized vertical gap", () => {
  const anchors = [
    { id: "FIXTURE_A", type: "dressing_anchor", frontageId: "COURT_WEST", servedBayId: "GROUND_01" },
    { id: "FIXTURE_B", type: "dressing_anchor", frontageId: "COURT_WEST", servedBayId: "GROUND_01" },
  ];
  const upperFixture = {
    ...fixturePlacement("FIXTURE_PLACE_B", "FIXTURE_B", 1, 1),
    position: { x: 1, y: 1, z: 1.9 },
  };
  assert.throws(
    () => validateFixtureBuffers({
      anchors,
      dressingPlacements: [
        fixturePlacement("FIXTURE_PLACE_A", "FIXTURE_A", 1, 1),
        upperFixture,
      ],
      rules: makeRules(),
    }),
    /violate measured decoration buffers/,
  );
});

test("fixture buffers do not trust different frontage labels over physical overlap", () => {
  assert.throws(
    () => validateFixtureBuffers({
      anchors: [
        { id: "FIXTURE_A", type: "dressing_anchor", frontageId: "WEST", servedBayId: "GROUND_01" },
        { id: "FIXTURE_B", type: "dressing_anchor", frontageId: "NORTH", servedBayId: "GROUND_01" },
      ],
      dressingPlacements: [
        fixturePlacement("FIXTURE_PLACE_A", "FIXTURE_A", 1, 1),
        fixturePlacement("FIXTURE_PLACE_B", "FIXTURE_B", 1.1, 1),
      ],
      rules: makeRules(),
    }),
    /violate measured decoration buffers/,
  );
});

test("seeded decoration-opening violation rejects a fixture intersecting an opening volume", () => {
  assert.throws(
    () => validateDecorationOpeningBuffers({
      anchors: [{
        id: "FIXTURE",
        type: "dressing_anchor",
        frontageId: "COURT_WEST",
        servedBayId: "GROUND_01",
      }],
      architecturePlacements: [{
        id: "ARCH_DOOR",
        kind: "facade_module",
        moduleKind: "door",
        zoneId: "COURT",
        center: { x: 1, y: 1, z: 1.2 },
        sizeM: { width: 1.2, depth: 0.2, height: 2.4 },
        yawDeg: 0,
      }],
      dressingPlacements: [fixturePlacement("FIXTURE_PLACE", "FIXTURE", 1, 1)],
      rules: makeRules(),
    }),
    /violate measured opening buffers/,
  );
});

test("a fixture may occupy the one opening its anchor declares it serves", () => {
  const call = (openingId) => validateDecorationOpeningBuffers({
    anchors: [{
      id: "FIXTURE",
      type: "dressing_anchor",
      frontageId: "COURT_WEST",
      servedBayId: "GROUND_01",
    }],
    architecturePlacements: [{
      id: openingId,
      kind: "facade_module",
      moduleKind: "door",
      zoneId: "COURT",
      center: { x: 1, y: 1, z: 1.2 },
      sizeM: { width: 1.2, depth: 0.2, height: 2.4 },
      yawDeg: 0,
    }],
    dressingPlacements: [fixturePlacement("FIXTURE_PLACE", "FIXTURE", 1, 1)],
    rules: makeRules(),
  });
  // The served bay is the fixture's own opening: a stall seated in its merchant
  // recess is the intended composition, not a conflict.
  assert.deepEqual(call("ARCH_COURT_WEST_GROUND_01"), []);
  // Any other opening on the same wall still has to be cleared.
  assert.throws(() => call("ARCH_COURT_WEST_GROUND_02"), /violate measured opening buffers/);
});

test("seeded canopy violation rejects an overhead span crossing an upper opening", () => {
  const anchors = [{
    id: "CANOPY",
    type: "cloth_canopy_span",
  }];
  assert.throws(
    () => validateCanopyOpeningClearance({
      anchors,
      dressingPlacements: [canopyPlacement("CANOPY_PLACE", "CANOPY", 5, 5)],
      architecturePlacements: [{
        id: "ARCH_UPPER_WINDOW",
        kind: "facade_module",
        moduleKind: "window",
        center: { x: 5, y: 5, z: 3.3 },
        sizeM: { width: 1.2, depth: 0.2, height: 1.4 },
        yawDeg: 0,
      }],
      rules: makeRules(),
    }),
    /intersects facade openings/,
  );
});

test("canopy clearance requires exact authored span seats instead of a placement-box fallback", () => {
  assert.throws(
    () => validateCanopyOpeningClearance({
      anchors: [{ id: "CANOPY", type: "cloth_canopy_span" }],
      dressingPlacements: [{
        ...fixturePlacement("CANOPY_PLACE", "CANOPY", 5, 5),
        classification: "overhead",
      }],
      architecturePlacements: [{
        id: "ARCH_UPPER_WINDOW",
        kind: "facade_module",
        moduleKind: "window",
        center: { x: 5, y: 5, z: 3.3 },
        sizeM: { width: 1.2, depth: 0.2, height: 1.4 },
        yawDeg: 0,
      }],
      rules: makeRules(),
    }),
    /requires exact span seats/,
  );
});

test("canopy clearance does not false-positive when the span is entirely below an opening", () => {
  assert.doesNotThrow(
    () => validateCanopyOpeningClearance({
      anchors: [{
        id: "LOW_CANOPY",
        type: "cloth_canopy_span",
      }],
      dressingPlacements: [{
        ...canopyPlacement("LOW_CANOPY_PLACE", "LOW_CANOPY", 5, 5, 1),
        dimensionsM: { width: 2, depth: 4, height: 0.2 },
      }],
      architecturePlacements: [{
        id: "ARCH_UPPER_WINDOW",
        kind: "facade_module",
        moduleKind: "window",
        center: { x: 5, y: 5, z: 3.3 },
        sizeM: { width: 1.2, depth: 0.2, height: 1.4 },
        yawDeg: 0,
      }],
      rules: makeRules(),
    }),
  );
});

test("blind niches do not satisfy the span-derived opening count", () => {
  assert.throws(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      rules: makeRules(),
      frontages: [{
        id: "SHORT_BUT_FENESTRATED",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 0.3,
        bays: [{
          id: "GROUND_01",
          moduleId: "BLIND_NICHE",
          along: 0.5,
          baseElevationM: 0,
          datumId: "GROUND_HEAD_1.80",
        }],
      }],
    }),
    /has 0 ground bays/,
  );
});

test("a lone facade-centered upper opening is valid without a ground axis", () => {
  assert.doesNotThrow(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      rules: makeRules(),
      frontages: [{
        id: "CENTERED_UPPER_RETURN",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 0.2,
        bays: [{
          id: "UPPER_01",
          moduleId: "WINDOW",
          along: 0.5,
          baseElevationM: 2.8,
          datumId: "STORY_1_SILL_2.80",
        }],
      }],
    }),
  );
});

test("seeded span-derived fenestration violation rejects too few ground bays", () => {
  assert.throws(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      frontages: [{
        id: "COURT_WEST",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 1,
        bays: [{
          id: "GROUND_01",
          moduleId: "DOOR",
          along: 0.5,
          baseElevationM: 0,
          datumId: "GROUND_HEAD_2.40",
        }],
      }],
    }),
    /required by its 10.00m span/,
  );
});

test("seeded span-derived fenestration violation does not count solid column bays as openings", () => {
  assert.throws(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      frontages: [{
        id: "COURT_WEST",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 1,
        bays: [
          {
            id: "GROUND_01",
            moduleId: "COLUMN",
            along: 0.3,
            baseElevationM: 0,
            datumId: "GROUND_HEAD_2.40",
          },
          {
            id: "GROUND_02",
            moduleId: "COLUMN",
            along: 0.7,
            baseElevationM: 0,
            datumId: "GROUND_HEAD_2.40",
          },
        ],
      }],
    }),
    /has 0 ground bays/,
  );
});

test("sub-2.5m returns may carry zero openings", () => {
  assert.doesNotThrow(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      rules: makeRules(),
      frontages: [{
        id: "SHORT_RETURN",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 0.2,
        bays: [],
      }],
    }),
  );
});

test("a mirrored solid module cannot legitimize an off-rhythm upper window", () => {
  assert.throws(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      rules: makeRules(),
      frontages: [{
        id: "COURT_WEST",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 0.6,
        bays: [
          { id: "GROUND_01", moduleId: "DOOR", along: 0.5, baseElevationM: 0, datumId: "GROUND_HEAD_2.40" },
          { id: "UPPER_WINDOW", moduleId: "WINDOW", along: 0.2, baseElevationM: 2.8, datumId: "STORY_1_SILL_2.80" },
          { id: "UPPER_COLUMN", moduleId: "COLUMN", along: 0.8, baseElevationM: 2.8, datumId: "STORY_1_SILL_2.80" },
        ],
      }],
    }),
    /does not align to the ground bay rhythm/,
  );
});

test("seeded rhythm violation rejects an unpaired upper opening off the ground axes", () => {
  assert.throws(
    () => validateSpanDerivedFenestration({
      zones,
      moduleById,
      frontages: [{
        id: "COURT_WEST",
        zoneId: "COURT",
        face: "west",
        start: 0,
        end: 0.6,
        bays: [
          {
            id: "GROUND_01",
            moduleId: "DOOR",
            along: 0.25,
            baseElevationM: 0,
            datumId: "GROUND_HEAD_2.40",
          },
          {
            id: "UPPER_01",
            moduleId: "WINDOW",
            along: 0.8,
            baseElevationM: 2.8,
            datumId: "STORY_1_SILL_2.80",
          },
        ],
      }],
    }),
    /does not align to the ground bay rhythm/,
  );
});

test("seeded wall-count violation rejects fixture density above its span-derived budget", () => {
  const anchors = Array.from({ length: 6 }, (_, index) => ({
    id: `FIXTURE_${index}`,
    type: "dressing_anchor",
    frontageId: "COURT_WEST",
    servedBayId: "GROUND_01",
    along: 0.1 + index * 0.14,
  }));
  assert.throws(
    () => validateWallPlacementBudgets({
      zones,
      anchors,
      dressingPlacements: anchors.map((anchor) => fixturePlacement(
        `PLACE_${anchor.id}`,
        anchor.id,
        0,
        anchor.along * 10,
      )),
      rules: makeRules(),
      frontages: [{ id: "COURT_WEST", zoneId: "COURT", face: "west", start: 0, end: 1 }],
    }),
    /above its span-derived budget/,
  );
});

test("seeded symmetry violation rejects a centroid-balanced but non-mirrored fixture group", () => {
  assert.throws(
    () => validateWallPlacementBudgets({
      zones,
      rules: makeRules(),
      frontages: [{ id: "COURT_WEST", zoneId: "COURT", face: "west", start: 0, end: 1 }],
      anchors: [
        { id: "FIXTURE_A", type: "dressing_anchor", frontageId: "COURT_WEST", servedBayId: "GROUND_01", along: 0.08 },
        { id: "FIXTURE_B", type: "dressing_anchor", frontageId: "COURT_WEST", servedBayId: "GROUND_01", along: 0.62 },
        { id: "FIXTURE_C", type: "dressing_anchor", frontageId: "COURT_WEST", servedBayId: "GROUND_01", along: 0.8 },
      ],
      dressingPlacements: [
        fixturePlacement("PLACE_A", "FIXTURE_A", 0, 0.8),
        fixturePlacement("PLACE_B", "FIXTURE_B", 0, 6.2),
        fixturePlacement("PLACE_C", "FIXTURE_C", 0, 8),
      ],
    }),
    /exceeds symmetry tolerance/,
  );
});

test("a lone off-center fixture on a large wall cannot bypass symmetry", () => {
  assert.throws(
    () => validateWallPlacementBudgets({
      zones,
      rules: makeRules(),
      frontages: [{ id: "COURT_WEST", zoneId: "COURT", face: "west", start: 0, end: 1 }],
      anchors: [{
        id: "FIXTURE_A",
        type: "dressing_anchor",
        frontageId: "COURT_WEST",
        servedBayId: "GROUND_01",
        along: 0.2,
      }],
      dressingPlacements: [fixturePlacement("PLACE_A", "FIXTURE_A", 0, 2)],
    }),
    /lone fixture 0.200 exceeds symmetry tolerance/,
  );
});

test("seeded zone-density violation rejects a placement count above the authored budget", () => {
  assert.throws(
    () => validateZoneDensityBudgets({
      zones,
      rules: makeRules({ zone_density_budgets: { COURT: 1 } }),
      dressingPlacements: [
        fixturePlacement("PLACE_A", "ANCHOR_A", 1, 1),
        fixturePlacement("PLACE_B", "ANCHOR_B", 2, 2),
      ],
    }),
    /above density budget 1/,
  );
});

test("explicit canopy exceptions remain citable, visible, and non-stale", () => {
  const rules = makeRules({
    waivers: [{
      kind: "canopy-opening",
      match: {
        anchorId: "CANOPY",
        openingIds: ["ARCH_UPPER_WINDOW"],
      },
    }],
  });
  assert.deepEqual(rules.canopyOpeningExemptions, [{
    anchorId: "CANOPY",
    openingIds: ["ARCH_UPPER_WINDOW"],
    waiver: {
      waiverId: "CW-TEST00000000",
      reasonCode: "test-conflict",
      approvalStatus: "approved",
      approver: "test-owner",
      ticket: "TEST-1",
    },
  }]);
  const anchors = [{
    id: "CANOPY",
    type: "cloth_canopy_span",
  }];
  const dressingPlacements = [canopyPlacement("CANOPY_PLACE", "CANOPY", 5, 5)];
  const architecturePlacements = [{
    id: "ARCH_UPPER_WINDOW",
    kind: "facade_module",
    moduleKind: "window",
    center: { x: 5, y: 5, z: 3.3 },
    sizeM: { width: 1.2, depth: 0.2, height: 1.4 },
    yawDeg: 0,
  }];
  assert.deepEqual(
    validateCanopyOpeningClearance({
      anchors,
      dressingPlacements,
      architecturePlacements,
      rules,
    }),
    [{
      anchorId: "CANOPY",
      openingIds: ["ARCH_UPPER_WINDOW"],
      waiverId: "CW-TEST00000000",
      reasonCode: "test-conflict",
      approvalStatus: "approved",
      approver: "test-owner",
      ticket: "TEST-1",
    }],
  );
  assert.throws(
    () => validateCanopyOpeningClearance({
      anchors,
      dressingPlacements,
      architecturePlacements: architecturePlacements.concat({
        ...architecturePlacements[0],
        id: "ARCH_NEW_CONFLICT",
      }),
      rules,
    }),
    /must exactly match conflicts/,
  );
  assert.throws(
    () => validateCanopyOpeningClearance({
      anchors: [],
      dressingPlacements: [],
      architecturePlacements,
      rules,
    }),
    /no longer match a conflict/,
  );
});

test("compiled fixture axes fail loudly on unresolved frontage and bay references", () => {
  assert.throws(
    () => validateCompiledFixtureAxes({
      zones,
      rules: makeRules(),
      frontages: [],
      anchors: [{
        id: "SIGN",
        type: "signage_anchor",
        frontageId: "MISSING_FRONTAGE",
        servedBayId: "GROUND_01",
      }],
      dressingPlacements: [fixturePlacement("SIGN_PLACE", "SIGN", 0, 5)],
    }),
    /references unknown frontage/,
  );
});

test("fixture-axis exemptions bind the exact placement and served-opening conflict", () => {
  const frontages = [{
    id: "COURT_WEST",
    zoneId: "COURT",
    face: "west",
    start: 0,
    end: 1,
    bays: [{ id: "GROUND_01", along: 0.5 }],
  }];
  const anchors = [{
    id: "SIGN",
    type: "signage_anchor",
    frontageId: "COURT_WEST",
    servedBayId: "GROUND_01",
  }];
  const rules = makeRules({
    waivers: [{
      kind: "fixture-axis",
      match: {
        placementId: "SIGN_PLACE",
        openingId: "COURT_WEST:GROUND_01",
      },
    }],
  });
  assert.deepEqual(
    validateCompiledFixtureAxes({
      zones,
      rules,
      frontages,
      anchors,
      dressingPlacements: [fixturePlacement("SIGN_PLACE", "SIGN", 0, 5.2)],
    }),
    [{
      placementId: "SIGN_PLACE",
      openingId: "COURT_WEST:GROUND_01",
      axisErrorM: 0.20000000000000018,
      waiverId: "CW-TEST00000000",
      reasonCode: "test-conflict",
      approvalStatus: "approved",
      approver: "test-owner",
      ticket: "TEST-1",
    }],
  );
});

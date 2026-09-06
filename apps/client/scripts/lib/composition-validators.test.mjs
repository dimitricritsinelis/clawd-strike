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
} from "./composition-validators.mjs";

const zones = [{ id: "COURT", rect: { x: 0, y: 0, w: 10, h: 10 } }];
const doorModule = {
  id: "DOOR",
  kind: "door",
  dimensionsM: { width: 1.2, depth: 0.2, height: 2.4 },
};
const moduleById = new Map([
  [doorModule.id, doorModule],
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
  }, waiverRegistry);
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

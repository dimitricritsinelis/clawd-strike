import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedSignWidthM,
  generateAuthoredFacadeLayout,
  generateFacadeLayout,
  validateFacadeLayout,
  validateFrontageCoverage,
  validateFixtureCenterlines,
} from "./facade-layout-grammar.mjs";

const modules = [
  { id: "shop_recess_market", kind: "shop_recess", dimensionsM: { width: 2.4, depth: 0.45, height: 2.7 } },
  { id: "door_shop_timber", kind: "door", dimensionsM: { width: 1.15, depth: 0.22, height: 2.7 } },
  { id: "window_shuttered", kind: "window", dimensionsM: { width: 1.1, depth: 0.24, height: 1.45 } },
  { id: "door_residential_timber", kind: "door", dimensionsM: { width: 1.05, depth: 0.2, height: 2.25 } },
  { id: "window_screened", kind: "window", dimensionsM: { width: 1, depth: 0.24, height: 1.4 } },
  { id: "window_dark_recess", kind: "window", dimensionsM: { width: 1.1, depth: 0.24, height: 1.45 } },
  { id: "timber_coverage_closure", kind: "column", dimensionsM: { width: 1.15, depth: 0.14, height: 2.25 } },
  { id: "pilaster_coverage", kind: "column", dimensionsM: { width: 0.42, depth: 0.24, height: 2.25 } },
  { id: "pilaster_niche_coverage", kind: "column", dimensionsM: { width: 0.42, depth: 0.24, height: 1.8 } },
  { id: "blind_niche", kind: "blind_niche", dimensionsM: { width: 1.05, depth: 0.18, height: 1.8 } },
  { id: "pilaster_facade", kind: "column", dimensionsM: { width: 0.42, depth: 0.24, height: 3.4 } },
];
const moduleById = new Map(modules.map((module) => [module.id, module]));

function generate(frontageId = "FRONTAGE_TEST") {
  return generateFacadeLayout({
    frontageId,
    lengthM: 15.12,
    heightM: 7,
    family: "active_merchant",
    rhythm: "merchant",
    profileModuleIds: modules.map((module) => module.id),
    moduleById,
  });
}

test("generates deterministic aligned bays with named datums and edge margins", () => {
  const first = generate();
  const second = generate();
  assert.deepEqual(first, second);
  assert.ok(first.bays.length >= 5);
  assert.ok(first.bays.every((bay) => bay.layoutSource === "generated" && bay.datumId && bay.columnId));
  const ground = first.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_"));
  assert.ok(new Set(ground.map((bay) => bay.moduleId)).size > 1, "long frontage should not stamp one identical module");
  assert.ok(ground.every((bay) => {
    const module = moduleById.get(bay.moduleId);
    return Math.abs(bay.baseElevationM + module.dimensionsM.height - first.layout.groundHeadM) < 1e-9;
  }));
  assert.ok(
    first.layout.upperSillDatumsM[0] - (first.layout.groundHeadM + 0.48) >= 0.5,
    "merchant frontage must preserve a half-metre wall band above awnings",
  );
});

test("dense residential rhythm adds at least a fourth datum-aligned bay on a fifteen-metre frontage", () => {
  const generated = generateFacadeLayout({
    frontageId: "FRONTAGE_DENSE_RESIDENTIAL",
    lengthM: 15.12,
    heightM: 4.5,
    family: "quiet_residential",
    rhythm: "residential_dense",
    profileModuleIds: modules.map((module) => module.id),
    moduleById,
  });
  const ground = generated.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_"));
  assert.ok(ground.length >= 4);
  assert.equal(new Set(ground.map((bay) => bay.datumId)).size, 1);
  assert.ok(ground.every((bay) => bay.along >= 0.07 && bay.along <= 0.93));
});

test("coverage relief mixes timber closures with lower-cost pilasters on one datum", () => {
  const generated = generateFacadeLayout({
    frontageId: "FRONTAGE_COVERAGE_RELIEF",
    lengthM: 15.12,
    heightM: 4.9,
    family: "quiet_residential",
    rhythm: "residential_dense",
    profileModuleIds: ["timber_coverage_closure", "pilaster_coverage"],
    moduleById,
  });
  const ground = generated.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_"));
  assert.equal(ground[0]?.moduleId, "timber_coverage_closure");
  assert.ok(ground.some((bay) => bay.moduleId === "timber_coverage_closure"));
  assert.ok(ground.some((bay) => bay.moduleId === "pilaster_coverage"));
  assert.equal(new Set(ground.map((bay) => bay.datumId)).size, 1);
});

test("niche coverage spends one real recess per frontage and keeps remaining bays budgeted", () => {
  const generated = generateFacadeLayout({
    frontageId: "FRONTAGE_NICHE_COVERAGE",
    lengthM: 15.12,
    heightM: 4.9,
    family: "quiet_residential",
    rhythm: "residential_dense",
    profileModuleIds: ["blind_niche", "pilaster_niche_coverage"],
    moduleById,
  });
  const ground = generated.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_"));
  assert.equal(ground.filter((bay) => bay.moduleId === "blind_niche").length, 1);
  assert.ok(ground.slice(1).every((bay) => bay.moduleId === "pilaster_niche_coverage"));
  assert.equal(new Set(ground.map((bay) => bay.datumId)).size, 1);
});

test("rejects unserved and off-center facade fixtures", () => {
  const frontage = { id: "FRONTAGE_TEST", ...generate() };
  assert.throws(
    () => validateFixtureCenterlines({
      frontage,
      moduleById,
      anchors: [{ id: "SIGN", type: "signage_anchor", frontageId: frontage.id, along: 0.5, vertical_offset_m: 3 }],
    }),
    /must declare servedBayId/,
  );
  assert.throws(
    () => validateFixtureCenterlines({
      frontage,
      moduleById,
      anchors: [{ id: "SIGN", type: "signage_anchor", frontageId: frontage.id, servedBayId: "GROUND_01", along: 0.5, vertical_offset_m: 3 }],
    }),
    /not centered/,
  );
});

test("frontage-served lanterns obey the same source axis contract", () => {
  const frontage = { id: "FRONTAGE_TEST", ...generate() };
  const bay = frontage.bays.find((candidate) => candidate.id === "GROUND_01");
  assert.throws(
    () => validateFixtureCenterlines({
      frontage,
      moduleById,
      anchors: [{
        id: "LANTERN",
        type: "lantern_anchor",
        frontageId: frontage.id,
        servedBayId: bay.id,
        along: bay.along + 0.1,
      }],
    }),
    /not centered on served bay/,
  );
});

test("derives sign width from the served opening and rejects manual drift", () => {
  const frontage = { id: "FRONTAGE_TEST", ...generate() };
  const bay = frontage.bays.find((candidate) => candidate.id === "GROUND_01");
  const module = moduleById.get(bay.moduleId);
  const expectedWidth = expectedSignWidthM(module.dimensionsM.width);
  const sign = {
    id: "SIGN",
    type: "signage_anchor",
    frontageId: frontage.id,
    servedBayId: bay.id,
    along: bay.along,
    vertical_offset_m: 3.05,
    width_m: expectedWidth,
  };
  assert.doesNotThrow(() => validateFixtureCenterlines({ frontage, moduleById, anchors: [sign] }));
  assert.throws(
    () => validateFixtureCenterlines({
      frontage,
      moduleById,
      anchors: [{ ...sign, width_m: module.dimensionsM.width * 2 }],
    }),
    /must derive from served opening/,
  );
});

test("rejects upper-story doors without a balcony-backed override", () => {
  const generated = generate();
  const invalidBays = generated.bays.concat({
    id: "UPPER_DOOR",
    moduleId: "door_shop_timber",
    along: 0.5,
    baseElevationM: 3.35,
    datumId: "STORY_1_SILL_3.35",
    columnId: "UPPER_COLUMN_99",
    layoutSource: "generated",
  });
  assert.throws(
    () => validateFacadeLayout({
      frontageId: "FRONTAGE_TEST",
      lengthM: 15.12,
      heightM: 7,
      family: "active_merchant",
      bays: invalidBays,
      layout: generated.layout,
      moduleById,
    }),
    /upper-story door without a balcony/,
  );
});

test("requires every walkable zone face to carry a frontage or measured exemption", () => {
  const zones = [{ id: "COURT" }, { id: "LINK" }];
  const frontages = [
    { id: "COURT_N", zoneId: "COURT", face: "north" },
    { id: "COURT_E", zoneId: "COURT", face: "east" },
  ];
  const exemptions = [
    { zoneId: "COURT", face: "south", reason: "sealed_perimeter", note: "South map edge." },
    { zoneId: "COURT", face: "west", reason: "short_wall_return", note: "1.8m surviving return." },
    { zoneId: "LINK", face: "north", reason: "architectural_cut_edge", note: "2.0m cut edge." },
    { zoneId: "LINK", face: "south", reason: "architectural_cut_edge", note: "2.0m cut edge." },
    { zoneId: "LINK", face: "east", reason: "open_traversal_face", note: "Open connector mouth." },
    { zoneId: "LINK", face: "west", reason: "open_traversal_face", note: "Open connector mouth." },
  ];

  const coverage = validateFrontageCoverage({ zones, frontages, exemptions });
  assert.equal(coverage.totalFaceCount, 8);
  assert.equal(coverage.frontageFaceCount, 2);
  assert.equal(coverage.exemptionFaceCount, 6);

  assert.throws(
    () => validateFrontageCoverage({ zones, frontages, exemptions: exemptions.slice(0, -1) }),
    /lack frontage or exemption records: LINK:west/,
  );
  assert.throws(
    () => validateFrontageCoverage({
      zones,
      frontages,
      exemptions: exemptions.concat({
        zoneId: "COURT",
        face: "north",
        reason: "sealed_perimeter",
        note: "Contradicts the authored frontage.",
      }),
    }),
    /cannot carry both a frontage and an exemption/,
  );
});

// ---------------------------------------------------------------------------
// Authored composition mode. Opening positions are a design decision: named
// columns, declared mirrors, declared corner treatment, one ordering sentence.
// ---------------------------------------------------------------------------

function authored(intent, overrides = {}) {
  return generateAuthoredFacadeLayout({
    frontageId: "FRONTAGE_AUTHORED",
    lengthM: 15.12,
    heightM: 7,
    family: "quiet_residential",
    profileModuleIds: modules.map((module) => module.id),
    moduleById,
    intent: { mode: "authored", ...intent },
    ...overrides,
  });
}

const symmetricIntent = {
  composition: "Residential door on the court axis, one mirrored pair of screened windows above; corners held.",
  cornerTreatment: "held",
  columns: [
    { id: "AXIS", along: 0.5 },
    { id: "L1", along: 0.3, mirrorOf: "R1" },
    { id: "R1", along: 0.7 },
  ],
  bays: [
    { id: "GROUND_DOOR", moduleId: "door_residential_timber", columnId: "AXIS" },
    { id: "GROUND_NICHE_L", moduleId: "blind_niche", columnId: "L1" },
    { id: "GROUND_NICHE_R", moduleId: "blind_niche", columnId: "R1" },
    { id: "STORY_1_WINDOW_L", moduleId: "window_screened", columnId: "L1", story: 1 },
    { id: "STORY_1_WINDOW_R", moduleId: "window_screened", columnId: "R1", story: 1 },
  ],
};

test("authored layouts place bays on named columns, keep shared datums, and pass the physical validator", () => {
  const first = authored(symmetricIntent);
  const second = authored(symmetricIntent);
  assert.deepEqual(first, second, "authored layouts are deterministic");
  assert.equal(first.layout.source, "authored");
  assert.equal(first.layout.rhythm, "authored");
  assert.equal(first.layout.cornerTreatment, "held");
  assert.equal(first.layout.axisAlong, 0.5);
  assert.ok(first.bays.every((bay) => bay.layoutSource === "authored" && bay.datumId && bay.columnId));
  const door = first.bays.find((bay) => bay.id === "GROUND_DOOR");
  assert.equal(door.along, 0.5);
  assert.equal(door.baseElevationM, 0);
  const ground = first.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_"));
  assert.equal(new Set(ground.map((bay) => bay.datumId)).size, 1, "ground bays share one head datum");
  assert.ok(ground.every((bay) => {
    const module = moduleById.get(bay.moduleId);
    return Math.abs(bay.baseElevationM + module.dimensionsM.height - first.layout.groundHeadM) < 1e-9;
  }));
  const upper = first.bays.filter((bay) => bay.datumId.startsWith("STORY_1_SILL_"));
  assert.equal(upper.length, 2);
  assert.deepEqual(upper.map((bay) => bay.columnId).sort(), ["L1", "R1"], "upper windows sit over their ground columns");
  assert.deepEqual(first.layout.upperSillDatumsM, [3.68]);
  // The same physical validator that guards generated layouts accepts the result.
  assert.doesNotThrow(() => validateFacadeLayout({
    frontageId: "FRONTAGE_AUTHORED",
    lengthM: 15.12,
    heightM: 7,
    family: "quiet_residential",
    bays: first.bays,
    layout: first.layout,
    moduleById,
  }));
});

test("authored layouts check declared mirrors about the composition axis", () => {
  assert.throws(
    () => authored({
      ...symmetricIntent,
      columns: [{ id: "AXIS", along: 0.5 }, { id: "L1", along: 0.3, mirrorOf: "R1" }, { id: "R1", along: 0.66 }],
    }),
    /not mirrored about axis 0\.500/,
  );
  assert.throws(
    () => authored({
      ...symmetricIntent,
      columns: [{ id: "AXIS", along: 0.5 }, { id: "L1", along: 0.3, mirrorOf: "MISSING" }, { id: "R1", along: 0.7 }],
    }),
    /mirrors unknown column/,
  );
  // An off-centre axis is allowed when declared, and mirrors are checked about it.
  const shifted = authored({
    ...symmetricIntent,
    axisAlong: 0.4,
    columns: [{ id: "AXIS", along: 0.4 }, { id: "L1", along: 0.2, mirrorOf: "R1" }, { id: "R1", along: 0.6 }],
  });
  assert.equal(shifted.layout.axisAlong, 0.4);
});

test("authored held corners refuse openings jammed into the frontage ends", () => {
  assert.throws(
    () => authored({
      composition: "A door pushed into the corner is exactly the failure this mode exists to prevent.",
      cornerTreatment: "held",
      columns: [{ id: "CORNER", along: 0.075 }, { id: "MID", along: 0.5 }, { id: "FAR", along: 0.85 }],
      bays: [
        { id: "GROUND_DOOR", moduleId: "door_residential_timber", columnId: "CORNER" },
        { id: "GROUND_NICHE", moduleId: "blind_niche", columnId: "MID" },
        { id: "GROUND_NICHE_2", moduleId: "blind_niche", columnId: "FAR" },
      ],
    }),
    /sits 0\.6\dm from a corner; a held corner keeps at least 1\.20m of pier/,
  );
});

test("authored pilaster corners require a column module at each end and open corners are declared", () => {
  assert.throws(
    () => authored({ ...symmetricIntent, cornerTreatment: "pilaster" }),
    /declares pilaster corners but lacks a column module within 0\.90m of both ends/,
  );
  const withPilasters = authored({
    ...symmetricIntent,
    cornerTreatment: "pilaster",
    columns: [
      ...symmetricIntent.columns,
      { id: "P_START", along: 0.6 / 15.12 + 0.21 / 15.12 },
      { id: "P_END", along: 1 - (0.6 / 15.12 + 0.21 / 15.12) },
    ],
    bays: [
      ...symmetricIntent.bays,
      { id: "GROUND_PILASTER_START", moduleId: "pilaster_coverage", columnId: "P_START" },
      { id: "GROUND_PILASTER_END", moduleId: "pilaster_coverage", columnId: "P_END" },
    ],
  });
  assert.equal(withPilasters.layout.cornerTreatment, "pilaster");
  assert.equal(withPilasters.bays.filter((bay) => bay.moduleId === "pilaster_coverage").length, 2);
  // "open" performs no corner check but still demands the ordering sentence.
  assert.doesNotThrow(() => authored({ ...symmetricIntent, cornerTreatment: "open" }));
  assert.throws(() => authored({ ...symmetricIntent, cornerTreatment: "random" }), /cornerTreatment must be one of/);
});

test("authored layouts require one complete ordering sentence and reject unsupported or unnamed inputs", () => {
  assert.throws(() => authored({ ...symmetricIntent, composition: "door in middle" }), /one complete sentence/);
  assert.throws(() => authored({ ...symmetricIntent, composition: "" }), /composition must be a non-empty string/);
  assert.throws(() => authored({ ...symmetricIntent, rhythm: "merchant" }), /unsupported field 'rhythm'/);
  assert.throws(
    () => authored({ ...symmetricIntent, columns: [{ id: "lower", along: 0.5 }] }),
    /must match/,
  );
  assert.throws(
    () => authored({ ...symmetricIntent, bays: [{ id: "GROUND_DOOR", moduleId: "door_residential_timber", columnId: "GHOST" }] }),
    /hangs on unknown column 'GHOST'/,
  );
  assert.throws(
    () => authored({ ...symmetricIntent, bays: [...symmetricIntent.bays, { id: "GROUND_DOOR", moduleId: "blind_niche", columnId: "R1" }] }),
    /repeats bay id/,
  );
  assert.throws(
    () => authored({
      ...symmetricIntent,
      bays: [...symmetricIntent.bays, { id: "GROUND_DUPLICATE", moduleId: "blind_niche", columnId: "AXIS" }],
    }),
    /column 'AXIS' hosts two bays on story 0/,
  );
});

test("authored layouts keep every physical grammar rule: profile, ground head, stories, parapet, overlap, articulation", () => {
  assert.throws(
    () => authored({ ...symmetricIntent, bays: [{ id: "GROUND_SHOP", moduleId: "shop_recess_market", columnId: "AXIS" }] }, {
      profileModuleIds: ["door_residential_timber", "blind_niche", "window_screened"],
    }),
    /outside its facade profile/,
  );
  assert.throws(
    () => authored({
      ...symmetricIntent,
      bays: [
        { id: "GROUND_DOOR", moduleId: "door_residential_timber", columnId: "AXIS" },
        { id: "GROUND_TALL", moduleId: "pilaster_facade", columnId: "L1" },
        { id: "GROUND_NICHE_R", moduleId: "blind_niche", columnId: "R1" },
      ],
    }),
    /exceeds the shared ground head 2\.25m/,
  );
  assert.throws(
    () => authored({ ...symmetricIntent, bays: [...symmetricIntent.bays, { id: "STORY_3", moduleId: "window_screened", columnId: "AXIS", story: 3 }] }),
    /story 3 exceeds the 2-story massing/,
  );
  assert.throws(
    () => authored({ ...symmetricIntent, upperSillDatumsM: [6.4] }),
    /does not fit under the 7\.00m parapet/,
  );
  assert.throws(
    () => authored({
      composition: "Overlapping bays are rejected by the shared physical validator.",
      cornerTreatment: "open",
      columns: [{ id: "A", along: 0.4 }, { id: "B", along: 0.43 }, { id: "C", along: 0.8 }],
      bays: [
        { id: "GROUND_A", moduleId: "door_residential_timber", columnId: "A" },
        { id: "GROUND_B", moduleId: "blind_niche", columnId: "B" },
        { id: "GROUND_C", moduleId: "blind_niche", columnId: "C" },
      ],
    }),
    /overlap/,
  );
  assert.throws(
    () => authored({
      composition: "One niche cannot articulate a fifteen-metre wall.",
      cornerTreatment: "open",
      columns: [{ id: "A", along: 0.5 }],
      bays: [{ id: "GROUND_A", moduleId: "blind_niche", columnId: "A" }],
    }),
    /under-articulated/,
  );
});

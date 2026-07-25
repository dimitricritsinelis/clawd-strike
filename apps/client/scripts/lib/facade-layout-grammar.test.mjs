import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedSignWidthM,
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  SURVEY_VIEW_CAP,
  blankEvidence,
  computeSurveyCoverage,
  deriveReviewUnits,
  deriveWallFaces,
  hashSurveyAuthority,
  validateMapSpec,
  validateState,
  type MapSpec,
  type ReviewUnitDefinition,
} from "./lib/mapPolish.js";

function laneSpec(overrides: Partial<{
  w: number;
  h: number;
  heightM: number;
  withFrontages: boolean;
}> = {}): MapSpec {
  const { w = 7, h = 32, heightM = 7, withFrontages = true } = overrides;
  return {
    global_dimensions: { playable_boundary: { shape: "rect", x: 0, y: 0, w: 56, h: 92 }, wall_height_default: 7 },
    zones: [{ id: "LANE_A", type: "service_area", label: "Lane A", rect: { x: 10, y: 10, w, h } }],
    traversal_surfaces: [{ id: "SURFACE_LANE_A", zoneId: "LANE_A", kind: "flat", rect: { x: 10, y: 10, w, h }, elevationM: 0 }],
    massing_profiles: [{ id: "MASSING_TEST", heightM, depthM: 4 }],
    ...(withFrontages
      ? {
          frontages: [
            { id: "FRONTAGE_LANE_A_WEST", zoneId: "LANE_A", face: "west", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_TEST" },
            { id: "FRONTAGE_LANE_A_EAST", zoneId: "LANE_A", face: "east", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_TEST" },
          ],
          frontage_exemptions: [
            { zoneId: "LANE_A", face: "north", reason: "open_traversal_face" },
            { zoneId: "LANE_A", face: "south", reason: "sealed_perimeter" },
          ],
        }
      : {}),
  };
}

function courtSpec(): MapSpec {
  return {
    global_dimensions: { playable_boundary: { shape: "rect", x: 0, y: 0, w: 56, h: 92 }, wall_height_default: 7 },
    zones: [{ id: "COURT_A", type: "courtyard", label: "Court A", rect: { x: 10, y: 10, w: 16, h: 16 } }],
    traversal_surfaces: [{ id: "SURFACE_COURT_A", zoneId: "COURT_A", kind: "flat", rect: { x: 10, y: 10, w: 16, h: 16 }, elevationM: 0 }],
    massing_profiles: [{ id: "MASSING_MID", heightM: 7, depthM: 4 }],
    frontages: [
      { id: "FRONTAGE_COURT_A_WEST", zoneId: "COURT_A", face: "west", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_MID" },
      { id: "FRONTAGE_COURT_A_EAST", zoneId: "COURT_A", face: "east", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_MID" },
      { id: "FRONTAGE_COURT_A_NORTH", zoneId: "COURT_A", face: "north", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_MID" },
      { id: "FRONTAGE_COURT_A_SOUTH", zoneId: "COURT_A", face: "south", start: 0, end: 1, facadeProfileId: "p", massingProfileId: "MASSING_MID" },
    ],
  };
}

function primaryContextOnly(definitions: readonly ReviewUnitDefinition[]): ReviewUnitDefinition[] {
  return definitions.map((definition) => ({
    ...definition,
    views: definition.views.filter((view) => view.id === "primary" || view.id === "context"),
  }));
}

test("long lane derives segmented elevation views and passes coverage; the legacy pair alone fails", () => {
  const spec = laneSpec();
  const units = deriveReviewUnits(spec);
  assert.equal(units.length, 1);
  const unit = units[0]!;
  const viewIds = unit.views.map((view) => view.id);
  assert.equal(viewIds[0], "primary");
  assert.equal(viewIds[1], "context");
  assert.ok(viewIds.some((viewId) => viewId.startsWith("elev:FRONTAGE_LANE_A_WEST")), viewIds.join(","));
  assert.ok(viewIds.some((viewId) => viewId.startsWith("elev:FRONTAGE_LANE_A_EAST")));
  assert.ok(
    viewIds.filter((viewId) => viewId.startsWith("elev:FRONTAGE_LANE_A_WEST")).length >= 2,
    "a 32m wall in a 7m lane must be split into segments",
  );
  assert.ok(viewIds.includes("elev:south"), "a sealed exempt face is still a wall the review must see");
  assert.ok(!viewIds.includes("elev:north"), "an open traversal face is not a wall");
  assert.ok(viewIds.length <= SURVEY_VIEW_CAP);

  const full = computeSurveyCoverage(spec, units);
  assert.deepEqual(full.failures, [], full.failures.join(" | "));
  assert.ok(full.mapWide.usablePct >= 90);
  assert.ok(full.mapWide.fullHeightPct >= 85);

  const legacy = computeSurveyCoverage(spec, primaryContextOnly(units));
  assert.ok(legacy.failures.length > 0, "lane side walls at grazing angles must fail the usable threshold");
});

test("square court derives cross views and full perimeter elevation coverage", () => {
  const spec = courtSpec();
  const units = deriveReviewUnits(spec);
  const unit = units[0]!;
  const viewIds = unit.views.map((view) => view.id);
  assert.ok(viewIds.includes("cross-a") && viewIds.includes("cross-b"), viewIds.join(","));
  const report = computeSurveyCoverage(spec, units);
  assert.deepEqual(report.failures, []);
  for (const row of report.rows.filter((entry) => entry.kind === "frontage")) {
    assert.ok(row.usablePct >= 90, `${row.frontageId} usable ${row.usablePct}`);
    assert.ok(row.fullHeightPct >= 85, `${row.frontageId} full-height ${row.fullHeightPct}`);
  }
});

test("tall walls in a narrow lane require pitch; stripping pitch fails full-height", () => {
  const spec = laneSpec({ w: 4, h: 22, heightM: 9.5 });
  const units = deriveReviewUnits(spec);
  const unit = units[0]!;
  const elevations = unit.views.filter((view) => view.id.startsWith("elev:FRONTAGE"));
  assert.ok(elevations.length > 0);
  assert.ok(
    elevations.every((view) => (view.camera.pitchDeg ?? 0) > 0),
    "a 9.5m wall behind a <=3.4m standoff cannot fit the frame at pitch 0",
  );
  const withPitch = computeSurveyCoverage(spec, units);
  assert.ok(withPitch.mapWide.fullHeightPct >= 85, `full-height ${withPitch.mapWide.fullHeightPct}`);

  const withoutPitch = units.map((definition) => ({
    ...definition,
    views: definition.views.map((view) => {
      const camera = { ...view.camera };
      delete camera.pitchDeg;
      return { ...view, camera };
    }),
  }));
  const flat = computeSurveyCoverage(spec, withoutPitch);
  assert.ok(
    flat.mapWide.fullHeightPct < withPitch.mapWide.fullHeightPct,
    "removing pitch must lose full-height coverage",
  );
  assert.ok(flat.failures.some((failure) => failure.includes("full-height")));
});

test("wall faces derive deterministically and pose derivation is stable", () => {
  const spec = laneSpec();
  const zone = spec.zones[0]!;
  const faces = deriveWallFaces(validateMapSpec(spec), zone);
  assert.deepEqual(
    faces.map((face) => `${face.kind}:${face.face}`),
    ["frontage:east", "frontage:west", "exemption:south"],
  );
  const west = faces.find((face) => face.face === "west")!;
  assert.equal(west.heightM, 7);
  assert.deepEqual(west.inwardNormal, { x: 1, y: 0 });
  assert.deepEqual(deriveReviewUnits(spec), deriveReviewUnits(spec), "derivation must be deterministic");
});

test("survey camera overrides accept arbitrary view ids and pitch, and reject malformed pitch", () => {
  const spec = laneSpec();
  const unit = deriveReviewUnits(spec)[0]!;
  const elevation = unit.views.find((view) => view.id.startsWith("elev:FRONTAGE_LANE_A_WEST"))!;
  const overridden = structuredClone(spec);
  overridden.map_polish_survey_camera_overrides = {
    LANE_A: { [elevation.id]: { ...elevation.camera, pitchDeg: 5.5 } },
  };
  const derived = deriveReviewUnits(overridden)[0]!;
  assert.equal(derived.views.find((view) => view.id === elevation.id)?.camera.pitchDeg, 5.5);
  assert.notEqual(
    hashSurveyAuthority(overridden),
    hashSurveyAuthority(validateMapSpec(spec)),
    "view overrides are survey authority",
  );

  const badPitch = structuredClone(overridden);
  badPitch.map_polish_survey_camera_overrides = {
    LANE_A: { [elevation.id]: { ...elevation.camera, pitchDeg: 90 } },
  };
  assert.throws(() => validateMapSpec(badPitch), /pitchDeg must be finite and between -90 and 90/);

  const badViewId = structuredClone(overridden);
  badViewId.map_polish_survey_camera_overrides = {
    LANE_A: { "bad view id!": elevation.camera },
  };
  assert.throws(() => validateMapSpec(badViewId), /view id 'bad view id!' is invalid/);
});

test("schema v1 state migrates to v2 with a forced resurvey", () => {
  const v1 = {
    schemaVersion: 1,
    mapAuthorityHash: "authority-a",
    surveyedAuthorityHash: "authority-a",
    sourceFingerprint: "source-a",
    pass: 3,
    surveyRequired: false,
    milestone: { acceptedAtLastRun: 2, required: false, full: false },
    activeTask: null,
    units: [{
      id: "unit-lane-a",
      zoneIds: ["LANE_A"],
      rating: "yellow",
      confidence: 0.8,
      defects: ["[intent-hierarchy] Visible defect."],
      evidence: { primary: "artifacts/p.png", context: "artifacts/c.png" },
      lastAttemptedPass: { pass: 3, attempts: 1, accepted: true },
      acceptedChanges: 2,
      rejectedTactics: [],
      deferredReason: "stale",
    }],
  };
  const migrated = validateState(v1);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.engine, null);
  assert.equal(migrated.coverage, null);
  assert.equal(migrated.surveyRequired, true, "v1 evidence lacks elevation views; the pass must resurvey");
  assert.equal(migrated.surveyedAuthorityHash, null);
  const unit = migrated.units[0]!;
  assert.equal(unit.rating, "unrated");
  assert.deepEqual(unit.evidence, blankEvidence());
  assert.equal(unit.deferredReason, undefined);
  assert.equal(unit.acceptedChanges, 2, "accept history survives migration");
});

test("v2 state validates evidence records per view and coverage bounds", () => {
  const spec = laneSpec();
  const unit = deriveReviewUnits(spec)[0]!;
  const state = {
    schemaVersion: 2,
    mapAuthorityHash: "authority-a",
    surveyedAuthorityHash: "authority-a",
    sourceFingerprint: "source-a",
    engine: "claude",
    pass: 1,
    surveyRequired: false,
    coverage: { usablePct: 99.5, fullHeightPct: 97.2, frontageUsablePct: 100 },
    milestone: { acceptedAtLastRun: 0, required: false, full: false },
    activeTask: null,
    units: [{
      id: unit.id,
      zoneIds: [...unit.zoneIds],
      rating: "yellow",
      confidence: 0.8,
      defects: ["[intent-hierarchy] [view:elev:FRONTAGE_LANE_A_WEST:1] The west wall reads blank."],
      evidence: Object.fromEntries(unit.views.map((view) => [view.id, `artifacts/${view.id}.png`])),
      lastAttemptedPass: null,
      acceptedChanges: 0,
      rejectedTactics: [],
    }],
  };
  const parsed = validateState(state);
  assert.equal(parsed.engine, "claude");
  assert.equal(parsed.coverage?.fullHeightPct, 97.2);
  assert.equal(Object.keys(parsed.units[0]!.evidence).length, unit.views.length);

  const badEngine = structuredClone(state) as Record<string, unknown>;
  badEngine.engine = "gemini";
  assert.throws(() => validateState(badEngine), /engine must be null, 'codex', or 'claude'/);

  const badCoverage = structuredClone(state) as { coverage: Record<string, number> };
  badCoverage.coverage.usablePct = 140;
  assert.throws(() => validateState(badCoverage), /coverage.usablePct/);
});

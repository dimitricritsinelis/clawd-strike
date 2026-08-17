import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applyRatings,
  buildSurveyBatches,
  createInitialState,
  deriveReviewUnits,
  hashSurveyAuthority,
  pruneState,
  selectNextUnit,
  syncStateWithSpec,
  syncStateWithSourceFingerprint,
  updateOutcome,
  validateMapSpec,
  validateState,
  type MapPolishState,
  type MapSpec,
  type SurveyRating,
} from "./lib/mapPolish.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_SPEC_PATH = path.join(REPO_ROOT, "docs/map-design/specs/map_spec.json");

type UnitShape = {
  id: string;
  zoneIds: string[];
};

type MutableUnitState = UnitShape & {
  rating: "unrated" | "red" | "yellow" | "green";
  confidence: number;
  defects: string[];
  lastAttemptedPass: { pass: number; attempts: number; accepted: boolean } | null;
  acceptedChanges: number;
  rejectedTactics: string[];
  [key: string]: unknown;
};

type MutableState = {
  mapAuthorityHash: string;
  surveyedAuthorityHash: string | null;
  pass: number;
  surveyRequired: boolean;
  units: MutableUnitState[];
  [key: string]: unknown;
};

async function loadMapSpec(): Promise<MapSpec> {
  return validateMapSpec(JSON.parse(await readFile(MAP_SPEC_PATH, "utf8")) as unknown);
}

function unitIds(units: readonly UnitShape[]): string[] {
  return units.map((unit) => unit.id);
}

function flattenBatchIds(batches: readonly (readonly UnitShape[])[]): string[] {
  return batches.flatMap((batch) => batch.map((unit) => unit.id));
}

function mutableState<T>(state: T): MutableState {
  return state as unknown as MutableState;
}

function surveyRatings(
  units: readonly UnitShape[],
  ratingFor: (unit: UnitShape, index: number) => SurveyRating["rating"],
): SurveyRating[] {
  return units.map((unit, index) => {
    const rating = ratingFor(unit, index);
    return {
      unitId: unit.id,
      rating,
      confidence: 0.85,
      defects: rating === "green" ? [] : ["Visible defect"],
    };
  });
}

test("every authored zone has stable survey coverage and batches stay bounded", async () => {
  const spec = await loadMapSpec();
  const authoredZoneIds = spec.zones.map((zone) => zone.id).sort();
  const units = deriveReviewUnits(spec);
  const coveredZoneIds = units.flatMap((unit) => unit.zoneIds).sort();

  assert.deepEqual(coveredZoneIds, authoredZoneIds);
  assert.equal(new Set(coveredZoneIds).size, authoredZoneIds.length, "a zone must not belong to two review units");
  assert.deepEqual(deriveReviewUnits(spec), units, "generated unit ids and cameras must be deterministic");
  const reorderedConnectivity = structuredClone(spec);
  reorderedConnectivity.explicit_connectivity = [...(reorderedConnectivity.explicit_connectivity ?? [])].reverse();
  assert.deepEqual(
    deriveReviewUnits(reorderedConnectivity),
    units,
    "camera derivation must not depend on authored connectivity array order",
  );

  const extendedSpec = structuredClone(spec);
  const extendedZones = extendedSpec.zones;
  const template = extendedZones[extendedZones.length - 1];
  assert.ok(template);
  extendedZones.push({
    ...template,
    id: "TEST_NEW_EDGE_ZONE",
    label: "Test New Edge Zone",
    rect: { x: 0, y: 92, w: 4, h: 4 },
  });
  const extendedUnits = deriveReviewUnits(extendedSpec);
  assert.ok(
    extendedUnits.some((unit) => unit.zoneIds.includes("TEST_NEW_EDGE_ZONE")),
    "a newly authored zone must be detected without a maintained camera inventory",
  );

  const batches = buildSurveyBatches(units, 7);
  assert.ok(batches.length > 0);
  assert.ok(batches.every((batch) => batch.length >= 1 && batch.length <= 7));
  assert.deepEqual(flattenBatchIds(batches), unitIds(units));
});

test("survey camera overrides are authoritative and fail closed when malformed", async () => {
  const spec = await loadMapSpec();
  const zoneId = "LINK_NORTH_EAST";
  const authoredPrimary = spec.map_polish_survey_camera_overrides?.[zoneId]?.primary;
  assert.ok(authoredPrimary);
  const unit = deriveReviewUnits(spec).find((candidate) => candidate.zoneIds.includes(zoneId));
  assert.ok(unit);
  assert.deepEqual(unit.views.primary, authoredPrimary);

  const unknownZone = structuredClone(spec);
  unknownZone.map_polish_survey_camera_overrides = {
    UNKNOWN_SURVEY_ZONE: { primary: authoredPrimary },
  };
  assert.throws(
    () => validateMapSpec(unknownZone),
    /unknown map polish survey camera override zone 'UNKNOWN_SURVEY_ZONE'/i,
  );

  const duplicateCanonicalZone = structuredClone(spec);
  duplicateCanonicalZone.map_polish_survey_camera_overrides = {
    [zoneId]: { primary: authoredPrimary },
    [` ${zoneId} `]: { context: authoredPrimary },
  };
  assert.throws(
    () => validateMapSpec(duplicateCanonicalZone),
    /duplicate map polish survey camera override/i,
  );

  const duplicateAuthoredZone = structuredClone(spec);
  const duplicateZone = duplicateAuthoredZone.zones.find((zone) => zone.id === zoneId);
  assert.ok(duplicateZone);
  duplicateAuthoredZone.zones.push(structuredClone(duplicateZone));
  assert.throws(() => validateMapSpec(duplicateAuthoredZone), /duplicate authored zone/i);

  const nonFiniteCamera = structuredClone(spec);
  const nonFinitePrimary = nonFiniteCamera.map_polish_survey_camera_overrides?.[zoneId]?.primary;
  assert.ok(nonFinitePrimary);
  nonFinitePrimary.yawDeg = Number.NaN;
  assert.throws(() => validateMapSpec(nonFiniteCamera), /yawDeg must be finite/);

  const missingCameraField = structuredClone(spec) as unknown as {
    map_polish_survey_camera_overrides: Record<string, { primary: Partial<typeof authoredPrimary> }>;
  };
  delete missingCameraField.map_polish_survey_camera_overrides[zoneId]?.primary.playerPosition;
  assert.throws(
    () => validateMapSpec(missingCameraField),
    /playerPosition must be an object/,
  );

  const inconsistentPlayerPose = structuredClone(spec);
  const inconsistentPrimary = inconsistentPlayerPose.map_polish_survey_camera_overrides?.[zoneId]?.primary;
  assert.ok(inconsistentPrimary);
  inconsistentPrimary.playerPosition.x += 0.03;
  assert.throws(
    () => validateMapSpec(inconsistentPlayerPose),
    /designPosition must be the 1\.7m player-eye position for playerPosition/,
  );

  const verticalLookVector = structuredClone(spec);
  const verticalPrimary = verticalLookVector.map_polish_survey_camera_overrides?.[zoneId]?.primary;
  assert.ok(verticalPrimary);
  verticalPrimary.designLookAt = {
    ...verticalPrimary.designPosition,
    z: verticalPrimary.designPosition.z + 2,
  };
  assert.throws(
    () => validateMapSpec(verticalLookVector),
    /designLookAt must differ from designPosition in the horizontal plane/,
  );

  const misalignedYaw = structuredClone(spec);
  const misalignedPrimary = misalignedYaw.map_polish_survey_camera_overrides?.[zoneId]?.primary;
  assert.ok(misalignedPrimary);
  misalignedPrimary.yawDeg += 10;
  assert.throws(
    () => validateMapSpec(misalignedYaw),
    /yawDeg must align with designPosition and designLookAt/,
  );

  const secondZoneId = "LINK_NORTH_WEST";
  const secondUnit = deriveReviewUnits(spec).find((candidate) => candidate.zoneIds.includes(secondZoneId));
  assert.ok(secondUnit);
  const canonicalOverrides = structuredClone(spec);
  const authoredViews = canonicalOverrides.map_polish_survey_camera_overrides?.[zoneId];
  assert.ok(authoredViews?.primary && authoredViews.context);
  canonicalOverrides.map_polish_survey_camera_overrides = {
    [zoneId]: authoredViews,
    [secondZoneId]: { primary: secondUnit.views.primary },
  };
  const reorderedOverrides = structuredClone(canonicalOverrides);
  const reversePoint = (point: { x: number; y: number; z: number }) => ({
    z: point.z,
    y: point.y,
    x: point.x,
  });
  const reverseCameraKeys = (camera: typeof authoredViews.primary) => ({
    fovDeg: camera.fovDeg,
    yawDeg: camera.yawDeg,
    playerPosition: reversePoint(camera.playerPosition),
    designLookAt: reversePoint(camera.designLookAt),
    designPosition: reversePoint(camera.designPosition),
  });
  reorderedOverrides.map_polish_survey_camera_overrides = {
    [secondZoneId]: {
      primary: reverseCameraKeys(secondUnit.views.primary),
    },
    [zoneId]: {
      context: reverseCameraKeys(authoredViews.context),
      primary: reverseCameraKeys(authoredViews.primary),
    },
  };
  assert.equal(
    hashSurveyAuthority(reorderedOverrides),
    hashSurveyAuthority(canonicalOverrides),
    "semantically identical override key order must not change survey authority",
  );

  const reverseRecordKeys = <T extends object>(record: T): T => (
    Object.fromEntries(Object.entries(record).reverse()) as T
  );
  const reorderedNestedAuthority = structuredClone(canonicalOverrides);
  const firstZone = reorderedNestedAuthority.zones[0];
  const firstSurface = reorderedNestedAuthority.traversal_surfaces?.[0];
  const firstEdge = reorderedNestedAuthority.explicit_connectivity?.[0];
  assert.ok(firstZone && firstSurface && firstEdge);
  firstZone.rect = reverseRecordKeys(firstZone.rect);
  reorderedNestedAuthority.traversal_surfaces = [
    reverseRecordKeys({ ...firstSurface, rect: reverseRecordKeys(firstSurface.rect) }),
    ...(reorderedNestedAuthority.traversal_surfaces?.slice(1) ?? []),
  ];
  reorderedNestedAuthority.explicit_connectivity = [
    reverseRecordKeys(firstEdge),
    ...(reorderedNestedAuthority.explicit_connectivity?.slice(1) ?? []),
  ];
  assert.equal(
    hashSurveyAuthority(reorderedNestedAuthority),
    hashSurveyAuthority(canonicalOverrides),
    "zone, surface, and connectivity key order must not change survey authority",
  );
});

test("initial state is schema-valid and survey ratings are applied by unit id", async () => {
  const spec = await loadMapSpec();
  const units = deriveReviewUnits(spec);
  const firstUnit = units[0];
  assert.ok(firstUnit);
  const initial = createInitialState(spec, "map-hash-a");
  assert.doesNotThrow(() => validateState(initial));

  const ratings = surveyRatings(units, (_unit, index) => index === 0 ? "red" : "green");
  ratings[0] = {
    unitId: firstUnit.id,
    rating: "red",
    confidence: 0.91,
    defects: ["Blockout-like frontage", "Missing visual hierarchy"],
  };
  const rated = applyRatings(initial, ratings, "map-hash-a", "source-hash-a");
  const first = mutableState(rated).units.find((unit) => unit.id === firstUnit.id);
  assert.equal(first?.rating, "red");
  assert.equal(first?.confidence, 0.91);
  assert.deepEqual(first?.defects, ["Blockout-like frontage", "Missing visual hierarchy"]);
  assert.equal(rated.sourceFingerprint, "source-hash-a");
  assert.doesNotThrow(() => validateState(rated));

  const invalid = structuredClone(rated);
  const invalidUnit = mutableState(invalid).units[0];
  assert.ok(invalidUnit);
  invalidUnit.defects = ["one", "two", "three"];
  assert.throws(() => validateState(invalid), /defect|maximum|at most|two/i);

  const missingWeakDefect = structuredClone(ratings);
  const weak = missingWeakDefect[0];
  assert.ok(weak);
  weak.defects = [];
  assert.throws(
    () => applyRatings(initial, missingWeakDefect, "map-hash-a", "source-hash-a"),
    /one or two visible defects/,
  );
});

test("scheduler is deterministic and prioritizes unrated, red, yellow, then optional green", async () => {
  const spec = await loadMapSpec();
  const units = deriveReviewUnits(spec);
  assert.ok(units.length >= 4);
  const sortedIds = unitIds(units).sort();
  const unratedId = sortedIds[sortedIds.length - 1];
  assert.ok(unratedId);

  const unratedState = createInitialState(spec, "map-hash-b");
  const mutableUnrated = mutableState(unratedState);
  mutableUnrated.surveyRequired = false;
  mutableUnrated.surveyedAuthorityHash = mutableUnrated.mapAuthorityHash;
  mutableUnrated.sourceFingerprint = "source-hash-b";
  mutableUnrated.sourceFingerprint = "source-hash-b";
  mutableUnrated.pass = 1;
  for (const unit of mutableUnrated.units) {
    unit.rating = unit.id === unratedId ? "unrated" : "red";
    unit.confidence = unit.id === unratedId ? 0 : 0.8;
    unit.defects = unit.id === unratedId ? [] : ["Visible defect"];
  }
  assert.equal(selectNextUnit(unratedState)?.id, unratedId, "unrated work must outrank red work");

  let state = applyRatings(
    createInitialState(spec, "map-hash-b"),
    surveyRatings(units, (_unit, index) => index === 0 ? "red" : index === 1 ? "yellow" : "green"),
    "map-hash-b",
    "source-hash-b",
  );
  const redSelection = selectNextUnit(state);
  assert.ok(redSelection);
  assert.equal(redSelection.rating, "red");
  assert.equal(selectNextUnit(state)?.id, redSelection.id, "selection must be repeatable from identical state");

  const mixedRatings = surveyRatings(units, (_unit, index) => index === 0 ? "red" : index === 1 ? "yellow" : "green");
  state = applyRatings(state, mixedRatings, "map-hash-b", "source-hash-b");
  assert.equal(selectNextUnit(state)?.id, units[0]?.id, "red must outrank less recently attempted yellow and green units");

  state = applyRatings(state, surveyRatings(units, () => "green"), "map-hash-b", "source-hash-b");
  assert.equal(selectNextUnit(state), null, "green work is opt-in");
  assert.equal(selectNextUnit(state, { allowGreen: true })?.id, sortedIds[0]);
});

test("state pruning retains only bounded current information", async () => {
  const spec = await loadMapSpec();
  const initial = createInitialState(spec, "map-hash-c");
  const dirty = structuredClone(initial);
  const dirtyState = mutableState(dirty);
  const first = dirtyState.units[0];
  assert.ok(first);
  first.defects = ["current one", "current two", "stale three"];
  first.rejectedTactics = ["oldest", "recent", "latest"];
  first.fullPrompt = "This must not become durable state.";
  first.fullDiff = "diff --git a/map b/map";
  dirtyState.history = [{ event: "append-only history is forbidden" }];

  const pruned = pruneState(dirty as MapPolishState);
  const prunedState = mutableState(pruned);
  const prunedFirst = prunedState.units[0];
  assert.ok(prunedFirst);
  assert.ok(prunedFirst.defects.length <= 2);
  assert.ok(prunedFirst.rejectedTactics.length <= 2);
  assert.equal("fullPrompt" in prunedFirst, false);
  assert.equal("fullDiff" in prunedFirst, false);
  assert.equal("history" in prunedState, false);
  assert.doesNotThrow(() => validateState(pruned));
});

test("authority/source drift invalidates ratings while preserving active recovery", async () => {
  const spec = await loadMapSpec();
  const units = deriveReviewUnits(spec);
  const first = units[0];
  assert.ok(first);
  const rated = applyRatings(
    createInitialState(spec, "authority-a"),
    surveyRatings(units, () => "yellow"),
    "authority-a",
    "source-authority-a",
  );
  rated.activeTask = {
    id: "pass-1-recovery",
    unitId: first.id,
    status: "blocked",
    startCommit: "0123456789abcdef",
    artifactDir: "artifacts/map-polish/active/recovery",
    workOrder: "artifacts/map-polish/active/recovery/work-order.md",
    objective: "One bounded visual objective.",
    attempt: 1,
    risk: "pure",
    touchedFiles: ["docs/map-design/specs/map_spec.json"],
  };
  const changedSpec = structuredClone(spec);
  changedSpec.zones.push({
    id: "TEST_AUTHORITY_DRIFT",
    type: "edge_area",
    label: "Test Authority Drift",
    rect: { x: 0, y: 100, w: 4, h: 4 },
  });

  const preserved = syncStateWithSpec(rated, changedSpec, "authority-b");
  assert.equal(preserved.activeTask?.id, "pass-1-recovery");
  assert.equal(preserved.mapAuthorityHash, "authority-a");
  assert.equal(preserved.units.some((unit) => unit.zoneIds.includes("TEST_AUTHORITY_DRIFT")), false);

  const noActive = structuredClone(rated);
  noActive.activeTask = null;
  const drifted = syncStateWithSourceFingerprint(noActive, "source-authority-b");
  assert.equal(drifted.surveyRequired, true);
  assert.equal(drifted.surveyedAuthorityHash, null);
  assert.ok(drifted.units.every((unit) => unit.rating === "unrated"));
  assert.ok(drifted.units.every((unit) => unit.evidence.primary === null && unit.evidence.context === null));

  const activeSourceDrift = syncStateWithSourceFingerprint(rated, "source-authority-b");
  assert.equal(activeSourceDrift.activeTask?.id, "pass-1-recovery");
  assert.equal(activeSourceDrift.units[0]?.rating, rated.units[0]?.rating);

  const rejected = updateOutcome(noActive, {
    unitId: first.id,
    outcome: "reject",
    rejectedTactic: "A shared material edit did not meet the objective.",
    nextAction: "Try a materially different shared material hypothesis.",
    shared: true,
  });
  assert.equal(rejected.milestone.required, false, "a fully restored shared candidate leaves no map-wide change to verify");
});

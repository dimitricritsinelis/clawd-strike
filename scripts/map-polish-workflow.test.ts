import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  DESIGN_REVIEW_LENS,
  buildSiteBrief,
  buildWorkOrder,
  cleanupRejectedArtifacts,
  collectTouchedFiles,
  deriveReviewUnits,
  detectProtectedChanges,
  inferTaskRisk,
  isRelevantMapSource,
  modeUsesExternalModel,
  protectedDomainProjection,
  readStateFile,
  restoreCandidateFiles,
  selectNextUnit,
  validateImageComparison,
  type ImagePairInput,
  type MapSpec,
  type ReviewUnitState,
  type ReviewerResult,
  type RuntimeCamera,
} from "./lib/mapPolish.js";
import {
  FACADE_COMPOSITION_SOURCES,
  candidateTouchesMapAuthority,
  codexInvocationArgs,
  focusedSharedTest,
  inspectCandidateLocality,
  isAllowedCandidateFile,
  mapSpecRouteAdjacentChanged,
  mapSpecRouteChangedZoneIds,
  mapSpecSharedVisualChanged,
  mapWideSurveySchema,
  mergeMapWideFindings,
  normalizeObjective,
  outsidePermittedSourceFiles,
  parseManualSurveyPayload,
  parseMapWideFindings,
  parseCodexUsage,
  parseReviewer,
  parseSurveyPayload,
  proposedOutcome,
  mapSpecSurveyCameraAuthorityChanged,
  runMapPolishCli,
  surveyPrompt,
  touchedSharedMechanism,
} from "./map-polish.js";

const execFile = promisify(execFileCallback);

function runtimeCamera(overrides: Partial<RuntimeCamera> = {}): RuntimeCamera {
  return {
    pos: { x: 12, y: 1.7, z: 24 },
    yawDeg: 0,
    pitchDeg: 0,
    fovDeg: 70,
    ...overrides,
  };
}

function comparisonInput(overrides: Partial<ImagePairInput> = {}): ImagePairInput {
  return {
    before: {
      width: 1440,
      height: 900,
      sha256: "before-primary",
      camera: runtimeCamera(),
      zoneId: "ZONE_A",
      runtimeErrors: 0,
    },
    after: {
      width: 1440,
      height: 900,
      sha256: "after-primary",
      camera: runtimeCamera(),
      zoneId: "ZONE_A",
      runtimeErrors: 0,
    },
    meanAbsoluteDelta: 0.02,
    changedPixelRatio: 0.12,
    expectedZoneId: "ZONE_A",
    relevantSourceChanged: true,
    ...overrides,
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function git(repoRoot: string, args: string[]): Promise<string> {
  const result = await execFile("git", ["-C", repoRoot, ...args]);
  return result.stdout.trim();
}

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runMapPolishCli(args, {
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; },
  });
  return { code, stdout, stderr };
}

async function allFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await allFiles(absolute)).map((child) => path.join(entry.name, child)));
    } else {
      result.push(entry.name);
    }
  }
  return result.sort();
}

test("identical primary images are rejected before independent review", async () => {
  let reviewerCalls = 0;
  const primary = {
    width: 1440,
    height: 900,
    sha256: "same-hash",
    camera: runtimeCamera(),
    zoneId: "ZONE_A",
    runtimeErrors: 0,
  };
  const result = await validateImageComparison(comparisonInput({
    before: primary,
    after: { ...primary },
    meanAbsoluteDelta: 0,
    changedPixelRatio: 0,
  }), async () => {
    reviewerCalls += 1;
    return {
      preferred: "B" as const,
      designPreferred: "B" as const,
      objectiveMetBy: "B" as const,
      blockingDefectIn: "neither" as const,
      compositionLogic: "legible" as const,
      confidence: 1,
      reason: "This callback must not run for invalid evidence.",
    };
  });

  assert.equal(result.validation.valid, false);
  assert.match(result.validation.reasons.join(" "), /identical|unchanged/i);
  assert.equal(result.review, null);
  assert.equal(reviewerCalls, 0);
});

test("valid evidence reaches exactly one reviewer", async () => {
  let reviewerCalls = 0;
  const result = await validateImageComparison(comparisonInput(), async () => {
    reviewerCalls += 1;
    return {
      preferred: "B" as const,
      designPreferred: "B" as const,
      objectiveMetBy: "B" as const,
      blockingDefectIn: "neither" as const,
      compositionLogic: "legible" as const,
      confidence: 0.8,
      reason: "The bounded objective is clearer in B.",
    };
  });

  assert.equal(result.validation.valid, true);
  assert.ok(result.review);
  assert.equal(reviewerCalls, 1);
});

test("design-lens survey and blind-review contracts are structured and chronology-safe", () => {
  assert.throws(() => normalizeObjective("x".repeat(261)), /260 characters or fewer/);
  assert.equal(normalizeObjective("  One bounded objective.  "), "One bounded objective.");
  assert.doesNotMatch(
    JSON.stringify(mapWideSurveySchema()),
    /uniqueItems/,
    "Codex structured-output schemas must avoid unsupported uniqueItems; parser enforces uniqueness",
  );
  const cameraPose = {
    designPosition: { x: 1, y: 1, z: 1.7 },
    designLookAt: { x: 1, y: 2, z: 1.65 },
    playerPosition: { x: 1, y: 0, z: 1 },
    yawDeg: 180,
    fovDeg: 75,
  };
  const workOrder = buildWorkOrder({
    unit: {
      id: "unit-a",
      zoneIds: ["ZONE_A"],
      rating: "red",
      confidence: 0.9,
      defects: ["[order-and-variation] Opening heads miss a common datum."],
      evidence: { primary: "primary.png", context: "context.png" },
      lastAttemptedPass: null,
      acceptedChanges: 0,
      rejectedTactics: [],
    },
    definition: {
      id: "unit-a",
      zoneIds: ["ZONE_A"],
      label: "Zone A",
      zoneType: "market",
      macroLane: null,
      views: [
        { id: "primary", camera: cameraPose },
        { id: "context", camera: cameraPose },
      ],
    },
    primaryScreenshot: "primary.png",
    contextScreenshot: "context.png",
    objective: "Restore one legible opening datum without making the facade mechanically uniform.",
    risk: "pure",
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    permittedPaths: ["docs/map-design/specs/map_spec.json"],
    checks: ["protected-domain diff", "scoped typecheck"],
  });
  for (const lens of DESIGN_REVIEW_LENS) assert.match(workOrder, new RegExp(lens.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workOrder, /state the place's purpose, ordered architectural scaffold, and plausible cause of each exception; return it as designRationale/);
  assert.match(workOrder, /Optimize the whole primary\/context pair, not one hero camera/);
  assert.match(workOrder, /Task risk: pure/);
  assert.match(workOrder, /Permitted source surfaces \(hard boundary\):/);
  assert.match(workOrder, /Read AGENTS\.md, the supplied site brief and evidence/);
  assert.match(workOrder, /No broad repository exploration or orchestration repair/);
  assert.match(workOrder, /workflow-owned; do not run them/);
  assert.match(workOrder, /return a concise blocker without editing/);
  assert.ok(workOrder.trim().split(/\s+/).length <= 500);

  const ratings = parseSurveyPayload({
    ratings: [{
      unitId: "unit-a",
      rating: "red",
      confidence: 0.9,
      defects: [{
        criterion: "order-and-variation",
        evidence: "Opening heads miss a common datum while every awning uses identical jitter.",
      }],
    }],
  }, ["unit-a"]);
  assert.deepEqual(ratings[0]?.defects, [
    "[order-and-variation] Opening heads miss a common datum while every awning uses identical jitter.",
  ]);
  assert.throws(() => parseSurveyPayload({
    ratings: [{ unitId: "unit-a", rating: "red", confidence: 0.9, defects: ["Needs more detail"] }],
  }, ["unit-a"]), /invalid confidence or defects/);
  assert.throws(() => parseSurveyPayload({
    ratings: [{
      unitId: "unit-a",
      rating: "red",
      confidence: 0.9,
      defects: [{ criterion: "intent-hierarchy", evidence: "The visible frontage sentence cuts off before its conclusion" }],
    }],
  }, ["unit-a"]), /invalid confidence or defects/);
  const boundedCompleteEvidence = `${"Visible ordered facade evidence remains coherent and specific ".repeat(3).slice(0, 145)}.`;
  assert.doesNotThrow(() => parseSurveyPayload({
    ratings: [{
      unitId: "unit-a",
      rating: "yellow",
      confidence: 0.8,
      defects: [{ criterion: "intent-hierarchy", evidence: boundedCompleteEvidence }],
    }],
  }, ["unit-a"]));

  const mapWide = parseMapWideFindings({
    findings: [{
      unitIds: ["unit-a", "unit-b"],
      criterion: "intent-hierarchy",
      evidence: "Both approaches repeat equal-weight landmarks and provide no quiet visual rest.",
      confidence: 0.82,
    }],
  }, ["unit-a", "unit-b"]);
  const merged = mergeMapWideFindings([
    ratings[0]!,
    { unitId: "unit-b", rating: "green", confidence: 0.8, defects: [] },
  ], mapWide);
  assert.equal(merged[1]?.rating, "green", "an existing weak unit carries a shared finding without multiplying the queue");
  assert.match(merged[0]?.defects[0] ?? "", /^\[order-and-variation\]/, "local priority remains first");
  assert.match(merged[0]?.defects[1] ?? "", /^\[intent-hierarchy\] Map-wide:/);

  const lowConfidence = mergeMapWideFindings([
    { unitId: "unit-b", rating: "green", confidence: 0.8, defects: [] },
  ], [{ ...mapWide[0]!, unitIds: ["unit-b"], confidence: 0.4 }]);
  assert.deepEqual(lowConfidence, [{ unitId: "unit-b", rating: "green", confidence: 0.8, defects: [] }]);

  const representative = mergeMapWideFindings([
    { unitId: "unit-b", rating: "green", confidence: 0.8, defects: [] },
    { unitId: "unit-c", rating: "green", confidence: 0.8, defects: [] },
  ], [{ ...mapWide[0]!, unitIds: ["unit-b", "unit-c"] }]);
  assert.equal(representative[0]?.rating, "yellow");
  assert.equal(representative[1]?.rating, "green");

  assert.throws(() => parseManualSurveyPayload({ ratings, findings: null }, ["unit-a"]), /findings\[\]/);
  const manual = parseManualSurveyPayload({
    ratings: [{
      unitId: "unit-a",
      rating: "red",
      confidence: 0.9,
      defects: [{
        criterion: "order-and-variation",
        evidence: "Opening heads miss a common datum while every awning uses identical jitter.",
      }],
    }],
    findings: [],
  }, ["unit-a"]);
  assert.equal(manual[0]?.rating, "red");

  const prompt = surveyPrompt({ id: "batch-01", unitIds: ["unit-a"], contactSheetPath: "sheet.png" });
  assert.match(prompt, /Image 1 is the labeled map-survey contact sheet; image 2 is the approved reference board/);
  assert.match(prompt, /elev:<FRONTAGE or face>/);
  assert.match(prompt, /viewId/);
  assert.ok(prompt.trim().split(/\s+/).length <= 340);

  for (const afterLabel of ["A", "B"] as const) {
    const beforeLabel = afterLabel === "A" ? "B" : "A";
    const accepted: ReviewerResult = {
      preferred: afterLabel,
      designPreferred: afterLabel,
      objectiveMetBy: afterLabel,
      blockingDefectIn: "neither",
      compositionLogic: "legible",
      confidence: 0.9,
      reason: "The candidate strengthens the objective and remains deliberately designed.",
    };
    assert.equal(proposedOutcome(accepted, afterLabel), "accept");
    assert.equal(proposedOutcome({ ...accepted, designPreferred: beforeLabel }, afterLabel), "reject");
    assert.equal(proposedOutcome({ ...accepted, blockingDefectIn: afterLabel }, afterLabel), "reject");
    assert.equal(proposedOutcome({ ...accepted, objectiveMetBy: "neither" }, afterLabel), "defer");
    assert.equal(proposedOutcome({ ...accepted, designPreferred: beforeLabel, confidence: 0.01 }, afterLabel), "defer");
    assert.equal(proposedOutcome({ ...accepted, blockingDefectIn: afterLabel, confidence: 0.01 }, afterLabel), "defer");
    assert.throws(() => parseReviewer({ ...accepted, reason: "This reason cuts off" }), /reason is invalid/);
    assert.equal(parseReviewer(accepted).reason, accepted.reason);
    // Absolute composition bar: a candidate that wins the pair with arbitrary
    // placement is deferred for the human, never baselined as "better than blank".
    assert.equal(proposedOutcome({ ...accepted, compositionLogic: "arbitrary" }, afterLabel), "defer");
    assert.equal(proposedOutcome({ ...accepted, compositionLogic: "unclear" }, afterLabel), "accept");
    assert.equal(
      proposedOutcome({ ...accepted, preferred: beforeLabel, designPreferred: beforeLabel, compositionLogic: "arbitrary" }, afterLabel),
      "reject",
      "arbitrary placement in the losing candidate is still a plain rejection",
    );
    assert.throws(() => parseReviewer({ ...accepted, compositionLogic: "nice" }), /compositionLogic is invalid/);
    const { compositionLogic: _omitted, ...missingComposition } = accepted;
    assert.throws(() => parseReviewer(missingComposition), /compositionLogic is invalid/);
  }
});

test("facade composition sources are shared map-visual ownership and Red bones-level units get a composition brief", () => {
  // The grammar and generator decide where every opening sits; touching them is
  // a shared mechanism change, reachable by shared tasks and never by pure ones.
  for (const file of FACADE_COMPOSITION_SOURCES) {
    assert.equal(isRelevantMapSource(file), true, `${file} is map-visual source`);
    assert.equal(touchedSharedMechanism([file]), true, `${file} is a shared mechanism`);
  }
  assert.equal(
    focusedSharedTest(["apps/client/scripts/lib/facade-layout-grammar.mjs"]),
    "apps/client/scripts/lib/facade-layout-grammar.test.mjs",
  );
  assert.equal(focusedSharedTest(["apps/client/scripts/gen-map-runtime.mjs"]), "apps/client/scripts/gen-map-runtime.test.mjs");

  const spec: MapSpec = {
    global_dimensions: { playable_boundary: { shape: "rect", x: 0, y: 0, w: 56, h: 92 } },
    zones: [
      { id: "SERVICE_SOUTH", type: "service_area", label: "Service South", rect: { x: 3, y: 10, w: 7, h: 20 }, districtId: "DISTRICT_CARAVAN" },
      { id: "CARAVAN_COURT", type: "courtyard", label: "Caravan Court", rect: { x: 3, y: 30, w: 12, h: 18 } },
    ],
    explicit_connectivity: [{ fromZoneId: "CARAVAN_COURT", toZoneId: "SERVICE_SOUTH" }],
    facade_modules: [
      { id: "door_storage_heavy", kind: "door", dimensionsM: { width: 1.35, height: 2.5 } },
      { id: "blind_niche", kind: "blind_niche", dimensionsM: { width: 1.05, height: 1.8 } },
    ],
    facade_profiles: [{ id: "service_storage", family: "service_storage", moduleIds: ["door_storage_heavy", "blind_niche"] }],
    massing_profiles: [{ id: "MASSING_LOW_MERCHANT", heightM: 4.5, depthM: 4.2 }],
    frontages: [
      {
        id: "FRONTAGE_SERVICE_SOUTH_EAST",
        zoneId: "SERVICE_SOUTH",
        face: "east",
        start: 0.18,
        end: 0.97,
        facadeProfileId: "service_storage",
        massingProfileId: "MASSING_LOW_MERCHANT",
        layoutIntent: { mode: "generated", rhythm: "service" },
      },
      {
        id: "FRONTAGE_CARAVAN_COURT_WEST",
        zoneId: "CARAVAN_COURT",
        face: "west",
        facadeProfileId: "service_storage",
        massingProfileId: "MASSING_LOW_MERCHANT",
        layoutIntent: {
          mode: "authored",
          composition: "Storage door on the court axis; corners held.",
          cornerTreatment: "held",
          columns: [{ id: "AXIS", along: 0.5 }, { id: "L1", along: 0.3, mirrorOf: "R1" }, { id: "R1", along: 0.7 }],
          bays: [
            { id: "GROUND_DOOR", moduleId: "door_storage_heavy", columnId: "AXIS" },
            { id: "GROUND_NICHE_L", moduleId: "blind_niche", columnId: "L1" },
            { id: "GROUND_NICHE_R", moduleId: "blind_niche", columnId: "R1" },
          ],
        },
      },
    ],
    frontage_exemptions: [
      { zoneId: "SERVICE_SOUTH", face: "south", reason: "sealed_perimeter", note: "Outer boundary." },
      { zoneId: "SERVICE_SOUTH", face: "west", reason: "sealed_perimeter" },
      { zoneId: "SERVICE_SOUTH", face: "north", reason: "open_traversal_face" },
    ],
  };
  const definition = deriveReviewUnits(spec).find((unit) => unit.zoneIds[0] === "SERVICE_SOUTH");
  assert.ok(definition);
  const unit: ReviewUnitState = {
    id: definition.id,
    zoneIds: ["SERVICE_SOUTH"],
    rating: "red",
    confidence: 0.98,
    defects: [
      "[intent-hierarchy] The reverse view terminates on an unarticulated brick enclosure, making the space read as an unfinished dead end.",
      "[scale-sequence-restraint] Oversized blank wall planes overwhelm the human-scale doors.",
    ],
    evidence: { primary: null, context: null },
    lastAttemptedPass: null,
    acceptedChanges: 0,
    rejectedTactics: [],
  };
  const brief = buildSiteBrief(spec, definition, unit);
  assert.match(brief, /## Zone SERVICE_SOUTH — Service South/);
  assert.match(brief, /connects ← CARAVAN_COURT/);
  assert.match(brief, /FRONTAGE_SERVICE_SOUTH_EAST: east face, span 0\.180–0\.970 = 15\.80m, profile service_storage \(service_storage\)/);
  assert.match(brief, /layout: generated \(rhythm service\)/, "generated frontages say so and point at authored mode");
  assert.match(brief, /switch to mode "authored"/);
  assert.match(brief, /- south: sealed_perimeter — Outer boundary\./);
  assert.match(brief, /### Neighbouring frontages \(alignment references\)/);
  assert.match(brief, /FRONTAGE_CARAVAN_COURT_WEST \(CARAVAN_COURT west\): profile service_storage, layout authored/);
  assert.match(brief, /## Composing a frontage \(authored mode\)/);
  assert.match(brief, /"cornerTreatment": "held"/);
  assert.match(brief, /Opening modules: door_storage_heavy \(door, 1\.35m wide\)/);

  const workOrder = buildWorkOrder({
    unit,
    definition,
    primaryScreenshot: "before/primary.png",
    contextScreenshot: "before/context.png",
    planImage: "plan-before.png",
    siteBriefPath: "site-brief.md",
    compositionRequired: true,
    objective: "Compose Service South's east frontage as a working storage lane.",
    risk: "pure",
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    permittedPaths: ["docs/map-design/specs/map_spec.json"],
    checks: ["Protected-domain diff check"],
  });
  assert.match(workOrder, /Plan crop \(compiled layout, north up, unit outlined\): plan-before\.png/);
  assert.match(workOrder, /Site brief .*: site-brief\.md/);
  assert.match(workOrder, /Composition brief \(required before editing/);
  assert.match(workOrder, /A profile, material, or rhythm swap alone does not resolve an intent or order defect/);
  assert.match(workOrder, /return it as designRationale/);
  assert.ok(workOrder.trim().split(/\s+/).length <= 560, "composition brief keeps the work order bounded");
  const polishOrder = buildWorkOrder({
    unit: { ...unit, rating: "yellow", defects: ["[plausibility-causality] The awning lacks visible supports."] },
    definition,
    primaryScreenshot: "before/primary.png",
    contextScreenshot: "before/context.png",
    objective: "Support the awning.",
    risk: "pure",
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    permittedPaths: ["docs/map-design/specs/map_spec.json"],
    checks: ["Protected-domain diff check"],
  });
  assert.doesNotMatch(polishOrder, /Composition brief/, "polish tasks are not burdened with a composition brief");
});

test("protected gameplay-domain changes are detected while visual-only spec edits are allowed", () => {
  const baseSpec: MapSpec = {
    constraints: { min_path_width_main_lane: 6 },
    traversal_surfaces: [{
      id: "SURFACE_A",
      zoneId: "ZONE_A",
      kind: "flat",
      rect: { x: 0, y: 0, w: 8, h: 8 },
      elevationM: 0,
    }],
    tactical_lanes: [{ id: "LANE_A", width_m: 6 }],
    explicit_connectivity: [{ fromZoneId: "ZONE_A", toZoneId: "ZONE_B" }],
    authored_spawns: [{ id: "SPAWN_A", x: 2, y: 2 }],
    zones: [{
      id: "ZONE_A",
      type: "main_lane_segment",
      label: "Zone A",
      rect: { x: 0, y: 0, w: 8, h: 8 },
      clearWidthM: 6,
    }],
    dressing_placements: [{ id: "CRATE_A", color: "ochre", collisionClass: "none" }],
  };
  const visualOnly = structuredClone(baseSpec);
  visualOnly.dressing_placements = [{ id: "CRATE_A", color: "umber", collisionClass: "none" }];
  const baseProjection = protectedDomainProjection(baseSpec);
  const visualProjection = protectedDomainProjection(visualOnly);
  assert.deepEqual(visualProjection, baseProjection);
  // Composing a frontage (authored layoutIntent with nested columns/bays) is a
  // visual change; nested containers without protected fields must not leak
  // their shape into the projection.
  const generatedFrontage = structuredClone(baseSpec);
  generatedFrontage.frontages = [{
    id: "FRONTAGE_A", zoneId: "ZONE_A", face: "north", facadeProfileId: "p", massingProfileId: "m",
    layoutIntent: { mode: "generated", rhythm: "service" },
  }];
  const authoredFrontage = structuredClone(generatedFrontage);
  authoredFrontage.frontages = [{
    id: "FRONTAGE_A", zoneId: "ZONE_A", face: "north", facadeProfileId: "p", massingProfileId: "m",
    layoutIntent: {
      mode: "authored",
      composition: "Door on the axis; corners held.",
      cornerTreatment: "held",
      columns: [{ id: "AXIS", along: 0.5 }, { id: "L1", along: 0.3, mirrorOf: "R1" }, { id: "R1", along: 0.7 }],
      bays: [{ id: "GROUND_DOOR", moduleId: "door", columnId: "AXIS" }],
    },
  }];
  assert.deepEqual(protectedDomainProjection(authoredFrontage), protectedDomainProjection(generatedFrontage));
  assert.deepEqual(detectProtectedChanges(generatedFrontage, authoredFrontage, ["docs/map-design/specs/map_spec.json"]), []);
  const collisionOpening = structuredClone(authoredFrontage);
  const collisionFrontage = (collisionOpening.frontages as Array<Record<string, unknown>>)[0];
  assert.ok(collisionFrontage);
  collisionFrontage.collisionOpening = true;
  assert.deepEqual(
    detectProtectedChanges(authoredFrontage, collisionOpening, ["docs/map-design/specs/map_spec.json"]),
    ["protected map authority changed"],
    "a real protected field inside a frontage is still detected",
  );
  assert.deepEqual(detectProtectedChanges(
    baseSpec,
    visualOnly,
    ["apps/client/src/runtime/map/buildProps.ts"],
  ), []);

  const routeChange = structuredClone(baseSpec);
  routeChange.constraints = { min_path_width_main_lane: 5.5 };
  const protectedChanges = detectProtectedChanges(
    baseSpec,
    routeChange,
    ["docs/map-design/specs/map_spec.json"],
  );
  assert.ok(protectedChanges.length > 0);
  assert.match(protectedChanges.join(" "), /protected|authority|constraint|path|gameplay/i);

  const protectedSourceChanges = detectProtectedChanges(
    baseSpec,
    baseSpec,
    ["apps/client/src/runtime/sim/TraversalSurfaceResolver.ts"],
  );
  assert.ok(protectedSourceChanges.length > 0, "touching collision/traversal authority must stop visual polish");

  const openingBase = structuredClone(baseSpec);
  openingBase.facade_modules = [{
    id: "DOOR_MODULE",
    openingType: "door",
    dimensionsM: { width: 1.2, depth: 0.2, height: 2.4 },
    collisionOpening: true,
  }];
  const openingChanged = structuredClone(openingBase) as MapSpec & {
    facade_modules: Array<{ dimensionsM: { width: number } }>;
  };
  const openingModule = openingChanged.facade_modules[0];
  assert.ok(openingModule);
  openingModule.dimensionsM.width = 1.6;
  assert.match(
    detectProtectedChanges(openingBase, openingChanged, ["docs/map-design/specs/map_spec.json"]).join(" "),
    /protected map authority/,
  );

  const clearanceBase = structuredClone(baseSpec);
  clearanceBase.composition_rules = { clearances: { door_service_m: 0.8 } };
  const clearanceChanged = structuredClone(clearanceBase);
  clearanceChanged.composition_rules = { clearances: { door_service_m: 0.2 } };
  assert.match(
    detectProtectedChanges(clearanceBase, clearanceChanged, ["docs/map-design/specs/map_spec.json"]).join(" "),
    /protected map authority/,
  );
});

test("real map owners stay local unless the changed mechanism is actually shared or route-adjacent", () => {
  assert.deepEqual(outsidePermittedSourceFiles(
    ["docs/map-design/specs/map_spec.json"],
    ["docs/map-design/specs/map_spec.json", "apps/client/src/runtime/map/buildProps.test.ts"],
  ), ["apps/client/src/runtime/map/buildProps.test.ts"]);
  assert.equal(inferTaskRisk({ defects: ["Prop material looks flat"] } as ReviewUnitState), "pure");
  assert.equal(inferTaskRisk({ defects: ["Placement blocks walking clearance"] } as ReviewUnitState), "route-adjacent");
  assert.equal(inferTaskRisk({ defects: ["Facade opening trim is repetitive"] } as ReviewUnitState), "pure");
  assert.equal(inferTaskRisk({ defects: ["Connector feels empty"] } as ReviewUnitState), "pure");
  for (const defect of [
    "Crate crowds the lane",
    "Barrel sits in the player path",
    "Stall protrudes into circulation",
    "Prop narrows the passage",
    "Canopy hangs too low over the route",
    "Wall geometry pinches the connector",
  ]) {
    assert.equal(inferTaskRisk({ defects: [defect] } as ReviewUnitState), "route-adjacent", defect);
  }
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/buildProps.ts"]), true);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/v3Architecture.ts"]), true);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/wallDetailPlacer.ts"]), true);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/wallMaterialAssignment.ts"]), true);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/buildProps.test.ts"]), false);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/map/wallShaderProfiles.ts"]), true);
  assert.equal(touchedSharedMechanism(["apps/client/src/runtime/render/materials/WallMaterialLibrary.ts"]), true);
  assert.equal(
    focusedSharedTest(["apps/client/src/runtime/map/propFamilies/propsCore.ts"]),
    "apps/client/src/runtime/map/buildProps.test.ts",
  );
  assert.equal(
    focusedSharedTest(["apps/client/src/runtime/map/wallDetailFamilies/kitCore.ts"]),
    "apps/client/src/runtime/map/v3Architecture.test.ts",
  );
  assert.equal(
    focusedSharedTest(["apps/client/src/runtime/render/models/PropModelLibrary.ts"]),
    "apps/client/src/runtime/map/buildProps.test.ts",
  );

  const base = {
    zones: [
      { id: "ZONE_A", type: "courtyard", label: "Zone A", rect: { x: 0, y: 0, w: 8, h: 8 } },
      { id: "ZONE_B", type: "courtyard", label: "Zone B", rect: { x: 10, y: 0, w: 8, h: 8 } },
    ],
    frontages: [
      { id: "FRONT_A", zoneId: "ZONE_A", material: "plaster", facadeProfileId: "PROFILE_A" },
      { id: "FRONT_B", zoneId: "ZONE_B", material: "plaster", facadeProfileId: "PROFILE_A" },
    ],
    dressing_placements: [{ id: "PROP_A", clusterId: "CLUSTER_A", offsetM: { x: 0, y: 0 } }],
    dressing_clusters: [
      { id: "CLUSTER_A", zoneId: "ZONE_A", assetIds: ["ASSET_SHARED"] },
      { id: "CLUSTER_B", zoneId: "ZONE_B", assetIds: ["ASSET_SHARED"] },
    ],
    asset_registry: [{ id: "ASSET_SHARED", dimensionsM: { width: 1, depth: 1, height: 1 }, collisionClass: "none" }],
    facade_modules: [{ id: "MODULE_SHARED", dimensionsM: { width: 1, depth: 0.2, height: 2 } }],
    facade_profiles: [{ id: "PROFILE_A", wall: "plaster", moduleIds: ["MODULE_SHARED"] }],
  } satisfies MapSpec;
  const removedFrontage = structuredClone(base);
  removedFrontage.frontages = [{ id: "FRONT_A", zoneId: "ZONE_A", material: "stone", facadeProfileId: "PROFILE_A" }];
  assert.equal(mapSpecRouteAdjacentChanged(base, removedFrontage), true);
  assert.equal(mapSpecSharedVisualChanged(base, removedFrontage), false);

  const localFrontage = structuredClone(base);
  const localFrontageRecord = localFrontage.frontages[0];
  assert.ok(localFrontageRecord);
  localFrontageRecord.material = "stone";
  assert.equal(mapSpecRouteAdjacentChanged(base, localFrontage), false, "material-only frontage edits stay pure");
  const localImpact = inspectCandidateLocality({
    baseSpec: base,
    currentSpec: localFrontage,
    touchedFiles: ["docs/map-design/specs/map_spec.json"],
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    selectedZoneIds: ["ZONE_A"],
  });
  assert.deepEqual(localImpact.zoneIds, ["ZONE_A"]);
  assert.equal(localImpact.requiresSharedEvidence, false);

  const profileSwapBase = structuredClone(base) as MapSpec;
  profileSwapBase.facade_modules = [
    { id: "MODULE_SHARED", kind: "column", openingType: "none", dimensionsM: { width: 1, depth: 0.2, height: 2 } },
    { id: "MODULE_DOOR", kind: "door", openingType: "door_void", dimensionsM: { width: 1.2, depth: 0.3, height: 2.4 } },
  ];
  profileSwapBase.facade_profiles = [
    { id: "PROFILE_A", family: "quiet", moduleIds: ["MODULE_SHARED"] },
    { id: "PROFILE_B", family: "service", moduleIds: ["MODULE_DOOR"] },
  ];
  const profileSwap = structuredClone(profileSwapBase);
  const profileSwapFrontage = (profileSwap.frontages as Array<Record<string, unknown>>)[0];
  assert.ok(profileSwapFrontage);
  profileSwapFrontage.facadeProfileId = "PROFILE_B";
  assert.equal(mapSpecRouteAdjacentChanged(profileSwapBase, profileSwap), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(profileSwapBase, profileSwap), ["ZONE_A"]);
  const zoneProfileSwap = structuredClone(profileSwapBase);
  const zoneProfile = (zoneProfileSwap.zones as Array<Record<string, unknown>>)[0];
  assert.ok(zoneProfile);
  zoneProfile.facadeProfileId = "PROFILE_B";
  assert.equal(mapSpecRouteAdjacentChanged(profileSwapBase, zoneProfileSwap), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(profileSwapBase, zoneProfileSwap), ["ZONE_A"]);
  const sameProfileGeometryChange = structuredClone(profileSwapBase);
  const sameProfile = (sameProfileGeometryChange.facade_profiles as Array<Record<string, unknown>>)
    .find((profile) => profile.id === "PROFILE_A");
  assert.ok(sameProfile);
  sameProfile.moduleIds = ["MODULE_DOOR"];
  assert.equal(mapSpecRouteAdjacentChanged(profileSwapBase, sameProfileGeometryChange), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(profileSwapBase, sameProfileGeometryChange), ["ZONE_A", "ZONE_B"]);
  const massingBase = structuredClone(profileSwapBase);
  massingBase.massing_profiles = [{ id: "MASSING_A", depthM: 0.4, heightM: 4 }];
  for (const profile of massingBase.facade_profiles as Array<Record<string, unknown>>) {
    if (profile.id === "PROFILE_A") profile.massingProfileId = "MASSING_A";
  }
  const massingChange = structuredClone(massingBase);
  const massing = (massingChange.massing_profiles as Array<Record<string, unknown>>)[0];
  assert.ok(massing);
  massing.depthM = 0.5;
  assert.equal(mapSpecRouteAdjacentChanged(massingBase, massingChange), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(massingBase, massingChange), ["ZONE_A", "ZONE_B"]);

  const foreignFrontage = structuredClone(base);
  const foreignFrontageRecord = foreignFrontage.frontages[1];
  assert.ok(foreignFrontageRecord);
  foreignFrontageRecord.material = "stone";
  const foreignImpact = inspectCandidateLocality({
    baseSpec: base,
    currentSpec: foreignFrontage,
    touchedFiles: ["docs/map-design/specs/map_spec.json"],
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    selectedZoneIds: ["ZONE_A"],
  });
  assert.deepEqual(foreignImpact.foreignVisualZoneIds, ["ZONE_B"]);
  assert.equal(foreignImpact.requiresSharedEvidence, true);

  const outsideOwnership = inspectCandidateLocality({
    baseSpec: base,
    currentSpec: base,
    touchedFiles: ["apps/client/src/runtime/map/propFamilies/foreignZone.ts"],
    ownershipPaths: [
      "docs/map-design/specs/map_spec.json",
      "apps/client/src/runtime/map/propFamilies/selectedZone.ts",
    ],
    selectedZoneIds: ["ZONE_A"],
  });
  assert.deepEqual(outsideOwnership.outsideOwnershipFiles, [
    "apps/client/src/runtime/map/propFamilies/foreignZone.ts",
  ]);
  assert.equal(outsideOwnership.requiresSharedEvidence, true);

  const ambiguousEmitter = inspectCandidateLocality({
    baseSpec: base,
    currentSpec: base,
    touchedFiles: ["apps/client/src/runtime/map/buildProps.ts"],
    ownershipPaths: ["docs/map-design/specs/map_spec.json", "apps/client/src/runtime/map/buildProps.ts"],
    selectedZoneIds: ["ZONE_A"],
  });
  assert.deepEqual(ambiguousEmitter.ambiguousSharedFiles, ["apps/client/src/runtime/map/buildProps.ts"]);
  assert.equal(ambiguousEmitter.requiresSharedEvidence, true);

  const landmarkBase = {
    ...base,
    anchors: [
      { id: "ANCHOR_A", zone: "ZONE_A" },
      { id: "ANCHOR_B", zone: "ZONE_B" },
    ],
    landmarks: {
      local: { anchor_id: "ANCHOR_A", note: "baseline" },
      foreign: { anchor_id: "ANCHOR_B", note: "unchanged" },
    },
  } satisfies MapSpec;
  const localLandmark = structuredClone(landmarkBase);
  localLandmark.landmarks.local.note = "selected-zone refinement";
  const landmarkImpact = inspectCandidateLocality({
    baseSpec: landmarkBase,
    currentSpec: localLandmark,
    touchedFiles: ["docs/map-design/specs/map_spec.json"],
    ownershipPaths: ["docs/map-design/specs/map_spec.json"],
    selectedZoneIds: ["ZONE_A"],
  });
  assert.deepEqual(landmarkImpact.zoneIds, ["ZONE_A"]);
  assert.equal(landmarkImpact.requiresSharedEvidence, false);

  const changedCameraAuthority = {
    ...base,
    map_polish_survey_camera_overrides: {
      ZONE_A: {
        primary: {
          designPosition: { x: 1, y: 1, z: 1.7 },
          designLookAt: { x: 2, y: 1, z: 1.7 },
          playerPosition: { x: 1, y: 0, z: 1 },
          yawDeg: 90,
          fovDeg: 75,
        },
      },
    },
  } satisfies MapSpec;
  assert.equal(mapSpecSurveyCameraAuthorityChanged(base, changedCameraAuthority), true);

  const placement = structuredClone(base);
  placement.dressing_placements = [{ id: "PROP_A", clusterId: "CLUSTER_A", offsetM: { x: 1, y: 0 } }];
  assert.equal(mapSpecRouteAdjacentChanged(base, placement), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(base, placement), ["ZONE_A"]);

  const shared = structuredClone(base);
  shared.facade_profiles = [{ id: "PROFILE_A", wall: "stone", moduleIds: ["MODULE_SHARED"] }];
  assert.equal(mapSpecSharedVisualChanged(base, shared), true);
  const sharedAsset = structuredClone(base);
  sharedAsset.asset_registry = [{ id: "ASSET_SHARED", dimensionsM: { width: 2, depth: 1, height: 1 }, collisionClass: "none" }];
  assert.equal(mapSpecSharedVisualChanged(base, sharedAsset), true);
  assert.equal(mapSpecRouteAdjacentChanged(base, sharedAsset), true);
  assert.deepEqual(mapSpecRouteChangedZoneIds(base, sharedAsset), ["ZONE_A", "ZONE_B"]);
  const oneOffAsset = structuredClone(base);
  oneOffAsset.asset_registry.push({ id: "ASSET_LOCAL", dimensionsM: { width: 1, depth: 1, height: 1 }, collisionClass: "none" });
  assert.equal(mapSpecSharedVisualChanged(base, oneOffAsset), false);
  const sharedModule = structuredClone(base);
  sharedModule.facade_modules = [{ id: "MODULE_SHARED", dimensionsM: { width: 1.2, depth: 0.2, height: 2 } }];
  assert.equal(mapSpecSharedVisualChanged(base, sharedModule), true);
  const globalWallDetails = { ...base, wall_details: { density: 0.4, facade_overrides: [] } };
  const changedGlobalWallDetails = { ...globalWallDetails, wall_details: { density: 0.8, facade_overrides: [] } };
  assert.equal(mapSpecSharedVisualChanged(globalWallDetails, changedGlobalWallDetails), true);
  const localWallDetails = { ...globalWallDetails, wall_details: { density: 0.4, facade_overrides: [{ zoneId: "ZONE_A" }] } };
  assert.equal(mapSpecSharedVisualChanged(globalWallDetails, localWallDetails), false);
  assert.equal(candidateTouchesMapAuthority(["docs/map-design/specs/map_spec.json"]), true);
  assert.equal(isAllowedCandidateFile("apps/client/src/runtime/map/buildProps.ts"), true);
  assert.equal(isAllowedCandidateFile("apps/client/src/runtime/map/buildProps.test.ts"), true);
  assert.equal(isAllowedCandidateFile("apps/client/public/maps/bazaar-map/map_spec.json"), true);
  assert.equal(isAllowedCandidateFile("docs/map-design/layout-reference.svg"), true);
  assert.equal(isAllowedCandidateFile("apps/client/src/runtime/enemies/EnemyManager.ts"), false);
  assert.equal(isAllowedCandidateFile("server/highScoreApi.ts"), false);
});

test("rejection restores only candidate-touched files", async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-map-polish-restore-"));
  try {
    await git(repoRoot, ["init", "--initial-branch", "main"]);
    await git(repoRoot, ["config", "user.name", "Codex Test"]);
    await git(repoRoot, ["config", "user.email", "codex-test@example.com"]);
    await writeFile(path.join(repoRoot, "candidate.txt"), "accepted baseline\n", "utf8");
    await writeFile(path.join(repoRoot, "unrelated.txt"), "user baseline\n", "utf8");
    await git(repoRoot, ["add", "candidate.txt", "unrelated.txt"]);
    await git(repoRoot, ["commit", "-m", "fixture baseline"]);
    const startCommit = await git(repoRoot, ["rev-parse", "HEAD"]);

    await writeFile(path.join(repoRoot, "candidate.txt"), "rejected candidate\n", "utf8");
    await writeFile(path.join(repoRoot, "unrelated.txt"), "unrelated user work\n", "utf8");
    await git(repoRoot, ["add", "candidate.txt"]);
    assert.deepEqual(
      await collectTouchedFiles(repoRoot),
      ["candidate.txt", "unrelated.txt"],
      "candidate ownership must include staged changes",
    );

    await restoreCandidateFiles({
      repoRoot,
      startCommit,
      touchedFiles: ["candidate.txt"],
    });

    assert.equal(await readFile(path.join(repoRoot, "candidate.txt"), "utf8"), "accepted baseline\n");
    assert.equal(await readFile(path.join(repoRoot, "unrelated.txt"), "utf8"), "unrelated user work\n");
    assert.deepEqual(
      await collectTouchedFiles(repoRoot),
      ["unrelated.txt"],
      "restoring a staged candidate must normalize only its worktree and index entry",
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("rejected artifact cleanup removes ephemera unless debug retention is explicit", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-map-polish-artifacts-"));
  try {
    const rejectedDir = path.join(tempRoot, "artifacts", "rejected");
    await mkdir(path.join(rejectedDir, "diagnostics"), { recursive: true });
    const rejectedEphemera = [
      "primary-before.png",
      "context-before.png",
      "primary-after.png",
      "context-after.png",
      "trace.zip",
      "diagnostics/full-console.txt",
    ];
    for (const relativePath of rejectedEphemera) {
      await writeFile(path.join(rejectedDir, relativePath), "temporary", "utf8");
    }
    await cleanupRejectedArtifacts(rejectedDir, false);
    for (const relativePath of rejectedEphemera) {
      assert.equal(await exists(path.join(rejectedDir, relativePath)), false, `${relativePath} should be removed`);
    }

    const debugDir = path.join(tempRoot, "artifacts", "kept-debug");
    await mkdir(debugDir, { recursive: true });
    await writeFile(path.join(debugDir, "trace.zip"), "debug trace", "utf8");
    await writeFile(path.join(debugDir, "primary-after.png"), "debug image", "utf8");
    await cleanupRejectedArtifacts(debugDir, true);
    assert.equal(await exists(path.join(debugDir, "trace.zip")), false, "browser traces are never retained");
    assert.equal(await exists(path.join(debugDir, "primary-after.png")), true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("survey capture builds one compact local reference board", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-map-reference-board-"));
  try {
    for (const fileName of [
      "bazaar_main_hall_reference.png",
      "cs2_daylight_ref_1.png",
      "cs2_daylight_ref_2.png",
      "cs2_daylight_ref_3.png",
      "cs2_daylight_ref_4.png",
      "cs2_daylight_ref_5.png",
    ]) {
      const source = await readFile(path.resolve("docs/map-design/refs", fileName));
      assert.deepEqual([...source.subarray(1, 4)], [0x50, 0x4e, 0x47], `${fileName} must be a present PNG source`);
    }
    const planPath = path.join(tempRoot, "plan.json");
    const outputDir = path.join(tempRoot, "capture");
    const camera = {
      designPosition: { x: 1, y: 1, z: 1.7 },
      designLookAt: { x: 1, y: 2, z: 1.65 },
      playerPosition: { x: 1, y: 0, z: 1 },
      yawDeg: 180,
      fovDeg: 75,
    };
    await writeFile(planPath, `${JSON.stringify({
      schemaVersion: 1,
      authorityHash: "reference-board-test",
      contactSheets: true,
      units: [{
        id: "unit-a",
        zoneIds: ["ZONE_A"],
        views: [
          { id: "primary", camera },
          { id: "context", camera },
          { id: "elev:FRONTAGE_A", camera: { ...camera, pitchDeg: 12 } },
        ],
      }],
      batches: [{ id: "batch-01", unitIds: ["unit-a"] }],
    })}\n`, "utf8");
    await execFile(process.execPath, [
      path.resolve("apps/client/scripts/map-polish-capture.mjs"),
      "capture", "--plan", planPath, "--output", outputDir, "--synthetic", "baseline",
    ]);
    const manifest = JSON.parse(await readFile(path.join(outputDir, "capture-result.json"), "utf8")) as {
      referenceBoardPath?: string;
      batches: Array<{ contactSheetPath: string }>;
    };
    assert.ok(manifest.referenceBoardPath);
    assert.equal(await exists(manifest.referenceBoardPath), true);
    const board = await readFile(manifest.referenceBoardPath);
    assert.deepEqual([...board.subarray(1, 4)], [0x50, 0x4e, 0x47]);
    assert.ok(board.length > 10_000);
    assert.equal(manifest.batches.length, 1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("manual and mock modes cannot invoke an external model", () => {
  assert.equal(modeUsesExternalModel("mock"), false);
  assert.equal(modeUsesExternalModel("manual"), false);
  assert.equal(modeUsesExternalModel("real"), true);
});

test("real writer and reviewer Codex argv use compatible sandbox flags", () => {
  const common = {
    repoRoot: "/repo",
    workingDirectory: "/review",
    images: ["primary.png", "context.png"],
    schemaPath: "schema.json",
    resultPath: "result.json",
  };
  const writer = codexInvocationArgs({ ...common, role: "writer" });
  assert.ok(writer.includes("--approve-for-me"));
  assert.equal(writer.includes("workspace-write"), false);
  assert.equal(writer.includes("-s"), false);
  assert.ok(writer.includes("--ignore-user-config"));
  assert.ok(writer.includes("gpt-5.6-sol"));
  assert.ok(writer.includes('model_reasoning_effort="xhigh"'));
  assert.ok(writer.includes("--json"));
  const reviewer = codexInvocationArgs({ ...common, role: "reviewer" });
  assert.ok(reviewer.includes("read-only"));
  assert.ok(reviewer.includes("--ask-for-approval"));
  assert.ok(reviewer.includes('model_reasoning_effort="high"'));
  assert.deepEqual(parseCodexUsage([
    JSON.stringify({ type: "thread.started" }),
    JSON.stringify({
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        cached_input_tokens: 40,
        cache_write_input_tokens: 5,
        output_tokens: 20,
        reasoning_output_tokens: 12,
        total_tokens: 120,
      },
    }),
  ].join("\n")), {
    inputTokens: 100,
    cachedInputTokens: 40,
    cacheWriteInputTokens: 5,
    outputTokens: 20,
    reasoningOutputTokens: 12,
    totalTokens: 120,
  });
  assert.equal(parseCodexUsage("not json"), null);
});

test("mock mode cannot write authoritative workflow state", async () => {
  const result = await runCli(["verify", "--mode", "mock", "--milestone"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /alternate --state and --artifacts/);
});

test("mock CLI survey, accept checkpoint, and rejected retry stay bounded and model-free", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-map-polish-cli-"));
  const repoRoot = path.join(tempRoot, "repo");
  const stateRelative = "docs/map-design/map-polish-state.json";
  const statePath = path.join(repoRoot, stateRelative);
  const specPath = path.join(repoRoot, "docs/map-design/specs/map_spec.json");
  const targetRelative = "apps/client/src/runtime/map/propFamilies/visualFixture.ts";
  const targetPath = path.join(repoRoot, targetRelative);
  const sharedTargetRelative = "apps/client/src/runtime/map/wallShaderProfiles.ts";
  const sharedTargetPath = path.join(repoRoot, sharedTargetRelative);
  const unrelatedPath = path.join(repoRoot, "notes/unrelated.txt");
  const markerPath = path.join(tempRoot, "codex-invoked");
  const fakeCodexPath = path.join(tempRoot, "fake-codex.cjs");
  const previousCodexBin = process.env.CODEX_BIN;
  const previousClaudeBin = process.env.CLAUDE_BIN;
  const previousEngine = process.env.MAP_POLISH_ENGINE;

  try {
    await mkdir(path.dirname(specPath), { recursive: true });
    await mkdir(path.dirname(targetPath), { recursive: true });
    await mkdir(path.dirname(unrelatedPath), { recursive: true });
    const spec: MapSpec = {
      zones: [
        { id: "TEST_RED_4", type: "courtyard", label: "Test Red Four", rect: { x: 0, y: 0, w: 8, h: 8 } },
        { id: "TEST_RED_6", type: "service_area", label: "Test Red Six", rect: { x: 12, y: 0, w: 8, h: 8 } },
        { id: "TEST_GREEN_0", type: "connector", label: "Test Green Zero", rect: { x: 24, y: 0, w: 8, h: 8 } },
      ],
    };
    await writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
    await writeFile(
      targetPath,
      "// TEST_RED_4 TEST_RED_6\nexport const visualFixture = \"baseline\";\n",
      "utf8",
    );
    await writeFile(sharedTargetPath, "export const wallShaderProfile = \"baseline\";\n", "utf8");
    await writeFile(unrelatedPath, "unrelated baseline\n", "utf8");
    await writeFile(
      path.join(repoRoot, ".gitignore"),
      "artifacts/\napps/client/layout-regenerated\napps/client/maps-regenerated\n",
      "utf8",
    );
    await writeFile(path.join(repoRoot, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n", "utf8");
    await writeFile(path.join(repoRoot, "apps/client/package.json"), `${JSON.stringify({
      name: "@clawd-strike/client",
      private: true,
      scripts: {
        "gen:layout-reference": "node -e \"require('node:fs').writeFileSync('layout-regenerated','yes')\"",
        "gen:maps": "node -e \"require('node:fs').writeFileSync('maps-regenerated','yes')\"",
      },
    }, null, 2)}\n`, "utf8");
    await writeFile(
      fakeCodexPath,
      `#!/usr/bin/env node\nrequire("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "invoked\\n");\nprocess.exit(97);\n`,
      "utf8",
    );
    await chmod(fakeCodexPath, 0o755);

    await git(repoRoot, ["init", "--initial-branch", "codex/map-polish-test"]);
    await git(repoRoot, ["config", "user.name", "Codex Test"]);
    await git(repoRoot, ["config", "user.email", "codex-test@example.com"]);
    await git(repoRoot, ["add", ".gitignore", "pnpm-workspace.yaml", "apps", "docs/map-design/specs", "notes"]);
    await git(repoRoot, ["commit", "-m", "fixture baseline"]);
    const baselineCommit = await git(repoRoot, ["rev-parse", "HEAD"]);
    const baselineSpec = await readFile(specPath, "utf8");
    const baselineUnrelated = await readFile(unrelatedPath, "utf8");
    process.env.CODEX_BIN = fakeCodexPath;
    process.env.CLAUDE_BIN = fakeCodexPath;
    delete process.env.MAP_POLISH_ENGINE;

    await writeFile(unrelatedPath, "dirty source before real survey\n", "utf8");
    const dirtyRealSurvey = await runCli([
      "survey",
      "--repo-root", repoRoot,
      "--mode", "real",
    ]);
    assert.equal(dirtyRealSurvey.code, 1);
    assert.match(dirtyRealSurvey.stderr, /refuses unrelated uncommitted changes/);
    assert.equal(await exists(markerPath), false, "dirty real survey must stop before any model call");
    await writeFile(unrelatedPath, baselineUnrelated, "utf8");

    const survey = await runCli([
      "survey",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--synthetic",
    ]);
    assert.equal(survey.code, 0, survey.stderr);
    assert.match(survey.stdout, /Survey complete/);
    assert.deepEqual(
      await collectTouchedFiles(repoRoot),
      [stateRelative],
      "survey should leave only its workflow-owned state dirty",
    );
    const missingRealScope = await runCli(["run", "--repo-root", repoRoot, "--mode", "real"]);
    assert.equal(missingRealScope.code, 1);
    assert.match(missingRealScope.stderr, /requires explicit --objective and --risk/);
    assert.equal(await exists(markerPath), false, "missing real scope must stop before capture or model invocation");
    const unsafeRealBatch = await runCli([
      "run", "--repo-root", repoRoot, "--mode", "real", "--commit", "--max-tasks", "2",
      "--objective", "One bounded visual objective.", "--risk", "pure",
    ]);
    assert.equal(unsafeRealBatch.code, 1);
    assert.match(unsafeRealBatch.stderr, /one explicitly scoped task at a time/);
    assert.equal(await exists(markerPath), false);

    const firstRun = await runCli([
      "run",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--synthetic",
      "--mock-target", targetRelative,
      "--mock-review", "accept",
    ]);
    assert.equal(firstRun.code, 0, firstRun.stderr);
    assert.match(firstRun.stdout, /pending human accept/);
    const firstPending = await readStateFile(statePath);
    assert.equal(firstPending.activeTask?.status, "awaiting-human");
    assert.equal(firstPending.activeTask?.proposedOutcome, "accept");
    assert.ok(firstPending.activeTask?.blindAfterLabel === "A" || firstPending.activeTask?.blindAfterLabel === "B");
    assert.deepEqual(firstPending.activeTask?.touchedFiles, [targetRelative]);
    const firstUnitId = firstPending.activeTask?.unitId;
    assert.ok(firstUnitId);
    const firstArtifactDir = path.resolve(repoRoot, firstPending.activeTask?.artifactDir ?? "missing");
    // Square test zones derive cross views; the synthetic after-variant changes
    // every view, so the blind package carries every materially changed pair.
    assert.deepEqual(await readdir(path.join(firstArtifactDir, "review")), [
      "A-context.png",
      "A-cross-a.png",
      "A-cross-b.png",
      "A-primary.png",
      "B-context.png",
      "B-cross-a.png",
      "B-cross-b.png",
      "B-primary.png",
    ]);
    const retained = await allFiles(firstArtifactDir);
    // Review image pairs for each changed view, work order, site brief, review result, outcome, candidate patch.
    assert.ok(retained.length <= 13, `pending artifact set must stay bounded, got: ${retained.join(", ")}`);
    assert.ok(retained.includes("site-brief.md"), "the human deciding the pending package gets the plan-level site brief");
    assert.ok(retained.every((file) => !/(^|\/)(before|after)(\/|$)|trace\.zip/.test(file)));
    const pendingOutcome = JSON.parse(await readFile(path.join(firstArtifactDir, "outcome.json"), "utf8")) as Record<string, unknown>;
    assert.equal("afterLabel" in pendingOutcome, false, "the review package must not reveal which blinded label is newer");
    const taskPerformance = pendingOutcome.performance as {
      totalAutomationMs: number;
      nonModelMs: number;
      phases: Record<string, number>;
      writer: { calls: number; usage: unknown };
      reviewer: { calls: number; usage: unknown };
      budgetsMs: Record<string, number>;
      warnings: string[];
    };
    assert.ok(Number.isFinite(taskPerformance.totalAutomationMs) && taskPerformance.totalAutomationMs >= 0);
    assert.ok(Number.isFinite(taskPerformance.nonModelMs) && taskPerformance.nonModelMs >= 0);
    assert.ok(Object.values(taskPerformance.phases).every((value) => Number.isFinite(value) && value >= 0));
    assert.deepEqual({ calls: taskPerformance.writer.calls, usage: taskPerformance.writer.usage }, { calls: 0, usage: null });
    assert.deepEqual({ calls: taskPerformance.reviewer.calls, usage: taskPerformance.reviewer.usage }, { calls: 0, usage: null });
    assert.equal(taskPerformance.budgetsMs.total, 900_000);
    assert.deepEqual(taskPerformance.warnings, []);
    const evidence = pendingOutcome.evidence as {
      startCommit: string;
      engine: string;
      writerEngine: string;
      touchedFiles: string[];
      completedChecks: string[];
      protectedAuthority: { unchanged: boolean };
      targetViewIds: string[];
      views: Record<string, {
        before: { sha256: string; camera: unknown; consoleErrorCount: number };
        after: { sha256: string; camera: unknown; consoleErrorCount: number };
        comparison: { changedPixelRatio: number };
        materiallyChanged: boolean;
        targetView: boolean;
      }>;
      valid: boolean;
      reasons: string[];
    };
    assert.equal(evidence.startCommit, baselineCommit);
    assert.equal(evidence.engine, "codex");
    assert.equal(evidence.writerEngine, "claude");
    assert.deepEqual(evidence.touchedFiles, [targetRelative]);
    assert.ok(evidence.completedChecks.includes("protected-domain diff"));
    assert.ok(evidence.completedChecks.includes("mock scoped checks passed"));
    assert.ok(evidence.completedChecks.includes("exact same-camera recapture"));
    assert.equal(evidence.protectedAuthority.unchanged, true);
    assert.ok(evidence.targetViewIds.length > 0);
    const primaryEvidence = evidence.views.primary;
    assert.ok(primaryEvidence, "per-view evidence must include primary");
    assert.notEqual(primaryEvidence.before.sha256, primaryEvidence.after.sha256);
    assert.ok(primaryEvidence.before.camera);
    assert.ok(primaryEvidence.after.camera);
    assert.equal(primaryEvidence.before.consoleErrorCount, 0);
    assert.equal(primaryEvidence.after.consoleErrorCount, 0);
    assert.ok(primaryEvidence.comparison.changedPixelRatio > 0);
    assert.equal(primaryEvidence.materiallyChanged, true);
    assert.equal(primaryEvidence.targetView, true);
    assert.equal(evidence.valid, true);
    assert.deepEqual(evidence.reasons, []);
    const outcomeBytes = await readFile(path.join(firstArtifactDir, "outcome.json"));
    assert.equal(
      firstPending.activeTask?.artifactEvidenceHash,
      createHash("sha256").update(outcomeBytes).digest("hex"),
    );

    const sealedReviewImage = path.join(firstArtifactDir, "review", "A-primary.png");
    const sealedReviewBytes = await readFile(sealedReviewImage);
    await writeFile(sealedReviewImage, "tampered review image", "utf8");
    const tamperedReviewAcceptance = await runCli([
      "verify",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--accept",
      "--commit",
    ]);
    assert.equal(tamperedReviewAcceptance.code, 1);
    assert.match(tamperedReviewAcceptance.stderr, /review image .* changed after visual validation/);
    await writeFile(sealedReviewImage, sealedReviewBytes);

    const failingHook = path.join(repoRoot, ".git/hooks/pre-commit");
    await writeFile(failingHook, "#!/bin/sh\nexit 1\n", "utf8");
    await chmod(failingHook, 0o755);
    const failedCheckpoint = await runCli([
      "verify",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--accept",
      "--commit",
    ]);
    assert.equal(failedCheckpoint.code, 1);
    assert.match(failedCheckpoint.stderr, /remains pending|checkpoint failed/i);
    const recoveryState = await readStateFile(statePath);
    assert.equal(recoveryState.activeTask?.id, firstPending.activeTask?.id);
    assert.equal(recoveryState.activeTask?.status, "awaiting-human");
    assert.equal(
      (await git(repoRoot, ["diff", "--cached", "--name-only", "--", stateRelative])).trim(),
      "",
      "failed checkpoint recovery must not leave an accepted state staged",
    );
    assert.equal(await exists(firstArtifactDir), true);
    await rm(failingHook, { force: true });

    const accept = await runCli([
      "verify",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--accept",
      "--commit",
    ]);
    assert.equal(accept.code, 0, accept.stderr);
    assert.match(accept.stdout, /accepted; candidate retained/);
    const checkpointCommit = await git(repoRoot, ["rev-parse", "HEAD"]);
    assert.notEqual(checkpointCommit, baselineCommit, "human acceptance should create the requested local checkpoint");
    assert.equal(await exists(firstArtifactDir), false);
    assert.deepEqual(await collectTouchedFiles(repoRoot), []);
    const acceptedTarget = await readFile(targetPath, "utf8");
    assert.match(acceptedTarget, /mock visual candidate/);
    const acceptedState = await readStateFile(statePath);
    assert.ok(acceptedState.sourceFingerprint);

    await writeFile(unrelatedPath, "out-of-band source drift\n", "utf8");
    const driftedNext = await runCli([
      "next",
      "--repo-root", repoRoot,
      "--mode", "mock",
    ]);
    assert.equal(driftedNext.code, 0, driftedNext.stderr);
    assert.match(driftedNext.stdout, /Survey required before implementation/);
    await writeFile(unrelatedPath, baselineUnrelated, "utf8");
    assert.deepEqual(await collectTouchedFiles(repoRoot), []);

    const secondRun = await runCli([
      "run",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--synthetic",
      "--mock-target", targetRelative,
      "--mock-review", "reject",
    ]);
    assert.equal(secondRun.code, 0, secondRun.stderr);
    assert.match(secondRun.stdout, /pending human reject/);
    const secondPending = await readStateFile(statePath);
    const secondTask = secondPending.activeTask;
    assert.ok(secondTask);
    assert.notEqual(secondTask.unitId, firstUnitId, "one accepted unit must rotate to another Red unit");
    const secondArtifactDir = path.resolve(repoRoot, secondTask.artifactDir);
    assert.notEqual(await readFile(targetPath, "utf8"), acceptedTarget);

    const reject = await runCli([
      "verify",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--reject",
      "--diagnosis", "Appending another local visual marker did not meet the objective.",
      "--next-action", "Use a materially different local material assignment.",
    ]);
    assert.equal(reject.code, 0, reject.stderr);
    assert.match(reject.stdout, /rejected; candidate restored/);
    assert.equal(await readFile(targetPath, "utf8"), acceptedTarget);
    assert.equal(await readFile(specPath, "utf8"), baselineSpec);
    assert.equal(await readFile(unrelatedPath, "utf8"), baselineUnrelated);
    assert.equal(await exists(secondArtifactDir), false);

    const rejectedState = await readStateFile(statePath);
    assert.equal(rejectedState.activeTask, null);
    const rejectedUnit = rejectedState.units.find((unit) => unit.id === secondTask.unitId);
    assert.deepEqual(rejectedUnit?.lastAttemptedPass, {
      pass: rejectedState.pass,
      attempts: 1,
      accepted: false,
    });
    assert.equal(rejectedUnit?.deferredReason, undefined);
    assert.equal(rejectedUnit?.nextAction, "Use a materially different local material assignment.");
    assert.equal(selectNextUnit(rejectedState)?.id, secondTask.unitId, "new evidence must permit exactly one second attempt");
    assert.deepEqual(await collectTouchedFiles(repoRoot), [stateRelative]);

    const manualDryRun = await runCli([
      "run",
      "--repo-root", repoRoot,
      "--mode", "manual",
      "--dry-run",
    ]);
    assert.equal(manualDryRun.code, 0, manualDryRun.stderr);
    assert.match(manualDryRun.stdout, /no capture, model call, source edit, or state update/i);
    const retryWorkOrder = await readFile(
      path.join(repoRoot, "artifacts/map-polish/dry-run/work-order.md"),
      "utf8",
    );
    assert.match(
      retryWorkOrder,
      /Objective: Use a materially different local material assignment\./,
      "the diagnosed next action must become the second attempt's objective",
    );

    const manualArtifactDir = path.join(repoRoot, "artifacts/map-polish/active/manual-recovery");
    await mkdir(manualArtifactDir, { recursive: true });
    await writeFile(path.join(manualArtifactDir, "work-order.md"), "Manual recovery fixture.\n", "utf8");
    const manualState = structuredClone(rejectedState);
    manualState.activeTask = {
      id: "manual-recovery",
      unitId: secondTask.unitId,
      status: "awaiting-writer",
      startCommit: checkpointCommit,
      artifactDir: path.relative(repoRoot, manualArtifactDir),
      workOrder: path.relative(repoRoot, path.join(manualArtifactDir, "work-order.md")),
      objective: "Exercise direct manual rollback.",
      attempt: 2,
      risk: "pure",
      touchedFiles: [],
    };
    await writeFile(statePath, `${JSON.stringify(manualState, null, 2)}\n`, "utf8");
    await writeFile(targetPath, `${acceptedTarget}\n// manual candidate\n`, "utf8");
    await writeFile(specPath, "{ malformed manual candidate\n", "utf8");
    const manualReject = await runCli([
      "verify",
      "--repo-root", repoRoot,
      "--mode", "manual",
      "--reject",
      "--diagnosis", "Manual candidate was intentionally invalid for rollback coverage.",
    ]);
    assert.equal(manualReject.code, 0, manualReject.stderr);
    assert.equal(await readFile(targetPath, "utf8"), acceptedTarget);
    assert.equal(await readFile(specPath, "utf8"), baselineSpec);
    assert.equal(await readFile(path.join(repoRoot, "apps/client/layout-regenerated"), "utf8"), "yes");
    assert.equal(await readFile(path.join(repoRoot, "apps/client/maps-regenerated"), "utf8"), "yes");
    assert.equal((await readStateFile(statePath)).activeTask, null);

    const resurvey = await runCli([
      "survey", "--repo-root", repoRoot, "--mode", "mock", "--synthetic",
    ]);
    assert.equal(resurvey.code, 0, resurvey.stderr);
    const clearPriorMilestone = await runCli([
      "verify", "--repo-root", repoRoot, "--mode", "mock", "--milestone",
    ]);
    assert.equal(clearPriorMilestone.code, 0, clearPriorMilestone.stderr);
    const preflightState = await readStateFile(statePath);
    const preflightSelected = selectNextUnit(preflightState);
    assert.ok(preflightSelected);
    const markerBeforePreflight = await exists(markerPath);
    const preflightDefer = await runCli([
      "run", "--repo-root", repoRoot, "--mode", "mock", "--defer-selected",
      "--diagnosis", "No bounded zone-local emitter owns this visible defect.",
    ]);
    assert.equal(preflightDefer.code, 0, preflightDefer.stderr);
    assert.match(preflightDefer.stdout, /without capture or model call/);
    assert.equal(await exists(markerPath), markerBeforePreflight);
    const sharedReadyState = await readStateFile(statePath);
    assert.equal(
      sharedReadyState.units.find((unit) => unit.id === preflightSelected.id)?.deferredReason,
      "No bounded zone-local emitter owns this visible defect.",
    );
    assert.notEqual(selectNextUnit(sharedReadyState)?.id, preflightSelected.id);
    const sharedSelected = selectNextUnit(sharedReadyState);
    assert.ok(sharedSelected);
    const corroboratingWeak = sharedReadyState.units.find((unit) => (
      unit.id !== sharedSelected.id && (unit.rating === "red" || unit.rating === "yellow")
    ));
    const greenRegression = sharedReadyState.units.find((unit) => unit.rating === "green");
    assert.ok(corroboratingWeak);
    assert.ok(greenRegression);

    const sharedRun = await runCli([
      "run",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--synthetic",
      "--risk", "shared",
      "--shared-evidence", corroboratingWeak.id,
      "--shared-cause", "One shared wall shader produces the same weak response in both units.",
      "--green-regression", greenRegression.id,
      "--mock-target", sharedTargetRelative,
      "--mock-review", "accept",
    ]);
    assert.equal(sharedRun.code, 0, sharedRun.stderr);
    const sharedPending = await readStateFile(statePath);
    assert.equal(sharedPending.activeTask?.risk, "shared");
    const sharedArtifactDir = path.resolve(repoRoot, sharedPending.activeTask?.artifactDir ?? "missing");
    assert.deepEqual(await readdir(path.join(sharedArtifactDir, "review")), [
      "A-context.png",
      "A-cross-a.png",
      "A-cross-b.png",
      "A-green.png",
      "A-primary.png",
      "B-context.png",
      "B-cross-a.png",
      "B-cross-b.png",
      "B-green.png",
      "B-primary.png",
    ]);
    const sharedWorkOrder = await readFile(path.join(sharedArtifactDir, "work-order.md"), "utf8");
    assert.match(sharedWorkOrder, /wallShaderProfiles\.ts/);
    assert.match(sharedWorkOrder, /Shared cause: One shared wall shader/);
    assert.match(sharedWorkOrder, new RegExp(corroboratingWeak.id));
    assert.match(sharedWorkOrder, /Primary review pair: review\/A-primary\.png and review\/B-primary\.png/);
    assert.doesNotMatch(sharedWorkOrder, /before\/units/);

    const sharedAccept = await runCli([
      "verify", "--repo-root", repoRoot, "--mode", "mock", "--accept", "--commit",
    ]);
    assert.equal(sharedAccept.code, 0, sharedAccept.stderr);
    const sharedAcceptedState = await readStateFile(statePath);
    assert.equal(sharedAcceptedState.activeTask, null);
    assert.equal(sharedAcceptedState.milestone.required, true);
    assert.equal(sharedAcceptedState.milestone.full, true);

    const clearSharedMilestone = await runCli([
      "verify", "--repo-root", repoRoot, "--mode", "mock", "--milestone",
    ]);
    assert.equal(clearSharedMilestone.code, 0, clearSharedMilestone.stderr);
    const routeSurvey = await runCli([
      "survey", "--repo-root", repoRoot, "--mode", "mock", "--synthetic",
    ]);
    assert.equal(routeSurvey.code, 0, routeSurvey.stderr);
    const routeSelected = selectNextUnit(await readStateFile(statePath));
    assert.ok(routeSelected);
    const routeRun = await runCli([
      "run",
      "--repo-root", repoRoot,
      "--mode", "mock",
      "--synthetic",
      "--risk", "route-adjacent",
      "--mock-target", targetRelative,
      "--mock-review", "accept",
      "--commit",
    ]);
    assert.equal(routeRun.code, 0, routeRun.stderr);
    assert.match(routeRun.stdout, /local commit created/);
    const routeAccepted = await readStateFile(statePath);
    assert.equal(routeAccepted.activeTask, null);
    assert.equal(routeAccepted.units.find((unit) => unit.id === routeSelected.id)?.lastAttemptedPass?.accepted, true);
    assert.equal(await exists(markerPath), false, "mock and manual workflow paths must never invoke either engine");
  } finally {
    if (previousCodexBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previousCodexBin;
    if (previousClaudeBin === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = previousClaudeBin;
    if (previousEngine === undefined) delete process.env.MAP_POLISH_ENGINE;
    else process.env.MAP_POLISH_ENGINE = previousEngine;
    await rm(tempRoot, { recursive: true, force: true });
  }
});

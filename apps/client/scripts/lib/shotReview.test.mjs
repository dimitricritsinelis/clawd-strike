import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  evaluateRuntimeShotCameraPose,
  readScreenshotCoverage,
  selectReviewShotIds,
  validateReviewShotInventory,
} from "./runtimePlaywright.mjs";
import {
  aggregateShotReviews,
  compareCapturedShotPair,
  parseHumanReviewPolicy,
  parseShotAcceptance,
  resolveShotDefinition,
  summarizeCapturedShot,
} from "./shotReview.mjs";

function runtimeState(overrides = {}) {
  return {
    shot: {
      active: true,
      id: "SHOT_A",
      cameraZoneId: "COURT",
      cameraPose: {
        pos: { x: 1, y: 2, z: 3 },
        lookAt: { x: 1, y: 2, z: 4 },
        fovDeg: 70,
      },
    },
    view: {
      camera: {
        pos: { x: 1, y: 2, z: 3 },
        yawDeg: 180,
        pitchDeg: 0,
        fovDeg: 70,
      },
    },
    render: {
      warnings: [],
      visibleSceneTags: ["spice-street", "awning"],
      artifactTags: [],
      visibleAssets: [
        {
          placementId: "COVER_A",
          assetId: "ASSET_CRATE",
          semanticClass: "gameplay-cover",
          representation: "model",
          materialMode: "pbr",
          groundingGapM: 0.01,
          dimensionsM: { width: 1.5, depth: 1, height: 1.1 },
          shadowMode: "cast_receive",
          screenAreaRatio: 0.2,
          occluded: false,
        },
      ],
    },
    landmarks: {
      visible: [{ id: "FOUNTAIN", type: "landmark", zone: "COURT" }],
    },
    player: { zoneId: "COURT" },
    weapon: { visible: false },
    assets: {
      floor: { requestedMode: "pbr", activeMode: "pbr" },
      wall: { requestedMode: "pbr", activeMode: "pbr" },
      props: { requestedVisualMode: "bazaar", activeVisualMode: "bazaar" },
    },
    ...overrides,
  };
}

const healthyMetrics = {
  width: 1440,
  height: 900,
  hash: "hash-a",
  meanLuminance: 0.5,
  contrast: 0.2,
  meanSaturation: 0.3,
  darkPixelRatio: 0.1,
  brightPixelRatio: 0.1,
  edgeEnergy: 0.04,
};

const healthyCoverage = {
  method: "top-connected-sky-color-v2",
  detailRatio: 0.4,
  upperDetailRatio: 0.3,
  skyRatio: 0.2,
  nonSkyRatio: 0.8,
  skyOnly: false,
};

function healthyCapture(state = runtimeState()) {
  return {
    shotId: "SHOT_A",
    imagePath: "shot.png",
    statePath: "shot.state.json",
    consolePath: "shot.console.json",
    beauty: true,
    coverage: healthyCoverage,
    state,
  };
}

test("verifies the live camera against the authored shot pose", () => {
  const matching = evaluateRuntimeShotCameraPose(runtimeState());
  assert.equal(matching.matches, true);

  const mismatching = evaluateRuntimeShotCameraPose(runtimeState({
    view: {
      camera: {
        pos: { x: 12, y: 2, z: 3 },
        yawDeg: 180,
        pitchDeg: 0,
        fovDeg: 70,
      },
    },
  }));
  assert.equal(mismatching.matches, false);
  assert.ok(mismatching.deltas.positionM > 10);
});

test("compares distinct captures at the exact authored camera tolerance", () => {
  const before = healthyCapture();
  const after = healthyCapture();
  const result = compareCapturedShotPair({
    shotId: "SHOT_A",
    shotDefinition: { id: "SHOT_A", acceptance: {} },
    beforeCapture: before,
    afterCapture: after,
    beforeMetrics: healthyMetrics,
    afterMetrics: { ...healthyMetrics, hash: "hash-b", contrast: 0.21 },
    diff: { changedPixelRatio: 0.1 },
  });
  assert.equal(result.passed, true, result.findings.map((finding) => finding.code).join(" | "));
  assert.deepEqual(result.cameraTolerance, {
    positionM: 0.02,
    angleDeg: 0.25,
    fovDeg: 0.05,
  });

  const identical = compareCapturedShotPair({
    shotId: "SHOT_A",
    shotDefinition: { id: "SHOT_A", acceptance: {} },
    beforeCapture: before,
    afterCapture: after,
    beforeMetrics: healthyMetrics,
    afterMetrics: healthyMetrics,
    diff: { changedPixelRatio: 0 },
  });
  assert.equal(identical.passed, false);
  assert.ok(identical.findings.some((finding) => finding.code === "identical-images"));
});

test("parses canonical and backward-compatible structured acceptance", () => {
  const acceptance = parseShotAcceptance({
    acceptance: {
      requiredTags: ["Spice Street"],
      forbiddenSceneTags: ["sealed_perimeter"],
      assetModes: { floors: "pbr", propVisuals: ["bazaar"] },
      screenCoverage: {
        nonSkyRatio: { min: 0.4, max: 1 },
        maxSkyRatio: 0.6,
      },
      cameraTolerances: { positionM: 0.1, angleDeg: 1, fovDeg: 0.5 },
      expectedCameraZoneId: "COURT",
      visualTelemetry: {
        required: true,
        forbiddenRepresentations: ["procedural-proxy"],
        forbiddenArtifactTags: ["floor-gap"],
        requiredVisibleAssets: [
          {
            placementId: "COVER_A",
            assetId: "ASSET_CRATE",
            representations: ["model"],
            maxGroundingGapM: 0.03,
            screenAreaRatio: { min: 0.1, max: 0.4 },
            dimensionsM: { width: { min: 1, max: 2 } },
          },
        ],
      },
    },
  });

  assert.deepEqual(acceptance.requiredSceneTags, ["spice-street"]);
  assert.deepEqual(acceptance.forbiddenSceneTags, ["sealed-perimeter"]);
  assert.deepEqual(acceptance.expectedAssetModes, { floor: ["pbr"], props: ["bazaar"] });
  assert.deepEqual(acceptance.screenCoverage.nonSkyRatio, { min: 0.4, max: 1 });
  assert.equal(acceptance.screenCoverage.skyRatio.max, 0.6);
  assert.deepEqual(acceptance.cameraTolerance, { positionM: 0.1, angleDeg: 1, fovDeg: 0.5 });
  assert.equal(acceptance.expectedCameraZoneId, "COURT");
  assert.equal(acceptance.visualTelemetry.required, true);
  assert.equal(acceptance.visualTelemetry.requiredVisibleAssets[0].assetId, "ASSET_CRATE");
  assert.deepEqual(acceptance.errors, []);
});

test("rejects missing tags, forbidden tags, asset mismatch, and console warnings", () => {
  const capture = healthyCapture();
  const summary = summarizeCapturedShot(capture, healthyMetrics, {
    errorCount: 0,
    warningCount: 1,
    total: 1,
  }, {
    shotDefinition: {
      acceptance: {
        requiredSceneTags: ["missing-stall"],
        forbiddenSceneTags: ["awning"],
        expectedAssetModes: { props: "blockout" },
      },
    },
  });

  assert.equal(summary.passed, false);
  assert.deepEqual(
    new Set(summary.findings.map((finding) => finding.code)),
    new Set([
      "console-warnings",
      "required-scene-tags-missing",
      "forbidden-scene-tags-visible",
      "asset-mode-mismatch",
    ]),
  );
});

function validShotInventory() {
  const shots = Array.from({ length: 22 }, (_, index) => ({
    id: `SHOT_${String(index + 1).padStart(2, "0")}_TEST`,
    captureKind: index < 12 ? "core" : index < 16 ? "closeup" : "audit",
    camera: {
      pos: { x: index, y: 2, z: 3 },
      lookAt: { x: index, y: 2, z: 4 },
      fovDeg: 70,
    },
  }));
  return {
    metadata: {
      shotCount: 22,
      coreShotCount: 12,
      closeupShotCount: 4,
      compareShotId: shots[1].id,
    },
    aliases: { compare: shots[1].id },
    shots,
  };
}

test("selects the exact authored inventory and rejects synthetic compare substitution", () => {
  const shotsSpec = validShotInventory();
  const inventory = validateReviewShotInventory(shotsSpec);
  assert.equal(inventory.passed, true);
  assert.deepEqual(selectReviewShotIds(shotsSpec), inventory.reviewShotIds);
  assert.deepEqual(selectReviewShotIds(shotsSpec, { captureKinds: ["closeup"] }), inventory.closeupShotIds);

  const substituted = structuredClone(shotsSpec);
  substituted.shots[0].id = "SHOT_BLOCKOUT_COMPARE";
  const invalid = validateReviewShotInventory(substituted);
  assert.equal(invalid.passed, false);
  assert.match(invalid.errors.join(" | "), /SHOT_BLOCKOUT_COMPARE/);

  const duplicateView = structuredClone(shotsSpec);
  duplicateView.shots[15].camera = structuredClone(duplicateView.shots[0].camera);
  const duplicateInventory = validateReviewShotInventory(duplicateView);
  assert.equal(duplicateInventory.passed, false);
  assert.deepEqual(duplicateInventory.duplicateCameraPairs, [[duplicateView.shots[0].id, duplicateView.shots[15].id]]);
});

test("keeps audit shots outside signoff selection and exposes them only when explicitly selected", () => {
  const shotsSpec = validShotInventory();
  const inventory = validateReviewShotInventory(shotsSpec);
  assert.equal(inventory.passed, true, inventory.errors.join(" | "));
  assert.equal(inventory.allShotIds.length, 22);
  assert.equal(inventory.reviewShotIds.length, 16);
  assert.deepEqual(
    inventory.auditShotIds,
    ["SHOT_17_TEST", "SHOT_18_TEST", "SHOT_19_TEST", "SHOT_20_TEST", "SHOT_21_TEST", "SHOT_22_TEST"],
  );
  assert.deepEqual(selectReviewShotIds(shotsSpec), inventory.reviewShotIds);
  assert.deepEqual(
    selectReviewShotIds(shotsSpec, { captureKinds: ["audit"] }),
    inventory.auditShotIds,
  );

  shotsSpec.shots[21].captureKind = "diagnostic";
  const unsupported = validateReviewShotInventory(shotsSpec);
  assert.equal(unsupported.passed, false);
  assert.match(unsupported.errors.join(" | "), /missing\/unsupported captureKind/);
});

test("authored closeup cameras frame the Spice door/window and canopy attachment without weakening acceptance", async () => {
  const shotsUrl = new URL("../../../../docs/map-design/shots.json", import.meta.url);
  const shotsSpec = JSON.parse(await readFile(shotsUrl, "utf8"));
  const inventory = validateReviewShotInventory(shotsSpec);
  assert.equal(inventory.passed, true, inventory.errors.join(" | "));
  assert.equal(inventory.coreShotIds.length, 12);
  assert.equal(inventory.closeupShotIds.length, 4);

  const byId = new Map(shotsSpec.shots.map((shot) => [shot.id, shot]));
  const spice = byId.get("SHOT_11_SPICE_CANOPY");
  assert.deepEqual(
    spice.acceptance.visualTelemetry.requiredVisibleAssets.map((asset) => asset.assetId),
    ["ASSET_CLOTH_CANOPY", "ASSET_MARKET_STALL", "ASSET_CC0_SPICE_SACK", "ASSET_CC0_BRASS_POT"],
  );
  const facade = byId.get("SHOT_13_CLOSEUP_MERCHANT_FACADE");
  assert.equal(facade.expectedCameraZoneId, "SPICE_STREET");
  assert.deepEqual(facade.camera, {
    pos: { x: 25.2, y: 18.5, z: 1.55 },
    lookAt: { x: 21.1, y: 21.8, z: 2.2 },
    fovDeg: 52,
  });
  assert.deepEqual(
    facade.acceptance.visualTelemetry.requiredVisibleAssets.map((asset) => [asset.moduleId, asset.screenAreaRatio.min]),
    [
      ["window_shuttered", 0.04],
      ["door_shop_timber", 0.03],
      ["window_shuttered_dark", 0.015],
      ["shop_recess_market", 0.03],
    ],
  );

  const grounding = byId.get("SHOT_14_CLOSEUP_PROP_GROUNDING");
  assert.deepEqual(grounding.camera, {
    pos: { x: 25.5, y: 28, z: 1.25 },
    lookAt: { x: 23, y: 27.6, z: 0.55 },
    fovDeg: 50,
  });
  assert.equal(grounding.acceptance.visualTelemetry.requiredVisibleAssets[0].screenAreaRatio.min, 0.08);

  const canopy = byId.get("SHOT_15_CLOSEUP_CANOPY_ATTACHMENT");
  assert.equal(canopy.expectedCameraZoneId, "SPICE_STREET");
  assert.deepEqual(canopy.camera, {
    pos: { x: 25.2, y: 18.2, z: 3 },
    lookAt: { x: 21.05, y: 20.2, z: 5.4 },
    fovDeg: 50,
  });
  assert.deepEqual(
    canopy.acceptance.visualTelemetry.requiredVisibleAssets.map((asset) => [asset.moduleId, asset.screenAreaRatio.min]),
    [["bazaar_cloth_canopy", 0.01], ["canopy_wall_ring", 0.004]],
  );
});

test("rejects duplicate captured images, viewpoints, and authored inventory order", () => {
  const baseSummary = {
    shotId: "SHOT_A",
    findings: [],
    passed: true,
    metrics: { hash: "same-hash" },
    camera: evaluateRuntimeShotCameraPose(runtimeState()),
  };
  const aggregate = aggregateShotReviews([
    baseSummary,
    { ...baseSummary, shotId: "SHOT_B" },
  ], { expectedShotIds: ["SHOT_B", "SHOT_A"] });
  assert.equal(aggregate.passed, false);
  assert.deepEqual(aggregate.duplicateImages, [["SHOT_A", "SHOT_B"]]);
  assert.deepEqual(aggregate.duplicateViewpoints, [["SHOT_A", "SHOT_B"]]);
  assert.ok(aggregate.aggregateFindings.some((finding) => finding.code === "captured-shot-inventory-mismatch"));
});

const telemetryAcceptance = {
  expectedCameraZoneId: "COURT",
  visualTelemetry: {
    required: true,
    forbiddenRepresentations: ["procedural-proxy", "placeholder"],
    forbiddenArtifactTags: ["floor-gap", "exposed-shell"],
    requiredVisibleAssets: [
      {
        placementId: "COVER_A",
        assetId: "ASSET_CRATE",
        semanticClass: "gameplay-cover",
        representations: ["model"],
        materialModes: ["pbr"],
        shadowModes: ["cast_receive"],
        maxGroundingGapM: 0.03,
        screenAreaRatio: { min: 0.1, max: 0.4 },
        dimensionsM: {
          width: { min: 1, max: 2 },
          depth: { min: 0.5, max: 1.5 },
          height: { min: 0.8, max: 1.5 },
        },
      },
    ],
  },
};

function telemetrySummary(state) {
  return summarizeCapturedShot(healthyCapture(state), healthyMetrics, {
    errorCount: 0,
    warningCount: 0,
    total: 0,
  }, { shotDefinition: { acceptance: telemetryAcceptance } });
}

const visualDefectFixtures = [
  {
    name: "proxy/model duplication",
    code: "duplicate-representation",
    mutate(state) {
      state.render.visibleAssets.push({
        ...state.render.visibleAssets[0],
        representation: "procedural-proxy",
      });
    },
  },
  {
    name: "forbidden proxy",
    code: "forbidden-representation-visible",
    mutate(state) {
      state.render.visibleAssets[0].representation = "procedural-proxy";
    },
  },
  {
    name: "floor or shell artifact",
    code: "forbidden-artifact-visible",
    mutate(state) {
      state.render.artifactTags = ["floor-gap", "exposed-shell"];
    },
  },
  {
    name: "floating prop",
    code: "required-asset-grounding-gap",
    mutate(state) {
      state.render.visibleAssets[0].groundingGapM = 0.2;
    },
  },
  {
    name: "absurd dimensions",
    code: "required-asset-dimensions",
    mutate(state) {
      state.render.visibleAssets[0].dimensionsM.width = 9;
    },
  },
  {
    name: "occluded asset reported as visible",
    code: "visible-asset-telemetry-invalid",
    mutate(state) {
      state.render.visibleAssets[0].occluded = true;
    },
  },
  {
    name: "asset outside required screen area",
    code: "required-asset-screen-area",
    mutate(state) {
      state.render.visibleAssets[0].screenAreaRatio = 0.001;
    },
  },
  {
    name: "wrong material",
    code: "required-asset-material-mismatch",
    mutate(state) {
      state.render.visibleAssets[0].materialMode = "debug";
    },
  },
  {
    name: "wrong shadow policy",
    code: "required-asset-shadow-mismatch",
    mutate(state) {
      state.render.visibleAssets[0].shadowMode = "none";
    },
  },
  {
    name: "wrong asset identity",
    code: "required-visible-asset-missing",
    mutate(state) {
      state.render.visibleAssets[0].assetId = "ASSET_POT";
    },
  },
  {
    name: "wrong camera zone",
    code: "camera-zone-mismatch",
    mutate(state) {
      state.shot.cameraZoneId = "SPAWN_A";
    },
  },
];

for (const fixture of visualDefectFixtures) {
  test(`visual defect fixture fails: ${fixture.name}`, () => {
    const state = runtimeState();
    fixture.mutate(state);
    const summary = telemetrySummary(state);
    assert.equal(summary.passed, false);
    assert.ok(summary.findings.some((finding) => finding.code === fixture.code));
  });
}

test("requires actual visible-asset and artifact telemetry", () => {
  const state = runtimeState({
    render: { warnings: [], visibleSceneTags: ["spice-street"] },
  });
  const summary = telemetrySummary(state);
  assert.equal(summary.passed, false);
  assert.ok(summary.findings.some((finding) => finding.code === "visual-telemetry-missing"));
});

test("merges global visual acceptance without allowing automation to approve", () => {
  const shotsSpec = {
    metadata: {
      acceptanceDefaults: {
        visualTelemetry: {
          required: true,
          forbiddenArtifactTags: ["floor-gap"],
        },
      },
      humanReviewPolicy: {
        status: "APPROVED",
        approvalAuthority: "human",
        automatedApprovalAllowed: false,
        minimumCategoryScore: 4,
        categories: [{ id: "architecture", label: "Architecture" }],
      },
    },
    shots: [{ id: "SHOT_A", acceptance: { visualTelemetry: { forbiddenRepresentations: ["placeholder"] } } }],
  };
  const resolved = resolveShotDefinition(shotsSpec, "SHOT_A");
  assert.equal(resolved.acceptance.visualTelemetry.required, true);
  assert.deepEqual(resolved.acceptance.visualTelemetry.forbiddenArtifactTags, ["floor-gap"]);
  assert.deepEqual(resolved.acceptance.visualTelemetry.forbiddenRepresentations, ["placeholder"]);

  const human = parseHumanReviewPolicy(shotsSpec);
  assert.equal(human.approved, false);
  assert.equal(human.complete, false);
});

test("measures sky from top-connected pixels rather than inverse scene detail", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "clawdstrike-sky-"));
  const imagePath = path.join(dir, "half-sky.png");
  try {
    const width = 240;
    const height = 150;
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 3;
        const color = y < height / 2 ? [168, 194, 218] : [133, 93, 49];
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
      }
    }
    await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(imagePath);
    const coverage = await readScreenshotCoverage(imagePath);
    assert.equal(coverage.method, "top-connected-sky-color-v2");
    assert.ok(coverage.skyRatio > 0.45 && coverage.skyRatio < 0.55, `skyRatio=${coverage.skyRatio}`);
    assert.equal(coverage.skyOnly, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

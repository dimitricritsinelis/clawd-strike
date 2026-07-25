import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_MAP_ID,
  captureShotSet,
  closeBrowserResources,
  evaluateRuntimeState,
  launchBrowserProcess,
  loadShotsSpec,
  validateReviewShotInventory,
  writeJson,
} from "./lib/runtimePlaywright.mjs";
import {
  aggregateShotReviews,
  resolveShotDefinition,
  summarizeCapturedShot,
} from "./lib/shotReview.mjs";
import { readPngMetrics, comparePngMetrics } from "./lib/imageMetrics.mjs";
import { assertGeneratedMapsFresh } from "./lib/generatedMapCheck.mjs";
import { startQaServer } from "./lib/qaServer.mjs";
import {
  CELL_SUMMARY_SCHEMA_VERSION,
  NO_CHANGE_IMAGE_DRIFT,
  auditRenderedIntersections,
  cellExitCode,
  createBlindMapping,
  createContactSheet,
  evaluateCellPerformance,
  evaluateCellTags,
  loadCellConfiguration,
  parseCellArgs,
  persistCellArtifacts,
  readBaselinePointer,
  writeBaselinePointer,
} from "./lib/mapCellQa.mjs";

const CLIENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE_ROOT = path.resolve(CLIENT_ROOT, "../..");
const CELLS_PATH = path.join(WORKSPACE_ROOT, "docs/map-design/cells.json");
const SHOTS_PATH = path.join(WORKSPACE_ROOT, "docs/map-design/shots.json");

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function metricDelta(baseline, candidate) {
  const keys = ["meanLuminance", "contrast", "meanSaturation", "edgeEnergy"];
  return Object.fromEntries(keys.map((key) => [
    key,
    {
      baseline: baseline[key],
      candidate: candidate[key],
      delta: candidate[key] - baseline[key],
    },
  ]));
}

async function summarizeCaptures(captures, shotsById) {
  const summaries = [];
  for (const capture of captures) {
    if (capture.failed) {
      summaries.push({
        shotId: capture.shotId,
        passed: false,
        imagePath: capture.imagePath,
        statePath: capture.statePath,
        consolePath: capture.consolePath,
        geometryPath: capture.additionalState?.geometryPath ?? null,
        metrics: null,
        findings: [{
          severity: "error",
          code: "shot-capture-failed",
          message: capture.failure?.error?.message ?? "Shot capture failed",
        }],
      });
      continue;
    }
    const metrics = await readPngMetrics(capture.imagePath);
    const consolePayload = JSON.parse(await readFile(capture.consolePath, "utf8"));
    summaries.push({
      ...summarizeCapturedShot(capture, metrics, consolePayload.counts, {
        minScore: 80,
        shotDefinition: shotsById.get(capture.shotId),
      }),
      imagePath: capture.imagePath,
      statePath: capture.statePath,
      consolePath: capture.consolePath,
      geometryPath: capture.additionalState?.geometryPath ?? null,
      metrics,
      camera: capture.state?.view?.camera ?? null,
      performance: capture.state?.perf ?? null,
      bootReadyMs: capture.evidence?.runtimeBootReadyMs ?? null,
    });
  }
  return summaries;
}

async function createComparisonArtifacts(summary, baseline, outputDir) {
  const comparisonsDir = path.join(outputDir, "comparisons");
  const hiddenDir = path.join(outputDir, "hidden");
  const blindDir = path.join(comparisonsDir, "blind");
  const mapping = createBlindMapping(summary.shotIds);
  const shots = [];

  for (const shotId of summary.shotIds) {
    const baselineShot = baseline.shots.find((shot) => shot.shotId === shotId);
    const candidateShot = summary.shots.find((shot) => shot.shotId === shotId);
    if (!baselineShot || !candidateShot) throw new Error(`[qa:cell] comparison is missing '${shotId}'`);
    const baselineMetrics = baselineShot.metrics ?? await readPngMetrics(baselineShot.imagePath);
    const candidateMetrics = candidateShot.metrics ?? await readPngMetrics(candidateShot.imagePath);
    const diff = await comparePngMetrics(baselineShot.imagePath, candidateShot.imagePath);
    const safeId = shotId.replaceAll(/[^a-zA-Z0-9_-]+/g, "-");
    const pairPath = path.join(comparisonsDir, `${safeId}-baseline-candidate.png`);
    const blindPath = path.join(blindDir, `${safeId}-blind-ab.png`);
    await createContactSheet([
      { imagePath: baselineShot.imagePath, label: `${shotId} — BASELINE` },
      { imagePath: candidateShot.imagePath, label: `${shotId} — CANDIDATE` },
    ], pairPath, { columns: 2 });
    const byRole = { baseline: baselineShot.imagePath, candidate: candidateShot.imagePath };
    await createContactSheet([
      { imagePath: byRole[mapping[shotId].A], label: `${shotId} — A` },
      { imagePath: byRole[mapping[shotId].B], label: `${shotId} — B` },
    ], blindPath, { columns: 2 });
    const deterministic = (
      diff.meanAbsLuminanceDiff <= NO_CHANGE_IMAGE_DRIFT.meanAbsLuminanceDiff
      && diff.changedPixelRatio <= NO_CHANGE_IMAGE_DRIFT.changedPixelRatio
    );
    shots.push({
      shotId,
      pairPath,
      blindPath,
      baselineHash: baselineMetrics.hash,
      candidateHash: candidateMetrics.hash,
      pixelDiff: diff,
      metricChanges: metricDelta(baselineMetrics, candidateMetrics),
      deterministic,
      passed: deterministic,
    });
  }

  await writeJson(path.join(hiddenDir, "blind-mapping.json"), {
    cellId: summary.cellId,
    createdAt: new Date().toISOString(),
    mapping,
  });
  return {
    passed: shots.every((shot) => shot.passed),
    baselineArtifactDir: baseline.outputDir,
    blindSheetDir: blindDir,
    hiddenMappingStored: true,
    driftLimits: NO_CHANGE_IMAGE_DRIFT,
    shots,
    performanceChanges: {
      drawCalls: summary.performance.desktop.drawCalls - baseline.performance.desktop.drawCalls,
      triangles: summary.performance.desktop.triangles - baseline.performance.desktop.triangles,
      medianFrameMs: summary.performance.desktop.medianFrameMs - baseline.performance.desktop.medianFrameMs,
      bootReadyMs: summary.performance.desktop.bootReadyMs - baseline.performance.desktop.bootReadyMs,
    },
  };
}

export async function runCellQa(argv, dependencies = {}) {
  const args = parseCellArgs(argv);
  const artifactRoot = dependencies.artifactRoot
    ?? path.join(WORKSPACE_ROOT, "artifacts/playwright/map-cells");
  const outputDir = path.join(artifactRoot, args.cellId, timestampId());
  const pointerPath = path.join(artifactRoot, args.cellId, "baseline.json");
  const { cell } = await loadCellConfiguration({
    cellsPath: dependencies.cellsPath ?? CELLS_PATH,
    shotsPath: dependencies.shotsPath ?? SHOTS_PATH,
    cellId: args.cellId,
  });
  let retainedBaseline = null;
  if (args.mode === "compare") {
    retainedBaseline = await readBaselinePointer(pointerPath, args.cellId);
  }

  const summary = {
    schemaVersion: CELL_SUMMARY_SCHEMA_VERSION,
    cellId: cell.id,
    label: cell.label,
    mode: args.mode,
    outputDir,
    shotIds: cell.shotIds,
    references: cell.references,
    hardChecks: cell.hardChecks,
    lockedSystems: cell.lockedSystems,
    requiredSemanticChecks: cell.requiredSemanticChecks,
    humanVisualApproval: "NOT_APPROVED",
    automatedAestheticApproval: false,
    currentStage: "initializing",
    failedStage: null,
    failed: false,
    passed: false,
    startedAt: new Date().toISOString(),
    shots: [],
    diagnostics: [],
  };
  await persistCellArtifacts(summary);

  const startServer = dependencies.startServer ?? (() => startQaServer({
    root: CLIENT_ROOT,
    profile: "cell-review",
  }));
  const launchBrowser = dependencies.launchBrowser ?? (() => launchBrowserProcess({ headless: true }));
  const closeBrowser = dependencies.closeBrowser ?? closeBrowserResources;
  let server = null;
  let browser = null;
  let runError = null;

  const failStage = (stage, error) => {
    summary.failed = true;
    summary.failedStage ??= stage;
    summary.diagnostics.push({
      stage,
      at: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });
  };

  try {
    summary.currentStage = "generation-current";
    summary.generationCheck = await (dependencies.assertGeneratedMapsFresh ?? assertGeneratedMapsFresh)();
    await persistCellArtifacts(summary);
    server = await startServer();
    summary.currentStage = "server-ready";
    summary.baseUrl = server.baseUrl;
    summary.sourceState = {
      ...server.fingerprint,
      cellConfiguration: {
        path: path.relative(WORKSPACE_ROOT, dependencies.cellsPath ?? CELLS_PATH),
        sha256: await sha256(dependencies.cellsPath ?? CELLS_PATH),
      },
    };
    await persistCellArtifacts(summary);

    const runtimeShotsSpec = await (dependencies.loadShotsSpec ?? loadShotsSpec)(server.baseUrl, DEFAULT_MAP_ID);
    const inventory = validateReviewShotInventory(runtimeShotsSpec);
    if (!inventory.passed) throw new Error(`[qa:cell] invalid authored shot inventory: ${inventory.errors.join(" | ")}`);
    for (const shotId of cell.shotIds) {
      if (!inventory.allShotIds.includes(shotId)) throw new Error(`[qa:cell] runtime is missing '${shotId}'`);
    }
    const shotsById = new Map(cell.shotIds.map((shotId) => [
      shotId,
      resolveShotDefinition(runtimeShotsSpec, shotId),
    ]));

    browser = await launchBrowser();
    summary.currentStage = "capturing";
    await persistCellArtifacts(summary);
    const captures = await (dependencies.captureShotSet ?? captureShotSet)(browser, {
      baseUrl: server.baseUrl,
      mapId: DEFAULT_MAP_ID,
      outputDir: path.join(outputDir, "shots"),
      shotIds: cell.shotIds,
      diagnosticMode: false,
      shotDefinitions: shotsById,
      authoredShotIds: inventory.allShotIds,
      captureAdditionalState: async ({ page, shotId, shotDir }) => {
        const geometry = await evaluateRuntimeState(
          page,
          () => window.__qa_visual_geometry_state?.() ?? null,
          undefined,
          {
            operation: "cell-rendered-geometry-audit",
            shotId,
            artifactDir: shotDir,
          },
        );
        if (!geometry || geometry.schemaVersion !== 1) {
          throw new Error(`[qa:cell] rendered geometry state is unavailable for '${shotId}'`);
        }
        const geometryPath = path.join(shotDir, "geometry.json");
        await writeJson(geometryPath, geometry);
        return { geometryPath, geometry };
      },
    });
    summary.shots = await summarizeCaptures(captures, shotsById);
    summary.shotAggregate = aggregateShotReviews(summary.shots, {
      minScore: 80,
      expectedShotIds: cell.shotIds,
    });
    summary.console = {
      passed: captures.every((capture) => capture.state && capture.state.render && (
        summary.shots.find((shot) => shot.shotId === capture.shotId)?.console?.errorCount ?? 0
      ) === 0),
      errorCount: summary.shots.reduce((sum, shot) => sum + (shot.console?.errorCount ?? 0), 0),
    };
    summary.cameras = {
      passed: captures.every((capture) => capture.failed !== true && capture.state?.shot?.id === capture.shotId),
      shotIds: captures.map((capture) => capture.state?.shot?.id ?? null),
    };
    summary.qaTags = evaluateCellTags(captures, cell);
    const geometryByShot = Object.fromEntries(captures.map((capture) => [
      capture.shotId,
      capture.additionalState?.geometry ?? null,
    ]));
    summary.intersections = auditRenderedIntersections(geometryByShot, cell);
    summary.performance = evaluateCellPerformance(captures.map((capture) => capture.state));

    const contactSheetPath = path.join(outputDir, "cell-contact-sheet.png");
    await createContactSheet(summary.shots.map((shot) => ({
      imagePath: shot.imagePath,
      label: shot.shotId,
    })), contactSheetPath, { columns: 2 });
    const referenceContactSheetPath = path.join(outputDir, "reference-contact-sheet.png");
    await createContactSheet(cell.references.map((reference) => ({
      imagePath: path.join(WORKSPACE_ROOT, reference.path),
      label: `${path.basename(reference.path)} — ${reference.role}`,
    })), referenceContactSheetPath, { columns: 2 });
    summary.artifacts = { contactSheetPath, referenceContactSheetPath };

    if (args.mode === "compare") {
      summary.comparison = await createComparisonArtifacts(
        summary,
        retainedBaseline.summary,
        outputDir,
      );
    }
    summary.currentStage = "hard-checks";
    summary.passed = (
      summary.shotAggregate.passed
      && summary.console.passed
      && summary.cameras.passed
      && summary.qaTags.passed
      && summary.intersections.passed
      && summary.performance.passed
      && (args.mode !== "compare" || summary.comparison.passed)
    );
    summary.failed = !summary.passed;
    if (!summary.passed) summary.failedStage = "hard-checks";
  } catch (error) {
    runError = error;
    failStage(summary.currentStage, error);
  } finally {
    if (browser) {
      await closeBrowser({ browser }).catch((error) => {
        failStage("browser-cleanup", error);
        runError ??= error;
      });
    }
    if (server) {
      await server.close().catch((error) => {
        failStage("server-cleanup", error);
        runError ??= error;
      });
    }
    summary.finishedAt = new Date().toISOString();
    summary.currentStage = "finished";
    summary.failed = summary.failed === true || runError !== null;
    summary.passed = summary.passed === true && !summary.failed;
    if (runError) summary.failure = runError instanceof Error ? runError.message : String(runError);
    await persistCellArtifacts(summary);
  }

  if (args.mode === "baseline" && summary.passed) {
    summary.baselinePointer = await writeBaselinePointer(pointerPath, summary);
    await persistCellArtifacts(summary);
  }
  if (summary.passed) {
    console.log(`[qa:cell] pass | cell=${cell.id} | mode=${args.mode} | output=${outputDir}`);
  } else {
    console.error(`[qa:cell] fail | cell=${cell.id} | stage=${summary.failedStage ?? "unknown"} | output=${outputDir}`);
  }
  return cellExitCode(summary);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await runCellQa(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    return 1;
  });
}

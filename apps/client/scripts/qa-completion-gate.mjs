import path from "node:path";
import { readPngMetrics } from "./lib/imageMetrics.mjs";
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_MAP_ID,
  SHIP_QA_SEARCH_PARAMS,
  assertQaNetworkTexturePolicy,
  attachConsoleRecorder,
  attachNetworkRecorder,
  captureRuntimeSnapshot,
  closeBrowserResources,
  ensureDir,
  gotoAgentRuntime,
  gotoHumanShot,
  launchBrowserProcess,
  loadShotsSpec,
  parseBooleanEnv,
  readQaPerformanceState,
  readScreenshotCoverage,
  readRuntimeState,
  renderRuntimeFrame,
  runAgentRoute,
  sanitizeFileSegment,
  selectReviewShotIds,
  shotQaTargetSelectors,
  startTracing,
  stopTracing,
  trimAgentName,
  validateReviewShotInventory,
  withTimeout,
  writeJson,
} from "./lib/runtimePlaywright.mjs";
import { resolveCompletionRoutes } from "./lib/traversalRoutes.mjs";
import {
  aggregateShotReviews,
  parseHumanReviewPolicy,
  resolveShotDefinition,
  summarizeCapturedShot,
} from "./lib/shotReview.mjs";
import { evaluateBazaarPerformance, summarizePerformanceSamples } from "./lib/performanceAcceptance.mjs";
import { persistCompletionArtifacts } from "./lib/completionArtifacts.mjs";
import { startQaServer } from "./lib/qaServer.mjs";
import { assertGeneratedMapsFresh } from "./lib/generatedMapCheck.mjs";
import { installSignalCleanup } from "./lib/childLifecycle.mjs";

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function summarizeRoute(route, routeSummary, startState, endState, consoleCounts) {
  const findings = [];
  const eyeHeightM = (state) => {
    const cameraY = state?.view?.camera?.pos?.y;
    const playerY = state?.player?.pos?.y;
    return typeof cameraY === "number" && typeof playerY === "number" ? cameraY - playerY : null;
  };
  const startEyeHeightM = eyeHeightM(startState);
  const endEyeHeightM = eyeHeightM(endState);

  if (routeSummary.distanceM < route.expectedMinDistanceM) {
    findings.push({
      severity: "error",
      code: "short-traversal",
      message: `Route moved ${routeSummary.distanceM.toFixed(2)}m (expected >= ${route.expectedMinDistanceM.toFixed(2)}m).`,
    });
  }
  if (routeSummary.maxStationaryTicks > route.maxStationaryTicks) {
    findings.push({
      severity: "error",
      code: "stalled",
      message: `Route stalled for ${routeSummary.maxStationaryTicks} ticks (allowed ${route.maxStationaryTicks}).`,
    });
  }
  if (!routeSummary.withinPlayableBounds) {
    findings.push({ severity: "error", code: "out-of-bounds", message: "Route ended outside playable bounds." });
  }
  if (!routeSummary.endedAlive) {
    findings.push({ severity: "error", code: "dead-end-state", message: "Route ended in a dead gameplay state." });
  }
  for (const [label, value] of [["start", startEyeHeightM], ["final", endEyeHeightM]]) {
    if (typeof value !== "number" || value < 1.4 || value > 2) {
      findings.push({
        severity: "error",
        code: "non-player-height-capture",
        message: `${label} traversal capture eye height is ${typeof value === "number" ? `${value.toFixed(2)}m` : "unavailable"}; expected 1.4..2.0m above the player's feet.`,
      });
    }
  }
  if ((endState.render?.warnings?.length ?? 0) > 0) {
    findings.push({
      severity: "warn",
      code: "runtime-warnings",
      message: `Runtime warnings present after route: ${endState.render.warnings.join(" | ")}`,
    });
  }
  if (consoleCounts.errorCount > 0) {
    findings.push({
      severity: "error",
      code: "console-errors",
      message: `Route emitted ${consoleCounts.errorCount} console/page errors.`,
    });
  }
  if (consoleCounts.warningCount > 0) {
    findings.push({
      severity: "warn",
      code: "console-warnings",
      message: `Route emitted ${consoleCounts.warningCount} warnings.`,
    });
  }

  return {
    routeId: route.id,
    label: route.label,
    spawn: route.spawn,
    startZoneId: startState.player?.zoneId ?? null,
    endZoneId: endState.player?.zoneId ?? null,
    console: consoleCounts,
    captureKind: "player-height-traversal",
    eyeHeightM: { start: startEyeHeightM, final: endEyeHeightM },
    findings,
    passed: findings.every((finding) => finding.severity !== "error"),
    ...routeSummary,
  };
}

function aggregateRouteResults(routes) {
  const severityCounts = { error: 0, warn: 0 };
  const failingRoutes = [];
  const routesWithFindings = [];
  for (const route of routes) {
    if ((route.findings?.length ?? 0) > 0) routesWithFindings.push(route.routeId);
    if (!route.passed) failingRoutes.push(route.routeId);
    for (const finding of route.findings ?? []) {
      if (finding.severity === "error") severityCounts.error += 1;
      if (finding.severity === "warn") severityCounts.warn += 1;
    }
  }
  return {
    passed: failingRoutes.length === 0,
    totalRoutes: routes.length,
    totalFindings: severityCounts.error + severityCounts.warn,
    severityCounts,
    failingRoutes,
    routesWithFindings,
  };
}

function optionalPositiveNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function collectPerformanceSamples(page, count = 7, artifactDir) {
  const states = [];
  for (let index = 0; index < count; index += 1) {
    await renderRuntimeFrame(page);
    await page.waitForTimeout(50);
    const state = await readQaPerformanceState(page, {
      operation: `performance-sample-${index + 1}`,
      artifactDir,
    });
    states.push(state ?? await readRuntimeState(page, {
      operation: `performance-fallback-sample-${index + 1}`,
      artifactDir,
    }));
  }
  return summarizePerformanceSamples(states);
}

const MAP_ID = (process.env.MAP_ID ?? DEFAULT_MAP_ID).trim() || DEFAULT_MAP_ID;
const AGENT_NAME = trimAgentName(process.env.AGENT_NAME, DEFAULT_AGENT_NAME);
const HEADLESS = parseBooleanEnv(process.env.HEADLESS, true);
const CAPTURE_TRACE = parseBooleanEnv(process.env.CAPTURE_TRACE, false);
const MIN_SHOT_SCORE = Math.max(0, Math.min(100, Number(process.env.MIN_SHOT_SCORE ?? 80)));
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.OUTPUT_DIR ?? `../../artifacts/playwright/completion-gate/${timestampId()}`,
);
const STABLE_DIR = path.resolve(process.cwd(), "../../artifacts/playwright/completion-gate");

await ensureDir(OUTPUT_DIR);
await ensureDir(STABLE_DIR);

const summary = {
  baseUrl: null,
  mapId: MAP_ID,
  agentName: AGENT_NAME,
  headless: HEADLESS,
  selectedShotIds: [],
  inventory: null,
  serverIdentity: null,
  humanReview: null,
  outputDir: OUTPUT_DIR,
  startedAt: new Date().toISOString(),
  currentStage: "initializing",
  failedStage: null,
  failed: false,
  diagnostics: [],
  traversalProfile: "final",
  functional: { routes: [] },
  visual: { minShotScore: MIN_SHOT_SCORE, shots: [] },
  performance: null,
};

let server = null;
let browser = null;
let gateError = null;
let resourceCleanupPromise = null;
const persist = async (stage) => {
  summary.currentStage = stage;
  await persistCompletionArtifacts(summary, { outputDir: OUTPUT_DIR, stableDir: STABLE_DIR });
};
const noteFailure = (stage, error, diagnostics = null) => {
  summary.failed = true;
  summary.failedStage ??= stage;
  summary.diagnostics.push({
    stage,
    failedAt: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    ...(diagnostics ? { diagnostics } : {}),
  });
};
const cleanupResources = () => {
  resourceCleanupPromise ??= (async () => {
    const failures = [];
    const browserToClose = browser;
    const serverToClose = server;
    browser = null;
    server = null;
    if (browserToClose) {
      await closeBrowserResources({ browser: browserToClose }).catch((error) => {
        failures.push({ stage: "browser-cleanup", error });
      });
    }
    await serverToClose?.close().catch((error) => {
      failures.push({ stage: "server-cleanup", error });
    });
    return failures;
  })();
  return resourceCleanupPromise;
};
const removeSignalCleanup = installSignalCleanup(async (signal) => {
  const failures = await cleanupResources();
  if (failures.length > 0) {
    throw new Error(
      `${signal} resource cleanup failed | ${failures.map(({ stage, error }) => (
        `${stage}: ${error instanceof Error ? error.message : String(error)}`
      )).join(" | ")}`,
    );
  }
});

try {
  await persist("initializing");
  summary.generationCheck = await assertGeneratedMapsFresh();
  await persist("generation-current");
  server = await startQaServer({ profile: "final" });
  summary.baseUrl = server.baseUrl;
  summary.serverIdentity = {
    owned: server.owned,
    runToken: server.runToken,
    fingerprint: server.fingerprint,
  };
  await persist("server-ready");

  const routes = resolveCompletionRoutes();
  const shotsSpec = await loadShotsSpec(server.baseUrl, MAP_ID);
  const inventory = validateReviewShotInventory(shotsSpec);
  summary.inventory = inventory;
  if (!inventory.passed) {
    throw new Error(`[qa:completion] invalid authored shot inventory | ${inventory.errors.join(" | ")}`);
  }
  const selectedShotIds = selectReviewShotIds(shotsSpec);
  summary.selectedShotIds = selectedShotIds;
  const shotsById = new Map(
    selectedShotIds.map((shotId) => [shotId, resolveShotDefinition(shotsSpec, shotId)]),
  );
  summary.humanReview = parseHumanReviewPolicy(shotsSpec);
  await persist("inventory-ready");

  browser = await launchBrowserProcess({ headless: HEADLESS });
  const routesDir = path.join(OUTPUT_DIR, "routes");
  await ensureDir(routesDir);

  for (const route of routes) {
    const stage = `route:${route.id}`;
    const routeDir = path.join(routesDir, route.id);
    await ensureDir(routeDir);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const recorder = attachConsoleRecorder(page);
    if (CAPTURE_TRACE) await startTracing(context);
    try {
      await withTimeout(async () => {
        await gotoAgentRuntime(page, {
          baseUrl: server.baseUrl,
          mapId: MAP_ID,
          agentName: AGENT_NAME,
          spawn: route.spawn,
          routeId: route.id,
          artifactDir: routeDir,
          extraSearchParams: { ...SHIP_QA_SEARCH_PARAMS, unlimitedHealth: 1 },
        });
        const startImage = path.join(routeDir, "start.png");
        const startStatePath = path.join(routeDir, "start.state.json");
        const finalImage = path.join(routeDir, "final.png");
        const finalStatePath = path.join(routeDir, "final.state.json");
        const consolePath = path.join(routeDir, "console.json");
        const startState = await captureRuntimeSnapshot(page, {
          imagePath: startImage,
          statePath: startStatePath,
          routeId: route.id,
          artifactDir: routeDir,
          operation: "route-start-snapshot",
        });
        const routeSummary = await runAgentRoute(page, route, { artifactDir: routeDir });
        const endState = await captureRuntimeSnapshot(page, {
          imagePath: finalImage,
          statePath: finalStatePath,
          routeId: route.id,
          artifactDir: routeDir,
          operation: "route-final-snapshot",
        });
        const consoleCounts = recorder.counts();
        await writeJson(consolePath, { events: recorder.snapshot(), counts: consoleCounts });
        summary.functional.routes.push({
          ...summarizeRoute(route, routeSummary, startState, endState, consoleCounts),
          artifacts: {
            captureKind: "player-height-traversal",
            startImage,
            startState: startStatePath,
            finalImage,
            finalState: finalStatePath,
            console: consolePath,
          },
        });
      }, 90_000, `completion route '${route.id}'`);
    } catch (error) {
      noteFailure(stage, error, routeDir);
      await writeJson(path.join(routeDir, "console.json"), {
        events: recorder.snapshot(),
        counts: recorder.counts(),
      });
      summary.functional.routes.push({
        routeId: route.id,
        label: route.label,
        spawn: route.spawn,
        passed: false,
        findings: [{
          severity: "error",
          code: "route-run-failed",
          message: error instanceof Error ? error.message : String(error),
        }],
      });
    } finally {
      if (CAPTURE_TRACE) await stopTracing(context, path.join(routeDir, "trace.zip")).catch(() => {});
      await closeBrowserResources({ context }).catch((error) => noteFailure(`${stage}:cleanup`, error));
    }
    await persist(stage);
  }

  const shotsDir = path.join(OUTPUT_DIR, "shots");
  await ensureDir(shotsDir);
  for (let index = 0; index < selectedShotIds.length; index += 1) {
    const shotId = selectedShotIds[index];
    const stage = `shot:${shotId}`;
    const fileBase = `${String(index + 1).padStart(2, "0")}-${sanitizeFileSegment(shotId)}`;
    const shotDir = path.join(shotsDir, fileBase);
    await ensureDir(shotDir);
    const imagePath = path.join(shotDir, "capture.png");
    const statePath = path.join(shotDir, "state.json");
    const consolePath = path.join(shotDir, "console.json");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const recorder = attachConsoleRecorder(page);
    const networkRecorder = attachNetworkRecorder(page);
    if (CAPTURE_TRACE) await startTracing(context);
    try {
      await withTimeout(async () => {
        const qaTargets = shotQaTargetSelectors(shotsById.get(shotId));
        const bootStartedAt = Date.now();
        const readyState = await gotoHumanShot(page, {
          baseUrl: server.baseUrl,
          mapId: MAP_ID,
          shot: shotId,
          extraSearchParams: {
            ...SHIP_QA_SEARCH_PARAMS,
            vm: 0,
            ...(qaTargets.length > 0 ? { qaTargets: qaTargets.join(",") } : {}),
          },
          artifactDir: shotDir,
        });
        const bootReadyWallMs = Date.now() - bootStartedAt;
        const captureStartedAt = Date.now();
        const state = await captureRuntimeSnapshot(page, {
          imagePath,
          statePath,
          beauty: true,
          shotId,
          artifactDir: shotDir,
          operation: "completion-shot-camera-verification",
        });
        const captureMs = Date.now() - captureStartedAt;
        const coverage = await readScreenshotCoverage(imagePath);
        const network = await networkRecorder.snapshot();
        assertQaNetworkTexturePolicy(network, page.url());
        const consoleCounts = recorder.counts();
        await writeJson(consolePath, { events: recorder.snapshot(), counts: consoleCounts });
        const metrics = await readPngMetrics(imagePath);
        summary.visual.shots.push({
          ...summarizeCapturedShot(
            { shotId, artifactDir: shotDir, imagePath, statePath, consolePath, state, beauty: true, coverage },
            metrics,
            consoleCounts,
            { minScore: MIN_SHOT_SCORE, shotDefinition: shotsById.get(shotId) ?? null },
          ),
          evidence: {
            bootReadyWallMs,
            runtimeBootReadyMs: readyState.boot?.readyAtMs ?? state.boot?.readyAtMs ?? null,
            captureMs,
            network,
          },
        });
      }, 120_000, `completion shot '${shotId}'`);
    } catch (error) {
      noteFailure(stage, error, shotDir);
      await writeJson(consolePath, { events: recorder.snapshot(), counts: recorder.counts() });
      const failurePath = path.join(shotDir, "failure.json");
      await writeJson(failurePath, {
        shotId,
        failedAt: new Date().toISOString(),
        currentUrl: page.url(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? null,
        } : { message: String(error) },
      });
      summary.visual.shots.push({
        shotId,
        artifactDir: shotDir,
        imagePath,
        statePath,
        consolePath,
        failurePath,
        metrics: null,
        zoneId: null,
        visibleLandmarks: [],
        console: recorder.counts(),
        findings: [{
          severity: "error",
          code: "shot-capture-failed",
          message: error instanceof Error ? error.message : String(error),
        }],
        score: 0,
        passed: false,
      });
    } finally {
      if (CAPTURE_TRACE) await stopTracing(context, path.join(shotDir, "trace.zip")).catch(() => {});
      await closeBrowserResources({ context }).catch((error) => noteFailure(`${stage}:cleanup`, error));
    }
    await persist(stage);
  }

  summary.functional.aggregate = aggregateRouteResults(summary.functional.routes);
  summary.visual.aggregate = aggregateShotReviews(summary.visual.shots, {
    minScore: MIN_SHOT_SCORE,
    expectedShotIds: selectedShotIds,
  });
  await persist("acceptance-aggregates");

  const performanceShot = inventory.compareShotId;
  const performanceDir = path.join(OUTPUT_DIR, "performance");
  await ensureDir(performanceDir);
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const desktopPage = await desktopContext.newPage();
    await gotoHumanShot(desktopPage, {
      baseUrl: server.baseUrl,
      mapId: MAP_ID,
      shot: performanceShot,
      extraSearchParams: { ...SHIP_QA_SEARCH_PARAMS, vm: 0, perf: 1 },
    });
    const desktopPerformance = await collectPerformanceSamples(
      desktopPage,
      7,
      path.join(performanceDir, "desktop"),
    );
    summary.performance = { stage: "desktop-collected", desktop: desktopPerformance };
    await persist("performance:desktop");

    const mobileContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      screen: { width: 844, height: 390 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
    });
    let mobilePerformance;
    try {
      const mobilePage = await mobileContext.newPage();
      await gotoHumanShot(mobilePage, {
        baseUrl: server.baseUrl,
        mapId: MAP_ID,
        shot: performanceShot,
        extraSearchParams: { ...SHIP_QA_SEARCH_PARAMS, vm: 0, perf: 1 },
      });
      mobilePerformance = await collectPerformanceSamples(
        mobilePage,
        7,
        path.join(performanceDir, "mobile"),
      );
    } finally {
      await closeBrowserResources({ context: mobileContext });
    }

    summary.performance = evaluateBazaarPerformance({
      desktop: desktopPerformance,
      mobile: mobilePerformance,
      baseline: {
        frameMs: optionalPositiveNumber(process.env.PERF_BASELINE_FRAME_MS),
        bootMs: optionalPositiveNumber(process.env.PERF_BASELINE_BOOT_MS),
      },
    });
    summary.performance.shotId = performanceShot;
    summary.performance.desktop.viewport = { width: 1440, height: 900 };
    summary.performance.mobile.viewport = { width: 844, height: 390 };
    summary.performance.mobile.profile = "automatic mobile reduced-detail";
    await persist("performance:complete");
  } finally {
    await closeBrowserResources({ context: desktopContext });
  }

  summary.automatedPassed = (
    summary.functional.aggregate.passed
    && summary.visual.aggregate.passed
    && summary.performance.passed
    && summary.humanReview.errors.length === 0
    && summary.failed !== true
  );
  summary.releaseReady = summary.automatedPassed && summary.humanReview.approved;
  summary.passed = summary.automatedPassed;
  summary.failed = !summary.automatedPassed;
  summary.finishedAt = new Date().toISOString();
  await persist("complete");
  if (summary.failed) {
    gateError = new Error(
      `[qa:completion] failed | routes=${summary.functional.aggregate.failingRoutes.join(",") || "none"} | shots=${summary.visual.aggregate.failingShots.join(",") || "none"} | performance=${summary.performance.passed ? "pass" : "fail"} | output=${OUTPUT_DIR}`,
    );
  }
} catch (error) {
  gateError = error;
  summary.finishedAt = new Date().toISOString();
  summary.failure = error instanceof Error ? error.message : String(error);
  noteFailure(summary.currentStage ?? "unknown", error);
} finally {
  removeSignalCleanup();
  const cleanupFailures = await cleanupResources();
  for (const { stage, error } of cleanupFailures) {
    noteFailure(stage, error);
    gateError ??= error;
  }
  summary.finishedAt ??= new Date().toISOString();
  summary.failed = summary.failed === true || gateError !== null;
  summary.passed = !summary.failed && summary.automatedPassed === true;
  await persist("finished").catch((error) => {
    gateError ??= error;
    console.error(
      `[qa:completion] final artifact write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
}

if (gateError || summary.failed) {
  process.exitCode = 1;
  console.error(
    gateError instanceof Error
      ? gateError.stack ?? gateError.message
      : String(gateError ?? summary.failure),
  );
} else {
  console.log(
    `[qa:completion] pass | routes=${summary.functional.routes.length} | shots=${summary.visual.shots.length} | output=${OUTPUT_DIR}`,
  );
}

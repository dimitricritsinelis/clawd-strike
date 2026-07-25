import path from "node:path";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_MAP_ID,
  assertCaptureSearchParamsPolicy,
  captureShotSet,
  closeBrowserResources,
  ensureDir,
  launchBrowserProcess,
  loadShotsSpec,
  parseBooleanEnv,
  selectReviewShotIds,
  validateReviewShotInventory,
  writeJson,
} from "./lib/runtimePlaywright.mjs";
import { startQaServer } from "./lib/qaServer.mjs";
import { assertGeneratedMapsFresh } from "./lib/generatedMapCheck.mjs";
import { readPngMetrics } from "./lib/imageMetrics.mjs";
import {
  aggregateShotReviews,
  resolveShotDefinition,
  summarizeCapturedShot,
} from "./lib/shotReview.mjs";
import { installSignalCleanup } from "./lib/childLifecycle.mjs";

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const MAP_ID = (process.env.MAP_ID ?? DEFAULT_MAP_ID).trim() || DEFAULT_MAP_ID;
const HEADLESS = parseBooleanEnv(process.env.HEADLESS, true);
const CAPTURE_TRACE = parseBooleanEnv(process.env.CAPTURE_TRACE, false);
const DIAGNOSTIC_MODE = parseBooleanEnv(process.env.DIAGNOSTIC_MODE, false);
const SHOT_IDS = typeof process.env.SHOT_IDS === "string"
  ? [...new Set(process.env.SHOT_IDS.split(",").map((shotId) => shotId.trim()).filter(Boolean))]
  : null;
const MAX_SHOTS = typeof process.env.MAX_SHOTS === "string"
  ? Math.max(1, Number(process.env.MAX_SHOTS))
  : null;
const ALLOW_PARTIAL_SHOTS = parseBooleanEnv(process.env.ALLOW_PARTIAL_SHOTS, false);
const EXTRA_SEARCH_PARAMS = Object.fromEntries(
  new URLSearchParams(process.env.EXTRA_SEARCH_PARAMS ?? ""),
);
assertCaptureSearchParamsPolicy(EXTRA_SEARCH_PARAMS, { diagnosticMode: DIAGNOSTIC_MODE });
const MIN_SHOT_SCORE = Math.max(0, Math.min(100, Number(process.env.MIN_SHOT_SCORE ?? 80)));
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.OUTPUT_DIR ?? `../../artifacts/playwright/map-shots/${timestampId()}`,
);

await ensureDir(OUTPUT_DIR);

let server = null;
let browser = null;
let resourceCleanupPromise = null;
const summary = {
  baseUrl: null,
  mapId: MAP_ID,
  headless: HEADLESS,
  traceCaptured: CAPTURE_TRACE,
  diagnosticMode: DIAGNOSTIC_MODE,
  signoffEligible: !DIAGNOSTIC_MODE,
  selectedShotIds: [],
  extraSearchParams: EXTRA_SEARCH_PARAMS,
  inventory: null,
  serverIdentity: null,
  partial: false,
  outputDir: OUTPUT_DIR,
  startedAt: new Date().toISOString(),
  shots: [],
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
        failures.push(`browser: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
    await serverToClose?.close().catch((error) => {
      failures.push(`server: ${error instanceof Error ? error.message : String(error)}`);
    });
    return failures;
  })();
  return resourceCleanupPromise;
};
const removeSignalCleanup = installSignalCleanup(async (signal) => {
  const failures = await cleanupResources();
  if (failures.length > 0) {
    throw new Error(`${signal} resource cleanup failed | ${failures.join(" | ")}`);
  }
});

try {
  summary.generationCheck = await assertGeneratedMapsFresh();
  server = await startQaServer({ profile: "cell-review" });
  summary.baseUrl = server.baseUrl;
  summary.serverIdentity = {
    owned: server.owned,
    runToken: server.runToken,
    fingerprint: server.fingerprint,
  };

  const shotsSpec = await loadShotsSpec(server.baseUrl, MAP_ID);
  const inventory = validateReviewShotInventory(shotsSpec);
  summary.inventory = inventory;
  if (!inventory.passed) {
    throw new Error(`[capture:shots] invalid authored inventory | ${inventory.errors.join(" | ")}`);
  }
  const reviewShotIds = selectReviewShotIds(shotsSpec, {
    ...(MAX_SHOTS === null ? {} : { maxShots: MAX_SHOTS }),
  });
  if (SHOT_IDS !== null) {
    const unknownShotIds = SHOT_IDS.filter((shotId) => !inventory.allShotIds.includes(shotId));
    if (unknownShotIds.length > 0) {
      throw new Error(`[capture:shots] unknown SHOT_IDS | ${unknownShotIds.join(",")}`);
    }
    if (SHOT_IDS.length === 0) {
      throw new Error("[capture:shots] SHOT_IDS must include at least one authored shot id");
    }
  }
  const requestedShotIds = new Set(SHOT_IDS ?? reviewShotIds);
  const selectedShotIds = (SHOT_IDS === null ? reviewShotIds : inventory.allShotIds)
    .filter((shotId) => requestedShotIds.has(shotId));
  if (selectedShotIds.length === 0) {
    throw new Error("[capture:shots] SHOT_IDS did not select any authored shots");
  }
  if (selectedShotIds.length !== inventory.reviewShotIds.length && SHOT_IDS === null && !ALLOW_PARTIAL_SHOTS) {
    throw new Error("[capture:shots] partial capture requested; set ALLOW_PARTIAL_SHOTS=1 only for diagnostic runs");
  }
  summary.selectedShotIds = selectedShotIds;
  summary.partial = (
    selectedShotIds.length !== inventory.reviewShotIds.length
    || selectedShotIds.some((shotId, index) => shotId !== inventory.reviewShotIds[index])
  );
  summary.signoffEligible = !DIAGNOSTIC_MODE && !summary.partial;
  const shotsById = new Map(
    selectedShotIds.map((shotId) => [shotId, resolveShotDefinition(shotsSpec, shotId)]),
  );

  browser = await launchBrowserProcess({ headless: HEADLESS });
  let captures;
  try {
    captures = await captureShotSet(browser, {
      baseUrl: server.baseUrl,
      mapId: MAP_ID,
      outputDir: path.join(OUTPUT_DIR, "shots"),
      shotIds: selectedShotIds,
      extraSearchParams: EXTRA_SEARCH_PARAMS,
      diagnosticMode: DIAGNOSTIC_MODE,
      captureTrace: CAPTURE_TRACE,
      shotDefinitions: shotsById,
      authoredShotIds: inventory.allShotIds,
    });
  } catch (error) {
    captures = error?.captures ?? [];
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { captures });
  } finally {
    for (const capture of captures ?? []) {
      if (capture.failed) {
        summary.shots.push({
          shotId: capture.shotId,
          artifactDir: capture.artifactDir,
          imagePath: capture.imagePath,
          statePath: capture.statePath,
          consolePath: capture.consolePath,
          failurePath: capture.failurePath,
          metrics: null,
          findings: [{
            severity: "error",
            code: "shot-capture-failed",
            message: capture.failure?.error?.message ?? "Shot capture failed",
          }],
          score: 0,
          passed: false,
        });
        continue;
      }
      const metrics = await readPngMetrics(capture.imagePath);
      const consolePayload = JSON.parse(await readFile(capture.consolePath, "utf8"));
      summary.shots.push({
        ...summarizeCapturedShot(capture, metrics, consolePayload.counts, {
          minScore: MIN_SHOT_SCORE,
          shotDefinition: shotsById.get(capture.shotId) ?? null,
        }),
        evidence: capture.evidence,
      });
    }
  }

  summary.aggregate = aggregateShotReviews(summary.shots, {
    minScore: MIN_SHOT_SCORE,
    expectedShotIds: selectedShotIds,
  });
  summary.finishedAt = new Date().toISOString();
  summary.failed = !summary.aggregate.passed;
  await writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);

  if (!summary.aggregate.passed) {
    throw new Error(
      `[capture:shots] failed | shots=${summary.aggregate.failingShots.join(",") || "none"} | output=${OUTPUT_DIR}`,
    );
  }
  console.log(`[capture:shots] pass | shots=${summary.shots.length} | output=${OUTPUT_DIR}`);
} catch (error) {
  summary.finishedAt = new Date().toISOString();
  summary.failed = true;
  summary.failure = error instanceof Error ? error.message : String(error);
  await writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);
  process.exitCode = 1;
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  removeSignalCleanup();
  const cleanupFailures = await cleanupResources();
  for (const failure of cleanupFailures) {
    process.exitCode = 1;
    console.error(`[capture:shots] resource cleanup failed: ${failure}`);
  }
}

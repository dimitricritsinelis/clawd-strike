import path from "node:path";
import { copyFile, readFile } from "node:fs/promises";
import {
  captureShotSet,
  closeBrowserResources,
  ensureDir,
  launchBrowserProcess,
  loadShotsSpec,
  validateReviewShotInventory,
} from "./lib/runtimePlaywright.mjs";
import { assertGeneratedMapsFresh } from "./lib/generatedMapCheck.mjs";
import { startQaServer } from "./lib/qaServer.mjs";
import { installSignalCleanup } from "./lib/childLifecycle.mjs";

const MAP_ID = (process.env.MAP_ID ?? "bazaar-map").trim() || "bazaar-map";
const SHOT_ID = "SHOT_01_TOPDOWN_ESTABLISHING";
const outputDir = path.resolve(process.cwd(), "../../artifacts/playwright/birdseye-reference");
const targetPath = path.resolve(process.cwd(), "../../docs/map-design/refs/bazaar_v3_detailed_birdseye.png");

await ensureDir(outputDir);
await assertGeneratedMapsFresh();
let server = null;
let browser = null;
let resourceCleanupPromise = null;
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
  server = await startQaServer({ profile: "cell-review" });
  const shotsSpec = await loadShotsSpec(server.baseUrl, MAP_ID);
  const inventory = validateReviewShotInventory(shotsSpec);
  if (!inventory.passed) {
    throw new Error(`[gen:birdseye] invalid authored inventory | ${inventory.errors.join(" | ")}`);
  }
  browser = await launchBrowserProcess({ headless: true });
  const [capture] = await captureShotSet(browser, {
    baseUrl: server.baseUrl,
    mapId: MAP_ID,
    outputDir,
    shotIds: [SHOT_ID],
    authoredShotIds: inventory.allShotIds,
    beauty: true,
  });
  if (!capture || capture.state?.shot?.id !== SHOT_ID) {
    throw new Error(`[gen:birdseye] runtime did not confirm ${SHOT_ID}`);
  }
  const consolePayload = JSON.parse(await readFile(capture.consolePath, "utf8"));
  if (consolePayload.counts.errorCount > 0 || consolePayload.counts.warningCount > 0) {
    throw new Error(`[gen:birdseye] console was not clean: ${JSON.stringify(consolePayload.counts)}`);
  }
  await copyFile(capture.imagePath, targetPath);
  console.log(`[gen:birdseye] wrote ${path.relative(process.cwd(), targetPath)}`);
} finally {
  removeSignalCleanup();
  const cleanupFailures = await cleanupResources();
  if (cleanupFailures.length > 0) {
    throw new Error(`[gen:birdseye] resource cleanup failed | ${cleanupFailures.join(" | ")}`);
  }
}

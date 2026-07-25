import path from "node:path";
import { readFile } from "node:fs/promises";
import { comparePngMetrics, readPngMetrics } from "./lib/imageMetrics.mjs";
import {
  readScreenshotCoverage,
  validateReviewShotInventory,
} from "./lib/runtimePlaywright.mjs";
import {
  compareCapturedShotPair,
  resolveShotDefinition,
} from "./lib/shotReview.mjs";

const DEFAULT_SHOTS_SPEC = new URL(
  "../../../docs/map-design/shots.json",
  import.meta.url,
);

function fail(message) {
  throw new Error(`[qa:cell:compare] ${message}`);
}

function parseArgs(argv) {
  const args = {
    shotId: "",
    beforeImage: "",
    afterImage: "",
    beforeState: "",
    afterState: "",
    beforeConsole: "",
    afterConsole: "",
    shotsSpec: DEFAULT_SHOTS_SPEC,
    reviewNote: "",
  };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const supported = new Set([
      "--shot-id",
      "--before-image",
      "--after-image",
      "--before-state",
      "--after-state",
      "--before-console",
      "--after-console",
      "--shots-spec",
      "--review-note",
    ]);
    if (!supported.has(key)) fail(`Unknown argument '${key}'`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for ${key}`);
    index += 1;
    if (key === "--shot-id") args.shotId = value.trim();
    if (key === "--before-image") args.beforeImage = path.resolve(value);
    if (key === "--after-image") args.afterImage = path.resolve(value);
    if (key === "--before-state") args.beforeState = path.resolve(value);
    if (key === "--after-state") args.afterState = path.resolve(value);
    if (key === "--before-console") args.beforeConsole = path.resolve(value);
    if (key === "--after-console") args.afterConsole = path.resolve(value);
    if (key === "--shots-spec") args.shotsSpec = path.resolve(value);
    if (key === "--review-note") args.reviewNote = value.trim();
  }
  if (
    !args.shotId
    || !args.beforeImage
    || !args.afterImage
    || !args.beforeState
    || !args.afterState
  ) {
    fail(
      "Usage: pnpm qa:cell:compare -- --shot-id <authored-id> --before-image <path> --after-image <path> --before-state <path> --after-state <path> [--before-console <path>] [--after-console <path>] [--review-note <text>]",
    );
  }
  if (args.beforeImage === args.afterImage || args.beforeState === args.afterState) {
    fail("Before and after inputs must be distinct files.");
  }
  return args;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to read ${label} at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readConsoleCounts(filePath) {
  if (!filePath) return { errorCount: 0, warningCount: 0, total: 0 };
  const payload = await readJson(filePath, "console JSON");
  return payload?.counts ?? { errorCount: 0, warningCount: 0, total: 0 };
}

const args = parseArgs(process.argv);
const shotsSpec = await readJson(args.shotsSpec, "authored shots spec");
const inventory = validateReviewShotInventory(shotsSpec);
if (!inventory.passed) fail(`Authored shot inventory is invalid: ${inventory.errors.join(" | ")}`);
if (!inventory.allShotIds.includes(args.shotId)) {
  fail(`Unknown authored shot id '${args.shotId}'`);
}
const shotDefinition = resolveShotDefinition(shotsSpec, args.shotId);
const [beforeState, afterState] = await Promise.all([
  readJson(args.beforeState, "before state"),
  readJson(args.afterState, "after state"),
]);
if (beforeState?.map?.loaded !== true || afterState?.map?.loaded !== true) {
  fail("Both states must report map.loaded=true.");
}

const [
  beforeMetrics,
  afterMetrics,
  diff,
  beforeCoverage,
  afterCoverage,
  beforeConsole,
  afterConsole,
] = await Promise.all([
  readPngMetrics(args.beforeImage),
  readPngMetrics(args.afterImage),
  comparePngMetrics(args.beforeImage, args.afterImage),
  readScreenshotCoverage(args.beforeImage),
  readScreenshotCoverage(args.afterImage),
  readConsoleCounts(args.beforeConsole),
  readConsoleCounts(args.afterConsole),
]);

const result = compareCapturedShotPair({
  shotId: args.shotId,
  shotDefinition,
  beforeCapture: {
    shotId: args.shotId,
    imagePath: args.beforeImage,
    statePath: args.beforeState,
    consolePath: args.beforeConsole || null,
    beauty: true,
    coverage: beforeCoverage,
    state: beforeState,
  },
  afterCapture: {
    shotId: args.shotId,
    imagePath: args.afterImage,
    statePath: args.afterState,
    consolePath: args.afterConsole || null,
    beauty: true,
    coverage: afterCoverage,
    state: afterState,
  },
  beforeMetrics,
  afterMetrics,
  diff,
  beforeConsole,
  afterConsole,
});

const summary = {
  ...result,
  reviewedAt: new Date().toISOString(),
  reviewNote: args.reviewNote || null,
};
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;

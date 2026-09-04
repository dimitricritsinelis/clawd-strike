import crypto from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import sharp from "sharp";
import { installSignalCleanup } from "./lib/childLifecycle.mjs";
import { comparePngMetrics, readPngMetrics } from "./lib/imageMetrics.mjs";
import { BAZAAR_PERFORMANCE_BUDGET, summarizePerformanceSamples } from "./lib/performanceAcceptance.mjs";
import { startQaServer } from "./lib/qaServer.mjs";
import {
  DEFAULT_VIEWPORT,
  SHIP_QA_SEARCH_PARAMS,
  attachConsoleRecorder,
  captureRuntimeSnapshot,
  closeBrowserResources,
  ensureDir,
  evaluateRuntimeState,
  launchBrowserProcess,
  readScreenshotCoverage,
  renderRuntimeFrame,
  sanitizeFileSegment,
  gotoAgentRuntime,
} from "./lib/runtimePlaywright.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// The captured repository defaults to the adapter's own checkout, but the
// orchestrator may target another repo with --repo-root; the QA server and the
// reference board must then come from that repo, never silently from this one.
const TOOL_REPO_ROOT = path.resolve(SCRIPT_DIR, "../../..");
let CLIENT_ROOT = path.resolve(SCRIPT_DIR, "..");
let REPO_ROOT = TOOL_REPO_ROOT;

function bindRepoRoot(repoRoot) {
  if (!repoRoot) return;
  let resolved = path.resolve(repoRoot);
  try {
    resolved = realpathSync(resolved);
  } catch {
    // Keep the resolved path; a missing root fails later with a clearer error.
  }
  REPO_ROOT = resolved;
  CLIENT_ROOT = path.join(REPO_ROOT, "apps/client");
}

// The approved reference board is calibration material: prefer the captured
// repo's copy, fall back to the adapter's own checkout (test fixtures carry none).
async function referenceImagePath(fileName) {
  const target = path.join(REPO_ROOT, "docs/map-design/refs", fileName);
  try {
    await readFile(target);
    return target;
  } catch {
    return path.join(TOOL_REPO_ROOT, "docs/map-design/refs", fileName);
  }
}
const PLAYER_EYE_HEIGHT_M = 1.7;
const CAMERA_TOLERANCE = Object.freeze({ positionM: 0.05, angleDeg: 0.35, fovDeg: 0.1 });
const STRICT_CHANGE_THRESHOLD = Object.freeze({
  changedPixelRatio: 0.002,
  meanAbsoluteDelta: 0.001,
});
const DEFAULT_BATCH_SIZE = 5;
const SYNTHETIC_WIDTH = 960;
const SYNTHETIC_HEIGHT = 600;
const CONTACT_WIDTH = 1000;
const CONTACT_VIEW_WIDTH = 480;
const CONTACT_VIEW_HEIGHT = 300;
const CONTACT_LABEL_HEIGHT = 46;
const REFERENCE_IMAGES = Object.freeze([
  ["BAZAAR IDENTITY", "bazaar_main_hall_reference.png"],
  ["CS2 DAYLIGHT 1", "cs2_daylight_ref_1.png"],
  ["CS2 DAYLIGHT 2", "cs2_daylight_ref_2.png"],
  ["CS2 DAYLIGHT 3", "cs2_daylight_ref_3.png"],
  ["CS2 DAYLIGHT 4", "cs2_daylight_ref_4.png"],
  ["CS2 DAYLIGHT 5", "cs2_daylight_ref_5.png"],
]);

function usage() {
  return [
    "Usage:",
    "  node scripts/map-polish-capture.mjs capture --plan <json> --output <dir> [--synthetic <variant>] [--repo-root <dir>]",
    "  node scripts/map-polish-capture.mjs compare --before <png> --after <png>",
  ].join("\n");
}

function parseOptions(argv) {
  const [command, ...tokens] = argv;
  if (!command || command === "--help" || command === "-h") return { command: "help", options: {} };
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") continue;
    if (!token.startsWith("--")) throw new Error(`Unexpected argument '${token}'`);
    const key = token.slice(2);
    if (!key) throw new Error("Empty option name");
    const value = tokens[index + 1];
    if (value === undefined || value === "--" || value.startsWith("--")) {
      throw new Error(`Option '--${key}' requires a value`);
    }
    if (Object.hasOwn(options, key)) throw new Error(`Option '--${key}' may be supplied only once`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function requireOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required option '--${key}'`);
  }
  return value;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeAngleDeg(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angleDeltaDeg(left, right) {
  let delta = Math.abs(normalizeAngleDeg(left) - normalizeAngleDeg(right));
  if (delta > 180) delta = 360 - delta;
  return delta;
}

function normalizeCamera(raw, label) {
  if (!isRecord(raw)) throw new Error(`${label} must be an object`);
  const designPositionRaw = raw.designPosition;
  const designLookAtRaw = raw.designLookAt;
  const playerPositionRaw = raw.playerPosition;
  if (!isRecord(designPositionRaw)) throw new Error(`${label}.designPosition must be an object`);
  if (!isRecord(designLookAtRaw)) throw new Error(`${label}.designLookAt must be an object`);
  if (!isRecord(playerPositionRaw)) throw new Error(`${label}.playerPosition must be an object`);
  const designPosition = {
    x: finite(designPositionRaw.x, `${label}.designPosition.x`),
    y: finite(designPositionRaw.y, `${label}.designPosition.y`),
    z: finite(designPositionRaw.z, `${label}.designPosition.z`),
  };
  const designLookAt = {
    x: finite(designLookAtRaw.x, `${label}.designLookAt.x`),
    y: finite(designLookAtRaw.y, `${label}.designLookAt.y`),
    z: finite(designLookAtRaw.z, `${label}.designLookAt.z`),
  };
  const playerPosition = {
    x: finite(playerPositionRaw.x, `${label}.playerPosition.x`),
    y: finite(playerPositionRaw.y, `${label}.playerPosition.y`),
    z: finite(playerPositionRaw.z, `${label}.playerPosition.z`),
  };
  const yawDeg = normalizeAngleDeg(finite(raw.yawDeg, `${label}.yawDeg`));
  const pitchDeg = raw.pitchDeg === undefined ? 0 : finite(raw.pitchDeg, `${label}.pitchDeg`);
  if (pitchDeg <= -90 || pitchDeg >= 90) throw new Error(`${label}.pitchDeg must be between -90 and 90`);
  const fovDeg = finite(raw.fovDeg, `${label}.fovDeg`);
  if (fovDeg <= 0 || fovDeg >= 180) throw new Error(`${label}.fov must be between 0 and 180`);
  const playerEyePosition = {
    x: playerPosition.x,
    y: playerPosition.y + PLAYER_EYE_HEIGHT_M,
    z: playerPosition.z,
  };
  const designWorldPosition = {
    x: designPosition.x,
    y: designPosition.z,
    z: designPosition.y,
  };
  if (Math.hypot(
    playerEyePosition.x - designWorldPosition.x,
    playerEyePosition.y - designWorldPosition.y,
    playerEyePosition.z - designWorldPosition.z,
  ) > 0.02) {
    throw new Error(`${label}.designPosition must be the 1.7m player-eye position for playerPosition`);
  }
  return {
    designPosition,
    designLookAt,
    playerPosition,
    yawDeg,
    pitchDeg,
    fovDeg,
    worldPosition: designWorldPosition,
  };
}

function normalizePlan(raw) {
  if (!isRecord(raw)) throw new Error("Capture plan must be a JSON object");
  const authorityHash = nonEmptyString(raw.authorityHash, "plan.authorityHash");
  if (!Array.isArray(raw.units) || raw.units.length === 0) {
    throw new Error("plan.units must be a non-empty array");
  }
  const ids = new Set();
  const units = raw.units.map((candidate, unitIndex) => {
    const label = `plan.units[${unitIndex}]`;
    if (!isRecord(candidate)) throw new Error(`${label} must be an object`);
    const id = nonEmptyString(candidate.id, `${label}.id`);
    if (ids.has(id)) throw new Error(`Duplicate review-unit id '${id}'`);
    ids.add(id);
    if (!Array.isArray(candidate.zoneIds) || candidate.zoneIds.length === 0) {
      throw new Error(`${label}.zoneIds must be a non-empty array`);
    }
    const zoneIds = [...new Set(candidate.zoneIds.map((zoneId, zoneIndex) => (
      nonEmptyString(zoneId, `${label}.zoneIds[${zoneIndex}]`)
    )))].sort((left, right) => left.localeCompare(right));
    if (!Array.isArray(candidate.views) || candidate.views.length === 0) {
      throw new Error(`${label}.views must be a non-empty array`);
    }
    if (candidate.views.length > 12) throw new Error(`${label}.views must contain at most 12 views`);
    const viewIds = new Set();
    const views = candidate.views.map((rawView, viewIndex) => {
      const viewLabel = `${label}.views[${viewIndex}]`;
      if (!isRecord(rawView)) throw new Error(`${viewLabel} must be an object`);
      const viewId = nonEmptyString(rawView.id, `${viewLabel}.id`);
      if (!/^[a-zA-Z0-9:._-]+$/.test(viewId)) {
        throw new Error(`${viewLabel}.id contains characters outside letters, digits, ':', '-', '_', '.'`);
      }
      if (viewIds.has(viewId)) throw new Error(`${label}.views contains duplicate view id '${viewId}'`);
      viewIds.add(viewId);
      return { id: viewId, camera: normalizeCamera(rawView.camera, `${viewLabel}.camera`) };
    });
    if (views[0]?.id !== "primary" || views[1]?.id !== "context") {
      throw new Error("unit views must start with primary then context");
    }
    return { id, zoneIds, views };
  }).sort((left, right) => left.id.localeCompare(right.id));
  return {
    authorityHash,
    units,
    batches: normalizeBatches(raw.batches, units),
    contactSheets: raw.contactSheets !== false,
  };
}

function chunk(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function normalizeBatches(rawBatches, units) {
  const knownIds = new Set(units.map((unit) => unit.id));
  if (rawBatches === undefined) {
    return chunk(units.map((unit) => unit.id), DEFAULT_BATCH_SIZE).map((unitIds, index) => ({
      id: `batch-${String(index + 1).padStart(2, "0")}`,
      label: `Batch ${index + 1}`,
      unitIds,
    }));
  }
  if (!Array.isArray(rawBatches) || rawBatches.length === 0) {
    throw new Error("plan.batches must be a non-empty array when supplied");
  }
  const seen = new Set();
  const batches = rawBatches.map((candidate, index) => {
    const batch = Array.isArray(candidate) ? { unitIds: candidate } : candidate;
    if (!isRecord(batch)) throw new Error(`plan.batches[${index}] must be an object or string array`);
    const rawUnitIds = batch.unitIds ?? batch.reviewUnitIds ?? batch.units;
    if (!Array.isArray(rawUnitIds) || rawUnitIds.length === 0) {
      throw new Error(`plan.batches[${index}] must name at least one review unit`);
    }
    const unitIds = rawUnitIds.map((unitId, unitIndex) => nonEmptyString(
      isRecord(unitId) ? unitId.id : unitId,
      `plan.batches[${index}].unitIds[${unitIndex}]`,
    ));
    for (const unitId of unitIds) {
      if (!knownIds.has(unitId)) throw new Error(`plan.batches[${index}] names unknown unit '${unitId}'`);
      if (seen.has(unitId)) throw new Error(`Review unit '${unitId}' appears in more than one batch`);
      seen.add(unitId);
    }
    return {
      id: typeof batch.id === "string" && batch.id.trim() ? batch.id.trim() : `batch-${String(index + 1).padStart(2, "0")}`,
      label: typeof batch.label === "string" && batch.label.trim() ? batch.label.trim() : `Batch ${index + 1}`,
      unitIds,
    };
  });
  const missing = units.map((unit) => unit.id).filter((unitId) => !seen.has(unitId));
  if (missing.length > 0) throw new Error(`plan.batches omit review units: ${missing.join(", ")}`);
  return batches;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function syntheticColors(seed) {
  const digest = crypto.createHash("sha256").update(seed).digest();
  const channel = (index) => 45 + digest[index] % 130;
  return {
    background: `rgb(${channel(0)},${channel(1)},${channel(2)})`,
    accent: `rgb(${125 + digest[3] % 110},${125 + digest[4] % 110},${125 + digest[5] % 110})`,
  };
}

async function writeSyntheticImage(imagePath, unit, viewName, variant) {
  const seed = `${variant}\0${unit.id}\0${viewName}\0${unit.zoneIds.join(",")}`;
  const colors = syntheticColors(seed);
  const title = `${unit.id} / ${viewName}`;
  const subtitle = `${unit.zoneIds.join(", ")} / ${variant}`;
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${SYNTHETIC_WIDTH}" height="${SYNTHETIC_HEIGHT}">
      <rect width="100%" height="100%" fill="${colors.background}"/>
      <path d="M0 480 L210 235 L405 405 L625 145 L960 475 L960 600 L0 600 Z" fill="${colors.accent}" opacity="0.72"/>
      <rect x="36" y="36" width="888" height="116" rx="12" fill="#111827" opacity="0.88"/>
      <text x="62" y="86" font-family="sans-serif" font-size="34" font-weight="700" fill="#ffffff">${xmlEscape(title)}</text>
      <text x="62" y="127" font-family="sans-serif" font-size="22" fill="#d1d5db">${xmlEscape(subtitle)}</text>
    </svg>
  `);
  await ensureDir(path.dirname(imagePath));
  await sharp({
    create: { width: SYNTHETIC_WIDTH, height: SYNTHETIC_HEIGHT, channels: 3, background: colors.background },
  }).composite([{ input: svg }]).png().toFile(imagePath);
}

function conciseExpectedCamera(camera) {
  return {
    designPosition: camera.designPosition,
    designLookAt: camera.designLookAt,
    playerPosition: camera.playerPosition,
    yawDeg: camera.yawDeg,
    pitchDeg: camera.pitchDeg,
    fovDeg: camera.fovDeg,
  };
}

function cameraComparison(camera, actual) {
  const position = actual?.pos;
  if (!isRecord(position)) {
    return { matches: false, deltas: null, error: "runtime camera position is unavailable" };
  }
  const values = [position.x, position.y, position.z, actual.yawDeg, actual.pitchDeg, actual.fovDeg];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return { matches: false, deltas: null, error: "runtime camera contains a non-finite value" };
  }
  const deltas = {
    positionM: Math.hypot(
      position.x - camera.worldPosition.x,
      position.y - camera.worldPosition.y,
      position.z - camera.worldPosition.z,
    ),
    yawDeg: angleDeltaDeg(actual.yawDeg, camera.yawDeg),
    pitchDeg: Math.abs(actual.pitchDeg - camera.pitchDeg),
    fovDeg: Math.abs(actual.fovDeg - camera.fovDeg),
  };
  const matches = (
    deltas.positionM <= CAMERA_TOLERANCE.positionM
    && deltas.yawDeg <= CAMERA_TOLERANCE.angleDeg
    && deltas.pitchDeg <= CAMERA_TOLERANCE.angleDeg
    && deltas.fovDeg <= CAMERA_TOLERANCE.fovDeg
  );
  return { matches, deltas, error: matches ? null : "runtime camera differs from generated player-eye pose" };
}

function conciseActualCamera(actual) {
  return isRecord(actual) ? {
    pos: isRecord(actual.pos) ? { x: actual.pos.x, y: actual.pos.y, z: actual.pos.z } : null,
    yawDeg: actual.yawDeg ?? null,
    pitchDeg: actual.pitchDeg ?? null,
    fovDeg: actual.fovDeg ?? null,
  } : null;
}

async function syntheticCapture(plan, outputDir, variant) {
  const units = [];
  for (const unit of plan.units) {
    const views = {};
    for (const { id: viewId, camera } of unit.views) {
      const imagePath = path.join(
        outputDir,
        "units",
        sanitizeFileSegment(unit.id),
        `${sanitizeFileSegment(viewId)}.png`,
      );
      await writeSyntheticImage(imagePath, unit, viewId, variant);
      const metrics = await readPngMetrics(imagePath);
      views[viewId] = {
        imagePath,
        camera: {
          expected: conciseExpectedCamera(camera),
          actual: {
            pos: camera.worldPosition,
            yawDeg: camera.yawDeg,
            pitchDeg: camera.pitchDeg,
            fovDeg: camera.fovDeg,
          },
        },
        playerZoneId: unit.zoneIds[0],
        skyRatio: 0,
        skyOnly: false,
        consoleErrorCount: 0,
        width: metrics.width,
        height: metrics.height,
        sha256: metrics.hash,
        valid: true,
        errors: [],
      };
    }
    units.push({ id: unit.id, zoneIds: unit.zoneIds, views });
  }
  return {
    units,
    protectedAuthorityHash: crypto.createHash("sha256").update("synthetic-gameplay-authority-v1").digest("hex"),
  };
}

async function realCapture(plan, outputDir) {
  let server = null;
  let browser = null;
  let context = null;
  let cleanupPromise = null;
  const cleanup = () => {
    cleanupPromise ??= (async () => {
      const failures = [];
      if (context || browser) {
        await closeBrowserResources({ context, browser }).catch((error) => failures.push(error));
      }
      context = null;
      browser = null;
      await server?.close().catch((error) => failures.push(error));
      server = null;
      if (failures.length > 0) {
        throw new Error(failures.map((error) => error instanceof Error ? error.message : String(error)).join(" | "));
      }
    })();
    return cleanupPromise;
  };
  const removeSignalCleanup = installSignalCleanup(cleanup);
  try {
    server = await startQaServer({
      root: CLIENT_ROOT,
      profile: "map-polish",
      baseUrlOverride: null,
      allowExternal: false,
    });
    browser = await launchBrowserProcess({ headless: true });
    context = await browser.newContext({ viewport: DEFAULT_VIEWPORT });
    const page = await context.newPage();
    const recorder = attachConsoleRecorder(page);
    await gotoAgentRuntime(page, {
      baseUrl: server.baseUrl,
      mapId: "bazaar-map",
      agentName: "MapPolishCapture",
      spawn: "A",
      routeId: "map-polish-capture",
      extraSearchParams: {
        ...SHIP_QA_SEARCH_PARAMS,
        vm: 0,
        unlimitedHealth: 1,
      },
    });
    const bootErrors = recorder.snapshot().filter((event) => (
      (event.kind === "console" && event.type === "error") || event.kind === "pageerror"
    ));
    if (bootErrors.length > 0) {
      throw new Error(`runtime boot emitted ${bootErrors.length} console/page error(s)`);
    }
    await page.evaluate(() => {
      const runtimeRoot = document.getElementById("runtime-root");
      if (runtimeRoot) runtimeRoot.dataset.beautyShot = "true";
    });
    recorder.clear();
    await evaluateRuntimeState(
      page,
      () => window.__debug_eliminate_all_bots?.() ?? 0,
      undefined,
      { operation: "map-polish-eliminate-bots", routeId: "map-polish-capture" },
    );

    const gameplayAuthority = await evaluateRuntimeState(
      page,
      () => {
        if (!window.__qa_gameplay_authority_state) throw new Error("gameplay-authority QA surface is unavailable");
        return window.__qa_gameplay_authority_state();
      },
      undefined,
      { operation: "map-polish-gameplay-authority", routeId: "map-polish-capture" },
    );
    const protectedAuthorityHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(gameplayAuthority))
      .digest("hex");
    const units = [];
    for (const unit of plan.units) {
      const views = {};
      for (const { id: viewId, camera } of unit.views) {
        const imagePath = path.join(
          outputDir,
          "units",
          sanitizeFileSegment(unit.id),
          `${sanitizeFileSegment(viewId)}.png`,
        );
        await rm(imagePath, { force: true });
        recorder.clear();
        const errors = [];
        let state = null;
        let coverage = null;
        let metrics = null;
        let performanceSample = null;
        try {
          await evaluateRuntimeState(
            page,
            ({ x, floor, north, yaw, pitch }) => {
              if (!window.__debug_set_player_pose) throw new Error("debug player-pose API is unavailable");
              window.__debug_set_player_pose({ x, y: floor, z: north, yawDeg: yaw, pitchDeg: pitch });
              return true;
            },
            {
              x: camera.playerPosition.x,
              floor: camera.playerPosition.y,
              north: camera.playerPosition.z,
              yaw: camera.yawDeg,
              pitch: camera.pitchDeg,
            },
            { operation: `map-polish-pose-${unit.id}-${viewId}`, routeId: unit.id },
          );
          await renderRuntimeFrame(page);
          state = await captureRuntimeSnapshot(page, {
            imagePath,
            beauty: true,
            performanceSampleFrames: 2,
            operation: `map-polish-capture-${unit.id}-${viewId}`,
            routeId: unit.id,
          });
          // The runtime's rolling median includes earlier cameras. Time fresh
          // synchronous QA frames in-page, excluding Playwright and pacing waits.
          const frameTimes = await evaluateRuntimeState(page, async () => {
            if (!window.__qa_render_frame) throw new Error("QA frame timing is unavailable");
            const samples = [];
            for (let index = 0; index < 7; index += 1) {
              const start = performance.now();
              window.__qa_render_frame();
              samples.push(performance.now() - start);
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            return samples;
          }, undefined, { operation: `map-polish-perf-${unit.id}-${viewId}`, routeId: unit.id });
          performanceSample = {
            ...summarizePerformanceSamples(frameTimes.map((cpuFrameMedianMs) => ({
              ...state, perf: { ...state.perf, cpuFrameMedianMs },
            }))),
            measurement: "per-view-qa-frame",
          };
          coverage = await readScreenshotCoverage(imagePath);
          metrics = await readPngMetrics(imagePath);
        } catch (error) {
          errors.push(`capture failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        const consoleSnapshot = recorder.snapshot();
        const consoleErrors = consoleSnapshot.filter((event) => (
          (event.kind === "console" && event.type === "error") || event.kind === "pageerror"
        ));
        if (consoleErrors.length > 0) errors.push(`runtime emitted ${consoleErrors.length} console/page error(s)`);
        const playerZoneId = state?.player?.zoneId ?? null;
        if (!unit.zoneIds.includes(playerZoneId)) {
          errors.push(`runtime player zone '${playerZoneId ?? "missing"}' is outside review unit`);
        }
        if (coverage?.skyOnly === true) errors.push("capture is sky-only");
        const cameraResult = cameraComparison(camera, state?.view?.camera);
        if (!cameraResult.matches) errors.push(cameraResult.error);
        views[viewId] = {
          imagePath,
          camera: {
            expected: conciseExpectedCamera(camera),
            actual: conciseActualCamera(state?.view?.camera),
          },
          cameraDeltas: cameraResult.deltas,
          playerZoneId,
          skyRatio: coverage?.skyRatio ?? null,
          skyOnly: coverage?.skyOnly ?? true,
          consoleErrorCount: consoleErrors.length,
          performance: performanceSample,
          width: metrics?.width ?? 0,
          height: metrics?.height ?? 0,
          sha256: metrics?.hash ?? "",
          valid: errors.length === 0,
          errors,
        };
      }
      units.push({ id: unit.id, zoneIds: unit.zoneIds, views });
    }
    return { units, protectedAuthorityHash };
  } finally {
    removeSignalCleanup();
    await cleanup();
  }
}

function labelSvg(width, height, lines) {
  const text = lines.map((line, index) => (
    `<text x="14" y="${22 + index * 18}" font-family="sans-serif" font-size="${index === 0 ? 17 : 13}" font-weight="${index === 0 ? 700 : 400}" fill="#f8fafc">${xmlEscape(line)}</text>`
  )).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#111827"/>${text}</svg>`);
}

async function thumbnailOrPlaceholder(imagePath, label, width = CONTACT_VIEW_WIDTH, height = CONTACT_VIEW_HEIGHT) {
  try {
    return await sharp(imagePath)
      .resize(width, height, { fit: "cover" })
      .removeAlpha()
      .png()
      .toBuffer();
  } catch {
    const placeholder = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#450a0a"/><text x="24" y="${Math.floor(height / 2)}" font-family="sans-serif" font-size="22" fill="#fecaca">${xmlEscape(label)} unavailable</text></svg>`);
    return sharp(placeholder).png().toBuffer();
  }
}

async function requiredReferenceThumbnail(imagePath, width, height) {
  return sharp(imagePath)
    .resize(width, height, { fit: "cover" })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function buildReferenceBoard(outputDir) {
  const columns = 3;
  const cellWidth = 333;
  const imageWidth = 320;
  const imageHeight = 180;
  const labelHeight = 34;
  const rows = Math.ceil(REFERENCE_IMAGES.length / columns);
  const boardWidth = cellWidth * columns;
  const boardHeight = rows * (imageHeight + labelHeight);
  const composites = [];
  for (const [index, [label, fileName]] of REFERENCE_IMAGES.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth + 6;
    const top = row * (imageHeight + labelHeight);
    const imagePath = await referenceImagePath(fileName);
    composites.push({ input: labelSvg(imageWidth, labelHeight, [label]), left, top });
    composites.push({
      input: await requiredReferenceThumbnail(imagePath, imageWidth, imageHeight),
      left,
      top: top + labelHeight,
    });
  }
  const referenceBoardPath = path.join(outputDir, "contact-sheets", "reference-board.png");
  await ensureDir(path.dirname(referenceBoardPath));
  await sharp({ create: { width: boardWidth, height: boardHeight, channels: 3, background: "#0f172a" } })
    .composite(composites)
    .png()
    .toFile(referenceBoardPath);
  return referenceBoardPath;
}

async function buildContactSheets(plan, capturedUnits, outputDir) {
  const byId = new Map(capturedUnits.map((unit) => [unit.id, unit]));
  const planUnitById = new Map(plan.units.map((unit) => [unit.id, unit]));
  const sheets = [];
  for (const [batchIndex, batch] of plan.batches.entries()) {
    const composites = [];
    let top = 0;
    for (const unitId of batch.unitIds) {
      const unit = byId.get(unitId);
      const planViews = planUnitById.get(unitId)?.views ?? [];
      const label = labelSvg(CONTACT_WIDTH, CONTACT_LABEL_HEIGHT, [
        `${batch.label} / ${unitId}`,
        unit?.zoneIds?.join(", ") ?? "missing review unit",
      ]);
      composites.push({ input: label, left: 0, top });
      for (const [viewIndex, view] of planViews.entries()) {
        const rowTop = top + CONTACT_LABEL_HEIGHT + Math.floor(viewIndex / 2) * CONTACT_VIEW_HEIGHT;
        const left = viewIndex % 2 === 0 ? 10 : 510;
        const thumbnail = await thumbnailOrPlaceholder(unit?.views?.[view.id]?.imagePath, view.id);
        composites.push({ input: thumbnail, left, top: rowTop });
        const badgeWidth = Math.min(460, Math.ceil(28 + 9.5 * view.id.length));
        composites.push({ input: labelSvg(badgeWidth, 26, [view.id]), left: left + 8, top: rowTop + 8 });
      }
      top += CONTACT_LABEL_HEIGHT + Math.ceil(planViews.length / 2) * CONTACT_VIEW_HEIGHT;
    }
    const height = top;
    const contactSheetPath = path.join(
      outputDir,
      "contact-sheets",
      `${String(batchIndex + 1).padStart(2, "0")}-${sanitizeFileSegment(batch.id)}.png`,
    );
    await ensureDir(path.dirname(contactSheetPath));
    await sharp({ create: { width: CONTACT_WIDTH, height, channels: 3, background: "#0f172a" } })
      .composite(composites)
      .png()
      .toFile(contactSheetPath);
    sheets.push({ id: batch.id, unitIds: batch.unitIds, contactSheetPath });
  }
  return sheets;
}

async function writeJsonAtomic(filePath, value) {
  await ensureDir(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function runCapture(options) {
  const planPath = path.resolve(requireOption(options, "plan"));
  const outputDir = path.resolve(requireOption(options, "output"));
  const unexpected = Object.keys(options).filter((key) => !["plan", "output", "synthetic", "repo-root"].includes(key));
  if (unexpected.length > 0) throw new Error(`Unknown capture option(s): ${unexpected.map((key) => `--${key}`).join(", ")}`);
  bindRepoRoot(options["repo-root"]);
  const plan = normalizePlan(JSON.parse(await readFile(planPath, "utf8")));
  await ensureDir(outputDir);
  const variant = typeof options.synthetic === "string" ? options.synthetic : null;
  const capture = variant === null
    ? await realCapture(plan, outputDir)
    : await syntheticCapture(plan, outputDir, variant);
  const { units, protectedAuthorityHash } = capture;
  const batches = plan.contactSheets ? await buildContactSheets(plan, units, outputDir) : [];
  const referenceBoardPath = plan.contactSheets ? await buildReferenceBoard(outputDir) : null;
  const invalidViewCount = units.reduce((sum, unit) => sum + Object.values(unit.views)
    .filter((view) => view.valid !== true).length, 0);
  const result = {
    schemaVersion: 1,
    authorityHash: plan.authorityHash,
    protectedAuthorityHash,
    performanceBudget: BAZAAR_PERFORMANCE_BUDGET,
    synthetic: variant !== null,
    ...(variant === null ? {} : { syntheticVariant: variant }),
    valid: invalidViewCount === 0,
    invalidViewCount,
    units,
    batches,
    ...(referenceBoardPath ? { referenceBoardPath } : {}),
  };
  const resultPath = path.join(outputDir, "capture-result.json");
  await writeJsonAtomic(resultPath, result);
  console.log(JSON.stringify(result));
}

async function inspectPng(filePath) {
  let buffer;
  try {
    buffer = await readFile(filePath);
    const metrics = await readPngMetrics(filePath);
    const decoded = PNG.sync.read(buffer);
    return {
      info: {
        path: filePath,
        corrupt: false,
        width: metrics.width,
        height: metrics.height,
        sha256: metrics.hash,
      },
      decoded,
    };
  } catch (error) {
    return {
      info: {
        path: filePath,
        corrupt: true,
        width: 0,
        height: 0,
        sha256: buffer ? crypto.createHash("sha256").update(buffer).digest("hex") : "",
        error: error instanceof Error ? error.message : String(error),
      },
      decoded: null,
    };
  }
}

function decodedDifference(before, after) {
  const pixelCount = before.width * before.height;
  let changedPixels = 0;
  let absoluteChannelDifference = 0;
  let maxChannelDifference = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const difference = Math.abs(before.data[offset + channel] - after.data[offset + channel]);
      if (difference > 0) pixelChanged = true;
      absoluteChannelDifference += difference;
      maxChannelDifference = Math.max(maxChannelDifference, difference);
    }
    if (pixelChanged) changedPixels += 1;
  }
  const changedPixelRatio = pixelCount === 0 ? 0 : changedPixels / pixelCount;
  const meanAbsoluteChannelDiff = pixelCount === 0
    ? 0
    : absoluteChannelDifference / (pixelCount * 4 * 255);
  const effectivelyChanged = (
    changedPixelRatio >= STRICT_CHANGE_THRESHOLD.changedPixelRatio
    || meanAbsoluteChannelDiff >= STRICT_CHANGE_THRESHOLD.meanAbsoluteDelta
  );
  return {
    pixelIdentical: changedPixels === 0,
    changedPixels,
    changedPixelRatio,
    meanAbsoluteChannelDiff,
    maxChannelDiff: maxChannelDifference / 255,
    threshold: STRICT_CHANGE_THRESHOLD,
    effectivelyChanged,
  };
}

async function runCompare(options) {
  const beforePath = path.resolve(requireOption(options, "before"));
  const afterPath = path.resolve(requireOption(options, "after"));
  const unexpected = Object.keys(options).filter((key) => !["before", "after"].includes(key));
  if (unexpected.length > 0) throw new Error(`Unknown compare option(s): ${unexpected.map((key) => `--${key}`).join(", ")}`);
  const [before, after] = await Promise.all([inspectPng(beforePath), inspectPng(afterPath)]);
  const errors = [];
  if (before.info.corrupt) errors.push({ code: "before-corrupt", message: before.info.error });
  if (after.info.corrupt) errors.push({ code: "after-corrupt", message: after.info.error });
  const dimensionsMatch = Boolean(
    before.decoded
    && after.decoded
    && before.decoded.width === after.decoded.width
    && before.decoded.height === after.decoded.height,
  );
  if (before.decoded && after.decoded && !dimensionsMatch) {
    errors.push({ code: "dimension-mismatch", message: "Before and after image dimensions differ" });
  }
  let decoded = null;
  let existingMetrics = null;
  let meanAbsoluteDelta = 0;
  let changedPixelRatio = 0;
  let effectivelyUnchanged = true;
  if (dimensionsMatch) {
    decoded = decodedDifference(before.decoded, after.decoded);
    existingMetrics = await comparePngMetrics(beforePath, afterPath);
    meanAbsoluteDelta = existingMetrics.meanAbsLuminanceDiff;
    changedPixelRatio = existingMetrics.changedPixelRatio;
    effectivelyUnchanged = (
      meanAbsoluteDelta < STRICT_CHANGE_THRESHOLD.meanAbsoluteDelta
      && changedPixelRatio < STRICT_CHANGE_THRESHOLD.changedPixelRatio
    );
    if (before.info.sha256 === after.info.sha256 || decoded.pixelIdentical) {
      errors.push({ code: "identical-images", message: "Before and after images are identical" });
    } else if (effectivelyUnchanged) {
      errors.push({ code: "effectively-unchanged", message: "Decoded image change is below the strict no-change threshold" });
    }
  }
  const result = {
    schemaVersion: 1,
    valid: errors.length === 0,
    before: before.info,
    after: after.info,
    meanAbsoluteDelta,
    changedPixelRatio,
    effectivelyUnchanged,
    dimensionsMatch,
    decoded,
    imageMetrics: existingMetrics,
    errors,
  };
  console.log(JSON.stringify(result));
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseOptions(argv);
  if (command === "help") {
    console.log(usage());
    return;
  }
  if (command === "capture") return runCapture(options);
  if (command === "compare") return runCompare(options);
  throw new Error(`Unknown command '${command}'\n${usage()}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  });
}

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";
export {
  TRAVERSAL_ROUTES,
  resolveTraversalRoutes,
} from "./traversalRoutes.mjs";
import { TRAVERSAL_ROUTES } from "./traversalRoutes.mjs";

export const DEFAULT_BASE_URL = "http://127.0.0.1:5174";
export const SHIP_QA_SEARCH_PARAMS = Object.freeze({
  qa: 1,
  floors: "pbr",
  walls: "pbr",
  props: "bazaar",
  "prop-profile": "medium",
  wallDetails: 1,
  floorRes: "1k",
  lighting: "golden",
  ao: 1,
  shadows: 1,
});
export const DEFAULT_MAP_ID = "bazaar-map";
export const DEFAULT_AGENT_NAME = "SmokeRunner";
export const DEFAULT_HUMAN_NAME = "HumanProbe";
export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
export const DEFAULT_RUNTIME_READY_TIMEOUT_MS = 90_000;
// Software-rendered hosts (no GPU in headless Chromium) can exceed the default
// on their first shader-compiling frame; QA_STATE_READ_TIMEOUT_MS raises the
// budget without loosening it for provisioned machines.
export const DEFAULT_STATE_READ_TIMEOUT_MS = (() => {
  const override = Number(process.env.QA_STATE_READ_TIMEOUT_MS);
  return Number.isFinite(override) && override >= 1_000 ? override : 9_000;
})();
export const DEFAULT_BROWSER_CLEANUP_TIMEOUT_MS = 30_000;
export const DEFAULT_SHOT_TIMEOUT_MS = 120_000;
// Same escape hatch as QA_STATE_READ_TIMEOUT_MS: software-rendered hosts can
// exceed the asset budget while shaders compile on first paint.
export const DEFAULT_QA_ASSET_READY_TIMEOUT_MS = (() => {
  const override = Number(process.env.QA_ASSET_READY_TIMEOUT_MS);
  return Number.isFinite(override) && override >= 1_000 ? override : 20_000;
})();
export const DEFAULT_ROUTE_TICK_MS = 100;
export const DEFAULT_WAYPOINT_TICK_MS = 200;
export const DEFAULT_WAYPOINT_TIMEOUT_MS = 20_000;
export const REQUIRED_CORE_SHOT_COUNT = 12;
export const REQUIRED_CLOSEUP_SHOT_COUNT = 4;
export const DEFAULT_REVIEW_SHOT_COUNT = REQUIRED_CORE_SHOT_COUNT + REQUIRED_CLOSEUP_SHOT_COUNT;
export const DEFAULT_SHOT_CAMERA_TOLERANCE = Object.freeze({
  positionM: 0.02,
  angleDeg: 0.25,
  fovDeg: 0.05,
});
export const QA_CAPTURE_STATE_SCHEMA_VERSION = 1;
export const RUNTIME_IDENTITY_SEARCH_PARAMS = Object.freeze([
  "map",
  "autostart",
  "name",
  "spawn",
  "shot",
]);
export const CAPTURE_PROTECTED_SEARCH_PARAMS = Object.freeze([
  ...RUNTIME_IDENTITY_SEARCH_PARAMS,
  ...Object.keys(SHIP_QA_SEARCH_PARAMS),
  "qaProfile",
  "profile",
  "vm",
  "qaTargets",
]);
export const SIGNOFF_CAPTURE_EXTRA_SEARCH_PARAMS = Object.freeze([
  "qaAssetTimeoutMs",
]);

const RAD_TO_DEG = 180 / Math.PI;
const SCREEN_COVERAGE_SAMPLE_WIDTH = 240;
const SCREEN_COVERAGE_SAMPLE_HEIGHT = 150;
const DETAIL_EDGE_THRESHOLD = 0.035;
const SKY_MIN_LUMINANCE = 0.38;
const SKY_MAX_LOCAL_EDGE = 0.16;
const SKY_MAX_NEIGHBOR_DISTANCE = 0.24;
const SKY_BLUE_RED_RATIO = 0.88;
const SKY_BLUE_GREEN_RATIO = 0.94;
const consoleRecorderByPage = new WeakMap();
const lastSuccessfulStateAtByPage = new WeakMap();

export class RuntimeOperationTimeoutError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "RuntimeOperationTimeoutError";
    this.details = details;
  }
}

export async function withTimeout(operation, timeoutMs, label) {
  let timeoutId;
  const operationPromise = Promise.resolve().then(operation);
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RuntimeOperationTimeoutError(`${label} timed out after ${timeoutMs}ms`, {
        label,
        timeoutMs,
      }));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operationPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseBaseUrl(value = DEFAULT_BASE_URL) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`Invalid BASE_URL '${value}'`);
  }
}

export function parseBooleanEnv(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value === "1" || value.toLowerCase() === "true";
}

export function trimAgentName(value, fallback = DEFAULT_AGENT_NAME) {
  const normalized = (value ?? fallback).trim().slice(0, 15);
  return normalized.length > 0 ? normalized : fallback;
}

export function sanitizeFileSegment(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function finiteOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function captureProfileFromUrl(value) {
  try {
    const params = new URL(value).searchParams;
    const namedProfile = params.get("qaProfile")?.trim().toLowerCase();
    if (namedProfile) return namedProfile;
    return params.has("shot") ? "cell-review" : "qa";
  } catch {
    return null;
  }
}

export function assertSafeRuntimeSearchParams(extraSearchParams, options = {}) {
  const protectedParams = new Set(options.protectedParams ?? RUNTIME_IDENTITY_SEARCH_PARAMS);
  const collisions = Object.entries(extraSearchParams ?? {})
    .filter(([key, value]) => protectedParams.has(key) && value !== null && value !== undefined && value !== false)
    .map(([key]) => key)
    .sort();
  if (collisions.length > 0) {
    throw new Error(
      `[runtime-url] extra search parameters cannot override protected keys: ${collisions.join(", ")}`,
    );
  }
}

export function assertSafeCaptureSearchParams(extraSearchParams) {
  assertSafeRuntimeSearchParams(extraSearchParams, {
    protectedParams: CAPTURE_PROTECTED_SEARCH_PARAMS,
  });
}

export function assertCaptureSearchParamsPolicy(extraSearchParams, options = {}) {
  assertSafeCaptureSearchParams(extraSearchParams);
  if (options.diagnosticMode === true) return;
  const allowed = new Set(SIGNOFF_CAPTURE_EXTRA_SEARCH_PARAMS);
  const unsupported = Object.entries(extraSearchParams ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key]) => key)
    .filter((key) => !allowed.has(key))
    .sort();
  if (unsupported.length > 0) {
    throw new Error(
      `[capture:shots] signoff capture rejects non-diagnostic render overrides: ${unsupported.join(", ")}; set DIAGNOSTIC_MODE=1 for non-signoff look-development captures`,
    );
  }
}

export function assertAuthoredCaptureShotIds(shotIds, authoredShotIds) {
  if (!Array.isArray(shotIds) || shotIds.length === 0) {
    throw new Error("[capture:shots] at least one authored shot id is required");
  }
  if (!Array.isArray(authoredShotIds)) return;
  const authored = new Set(authoredShotIds);
  const unknown = shotIds.filter((shotId) => !authored.has(shotId));
  if (unknown.length > 0) {
    throw new Error(`[capture:shots] unknown authored shot ids: ${unknown.join(", ")}`);
  }
}

function angleDeltaDeg(a, b) {
  let delta = Math.abs(a - b) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta;
}

function normalizeCameraTolerance(value = {}) {
  return {
    positionM: Math.max(0, finiteOr(value.positionM, DEFAULT_SHOT_CAMERA_TOLERANCE.positionM)),
    angleDeg: Math.max(0, finiteOr(value.angleDeg, DEFAULT_SHOT_CAMERA_TOLERANCE.angleDeg)),
    fovDeg: Math.max(0, finiteOr(value.fovDeg, DEFAULT_SHOT_CAMERA_TOLERANCE.fovDeg)),
  };
}

export function evaluateRuntimeShotCameraPose(state, tolerance = {}) {
  const resolvedTolerance = normalizeCameraTolerance(tolerance);
  const expected = state?.shot?.cameraPose;
  const actual = state?.view?.camera;

  if (!state?.shot?.active || !expected || !actual) {
    return {
      matches: false,
      reason: "active shot camera metadata and live view camera are required",
      tolerance: resolvedTolerance,
      expected: expected ?? null,
      actual: actual ?? null,
      deltas: null,
    };
  }

  const expectedValues = [
    expected.pos?.x,
    expected.pos?.y,
    expected.pos?.z,
    expected.lookAt?.x,
    expected.lookAt?.y,
    expected.lookAt?.z,
    expected.fovDeg,
  ];
  const actualValues = [
    actual.pos?.x,
    actual.pos?.y,
    actual.pos?.z,
    actual.yawDeg,
    actual.pitchDeg,
    actual.fovDeg,
  ];
  if (![...expectedValues, ...actualValues].every((value) => typeof value === "number" && Number.isFinite(value))) {
    return {
      matches: false,
      reason: "shot camera metadata contains a non-finite value",
      tolerance: resolvedTolerance,
      expected,
      actual,
      deltas: null,
    };
  }

  const dx = expected.lookAt.x - expected.pos.x;
  const dy = expected.lookAt.y - expected.pos.y;
  const dz = expected.lookAt.z - expected.pos.z;
  const directionLength = Math.hypot(dx, dy, dz);
  const horizontalDirectionLength = Math.hypot(dx, dz);
  if (directionLength <= 1e-6) {
    return {
      matches: false,
      reason: "shot camera position and lookAt must not be identical",
      tolerance: resolvedTolerance,
      expected,
      actual,
      deltas: null,
    };
  }

  const expectedYawDeg = Math.atan2(-dx, -dz) * RAD_TO_DEG;
  const expectedPitchDeg = Math.asin(dy / directionLength) * RAD_TO_DEG;
  const deltas = {
    positionM: Math.hypot(
      actual.pos.x - expected.pos.x,
      actual.pos.y - expected.pos.y,
      actual.pos.z - expected.pos.z,
    ),
    // Yaw is undefined for a straight-up/down camera, so only pitch can verify
    // that orientation without inventing a horizontal heading.
    yawDeg: horizontalDirectionLength / directionLength <= 1e-6
      ? 0
      : angleDeltaDeg(actual.yawDeg, expectedYawDeg),
    pitchDeg: Math.abs(actual.pitchDeg - expectedPitchDeg),
    fovDeg: Math.abs(actual.fovDeg - expected.fovDeg),
  };
  const matches =
    deltas.positionM <= resolvedTolerance.positionM &&
    deltas.yawDeg <= resolvedTolerance.angleDeg &&
    deltas.pitchDeg <= resolvedTolerance.angleDeg &&
    deltas.fovDeg <= resolvedTolerance.fovDeg;

  return {
    matches,
    reason: matches
      ? null
      : `live camera differs from authored shot (position=${deltas.positionM.toFixed(4)}m, yaw=${deltas.yawDeg.toFixed(3)}deg, pitch=${deltas.pitchDeg.toFixed(3)}deg, fov=${deltas.fovDeg.toFixed(3)}deg)`,
    tolerance: resolvedTolerance,
    expected: {
      ...expected,
      yawDeg: expectedYawDeg,
      pitchDeg: expectedPitchDeg,
    },
    actual,
    deltas,
  };
}

export function assertRuntimeShotCameraPose(state, tolerance = {}) {
  const result = evaluateRuntimeShotCameraPose(state, tolerance);
  if (!result.matches) {
    throw new Error(`[shot-camera] ${result.reason}`);
  }
  return result;
}

export async function readScreenshotCoverage(filePath) {
  const { data, info } = await sharp(filePath)
    .resize({
      width: SCREEN_COVERAGE_SAMPLE_WIDTH,
      height: SCREEN_COVERAGE_SAMPLE_HEIGHT,
      fit: "fill",
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = info.width * info.height;
  const luminances = new Float32Array(pixelCount);
  const red = new Float32Array(pixelCount);
  const green = new Float32Array(pixelCount);
  const blue = new Float32Array(pixelCount);

  for (let index = 0; index < luminances.length; index += 1) {
    const offset = index * channels;
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;
    red[index] = r;
    green[index] = g;
    blue[index] = b;
    luminances[index] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  let detailPixels = 0;
  let upperDetailPixels = 0;
  let samples = 0;
  let upperSamples = 0;
  const upperLimit = Math.ceil(info.height / 3);
  for (let y = 0; y < info.height - 1; y += 1) {
    for (let x = 0; x < info.width - 1; x += 1) {
      const index = y * info.width + x;
      const edge = Math.max(
        Math.abs(luminances[index] - luminances[index + 1]),
        Math.abs(luminances[index] - luminances[index + info.width]),
      );
      const detailed = edge >= DETAIL_EDGE_THRESHOLD;
      if (detailed) detailPixels += 1;
      samples += 1;
      if (y < upperLimit) {
        if (detailed) upperDetailPixels += 1;
        upperSamples += 1;
      }
    }
  }

  const localEdgeAt = (index) => {
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    let edge = 0;
    if (x > 0) edge = Math.max(edge, Math.abs(luminances[index] - luminances[index - 1]));
    if (x + 1 < info.width) edge = Math.max(edge, Math.abs(luminances[index] - luminances[index + 1]));
    if (y > 0) edge = Math.max(edge, Math.abs(luminances[index] - luminances[index - info.width]));
    if (y + 1 < info.height) edge = Math.max(edge, Math.abs(luminances[index] - luminances[index + info.width]));
    return edge;
  };
  const skyColorCandidate = (index) => (
    luminances[index] >= SKY_MIN_LUMINANCE &&
    blue[index] >= red[index] * SKY_BLUE_RED_RATIO &&
    blue[index] >= green[index] * SKY_BLUE_GREEN_RATIO &&
    localEdgeAt(index) <= SKY_MAX_LOCAL_EDGE
  );
  const colorDistance = (left, right) => Math.hypot(
    red[left] - red[right],
    green[left] - green[right],
    blue[left] - blue[right],
  );

  // Sky is measured as the smooth, sky-colored region connected to the top
  // image boundary. Unlike the former inverse-edge estimate, detailed walls
  // cannot manufacture a low sky ratio and a blank floor cannot become sky.
  const skyMask = new Uint8Array(pixelCount);
  const queue = [];
  for (let x = 0; x < info.width; x += 1) {
    const index = x;
    if (!skyColorCandidate(index)) continue;
    skyMask[index] = 1;
    queue.push(index);
  }
  let skyPixels = 0;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    skyPixels += 1;
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x + 1 < info.width) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - info.width);
    if (y + 1 < info.height) neighbors.push(index + info.width);
    for (const neighbor of neighbors) {
      if (skyMask[neighbor] || !skyColorCandidate(neighbor)) continue;
      if (colorDistance(index, neighbor) > SKY_MAX_NEIGHBOR_DISTANCE) continue;
      skyMask[neighbor] = 1;
      queue.push(neighbor);
    }
  }

  const detailRatio = samples === 0 ? 0 : detailPixels / samples;
  const upperDetailRatio = upperSamples === 0 ? 0 : upperDetailPixels / upperSamples;
  const skyRatio = pixelCount === 0 ? 0 : clamp01(skyPixels / pixelCount);
  return {
    method: "top-connected-sky-color-v2",
    detailRatio,
    upperDetailRatio,
    skyRatio,
    nonSkyRatio: 1 - skyRatio,
    // Backward-compatible aliases for older review artifacts.
    estimatedSkyRatio: skyRatio,
    estimatedNonSkyRatio: 1 - skyRatio,
    skyOnly: skyRatio >= 0.92,
  };
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function buildRuntimeUrl(baseUrl, options = {}) {
  const {
    mapId = DEFAULT_MAP_ID,
    autostart = "agent",
    agentName,
    shot,
    spawn,
    extraSearchParams = {},
  } = options;
  assertSafeRuntimeSearchParams(extraSearchParams);

  const url = new URL("/", parseBaseUrl(baseUrl));
  url.searchParams.set("map", mapId);
  url.searchParams.set("autostart", autostart);
  const fallbackName = autostart === "human" ? DEFAULT_HUMAN_NAME : DEFAULT_AGENT_NAME;
  url.searchParams.set("name", trimAgentName(agentName, fallbackName));
  if (shot) {
    url.searchParams.set("shot", shot);
  }
  if (spawn) {
    url.searchParams.set("spawn", spawn);
  }

  for (const [key, rawValue] of Object.entries(extraSearchParams)) {
    if (rawValue === null || rawValue === undefined || rawValue === false) continue;
    url.searchParams.set(key, String(rawValue));
  }

  return url.toString();
}

export async function launchBrowser(options = {}) {
  const {
    headless = false,
    viewport = DEFAULT_VIEWPORT,
  } = options;

  const browser = await chromium
    .launch({
      channel: "chrome",
      headless,
    })
    .catch(() => chromium.launch({ headless }));

  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function launchBrowserProcess(options = {}) {
  const {
    headless = false,
  } = options;
  return chromium
    .launch({
      channel: "chrome",
      headless,
    })
    .catch(() => chromium.launch({ headless }));
}

export async function closeBrowserResources(resources, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_BROWSER_CLEANUP_TIMEOUT_MS;
  const failures = [];
  for (const [label, resource] of [
    ["page", resources?.page],
    ["context", resources?.context],
    ["browser", resources?.browser],
  ]) {
    if (!resource || typeof resource.close !== "function") continue;
    try {
      await withTimeout(() => resource.close(), timeoutMs, `${label} cleanup`);
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`[browser-cleanup] ${failures.join(" | ")}`);
  }
}

export function attachConsoleRecorder(page) {
  const events = [];

  const push = (event) => {
    events.push({
      ...event,
      recordedAt: new Date().toISOString(),
    });
  };

  page.on("console", (message) => {
    push({
      kind: "console",
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    push({
      kind: "pageerror",
      type: "error",
      text: error.message,
      stack: error.stack ?? null,
    });
  });

  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "request failed";
    const aborted = /ERR_ABORTED|NS_BINDING_ABORTED|aborted|cancelled/i.test(errorText);
    push({
      kind: "requestfailed",
      // Navigating between authored shots intentionally cancels loading-screen
      // audio and other in-flight resources. Keep the event for diagnostics,
      // but do not misreport a browser cancellation as a console warning.
      type: aborted ? "info" : "error",
      text: errorText,
      url: request.url(),
      method: request.method(),
    });
  });

  const recorder = {
    clear() {
      events.length = 0;
    },
    snapshot() {
      return events.map((event) => ({ ...event }));
    },
    counts() {
      const errorCount = events.filter((event) => event.type === "error" || event.kind === "pageerror").length;
      const warningCount = events.filter((event) => event.type === "warning" || event.type === "warn").length;
      return {
        errorCount,
        warningCount,
        total: events.length,
      };
    },
  };
  consoleRecorderByPage.set(page, recorder);
  return recorder;
}

export function attachNetworkRecorder(page) {
  let requestCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let requestBytes = 0;
  let responseBytes = 0;
  const pendingMeasurements = new Set();
  const requestUrls = new Set();

  page.on("request", (request) => {
    requestCount += 1;
    requestUrls.add(request.url());
  });
  page.on("requestfinished", (request) => {
    completedCount += 1;
    const measurement = request.sizes()
      .then((sizes) => {
        requestBytes += (sizes.requestHeadersSize ?? 0) + (sizes.requestBodySize ?? 0);
        responseBytes += (sizes.responseHeadersSize ?? 0) + (sizes.responseBodySize ?? 0);
      })
      .catch(() => {})
      .finally(() => pendingMeasurements.delete(measurement));
    pendingMeasurements.add(measurement);
  });
  page.on("requestfailed", () => {
    failedCount += 1;
  });

  return {
    async snapshot() {
      await Promise.allSettled([...pendingMeasurements]);
      const normalizedRequestUrls = [...requestUrls]
        .map((requestUrl) => normalizeNetworkRequestUrl(requestUrl, page.url()))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
      return {
        requestCount,
        completedCount,
        failedCount,
        pendingCount: Math.max(0, requestCount - completedCount - failedCount),
        requestBytes,
        responseBytes,
        transferBytes: requestBytes + responseBytes,
        requestUrls: normalizedRequestUrls,
        non1kTextureRequests: findHighResolutionTextureRequests(normalizedRequestUrls),
      };
    },
  };
}

export function normalizeNetworkRequestUrl(rawUrl, pageUrl = null) {
  try {
    const requestUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(requestUrl.protocol)) return null;
    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      pathname = requestUrl.pathname;
    }
    let pageOrigin = null;
    try {
      const parsedPage = new URL(pageUrl);
      if (["http:", "https:"].includes(parsedPage.protocol)) pageOrigin = parsedPage.origin;
    } catch {
      // Before navigation, retain the absolute origin below.
    }
    return requestUrl.origin === pageOrigin
      ? pathname
      : `${requestUrl.origin}${pathname}`;
  } catch {
    return null;
  }
}

const TEXTURE_REQUEST_EXTENSION = /\.(?:avif|basis|bmp|dds|exr|hdr|jpe?g|ktx2?|png|tga|webp)$/i;
const HIGH_RESOLUTION_TIER_SEGMENT = /(?:^|[_-])(?:2k|4k)(?=$|[_-])/i;

export function findHighResolutionTextureRequests(requestUrls) {
  return [...new Set(requestUrls ?? [])]
    .filter((requestUrl) => {
      let pathname = requestUrl;
      try {
        pathname = new URL(requestUrl, "http://qa.invalid").pathname;
      } catch {
        // Use the recorded normalized request ID as-is.
      }
      const basename = pathname.slice(pathname.lastIndexOf("/") + 1);
      const extensionIndex = basename.lastIndexOf(".");
      const stem = extensionIndex > 0 ? basename.slice(0, extensionIndex) : basename;
      return TEXTURE_REQUEST_EXTENSION.test(basename)
        && HIGH_RESOLUTION_TIER_SEGMENT.test(stem);
    })
    .sort((left, right) => left.localeCompare(right));
}

export function assertQaNetworkTexturePolicy(network, runtimeUrl) {
  const params = new URL(runtimeUrl).searchParams;
  const qaProfile = captureProfileFromUrl(runtimeUrl);
  const requestedTier = params.get("floorRes") ?? params.get("floor-res") ?? "1k";
  if (
    params.get("qa") !== "1"
    || !["qa", "cell-review"].includes(qaProfile)
    || requestedTier.toLowerCase() !== "1k"
  ) {
    return network;
  }
  const rejected = network?.non1kTextureRequests
    ?? findHighResolutionTextureRequests(network?.requestUrls ?? []);
  if (rejected.length > 0) {
    throw new Error(
      `[qa-network] 1K capture requested 2K/4K texture assets: ${rejected.join(", ")}`,
    );
  }
  return network;
}

export async function startTracing(context) {
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
}

export async function stopTracing(context, tracePath) {
  await ensureDir(path.dirname(tracePath));
  await context.tracing.stop({ path: tracePath });
}

function runtimeOperationSubject(options = {}) {
  const route = options.routeId ? `route=${options.routeId}` : null;
  const shot = options.shotId ? `shot=${options.shotId}` : null;
  return [route, shot].filter(Boolean).join(" ") || "route/shot=unscoped";
}

function defaultRuntimeDiagnosticDir(options = {}) {
  const subject = sanitizeFileSegment(options.routeId ?? options.shotId ?? "unscoped");
  const operation = sanitizeFileSegment(options.operation ?? "runtime-state");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(
    process.cwd(),
    options.artifactDir ?? `../../artifacts/playwright/runtime-read-failures/${timestamp}-${subject}-${operation}`,
  );
}

export function classifyRuntimeFailure({ error, heartbeat, pageClosed }) {
  const message = error instanceof Error ? error.message : String(error);
  if (/ERR_CONNECTION|ECONNREFUSED|server closed|net::ERR_/i.test(message)) return "server-failure";
  if (/execution context was destroyed|navigation|frame was detached/i.test(message)) return "navigation-race";
  if (pageClosed || /target closed|page closed|browser has been closed/i.test(message)) return "browser-page-failure";
  if (heartbeat?.stateSerializationInProgress === true) return "state-serialization-stall";
  if (heartbeat && heartbeat.mainLoopAdvancing === false) return "runtime-loop-stall";
  if (!heartbeat) return "browser-page-failure";
  return "runtime-state-read-failure";
}

async function collectRuntimeFailureDiagnostics(page, options, error) {
  const artifactDir = defaultRuntimeDiagnosticDir(options);
  const recorder = options.consoleRecorder ?? consoleRecorderByPage.get(page);
  const screenshotPath = path.join(artifactDir, "failure.png");
  const consolePath = path.join(artifactDir, "console.json");
  const diagnosticsPath = path.join(artifactDir, "diagnostics.json");
  await ensureDir(artifactDir);

  let heartbeat = null;
  let readyState = null;
  let screenshotError = null;
  try {
    const debug = await withTimeout(
      () => page.evaluate(() => ({
        heartbeat: window.__qa_heartbeat?.() ?? null,
        readyState: window.__runtime_ready_state?.() ?? null,
      })),
      1_500,
      "runtime debug-state read",
    );
    heartbeat = debug?.heartbeat ?? null;
    readyState = debug?.readyState ?? null;
  } catch {
    // A frozen renderer/main thread can prevent even the lightweight heartbeat
    // read. The missing value is itself diagnostic and is persisted below.
  }
  try {
    await withTimeout(
      () => page.screenshot({ path: screenshotPath, timeout: 2_000 }),
      2_500,
      "runtime failure screenshot",
    );
  } catch (screenshotFailure) {
    screenshotError = screenshotFailure instanceof Error ? screenshotFailure.message : String(screenshotFailure);
  }

  const consolePayload = {
    events: recorder?.snapshot?.() ?? [],
    counts: recorder?.counts?.() ?? { errorCount: 0, warningCount: 0, total: 0 },
  };
  await writeJson(consolePath, consolePayload);
  const diagnostics = {
    failedAt: new Date().toISOString(),
    operation: options.operation ?? "runtime-state",
    routeId: options.routeId ?? null,
    shotId: options.shotId ?? null,
    url: page.url(),
    lastSuccessfulStateAt: lastSuccessfulStateAtByPage.get(page) ?? null,
    heartbeat,
    readyState,
    failureKind: classifyRuntimeFailure({
      error,
      heartbeat,
      pageClosed: page.isClosed?.() === true,
    }),
    screenshotPath: screenshotError ? null : screenshotPath,
    screenshotError,
    consolePath,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    } : { message: String(error) },
  };
  await writeJson(diagnosticsPath, diagnostics);
  return { artifactDir, diagnosticsPath, ...diagnostics };
}

export async function evaluateRuntimeState(page, pageFunction, arg, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_STATE_READ_TIMEOUT_MS;
  const operation = options.operation ?? "runtime-state";
  const subject = runtimeOperationSubject(options);
  const url = page.url();
  try {
    const value = await withTimeout(
      () => page.evaluate(pageFunction, arg),
      timeoutMs,
      `${operation} (${subject})`,
    );
    if (value && typeof value === "object") {
      lastSuccessfulStateAtByPage.set(page, new Date().toISOString());
    }
    return value;
  } catch (error) {
    const diagnostics = await collectRuntimeFailureDiagnostics(page, { ...options, operation }, error);
    const message = [
      `[runtime-state] ${operation} failed`,
      `kind=${diagnostics.failureKind}`,
      subject,
      `url=${url}`,
      `lastSuccessfulStateAt=${diagnostics.lastSuccessfulStateAt ?? "never"}`,
      `diagnostics=${diagnostics.diagnosticsPath}`,
      error instanceof Error ? error.message : String(error),
    ].join(" | ");
    throw new RuntimeOperationTimeoutError(message, diagnostics);
  }
}

export async function readRuntimeState(page, options = {}) {
  const state = await evaluateRuntimeState(page, () => {
    if (typeof window.render_game_to_text !== "function") {
      return null;
    }

    try {
      return JSON.parse(window.render_game_to_text());
    } catch {
      return null;
    }
  }, undefined, {
    ...options,
    operation: options.operation ?? "readRuntimeState",
  });

  if (!state || typeof state !== "object") {
    throw new Error("Runtime state is unavailable");
  }

  return state;
}

export function validateQaRouteState(state) {
  const errors = [];
  if (!isRecord(state)) {
    return { passed: false, errors: ["route state must be an object"] };
  }
  if (!isRecord(state.gameplay) || typeof state.gameplay.alive !== "boolean") {
    errors.push("gameplay.alive must be a boolean");
  }
  if (!isRecord(state.player)) {
    errors.push("player must be an object");
  } else {
    const position = state.player.pos;
    if (
      !isRecord(position)
      || !finiteNumber(position.x)
      || !finiteNumber(position.y)
      || !finiteNumber(position.z)
    ) {
      errors.push("player.pos must contain finite x, y, and z numbers");
    }
    if (typeof state.player.withinPlayableBounds !== "boolean") {
      errors.push("player.withinPlayableBounds must be a boolean");
    }
    if (!nonEmptyString(state.player.zoneId)) {
      errors.push("player.zoneId must be a non-empty authored zone id");
    }
    const collision = state.player.collision;
    if (
      !isRecord(collision)
      || ["hitX", "hitY", "hitZ", "grounded"].some((key) => typeof collision[key] !== "boolean")
    ) {
      errors.push("player.collision must contain boolean hitX, hitY, hitZ, and grounded fields");
    }
  }
  return { passed: errors.length === 0, errors };
}

export function assertQaRouteOperationalState(state, options = {}) {
  const routeId = options.routeId ?? "unknown-route";
  const operation = options.operation ?? "route polling";
  if (state.gameplay.alive !== true) {
    throw new Error(`[${routeId}] player died during ${operation}`);
  }
  if (state.player.withinPlayableBounds !== true) {
    throw new Error(`[${routeId}] player left playable bounds during ${operation}`);
  }
  return state;
}

export async function readRouteRuntimeState(page, options = {}) {
  const state = await evaluateRuntimeState(
    page,
    () => window.__qa_route_state?.() ?? null,
    undefined,
    { ...options, operation: options.operation ?? "readRouteRuntimeState" },
  );
  const validation = validateQaRouteState(state);
  if (!validation.passed) {
    throw new Error(`[qa-route-state] ${validation.errors.join(" | ")}`);
  }
  return state;
}

async function readOperationalRouteRuntimeState(page, options = {}) {
  const state = await readRouteRuntimeState(page, options);
  return assertQaRouteOperationalState(state, options);
}

export async function getDocumentedAgentApiStatus(page) {
  return evaluateRuntimeState(
    page,
    () => ({
      agentObserve: typeof window.agent_observe === "function",
      renderGameToText: typeof window.render_game_to_text === "function",
      agentApplyAction: typeof window.agent_apply_action === "function",
      advanceTime: typeof window.advanceTime === "function",
    }),
    undefined,
    { operation: "getDocumentedAgentApiStatus" },
  );
}

export async function readDocumentedAgentState(page) {
  const state = await evaluateRuntimeState(page, () => {
    const read = () => {
      if (typeof window.agent_observe === "function") {
        return window.agent_observe();
      }
      if (typeof window.render_game_to_text === "function") {
        return window.render_game_to_text();
      }
      return null;
    };

    const raw = read();
    if (typeof raw !== "string") {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, undefined, { operation: "readDocumentedAgentState" });

  if (!state || typeof state !== "object") {
    throw new Error("Documented agent state is unavailable");
  }

  return state;
}

export async function waitForDocumentedRuntimeReady(page, options = {}) {
  const {
    timeoutMs = DEFAULT_RUNTIME_READY_TIMEOUT_MS,
  } = options;

  await page.waitForFunction(() => {
    const read = () => {
      if (typeof window.agent_observe === "function") {
        return window.agent_observe();
      }
      if (typeof window.render_game_to_text === "function") {
        return window.render_game_to_text();
      }
      return null;
    };

    const raw = read();
    if (typeof raw !== "string") return false;

    try {
      const state = JSON.parse(raw);
      if (state.mode !== "runtime") return false;
      return state.runtimeReady === true;
    } catch {
      return false;
    }
  }, { timeout: timeoutMs });

  return readDocumentedAgentState(page);
}

export async function gotoAgentRuntimeViaUi(page, options = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    agentName = DEFAULT_AGENT_NAME,
  } = options;

  await page.goto(new URL("/", parseBaseUrl(baseUrl)).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("agent-mode").click();
  await page.getByTestId("play").click();
  const agentNameInput = page.getByTestId("agent-name");
  await agentNameInput.fill(trimAgentName(agentName));
  await agentNameInput.press("Enter");

  return waitForDocumentedRuntimeReady(page);
}

export async function waitForRuntimeReady(page, options = {}) {
  const {
    timeoutMs = DEFAULT_RUNTIME_READY_TIMEOUT_MS,
    expectedShotId = null,
    routeId = null,
    artifactDir = null,
    assetTimeoutMs = null,
  } = options;

  const bootStartedAt = Date.now();
  let lastBootState = null;
  let lastBootError = null;
  let consecutiveProbeTimeouts = 0;
  while (Date.now() - bootStartedAt <= timeoutMs) {
    try {
      lastBootState = await withTimeout(
        () => page.evaluate((shotId) => {
          const qaCapture = window.__qa_capture_state?.() ?? null;
          try {
            if (typeof window.__runtime_ready_state === "function") {
              const ready = window.__runtime_ready_state();
              const runtimeReady = ready.mapLoaded === true
                && ready.revealPhase === "active"
                && (
                  !shotId
                  || (shotId === "compare"
                    ? ready.shotActive === true
                    : ready.shotActive === true && ready.shotId === shotId)
                );
              return { runtimeReady, readyState: ready, qaCapture };
            }
            // Older/non-QA runtimes expose only the documented state. Avoid
            // this expensive serialization while the lightweight QA tracker
            // is available during early asset loading.
            if (!qaCapture && typeof window.render_game_to_text === "function") {
              const state = JSON.parse(window.render_game_to_text());
              const runtimeReady = state.mode === "runtime"
                && state.map?.loaded === true
                && state.boot?.revealPhase === "active"
                && (
                  !shotId
                  || (shotId === "compare"
                    ? state.shot?.active === true
                    : state.shot?.active === true && state.shot?.id === shotId)
                );
              return { runtimeReady, readyState: null, qaCapture };
            }
          } catch {
            // A partially installed runtime is expected while boot is active.
          }
          return { runtimeReady: false, readyState: null, qaCapture };
        }, expectedShotId),
        Math.min(2_000, Math.max(1, timeoutMs - (Date.now() - bootStartedAt))),
        "runtime boot readiness probe",
      );
      consecutiveProbeTimeouts = 0;
      lastBootError = null;
      const capture = lastBootState?.qaCapture;
      const captureValidation = capture
        ? validateQaCaptureState(capture, {
            phase: capture.ready === true ? "ready" : "boot",
            expectedProfile: captureProfileFromUrl(page.url()),
          })
        : null;
      if (captureValidation && !captureValidation.passed) {
        if (artifactDir) {
          await writeJson(path.join(artifactDir, "capture-readiness-failure.json"), {
            failedAt: new Date().toISOString(),
            routeId,
            shotId: expectedShotId,
            phase: "runtime-boot",
            state: capture,
            errors: captureValidation.errors,
          });
        }
        throw new Error(
          `[qa-capture] asset readiness failed during runtime boot | route=${routeId ?? "none"} | shot=${expectedShotId ?? "none"} | ${captureValidation.errors.join(" | ")} | state=${JSON.stringify(capture)}`,
        );
      }
      if (lastBootState?.runtimeReady === true) break;
    } catch (error) {
      if (error instanceof Error && error.message.includes("[qa-capture]")) throw error;
      if (error instanceof RuntimeOperationTimeoutError) {
        // Asset compilation can briefly occupy the browser main thread for
        // more than the lightweight 2s probe budget. Treat one or two isolated
        // stalls as boot progress; three consecutive stalls still fail fast
        // instead of hiding a genuinely wedged runtime until the 90s deadline.
        consecutiveProbeTimeouts += 1;
        lastBootError = error;
        if (consecutiveProbeTimeouts >= 3) {
          throw new RuntimeOperationTimeoutError(
            `[runtime-ready] lightweight boot probe stalled repeatedly | route=${routeId ?? "none"} | shot=${expectedShotId ?? "none"} | ${error.message}`,
            {
              routeId,
              shotId: expectedShotId,
              timeoutMs: error.details?.timeoutMs ?? 2_000,
            },
          );
        }
      } else {
        lastBootError = error;
      }
    }
    await page.waitForTimeout(50);
  }
  if (lastBootState?.runtimeReady !== true) {
    throw new RuntimeOperationTimeoutError(
      `[runtime-ready] boot did not become active within ${timeoutMs}ms | route=${routeId ?? "none"} | shot=${expectedShotId ?? "none"} | qaCapture=${JSON.stringify(lastBootState?.qaCapture ?? null)} | last=${lastBootError instanceof Error ? lastBootError.message : String(lastBootError ?? "none")}`,
      {
        routeId,
        shotId: expectedShotId,
        timeoutMs,
        qaCapture: lastBootState?.qaCapture ?? null,
      },
    );
  }

  const qaCapture = await waitForQaCaptureReady(page, {
    timeoutMs: assetTimeoutMs ?? qaAssetTimeoutFromUrl(page.url()),
    routeId,
    shotId: expectedShotId,
    artifactDir,
  });
  const state = await readRuntimeState(page, {
    operation: "runtime-ready-state",
    routeId,
    shotId: expectedShotId,
    artifactDir,
  });
  if (qaCapture) state.qaCapture = qaCapture;
  return state;
}

export async function gotoAgentRuntime(page, options = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    mapId = DEFAULT_MAP_ID,
    agentName = DEFAULT_AGENT_NAME,
    spawn = "A",
    shot = null,
    extraSearchParams: rawExtraSearchParams = {},
    timeoutMs = DEFAULT_RUNTIME_READY_TIMEOUT_MS,
    artifactDir = null,
    routeId = null,
  } = options;
  // The runtime clamps this to [1s, 120s]; the env knob lets software-rendered
  // hosts extend the in-page asset budget without touching every caller.
  const assetTimeoutOverride = Number(process.env.QA_ASSET_READY_TIMEOUT_MS);
  const extraSearchParams = Number.isFinite(assetTimeoutOverride)
    && assetTimeoutOverride >= 1_000
    && !("qaAssetTimeoutMs" in rawExtraSearchParams)
    ? { ...rawExtraSearchParams, qaAssetTimeoutMs: Math.round(assetTimeoutOverride) }
    : rawExtraSearchParams;

  await page.goto(
    buildRuntimeUrl(baseUrl, {
      mapId,
      autostart: "agent",
      agentName,
      spawn,
      shot,
      extraSearchParams,
    }),
    { waitUntil: "domcontentloaded", timeout: timeoutMs },
  );

  return waitForRuntimeReady(page, {
    expectedShotId: shot,
    timeoutMs,
    routeId: routeId ?? agentName,
    artifactDir,
  });
}

export async function gotoHumanShot(page, options = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    mapId = DEFAULT_MAP_ID,
    shot = "compare",
    spawn = "A",
    extraSearchParams = {},
    timeoutMs = DEFAULT_RUNTIME_READY_TIMEOUT_MS,
    artifactDir = null,
  } = options;

  await page.goto(
    buildRuntimeUrl(baseUrl, {
      mapId,
      autostart: "human",
      shot,
      spawn,
      extraSearchParams,
    }),
    { waitUntil: "domcontentloaded", timeout: timeoutMs },
  );

  return waitForRuntimeReady(page, {
    expectedShotId: shot,
    timeoutMs,
    artifactDir,
  });
}

export async function advanceRuntime(page, stepMs, options = {}) {
  const usedAdvanceTime = await evaluateRuntimeState(
    page,
    async (ms) => {
      if (typeof window.advanceTime !== "function") {
        return false;
      }

      await window.advanceTime(ms);
      return true;
    },
    stepMs,
    { ...options, operation: options.operation ?? "advanceRuntime" },
  );

  if (!usedAdvanceTime) {
    await page.waitForTimeout(stepMs);
  }

  return usedAdvanceTime;
}

export async function renderRuntimeFrame(page) {
  const rendered = await evaluateRuntimeState(
    page,
    () => {
      if (typeof window.__qa_render_frame !== "function") return false;
      window.__qa_render_frame();
      return true;
    },
    undefined,
    { operation: "renderRuntimeFrame" },
  );
  if (!rendered) await advanceRuntime(page, 16);
}

export async function readQaPerformanceState(page, options = {}) {
  return evaluateRuntimeState(
    page,
    () => window.__qa_performance_state?.() ?? null,
    undefined,
    { ...options, operation: options.operation ?? "readQaPerformanceState" },
  );
}

function qaAssetTimeoutFromUrl(url) {
  try {
    const requested = Number(new URL(url).searchParams.get("qaAssetTimeoutMs"));
    return Number.isFinite(requested) && requested > 0
      ? requested
      : DEFAULT_QA_ASSET_READY_TIMEOUT_MS;
  } catch {
    return DEFAULT_QA_ASSET_READY_TIMEOUT_MS;
  }
}

function requiresQaCaptureState(url) {
  try {
    const params = new URL(url).searchParams;
    return params.get("qa") === "1";
  } catch {
    return false;
  }
}

export function validateQaCaptureState(state, options = {}) {
  const {
    phase = "ready",
    expectedProfile = null,
    oneKOnly = expectedProfile === "qa" || expectedProfile === "cell-review",
  } = options;
  const errors = [];
  if (!isRecord(state)) {
    return { passed: false, errors: ["capture state must be an object"] };
  }
  if (state.schemaVersion !== QA_CAPTURE_STATE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${QA_CAPTURE_STATE_SCHEMA_VERSION}`);
  }
  if (!["qa", "cell-review"].includes(state.profile)) {
    errors.push("profile must be 'qa' or 'cell-review'");
  }
  if (expectedProfile && state.profile !== expectedProfile) {
    errors.push(`profile must equal '${expectedProfile}'`);
  }
  if (!nonEmptyString(state.planHash)) {
    errors.push("planHash must be a non-empty string");
  }
  if (phase === "ready") {
    if (!nonEmptyString(state.observedPlanHash)) {
      errors.push("observedPlanHash must be a non-empty string");
    }
  } else if (state.observedPlanHash !== null && !nonEmptyString(state.observedPlanHash)) {
    errors.push("observedPlanHash must be null or a non-empty string during boot");
  }
  if (
    nonEmptyString(state.planHash)
    && nonEmptyString(state.observedPlanHash)
    && state.planHash !== state.observedPlanHash
    && (phase === "ready" || (Array.isArray(state.pending) && state.pending.length === 0))
  ) {
    errors.push("observedPlanHash must match planHash");
  }
  if (!Array.isArray(state.pending) || state.pending.some((id) => !nonEmptyString(id))) {
    errors.push("pending must be an array of non-empty request ids");
  }
  if (
    !Array.isArray(state.failed)
    || state.failed.some((failure) => (
      !isRecord(failure)
      || !nonEmptyString(failure.id)
      || !nonEmptyString(failure.message)
    ))
  ) {
    errors.push("failed must be an array of { id, message } records");
  } else if (state.failed.length > 0) {
    errors.push(`failed assets must be empty (${state.failed.map((failure) => failure.id).join(", ")})`);
  }
  for (const field of ["totalRequests", "requestedCount", "completedCount", "textureCount", "stableFrameCount"]) {
    if (!nonNegativeInteger(state[field])) {
      errors.push(`${field} must be a non-negative integer`);
    }
  }
  if (
    nonNegativeInteger(state.totalRequests)
    && nonNegativeInteger(state.requestedCount)
    && state.totalRequests !== state.requestedCount
  ) {
    errors.push("totalRequests must equal requestedCount");
  }
  if (
    nonNegativeInteger(state.completedCount)
    && nonNegativeInteger(state.requestedCount)
    && state.completedCount > state.requestedCount
  ) {
    errors.push("completedCount cannot exceed requestedCount");
  }
  if (!Array.isArray(state.resolvedTextures)) {
    errors.push("resolvedTextures must be an array");
  } else {
    for (const entry of state.resolvedTextures) {
      if (
        !isRecord(entry)
        || !["floor", "wall"].includes(entry.kind)
        || !nonEmptyString(entry.materialId)
        || !["1k", "2k", "4k"].includes(entry.requestedTier)
        || !["1k", "2k", "4k"].includes(entry.resolvedTier)
        || !Array.isArray(entry.urls)
        || entry.urls.some((url) => !nonEmptyString(url))
      ) {
        errors.push("each resolved texture must include kind, materialId, tiers, and URL strings");
        continue;
      }
      if (
        oneKOnly
        && (
          entry.requestedTier !== "1k"
          || entry.resolvedTier !== "1k"
          || entry.urls.some((url) => /(?:^|[_./-])[24]k(?:[_./-]|$)/i.test(url))
        )
      ) {
        errors.push(`QA 1K policy rejected '${entry.materialId}' at ${entry.requestedTier}/${entry.resolvedTier}`);
      }
    }
  }
  for (const field of ["stableForMs", "startedAtMs", "timeoutMs"]) {
    if (!finiteNumber(state[field]) || state[field] < 0) {
      errors.push(`${field} must be a non-negative finite number`);
    }
  }
  if (finiteNumber(state.timeoutMs) && state.timeoutMs <= 0) {
    errors.push("timeoutMs must be greater than zero");
  }
  for (const field of ["lastResourceChangeAtMs", "readyAtMs"]) {
    if (state[field] !== null && (!finiteNumber(state[field]) || state[field] < 0)) {
      errors.push(`${field} must be null or a non-negative finite number`);
    }
  }
  if (typeof state.ready !== "boolean") errors.push("ready must be a boolean");
  if (typeof state.timedOut !== "boolean") errors.push("timedOut must be a boolean");
  if (state.timedOut === true) errors.push("timedOut must be false");

  const requireReady = phase === "ready" || state.ready === true;
  if (requireReady) {
    if (state.ready !== true) errors.push("ready must be true");
    if (Array.isArray(state.pending) && state.pending.length > 0) {
      errors.push(`pending assets must be empty (${state.pending.join(", ")})`);
    }
    if (
      nonNegativeInteger(state.completedCount)
      && nonNegativeInteger(state.requestedCount)
      && state.completedCount !== state.requestedCount
    ) {
      errors.push("completedCount must equal requestedCount when ready");
    }
    if (!nonNegativeInteger(state.stableFrameCount) || state.stableFrameCount < 8) {
      errors.push("stableFrameCount must be at least 8");
    }
    if (!finiteNumber(state.stableForMs) || state.stableForMs < 500) {
      errors.push("stableForMs must be at least 500");
    }
    if (!finiteNumber(state.readyAtMs)) {
      errors.push("readyAtMs must be a finite number when ready");
    }
  }
  return { passed: errors.length === 0, errors };
}

export async function readQaCaptureState(page, options = {}) {
  return evaluateRuntimeState(
    page,
    () => window.__qa_capture_state?.() ?? null,
    undefined,
    { ...options, operation: options.operation ?? "readQaCaptureState" },
  );
}

export async function waitForQaCaptureReady(page, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_QA_ASSET_READY_TIMEOUT_MS;
  const required = options.required ?? requiresQaCaptureState(page.url());
  const expectedProfile = options.expectedProfile ?? captureProfileFromUrl(page.url());
  const startedAt = Date.now();
  let lastState = null;
  while (Date.now() - startedAt <= timeoutMs) {
    lastState = await readQaCaptureState(page, {
      ...options,
      operation: "qa-capture-readiness",
    });
    if (!lastState) {
      if (!required) return null;
    } else {
      const validation = validateQaCaptureState(lastState, {
        phase: lastState.ready === true ? "ready" : "boot",
        expectedProfile,
      });
      if (!validation.passed) {
        if (options.artifactDir) {
          await writeJson(path.join(options.artifactDir, "capture-readiness-failure.json"), {
            failedAt: new Date().toISOString(),
            routeId: options.routeId ?? null,
            shotId: options.shotId ?? null,
            state: lastState,
            errors: validation.errors,
          });
        }
        throw new Error(
          `[qa-capture] asset readiness failed | route=${options.routeId ?? "none"} | shot=${options.shotId ?? "none"} | ${validation.errors.join(" | ")} | state=${JSON.stringify(lastState)}`,
        );
      }
      if (lastState.ready === true) {
        return lastState;
      }
    }
    await renderRuntimeFrame(page);
    await page.waitForTimeout(50);
  }
  if (options.artifactDir) {
    await writeJson(path.join(options.artifactDir, "capture-readiness-failure.json"), {
      failedAt: new Date().toISOString(),
      routeId: options.routeId ?? null,
      shotId: options.shotId ?? null,
      timeoutMs,
      state: lastState,
    });
  }
  throw new Error(
    `[qa-capture] asset readiness timed out after ${timeoutMs}ms | route=${options.routeId ?? "none"} | shot=${options.shotId ?? "none"} | state=${JSON.stringify(lastState)}`,
  );
}

async function sampleRuntimeFrames(page, sampleCount) {
  for (let index = 0; index < sampleCount; index += 1) {
    await renderRuntimeFrame(page);
    // Match the completion gate's inter-frame cadence so WebGL work can
    // retire; the runtime meter excludes this wait and therefore never reports
    // the browser's vsync-pinned rAF interval.
    await page.waitForTimeout(50);
  }
}

export async function captureRuntimeSnapshot(page, options) {
  const {
    imagePath,
    statePath,
    beauty = false,
    performanceSampleFrames = 7,
    operation = "captureRuntimeSnapshot",
    routeId = null,
    shotId = null,
    artifactDir = null,
  } = options;
  await ensureDir(path.dirname(imagePath));
  // Deterministic QA does not run the regular rAF loop. Take a warm rolling
  // sample here so the first shader-compilation frame cannot masquerade as the
  // card's median CPU frame cost.
  await sampleRuntimeFrames(page, Math.max(1, Math.floor(performanceSampleFrames)));
  const qaCapture = await waitForQaCaptureReady(page, {
    timeoutMs: qaAssetTimeoutFromUrl(page.url()),
    routeId,
    shotId,
    artifactDir,
  });
  const state = await readRuntimeState(page, {
    operation,
    routeId,
    shotId,
    artifactDir,
  });
  if (qaCapture) state.qaCapture = qaCapture;
  if (state.shot?.active) {
    assertRuntimeShotCameraPose(state);
  }
  if (beauty) {
    await page.getByTestId("game-canvas").screenshot({ path: imagePath });
  } else {
    await page.screenshot({ path: imagePath });
  }
  if (statePath) {
    await writeJson(statePath, state);
  }
  return state;
}

async function faceRouteWaypoint(page, route, waypoint, options = {}) {
  const stateOptions = {
    routeId: route.id,
    artifactDir: options.artifactDir,
  };
  const state = await readOperationalRouteRuntimeState(page, {
    ...stateOptions,
    operation: `face-waypoint ${waypoint.zoneId}`,
  });
  const position = state.player?.pos;
  if (!position) {
    throw new Error(`[${route.id}] player position is unavailable while facing '${waypoint.zoneId}'`);
  }
  const yawDeg = Math.atan2(
    -(waypoint.x - position.x),
    -(waypoint.z - position.z),
  ) * RAD_TO_DEG;
  await evaluateRuntimeState(
    page,
    ({ x, y, z, yaw }) => {
      window.__debug_set_player_pose?.({ x, y, z, yawDeg: yaw });
      return true;
    },
    { x: position.x, y: position.y, z: position.z, yaw: yawDeg },
    {
      ...stateOptions,
      operation: `aim-waypoint ${waypoint.zoneId}`,
    },
  );
}

function assertWaypointState(route, waypoint, state, waypointIndex) {
  const position = state.player?.pos;
  if (!position) {
    throw new Error(`[${route.id}] player position disappeared at waypoint ${waypointIndex} '${waypoint.zoneId}'`);
  }
  if (state.gameplay?.alive === false) {
    throw new Error(`[${route.id}] player died en route to waypoint ${waypointIndex} '${waypoint.zoneId}'`);
  }
  if (state.player?.withinPlayableBounds === false) {
    throw new Error(`[${route.id}] player left playable bounds at waypoint ${waypointIndex} '${waypoint.zoneId}'`);
  }
  if (state.player?.zoneId !== waypoint.zoneId) {
    throw new Error(
      `[${route.id}] waypoint ${waypointIndex} expected zone '${waypoint.zoneId}' but runtime reported '${state.player?.zoneId ?? "none"}'`,
    );
  }
  if (Array.isArray(waypoint.elevationRangeM)) {
    const [minimum, maximum] = waypoint.elevationRangeM;
    if (position.y < minimum || position.y > maximum) {
      throw new Error(
        `[${route.id}] waypoint ${waypointIndex} '${waypoint.zoneId}' elevation ${position.y.toFixed(3)}m outside ${minimum}..${maximum}m`,
      );
    }
  } else {
    const expectedElevationM = waypoint.elevationM ?? 0;
    if (Math.abs(position.y - expectedElevationM) > 0.11) {
      throw new Error(
        `[${route.id}] waypoint ${waypointIndex} '${waypoint.zoneId}' elevation ${position.y.toFixed(3)}m differs from ${expectedElevationM.toFixed(3)}m`,
      );
    }
  }
}

export async function runWaypointRoute(page, route, options = {}) {
  if (!route || !Array.isArray(route.waypoints) || route.waypoints.length < 2) {
    throw new Error("[route-runner] an authored route with at least two waypoints is required");
  }
  const tickMs = options.tickMs ?? DEFAULT_WAYPOINT_TICK_MS;
  const waypointTimeoutMs = options.waypointTimeoutMs ?? DEFAULT_WAYPOINT_TIMEOUT_MS;
  const reachRadiusM = options.reachRadiusM ?? 0.85;
  const maxTicksPerWaypoint = Math.max(1, Math.ceil(waypointTimeoutMs / tickMs));
  const stateOptions = {
    routeId: route.id,
    artifactDir: options.artifactDir,
  };
  const initialState = await readOperationalRouteRuntimeState(page, {
    ...stateOptions,
    operation: "route-initial-state",
  });
  const initialPos = initialState.player?.pos;
  if (!initialPos) {
    throw new Error(`Route '${route.id}' requires player.pos in runtime state`);
  }

  let finalState = initialState;
  let totalDistanceM = 0;
  let stationaryTicks = 0;
  let maxStationaryTicks = 0;
  let maxStationaryAt = null;
  let hasMoved = false;
  let collisionTicksX = 0;
  let collisionTicksY = 0;
  let collisionTicksZ = 0;
  let usedAdvanceTime = false;
  const zonesVisited = new Set(initialState.player.zoneId ? [initialState.player.zoneId] : []);
  const reachedWaypoints = [];

  for (let waypointIndex = 1; waypointIndex < route.waypoints.length; waypointIndex += 1) {
    const waypoint = route.waypoints[waypointIndex];
    const startedAt = Date.now();
    let reached = false;
    let tick = 0;
    while (
      tick < maxTicksPerWaypoint
      && Date.now() - startedAt <= waypointTimeoutMs
    ) {
      await faceRouteWaypoint(page, route, waypoint, options);
      await evaluateRuntimeState(
        page,
        () => {
          window.agent_apply_action?.({ moveZ: 1 });
          return true;
        },
        undefined,
        {
          ...stateOptions,
          operation: `waypoint-${waypointIndex}-action tick=${tick}`,
        },
      );
      const advanced = await advanceRuntime(page, tickMs, {
        ...stateOptions,
        operation: `waypoint-${waypointIndex}-advance tick=${tick}`,
      });
      usedAdvanceTime = usedAdvanceTime || advanced;
      const nextState = await readOperationalRouteRuntimeState(page, {
        ...stateOptions,
        operation: `waypoint-${waypointIndex}-state tick=${tick}`,
      });
      const previousPos = finalState.player?.pos ?? initialPos;
      const nextPos = nextState.player?.pos ?? previousPos;
      const movedDistanceM = Math.hypot(
        nextPos.x - previousPos.x,
        nextPos.y - previousPos.y,
        nextPos.z - previousPos.z,
      );
      totalDistanceM += movedDistanceM;
      if (movedDistanceM >= 0.02) {
        // Eliminating bots can leave the next-wave countdown active. Ignore its
        // one small spawn nudge and start stall accounting only after genuine travel.
        if (totalDistanceM >= 0.5) hasMoved = true;
        stationaryTicks = 0;
      } else if (hasMoved) {
        stationaryTicks += 1;
        if (stationaryTicks > maxStationaryTicks) {
          maxStationaryTicks = stationaryTicks;
          maxStationaryAt = {
            waypointIndex,
            targetZoneId: waypoint.zoneId,
            tick,
            pos: nextPos,
            collision: nextState.player?.collision ?? null,
          };
        }
      }
      if (nextState.player?.collision?.hitX) collisionTicksX += 1;
      if (nextState.player?.collision?.hitY) collisionTicksY += 1;
      if (nextState.player?.collision?.hitZ) collisionTicksZ += 1;
      if (nextState.player?.zoneId) zonesVisited.add(nextState.player.zoneId);
      finalState = nextState;

      if (Math.hypot(nextPos.x - waypoint.x, nextPos.z - waypoint.z) <= reachRadiusM) {
        reached = true;
        break;
      }
      tick += 1;
    }
    if (!reached) {
      throw new Error(
        `[${route.id}] waypoint ${waypointIndex} '${waypoint.zoneId}' timed out after ${waypointTimeoutMs}ms; last player state=${JSON.stringify(finalState.player ?? null)}`,
      );
    }
    const verifiedState = await readOperationalRouteRuntimeState(page, {
      ...stateOptions,
      operation: `waypoint-${waypointIndex}-verification`,
    });
    assertWaypointState(route, waypoint, verifiedState, waypointIndex);
    finalState = verifiedState;
    reachedWaypoints.push({
      index: waypointIndex,
      zoneId: waypoint.zoneId,
      pos: verifiedState.player.pos,
    });
  }

  const finalPos = finalState.player?.pos ?? initialPos;
  return {
    routeId: route.id,
    label: route.label,
    spawn: route.spawn,
    tickMs,
    usedAdvanceTime,
    initialPos,
    finalPos,
    distanceM: totalDistanceM,
    maxStationaryTicks,
    maxStationaryAt,
    withinPlayableBounds: finalState.player.withinPlayableBounds,
    endedAlive: finalState.gameplay.alive,
    collisionTicks: {
      x: collisionTicksX,
      y: collisionTicksY,
      z: collisionTicksZ,
    },
    zonesVisited: Array.from(zonesVisited).sort(),
    reachedWaypoints,
    expectedMinDistanceM: route.expectedMinDistanceM,
    maxAllowedStationaryTicks: route.maxStationaryTicks,
  };
}

export async function runAgentRoute(page, route, options = {}) {
  if (Array.isArray(route?.waypoints)) {
    return runWaypointRoute(page, route, options);
  }
  const tickMs = options.tickMs ?? DEFAULT_ROUTE_TICK_MS;
  const stateOptions = {
    routeId: route.id,
    artifactDir: options.artifactDir,
  };
  const initialState = await readOperationalRouteRuntimeState(page, {
    ...stateOptions,
    operation: "route-initial-state",
  });
  const initialPos = initialState.player?.pos;
  if (!initialPos) {
    throw new Error(`Route '${route.id}' requires player.pos in runtime state`);
  }

  let finalState = initialState;
  let stationaryTicks = 0;
  let maxStationaryTicks = 0;
  let collisionTicksX = 0;
  let collisionTicksY = 0;
  let collisionTicksZ = 0;
  let usedAdvanceTime = false;
  const zonesVisited = new Set(initialState.player.zoneId ? [initialState.player.zoneId] : []);

  for (let segmentIndex = 0; segmentIndex < route.segments.length; segmentIndex += 1) {
    const segment = route.segments[segmentIndex];
    const tickCount = Math.max(1, Math.ceil(segment.durationMs / tickMs));

    for (let index = 0; index < tickCount; index += 1) {
      await evaluateRuntimeState(
        page,
        (action) => {
          window.agent_apply_action?.(action);
          return true;
        },
        segment.action,
        {
          ...stateOptions,
          operation: `route-action segment=${segmentIndex} tick=${index}`,
        },
      );

      const advanced = await advanceRuntime(page, tickMs);
      usedAdvanceTime = usedAdvanceTime || advanced;

      const nextState = await readOperationalRouteRuntimeState(page, {
        ...stateOptions,
        operation: `route-state segment=${segmentIndex} tick=${index}`,
      });
      const prevPos = finalState.player?.pos ?? initialPos;
      const nextPos = nextState.player?.pos ?? prevPos;
      const movedDistanceM = Math.hypot(
        nextPos.x - prevPos.x,
        nextPos.y - prevPos.y,
        nextPos.z - prevPos.z,
      );
      const movingIntent = Math.hypot(segment.action.moveX ?? 0, segment.action.moveZ ?? 0) > 0.05;

      if (movingIntent && movedDistanceM < 0.02) {
        stationaryTicks += 1;
        maxStationaryTicks = Math.max(maxStationaryTicks, stationaryTicks);
      } else {
        stationaryTicks = 0;
      }

      if (nextState.player?.collision?.hitX) collisionTicksX += 1;
      if (nextState.player?.collision?.hitY) collisionTicksY += 1;
      if (nextState.player?.collision?.hitZ) collisionTicksZ += 1;
      if (nextState.player?.zoneId) zonesVisited.add(nextState.player.zoneId);

      finalState = nextState;

      if (nextState.gameplay?.alive === false) {
        break;
      }
    }

    if (finalState.gameplay?.alive === false) {
      break;
    }
  }

  const finalPos = finalState.player?.pos ?? initialPos;
  const distanceM = Math.hypot(
    finalPos.x - initialPos.x,
    finalPos.y - initialPos.y,
    finalPos.z - initialPos.z,
  );

  return {
    routeId: route.id,
    label: route.label,
    spawn: route.spawn,
    tickMs,
    usedAdvanceTime,
    initialPos,
    finalPos,
    distanceM,
    maxStationaryTicks,
    withinPlayableBounds: finalState.player.withinPlayableBounds,
    endedAlive: finalState.gameplay.alive,
    collisionTicks: {
      x: collisionTicksX,
      y: collisionTicksY,
      z: collisionTicksZ,
    },
    zonesVisited: Array.from(zonesVisited).sort(),
    expectedMinDistanceM: route.expectedMinDistanceM,
    maxAllowedStationaryTicks: route.maxStationaryTicks,
  };
}

export async function loadShotsSpec(baseUrl, mapId = DEFAULT_MAP_ID) {
  const shotsUrl = new URL(`/maps/${mapId}/shots.json`, parseBaseUrl(baseUrl));
  const response = await fetch(shotsUrl);
  if (!response.ok) {
    throw new Error(`Failed to load shots spec (${response.status} ${response.statusText}) from ${shotsUrl}`);
  }
  return response.json();
}

export function validateReviewShotInventory(shotsSpec) {
  const allShots = Array.isArray(shotsSpec?.shots) ? shotsSpec.shots : [];
  const errors = [];
  const ids = allShots.map((shot) => shot?.id).filter((id) => typeof id === "string");
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
  const coreShots = allShots.filter((shot) => shot?.captureKind === "core");
  const closeupShots = allShots.filter((shot) => shot?.captureKind === "closeup");
  const reviewShots = [...coreShots, ...closeupShots];
  const unsupportedShots = allShots.filter((shot) => !["core", "closeup"].includes(shot?.captureKind));
  const compareId = shotsSpec?.metadata?.compareShotId ?? shotsSpec?.aliases?.compare ?? null;
  const invalidCameraIds = [];
  const duplicateCameraPairs = [];
  const cameraValues = (shot) => [
    shot?.camera?.pos?.x,
    shot?.camera?.pos?.y,
    shot?.camera?.pos?.z,
    shot?.camera?.lookAt?.x,
    shot?.camera?.lookAt?.y,
    shot?.camera?.lookAt?.z,
    shot?.camera?.fovDeg,
  ];
  const camerasMatch = (left, right) => {
    const a = cameraValues(left);
    const b = cameraValues(right);
    if (![...a, ...b].every((value) => typeof value === "number" && Number.isFinite(value))) return false;
    return (
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= 0.05 &&
      Math.hypot(a[3] - b[3], a[4] - b[4], a[5] - b[5]) <= 0.05 &&
      Math.abs(a[6] - b[6]) <= 0.05
    );
  };
  allShots.forEach((shot) => {
    const values = cameraValues(shot);
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      invalidCameraIds.push(shot?.id ?? "<unknown>");
    }
  });
  for (let left = 0; left < allShots.length; left += 1) {
    for (let right = left + 1; right < allShots.length; right += 1) {
      if (camerasMatch(allShots[left], allShots[right])) {
        duplicateCameraPairs.push([allShots[left].id, allShots[right].id]);
      }
    }
  }

  if (reviewShots.length !== DEFAULT_REVIEW_SHOT_COUNT) {
    errors.push(`authored signoff inventory must contain exactly ${DEFAULT_REVIEW_SHOT_COUNT} shots (${REQUIRED_CORE_SHOT_COUNT} core + ${REQUIRED_CLOSEUP_SHOT_COUNT} closeup); found ${reviewShots.length}`);
  }
  if (ids.length !== allShots.length) errors.push("every authored review shot must have a string id");
  if (duplicateIds.length > 0) errors.push(`duplicate authored shot ids: ${duplicateIds.join(", ")}`);
  if (coreShots.length !== REQUIRED_CORE_SHOT_COUNT) {
    errors.push(`expected exactly ${REQUIRED_CORE_SHOT_COUNT} core shots; found ${coreShots.length}`);
  }
  if (closeupShots.length !== REQUIRED_CLOSEUP_SHOT_COUNT) {
    errors.push(`expected exactly ${REQUIRED_CLOSEUP_SHOT_COUNT} closeup shots; found ${closeupShots.length}`);
  }
  if (unsupportedShots.length > 0) {
    errors.push(`shots with missing/unsupported captureKind: ${unsupportedShots.map((shot) => shot?.id ?? "<unknown>").join(", ")}`);
  }
  if (ids.includes("SHOT_BLOCKOUT_COMPARE")) {
    errors.push("synthetic SHOT_BLOCKOUT_COMPARE must not appear in the authored review inventory");
  }
  if (invalidCameraIds.length > 0) errors.push(`shots with invalid camera poses: ${invalidCameraIds.join(", ")}`);
  if (duplicateCameraPairs.length > 0) {
    errors.push(`duplicate authored viewpoints: ${duplicateCameraPairs.map((pair) => pair.join("/")).join(", ")}`);
  }
  if (shotsSpec?.metadata?.shotCount !== allShots.length) {
    errors.push(`metadata.shotCount must equal authored inventory length ${allShots.length}`);
  }
  if (shotsSpec?.metadata?.coreShotCount !== REQUIRED_CORE_SHOT_COUNT) {
    errors.push(`metadata.coreShotCount must equal ${REQUIRED_CORE_SHOT_COUNT}`);
  }
  if (shotsSpec?.metadata?.closeupShotCount !== REQUIRED_CLOSEUP_SHOT_COUNT) {
    errors.push(`metadata.closeupShotCount must equal ${REQUIRED_CLOSEUP_SHOT_COUNT}`);
  }
  if (typeof compareId !== "string" || !ids.includes(compareId)) {
    errors.push("metadata.compareShotId/aliases.compare must resolve to an authored shot");
  } else if (!coreShots.some((shot) => shot.id === compareId)) {
    errors.push("the compare alias must resolve to a core authored shot");
  }

  return {
    passed: errors.length === 0,
    errors,
    expectedCount: DEFAULT_REVIEW_SHOT_COUNT,
    allShotIds: ids,
    reviewShotIds: allShots
      .filter((shot) => ["core", "closeup"].includes(shot.captureKind))
      .map((shot) => shot.id),
    coreShotIds: coreShots.map((shot) => shot.id),
    closeupShotIds: closeupShots.map((shot) => shot.id),
    compareShotId: compareId,
    duplicateCameraPairs,
  };
}

export function selectReviewShotIds(shotsSpec, options = {}) {
  const inventory = validateReviewShotInventory(shotsSpec);
  if (!inventory.passed) {
    throw new Error(`[shot-inventory] ${inventory.errors.join(" | ")}`);
  }

  const normalizedOptions = typeof options === "number" ? { maxShots: options } : options;
  const captureKinds = Array.isArray(normalizedOptions.captureKinds)
    ? new Set(normalizedOptions.captureKinds)
    : new Set(["core", "closeup"]);
  const allShots = Array.isArray(shotsSpec.shots) ? shotsSpec.shots : [];
  const selected = allShots
    .filter((shot) => captureKinds.has(shot.captureKind))
    .map((shot) => shot.id);
  const maxShots = Number.isFinite(normalizedOptions.maxShots)
    ? Math.max(0, Math.floor(normalizedOptions.maxShots))
    : selected.length;
  return selected.slice(0, maxShots);
}

export function shotQaTargetSelectors(shotDefinition) {
  const required = shotDefinition?.acceptance?.visualTelemetry?.requiredVisibleAssets;
  if (!Array.isArray(required)) return [];
  return [...new Set(required.flatMap((entry) => [
    entry?.placementId,
    entry?.assetId,
    entry?.moduleId,
  ]).filter((value) => typeof value === "string" && value.length > 0))].sort();
}

export async function captureShotSet(browserOrPage, options) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    mapId = DEFAULT_MAP_ID,
    outputDir,
    shotIds,
    extraSearchParams = {},
    beauty = true,
    diagnosticMode = false,
    captureTrace = false,
    shotTimeoutMs = DEFAULT_SHOT_TIMEOUT_MS,
    viewport = DEFAULT_VIEWPORT,
    shotDefinitions = new Map(),
    authoredShotIds = null,
    captureAdditionalState = null,
  } = options;

  assertCaptureSearchParamsPolicy(extraSearchParams, { diagnosticMode });
  assertAuthoredCaptureShotIds(shotIds, authoredShotIds);
  const captures = [];
  await ensureDir(outputDir);

  for (let index = 0; index < shotIds.length; index += 1) {
    const shotId = shotIds[index];
    const fileBase = `${String(index + 1).padStart(2, "0")}-${sanitizeFileSegment(shotId)}`;
    const shotDir = path.join(outputDir, fileBase);
    const imagePath = path.join(shotDir, "capture.png");
    const statePath = path.join(shotDir, "state.json");
    const consolePath = path.join(shotDir, "console.json");
    const failurePath = path.join(shotDir, "failure.json");
    await ensureDir(shotDir);

    const ownsContext = typeof browserOrPage?.newContext === "function";
    const context = ownsContext ? await browserOrPage.newContext({ viewport }) : null;
    const page = context ? await context.newPage() : browserOrPage;
    const consoleRecorder = attachConsoleRecorder(page);
    const networkRecorder = attachNetworkRecorder(page);
    if (captureTrace && context) await startTracing(context);

    try {
      const capture = await withTimeout(async () => {
        const qaTargets = shotQaTargetSelectors(shotDefinitions.get(shotId));
        const bootStartedAt = Date.now();
        const readyState = await gotoHumanShot(page, {
          baseUrl,
          mapId,
          shot: shotId,
          extraSearchParams: {
            ...extraSearchParams,
            ...SHIP_QA_SEARCH_PARAMS,
            ...(beauty ? { vm: 0 } : {}),
            ...(qaTargets.length > 0 ? { qaTargets: qaTargets.join(",") } : {}),
          },
          artifactDir: shotDir,
        });
        const bootReadyWallMs = Date.now() - bootStartedAt;
        const captureStartedAt = Date.now();
        const state = await captureRuntimeSnapshot(page, {
          imagePath,
          statePath,
          beauty,
          operation: "shot-camera-verification",
          shotId,
          artifactDir: shotDir,
        });
        const captureMs = Date.now() - captureStartedAt;
        const coverage = await readScreenshotCoverage(imagePath);
        const network = await networkRecorder.snapshot();
        assertQaNetworkTexturePolicy(network, page.url());
        const additionalState = typeof captureAdditionalState === "function"
          ? await captureAdditionalState({
              page,
              shotId,
              shotDir,
              state,
            })
          : null;
        const consolePayload = {
          events: consoleRecorder.snapshot(),
          counts: consoleRecorder.counts(),
        };
        await writeJson(consolePath, consolePayload);
        return {
          shotId,
          artifactDir: shotDir,
          imagePath,
          statePath,
          consolePath,
          state,
          beauty,
          coverage,
          ...(additionalState === null ? {} : { additionalState }),
          evidence: {
            bootReadyWallMs,
            runtimeBootReadyMs: readyState.boot?.readyAtMs ?? state.boot?.readyAtMs ?? null,
            captureMs,
            network,
          },
        };
      }, shotTimeoutMs, `shot '${shotId}'`);
      captures.push(capture);
    } catch (error) {
      const consolePayload = {
        events: consoleRecorder.snapshot(),
        counts: consoleRecorder.counts(),
      };
      await writeJson(consolePath, consolePayload);
      const failure = {
        shotId,
        failedAt: new Date().toISOString(),
        url: page.url(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? null,
        } : { message: String(error) },
        consolePath,
      };
      await writeJson(failurePath, failure);
      const failedCapture = {
        shotId,
        artifactDir: shotDir,
        imagePath,
        statePath,
        consolePath,
        failurePath,
        state: null,
        beauty,
        coverage: null,
        failed: true,
        failure,
      };
      captures.push(failedCapture);
      if (!diagnosticMode) {
        const failureError = error instanceof Error ? error : new Error(String(error));
        failureError.captures = captures;
        throw failureError;
      }
    } finally {
      if (captureTrace && context) {
        await stopTracing(context, path.join(shotDir, "trace.zip")).catch(() => {});
      }
      if (context) {
        await closeBrowserResources({ context });
      }
    }
  }

  return captures;
}

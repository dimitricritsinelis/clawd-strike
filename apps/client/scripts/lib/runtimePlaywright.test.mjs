import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  RuntimeOperationTimeoutError,
  assertCaptureSearchParamsPolicy,
  assertQaNetworkTexturePolicy,
  assertQaRouteOperationalState,
  assertSafeCaptureSearchParams,
  attachNetworkRecorder,
  attachConsoleRecorder,
  buildRuntimeUrl,
  captureShotSet,
  classifyRuntimeFailure,
  closeBrowserResources,
  findHighResolutionTextureRequests,
  normalizeNetworkRequestUrl,
  readRouteRuntimeState,
  readRuntimeState,
  validateQaCaptureState,
  validateQaRouteState,
  waitForQaCaptureReady,
  waitForRuntimeReady,
  withTimeout,
} from "./runtimePlaywright.mjs";

function validCaptureState(overrides = {}) {
  return {
    schemaVersion: 1,
    profile: "qa",
    planHash: "plan-a",
    observedPlanHash: "plan-a",
    pending: [],
    failed: [],
    totalRequests: 1,
    requestedCount: 1,
    completedCount: 1,
    resolvedTextures: [{
      kind: "floor",
      materialId: "floor-a",
      requestedTier: "1k",
      resolvedTier: "1k",
      urls: ["/floor-a_diff_1k.jpg"],
    }],
    textureCount: 1,
    stableFrameCount: 8,
    stableForMs: 500,
    startedAtMs: 0,
    lastResourceChangeAtMs: 10,
    readyAtMs: 510,
    ready: true,
    timedOut: false,
    timeoutMs: 20_000,
    ...overrides,
  };
}

test("withTimeout rejects a browser operation at its hard deadline", async () => {
  await assert.rejects(
    withTimeout(() => new Promise(() => {}), 20, "hung operation"),
    (error) => error instanceof RuntimeOperationTimeoutError
      && error.message.includes("hung operation timed out after 20ms"),
  );
});

test("runtime-state timeout writes bounded diagnostics with route, URL, heartbeat, and console", async () => {
  const artifactDir = await mkdtemp(path.join(os.tmpdir(), "clawd-runtime-timeout-"));
  let evaluateCalls = 0;
  const page = {
    evaluate() {
      evaluateCalls += 1;
      if (evaluateCalls === 1) return new Promise(() => {});
      return Promise.resolve({
        heartbeat: { frameCounter: 12, mainLoopAdvancing: false },
        readyState: { mapLoaded: true, revealPhase: "active" },
      });
    },
    url() {
      return "http://127.0.0.1:43210/?qa=1";
    },
    async screenshot({ path: filePath }) {
      await writeFile(filePath, "diagnostic");
    },
    on() {},
  };
  const recorder = attachConsoleRecorder(page);

  await assert.rejects(
    readRuntimeState(page, {
      timeoutMs: 20,
      operation: "test-state-read",
      routeId: "route-one",
      artifactDir,
      consoleRecorder: recorder,
    }),
    (error) => error.message.includes("operation=test-state-read")
      || (
        error.message.includes("test-state-read")
        && error.message.includes("route=route-one")
        && error.message.includes("url=http://127.0.0.1:43210/?qa=1")
        && error.message.includes("lastSuccessfulStateAt=never")
      ),
  );

  const diagnostics = JSON.parse(await readFile(path.join(artifactDir, "diagnostics.json"), "utf8"));
  assert.equal(diagnostics.operation, "test-state-read");
  assert.equal(diagnostics.routeId, "route-one");
  assert.equal(diagnostics.heartbeat.frameCounter, 12);
  assert.equal(diagnostics.failureKind, "runtime-loop-stall");
  assert.equal(diagnostics.url, "http://127.0.0.1:43210/?qa=1");
  assert.equal(diagnostics.lastSuccessfulStateAt, null);
  await readFile(path.join(artifactDir, "failure.png"));
  await readFile(path.join(artifactDir, "console.json"));
});

test("browser cleanup closes all supplied resources", async () => {
  const closed = [];
  const resource = (name) => ({ async close() { closed.push(name); } });
  await closeBrowserResources({
    page: resource("page"),
    context: resource("context"),
    browser: resource("browser"),
  });
  assert.deepEqual(closed, ["page", "context", "browser"]);
});

test("capture readiness waits through pending assets and accepts only a stable matching plan", async () => {
  const pending = validCaptureState({
    pending: ["texture-a"],
    completedCount: 0,
    stableFrameCount: 0,
    stableForMs: 0,
    readyAtMs: null,
    ready: false,
  });
  const ready = validCaptureState();
  const evaluations = [pending, true, ready];
  let waitCount = 0;
  const page = {
    evaluate() {
      return Promise.resolve(evaluations.shift());
    },
    url() {
      return "http://127.0.0.1:43210/?qa=1";
    },
    async waitForTimeout() {
      waitCount += 1;
    },
  };
  assert.deepEqual(await waitForQaCaptureReady(page, { timeoutMs: 100 }), ready);
  assert.equal(waitCount, 1);
});

test("capture readiness rejects a failed or mismatched asset plan", async () => {
  const page = {
    evaluate() {
      return Promise.resolve(validCaptureState({
        planHash: "planned",
        observedPlanHash: "observed",
        completedCount: 0,
        stableFrameCount: 0,
        stableForMs: 0,
        readyAtMs: null,
        ready: false,
      }));
    },
    url() {
      return "http://127.0.0.1:43210/?qa=1";
    },
  };
  await assert.rejects(
    waitForQaCaptureReady(page, { timeoutMs: 100 }),
    /asset readiness failed.*planHash.*planned/,
  );
});

test("runtime readiness stops on a logged launch failure instead of waiting 90 seconds", async () => {
  const page = new EventEmitter();
  attachConsoleRecorder(page);
  page.evaluate = () => assert.fail("must not poll readiness after a fatal launch error");
  page.emit("console", {
    type: () => "error",
    text: () => "[runtime] launch failed ReferenceError: missingBinding is not defined",
    location: () => ({}),
  });
  await assert.rejects(waitForRuntimeReady(page), /missingBinding is not defined/);
});

test("runtime readiness surfaces an early asset failure before the runtime-ready binding exists", async () => {
  let waited = 0;
  const page = {
    evaluate() {
      return Promise.resolve({
        runtimeReady: false,
        readyState: null,
        qaCapture: validCaptureState({
          observedPlanHash: null,
          failed: [{ id: "floor-material-pack", message: "missing grey_tiles" }],
          completedCount: 0,
          stableFrameCount: 0,
          stableForMs: 0,
          readyAtMs: null,
          ready: false,
        }),
      });
    },
    url() {
      return "http://127.0.0.1:43210/?qa=1";
    },
    async waitForTimeout() {
      waited += 1;
    },
  };
  await assert.rejects(
    waitForRuntimeReady(page, { timeoutMs: 1_000 }),
    /asset readiness failed during runtime boot.*missing grey_tiles/,
  );
  assert.equal(waited, 0);
});

test("capture state validation rejects malformed, unstable, mismatched-profile, and non-1K evidence", () => {
  assert.equal(validateQaCaptureState(validCaptureState(), {
    expectedProfile: "qa",
  }).passed, true);
  assert.match(
    validateQaCaptureState(validCaptureState({ schemaVersion: 2 }), {
      expectedProfile: "qa",
    }).errors.join(" | "),
    /schemaVersion/,
  );
  assert.match(
    validateQaCaptureState(validCaptureState({ stableFrameCount: 7, stableForMs: 499 }), {
      expectedProfile: "qa",
    }).errors.join(" | "),
    /stableFrameCount.*stableForMs/,
  );
  assert.match(
    validateQaCaptureState(validCaptureState({ profile: "cell-review" }), {
      expectedProfile: "qa",
    }).errors.join(" | "),
    /profile must equal 'qa'/,
  );
  assert.match(
    validateQaCaptureState(validCaptureState({
      resolvedTextures: [{
        kind: "wall",
        materialId: "wall-a",
        requestedTier: "1k",
        resolvedTier: "4k",
        urls: ["/wall-a_diff_4k.jpg"],
      }],
    }), {
      expectedProfile: "qa",
    }).errors.join(" | "),
    /1K policy/,
  );
  assert.match(
    validateQaCaptureState(validCaptureState({ completedCount: 0 }), {
      expectedProfile: "qa",
    }).errors.join(" | "),
    /completedCount must equal requestedCount/,
  );
  assert.equal(validateQaCaptureState(validCaptureState({
    observedPlanHash: "partial-coverage",
    pending: ["floor-a"],
    completedCount: 0,
    stableFrameCount: 0,
    stableForMs: 0,
    readyAtMs: null,
    ready: false,
  }), {
    phase: "boot",
    expectedProfile: "qa",
  }).passed, true);
  assert.match(
    validateQaCaptureState(validCaptureState({
      observedPlanHash: "empty-coverage",
      completedCount: 0,
      stableFrameCount: 0,
      stableForMs: 0,
      readyAtMs: null,
      ready: false,
    }), {
      phase: "boot",
      expectedProfile: "qa",
    }).errors.join(" | "),
    /observedPlanHash must match/,
  );
});

test("route polling requires the lightweight route contract and never falls back to full state", async () => {
  const valid = {
    gameplay: { alive: true },
    player: {
      pos: { x: 1, y: 2, z: 3 },
      withinPlayableBounds: true,
      zoneId: "SPICE_STREET",
      collision: { hitX: false, hitY: false, hitZ: false, grounded: true },
    },
  };
  assert.equal(validateQaRouteState(valid).passed, true);
  assert.equal(assertQaRouteOperationalState(valid, { routeId: "route-one" }), valid);
  assert.throws(
    () => assertQaRouteOperationalState({
      ...valid,
      player: { ...valid.player, withinPlayableBounds: false },
    }, {
      routeId: "route-one",
      operation: "waypoint-2-state tick=3",
    }),
    /route-one.*left playable bounds.*waypoint-2-state tick=3/,
  );
  assert.match(
    validateQaRouteState({
      gameplay: { alive: true },
      player: { pos: { x: 1, y: 2, z: 3 }, zoneId: null },
    }).errors.join(" | "),
    /withinPlayableBounds.*zoneId.*collision/,
  );
  const page = {
    evaluate() {
      return Promise.resolve(null);
    },
    url() {
      return "http://127.0.0.1:43210/?qa=1";
    },
  };
  await assert.rejects(readRouteRuntimeState(page), /qa-route-state.*must be an object/);
});

test("runtime and capture identity parameters cannot be overridden by extras", () => {
  assert.throws(
    () => buildRuntimeUrl("http://127.0.0.1:43210/", {
      mapId: "bazaar-map",
      extraSearchParams: { map: "other-map", shot: "synthetic" },
    }),
    /protected keys: map, shot/,
  );
  assert.throws(
    () => assertSafeCaptureSearchParams({ qa: "0", floorRes: "4k", profile: "lookdev" }),
    /protected keys: floorRes, profile, qa/,
  );
  assert.doesNotThrow(
    () => assertCaptureSearchParamsPolicy({ qaAssetTimeoutMs: "30000" }),
  );
  assert.throws(
    () => assertCaptureSearchParamsPolicy({
      post: "0",
      ibl: "0",
      seed: "999",
      "prop-density": "0",
    }),
    /signoff capture rejects non-diagnostic render overrides: ibl, post, prop-density, seed/,
  );
  assert.doesNotThrow(
    () => assertCaptureSearchParamsPolicy({
      post: "0",
      ibl: "0",
      seed: "999",
      "prop-density": "0",
    }, { diagnosticMode: true }),
  );
});

test("network evidence records normalized URLs and rejects actual 2K/4K textures only", async () => {
  assert.equal(
    normalizeNetworkRequestUrl(
      "http://127.0.0.1:43210/assets/wall_diff_1k.jpg?cache=1",
      "http://127.0.0.1:43210/?qa=1",
    ),
    "/assets/wall_diff_1k.jpg",
  );
  assert.deepEqual(findHighResolutionTextureRequests([
    "/assets/wall_diff_2k.jpg",
    "/assets/models/large_castle_door_2k.gltf",
    "/assets/models/source_4k.glb",
    "/assets/models/source_4k.bin",
    "/assets/models/source_4k/textures/door_diff_1k.jpg",
    "/assets/models/source_2k/textures/door_diff.jpg",
    "/assets/palm_diff_4k.png",
  ]), [
    "/assets/palm_diff_4k.png",
    "/assets/wall_diff_2k.jpg",
  ]);

  const page = new EventEmitter();
  page.url = () => "http://127.0.0.1:43210/?qa=1&floorRes=1k&shot=SHOT_01";
  const recorder = attachNetworkRecorder(page);
  const request = {
    url: () => "http://127.0.0.1:43210/assets/wall_diff_2k.jpg?cache=1",
    sizes: async () => ({
      requestHeadersSize: 10,
      requestBodySize: 0,
      responseHeadersSize: 20,
      responseBodySize: 30,
    }),
  };
  page.emit("request", request);
  page.emit("requestfinished", request);
  const network = await recorder.snapshot();
  assert.deepEqual(network.requestUrls, ["/assets/wall_diff_2k.jpg"]);
  assert.deepEqual(network.non1kTextureRequests, ["/assets/wall_diff_2k.jpg"]);
  assert.throws(
    () => assertQaNetworkTexturePolicy(network, page.url()),
    /1K capture requested 2K\/4K texture assets.*wall_diff_2k\.jpg/,
  );
  assert.doesNotThrow(
    () => assertQaNetworkTexturePolicy(network, "http://127.0.0.1:43210/?floorRes=1k"),
  );
});

test("capture rejects an unknown shot before creating a browser context", async () => {
  await assert.rejects(
    captureShotSet({}, {
      outputDir: path.join(os.tmpdir(), "must-not-be-created"),
      shotIds: ["SHOT_NOT_AUTHORED"],
      authoredShotIds: ["SHOT_01_TOPDOWN_ESTABLISHING"],
    }),
    /unknown authored shot ids: SHOT_NOT_AUTHORED/,
  );
});

test("capture closes its fresh browser context when a shot fails", async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "clawd-shot-cleanup-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  let closeCount = 0;
  const page = new EventEmitter();
  page.goto = async () => {
    throw new Error("expected navigation failure");
  };
  page.url = () => "http://127.0.0.1:43210/?qa=1&floorRes=1k&shot=SHOT_01";
  const context = {
    async newPage() {
      return page;
    },
    async close() {
      closeCount += 1;
    },
  };
  const browser = {
    async newContext() {
      return context;
    },
  };

  await assert.rejects(
    captureShotSet(browser, {
      baseUrl: "http://127.0.0.1:43210/",
      outputDir,
      shotIds: ["SHOT_01"],
      authoredShotIds: ["SHOT_01"],
    }),
    /expected navigation failure/,
  );
  assert.equal(closeCount, 1);
});

test("heartbeat diagnostics distinguish the five unattended failure classes", () => {
  assert.equal(classifyRuntimeFailure({
    error: new Error("net::ERR_CONNECTION_REFUSED"),
    heartbeat: null,
    pageClosed: false,
  }), "server-failure");
  assert.equal(classifyRuntimeFailure({
    error: new Error("Execution context was destroyed, most likely because of a navigation"),
    heartbeat: null,
    pageClosed: false,
  }), "navigation-race");
  assert.equal(classifyRuntimeFailure({
    error: new Error("Target closed"),
    heartbeat: null,
    pageClosed: true,
  }), "browser-page-failure");
  assert.equal(classifyRuntimeFailure({
    error: new Error("timed out"),
    heartbeat: { stateSerializationInProgress: true, mainLoopAdvancing: true },
    pageClosed: false,
  }), "state-serialization-stall");
  assert.equal(classifyRuntimeFailure({
    error: new Error("timed out"),
    heartbeat: { stateSerializationInProgress: false, mainLoopAdvancing: false },
    pageClosed: false,
  }), "runtime-loop-stall");
});

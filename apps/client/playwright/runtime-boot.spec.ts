import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { getGameplayProfileIdentity } from "../../shared/gameplayProfile";
import {
  attachConsoleRecorder,
  buildRuntimeUrl,
  evaluateRuntimeState,
  gotoAgentRuntime,
  gotoHumanShot,
  readDocumentedAgentState,
  readQaPerformanceState,
  renderRuntimeFrame,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

const DESKTOP_AGENT_IDENTITY = getGameplayProfileIdentity("desktop-agent");
const MOBILE_HUMAN_IDENTITY = getGameplayProfileIdentity("mobile-human");

const cacheTest = test.extend({ trace: "off" });

cacheTest("revalidates maps and manifests cached by the previous deployment", async ({ page }, testInfo) => {
  const currentMap = JSON.parse(await readFile(new URL("../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8"));
  const currentShots = JSON.parse(await readFile(new URL("../public/maps/bazaar-map/shots.json", import.meta.url), "utf8"));
  const oldMap = structuredClone(currentMap);
  const oldPlacement = oldMap.dressingPlacements.find((placement: { runtime: { mode: string } }) => placement.runtime.mode === "procedural");
  const retiredAssetId = oldPlacement.assetId;
  oldPlacement.id = "PLACE_B4_SOUK_CART_B4_SOUK_W_CART_GROUND_01";
  for (const placement of oldMap.dressingPlacements) {
    if (placement.assetId === retiredAssetId) placement.runtime.id = "bazaar_market_cart";
  }
  oldMap.assetRegistry.find((asset: { id: string }) => asset.id === retiredAssetId).runtime.id = "bazaar_market_cart";
  const oldShots = structuredClone(currentShots);
  oldShots.shots[0].label = "Previous deployment shot";
  const textures = { "1k": { albedo: "unused.jpg", normal: "unused.jpg", arm: "unused.jpg" } };
  const modelUrl = `data:application/json,${encodeURIComponent(JSON.stringify({ asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [] }] }))}`;
  const metadata = [
    { path: "/maps/cache-probe/map_spec.json", old: oldMap, current: currentMap },
    { path: "/maps/cache-probe/shots.json", old: oldShots, current: currentShots },
    { path: "/assets/floors/materials.json", old: { materials: [{ id: "previous", tileSizeM: 1, textures }] }, current: { materials: [{ id: "current", tileSizeM: 1, textures }] } },
    { path: "/assets/walls/materials.json", old: { materials: [{ id: "previous", tileSizeM: 1, textures }] }, current: { materials: [{ id: "current", tileSizeM: 1, textures }] } },
    { path: "/assets/props/models.json", old: { models: [{ id: "previous", url: modelUrl }] }, current: { models: [{ id: "current", url: modelUrl }] } },
  ];
  const requests = new Map<string, number>();
  let currentDeployment = false;
  const server = createServer((request, response) => {
    const item = metadata.find((candidate) => candidate.path === request.url);
    if (!item) {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<!doctype html><title>Deployment cache probe</title>");
      return;
    }
    requests.set(item.path, (requests.get(item.path) ?? 0) + 1);
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": item.path.startsWith("/maps/")
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "public, max-age=604800, stale-while-revalidate=86400",
    });
    response.end(JSON.stringify(currentDeployment ? item.current : item.old));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Cache probe server has no TCP address");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    await page.goto(origin);
    const paths = metadata.map((item) => item.path);
    await page.evaluate(async (urls) => {
      await Promise.all(urls.map(async (url) => (await fetch(url)).json()));
    }, paths);
    currentDeployment = true;
    const stillCached = await page.evaluate(async (urls) => {
      return Promise.all(urls.map(async (url) => (await fetch(url)).json()));
    }, paths);
    expect(stillCached[0].dressingPlacements.some((placement: { runtime: { id: string } }) => placement.runtime.id === "bazaar_market_cart")).toBe(true);
    expect(stillCached[1].shots[0].label).toBe("Previous deployment shot");
    expect(stillCached.slice(2).map((manifest) => (manifest.materials ?? manifest.models)[0].id)).toEqual(["previous", "previous", "previous"]);
    expect(paths.map((path) => requests.get(path))).toEqual([1, 1, 1, 1, 1]);

    const loaded = await page.evaluate(async (baseUrl) => {
      const [{ loadMap }, { FloorMaterialLibrary }, { WallMaterialLibrary }, { PropModelLibrary }] = await Promise.all([
        import(`${baseUrl}/src/runtime/map/spec/loadMap.ts`),
        import(`${baseUrl}/src/runtime/render/materials/FloorMaterialLibrary.ts`),
        import(`${baseUrl}/src/runtime/render/materials/WallMaterialLibrary.ts`),
        import(`${baseUrl}/src/runtime/render/models/PropModelLibrary.ts`),
      ]);
      const [map, floors, walls, props] = await Promise.all([
        loadMap("cache-probe"),
        FloorMaterialLibrary.load("/assets/floors/materials.json"),
        WallMaterialLibrary.load("/assets/walls/materials.json"),
        PropModelLibrary.load("/assets/props/models.json"),
      ]);
      const result = {
        retiredCartPresent: map.blockout.dressingPlacements.some((placement: { runtime: { id: string } }) => placement.runtime.id === "bazaar_market_cart"),
        shotLabel: map.shots.shots[0].label,
        floorIds: floors.getMaterialIds(),
        wallIds: walls.getMaterialIds(),
        currentPropPresent: props.hasModel("current"),
        previousPropPresent: props.hasModel("previous"),
      };
      props.dispose();
      return result;
    }, new URL(testInfo.project.use.baseURL as string).origin);

    expect(loaded).toEqual({
      retiredCartPresent: false,
      shotLabel: currentShots.shots[0].label,
      floorIds: ["current"],
      wallIds: ["current"],
      currentPropPresent: true,
      previousPropPresent: false,
    });
    expect(paths.map((path) => requests.get(path))).toEqual([2, 2, 2, 2, 2]);
  } finally {
    await page.close();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("boots runtime in agent mode without console errors", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  const state = await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    extraSearchParams: {
      qa: 1,
      floors: "blockout",
      walls: "blockout",
      ao: 0,
    },
  });

  expect(state.mode).toBe("runtime");
  expect(state.profile).toEqual(DESKTOP_AGENT_IDENTITY);
  expect(state.map?.loaded).toBe(true);
  expect(state.player?.pos).toBeTruthy();
  expect(state.gameplay?.health).toBe(100);
  expect(state.bots).toMatchObject({ waveNumber: 1, tier: 0, aliveCount: 10 });
  const publicState = await readDocumentedAgentState(page);
  expect(publicState.profile).toEqual(DESKTOP_AGENT_IDENTITY);
  expect(publicState.ammo).toMatchObject({ mag: 30, reserve: 120, reloading: false });
  expect(state.render?.viewport?.width).toBeGreaterThan(0);
  expect(recorder.counts().errorCount).toBe(0);
});

test("keeps reveal-stage camera framing stable through runtime activation", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  const baseUrl = testInfo.project.use.baseURL as string;

  await page.goto(buildRuntimeUrl(baseUrl, {
    autostart: "agent",
    agentName: "AspectProbe",
    extraSearchParams: {
      qa: 1,
      floors: "blockout",
      walls: "blockout",
      ao: 0,
    },
  }), { waitUntil: "domcontentloaded" });

  const revealingHandle = await page.waitForFunction(() => {
    const state = window.__qa_framing_state?.();
    return state?.revealing ?? null;
  }, undefined, { timeout: 30_000 });
  const revealingState = await revealingHandle.jsonValue();

  const activeHandle = await page.waitForFunction(() => {
    const state = window.__qa_framing_state?.();
    return state?.revealPhase === "active" ? state : null;
  }, undefined, { timeout: 30_000 });
  const activeState = await activeHandle.jsonValue();
  // waitForFunction only resolves on a truthy value.
  if (!revealingState || !activeState) throw new Error("Framing state resolved empty");

  expect(revealingState.camera?.fovDeg).toBe(activeState.camera?.fovDeg);
  expect(revealingState.camera?.aspect).toBeCloseTo(activeState.camera?.aspect, 6);

  const revealingLandmark = revealingState.landmarks?.visible?.find((landmark) => landmark.id === "LMK_MID_WELL_01")
    ?? revealingState.landmarks?.visible?.[0]
    ?? null;
  const activeLandmark = activeState.landmarks?.visible?.find((landmark) => landmark.id === "LMK_MID_WELL_01")
    ?? activeState.landmarks?.visible?.[0]
    ?? null;
  expect(revealingLandmark).not.toBeNull();
  expect(activeLandmark).not.toBeNull();
  expect(Math.abs(revealingLandmark!.screenX - activeLandmark!.screenX)).toBeLessThan(0.5);
  expect(Math.abs(revealingLandmark!.screenY - activeLandmark!.screenY)).toBeLessThan(0.5);

  expect(recorder.counts().errorCount).toBe(0);
});

test("boots mobile bazaar final dressing with registered models", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    screen: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  const recorder = attachConsoleRecorder(page);

  try {
    const state = await gotoHumanShot(page, {
      baseUrl: testInfo.project.use.baseURL as string,
      shot: "SHOT_02_SPAWN_A_TO_BAZAAR",
      extraSearchParams: {
        floors: "pbr",
        walls: "pbr",
        vm: 0,
        perf: 1,
      },
    });

    expect(state.mode).toBe("runtime");
    expect(state.profile).toEqual(MOBILE_HUMAN_IDENTITY);
    expect(state.map?.loaded).toBe(true);
    expect(state.gameplay?.health).toBe(100);
    expect(state.bots).toMatchObject({ waveNumber: 1, tier: 0, aliveCount: 10 });
    const publicState = await readDocumentedAgentState(page);
    expect(publicState.profile).toEqual(MOBILE_HUMAN_IDENTITY);
    expect(publicState.ammo).toMatchObject({ mag: 30, reserve: 120, reloading: false });
    expect(state.boot?.performanceSafeFallback).toBe(false);
    expect(state.assets?.props?.requestedVisualMode).toBe("bazaar");
    expect(state.assets?.props?.activeVisualMode).toBe("bazaar");
    expect(state.assets?.props?.modelCount).toBeGreaterThan(0);
    expect(state.render?.artifactTags).not.toContain("placeholder");
    expect(state.render?.artifactTags).not.toContain("procedural-proxy");
    expect(recorder.counts().errorCount).toBe(0);
  } finally {
    await context.close();
  }
});


test("manual zero-time QA renders cannot manufacture a higher runtime FPS", async ({ page }, testInfo) => {
  await gotoHumanShot(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    shot: "SHOT_02_SPAWN_A_TO_BAZAAR",
    extraSearchParams: { qa: 1, floors: "blockout", walls: "blockout", ao: 0, vm: 0, perf: 1 },
  });
  type PerfState = { perf: { fps: number; msPerFrame: number } };
  const before = await readQaPerformanceState(page) as PerfState;
  const beforeCounter = await page.evaluate(() => window.__qa_heartbeat?.().frameCounter);
  for (let index = 0; index < 20; index += 1) await renderRuntimeFrame(page);
  const after = await readQaPerformanceState(page) as PerfState;
  const afterCounter = await page.evaluate(() => window.__qa_heartbeat?.().frameCounter);
  expect(before.perf.fps).toBeGreaterThan(0);
  expect(after.perf.fps).toBe(before.perf.fps);
  expect(after.perf.msPerFrame).toBe(before.perf.msPerFrame);
  expect(afterCounter! - beforeCounter!).toBe(20);
});


test("desktop preserves PBR and its weapon after a warmup network timeout", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  let delayedRequests = 0;
  await page.route("**/assets/models/weapons/ak47-next/ak47.glb", async (route) => {
    delayedRequests += 1;
    // Exercise the real 20-second prefetch deadline with an actual asset request.
    // Subsequent bootstrap requests can recover normally after the first delay.
    if (delayedRequests === 1) await new Promise((resolve) => setTimeout(resolve, 23_000));
    await route.continue();
  });
  const recoveredAsset = page.waitForResponse(
    (response) => response.url().endsWith("/assets/models/weapons/ak47-next/ak47.glb") && response.ok(),
    { timeout: 60_000 },
  );
  await page.goto(buildRuntimeUrl(testInfo.project.use.baseURL as string, {
    autostart: "human",
    agentName: "ColdLoadProbe",
    extraSearchParams: { bootGate: 1 },
  }), { waitUntil: "domcontentloaded" });
  await recoveredAsset;
  await waitForRuntimeReady(page, { routeId: "ColdLoadProbe", timeoutMs: 90_000 });
  const state = await readRuntimeState(page);
  const groups = await page.evaluate(() => {
    const perf = window.__debug_render_perf?.() as { scene: { groups: Record<string, unknown> } } | undefined;
    return Object.keys(perf?.scene.groups ?? {});
  });

  expect(delayedRequests).toBeGreaterThan(0);
  expect(state.boot?.warmupTimedOut).toBe(true);
  expect(state.boot?.performanceSafeFallback).toBe(false);
  const rendererEvent = recorder.snapshot().find((event: { text?: string }) => event.text?.startsWith("[renderer] "));
  expect(rendererEvent).toBeTruthy();
  const rendererIdentity = JSON.parse(rendererEvent!.text.slice("[renderer] ".length));
  // Both paths finish their first draw during boot. Software stages compilation
  // and uploads first; it does not force the hardware asset gate.
  expect(state.boot?.hiddenWarmupRenderDone).toBe(true);
  expect(state.boot?.precompiled).toBe(true);
  expect(rendererIdentity.shadows).toBe(true);
  expect(rendererIdentity.ao).toBe(true);
  expect(rendererIdentity.post).toBe(true);
  if (rendererIdentity.softwareRendering) {
    expect(rendererIdentity.composerSamples).toEqual([0, 0]);
    expect(rendererIdentity.canvasAntialias).toBe(false);
    const firstDraw = recorder.snapshot().find((event: { text?: string }) => event.text?.startsWith("[runtime:boot] software first draw completed"));
    expect(firstDraw).toBeTruthy();
    console.info(firstDraw!.text);
  }
  expect(state.assets?.floor?.activeMode).toBe("pbr");
  expect(state.assets?.wall?.activeMode).toBe("pbr");
  expect(state.weapon).toMatchObject({ enabled: true, visible: true, loaded: true });
  expect(groups).toContain("map-blockout/map-pbr-floors");
  expect(groups).toContain("map-blockout/r8-atmosphere");
  expect(groups.some((name) => name.startsWith("AK47_AnimatedPose/"))).toBe(true);
  const submittedFrames = await evaluateRuntimeState(page, async () => {
    const before = window.__qa_heartbeat?.().renderedFrameCounter;
    await window.advanceTime?.(500);
    const after = window.__qa_heartbeat?.().renderedFrameCounter;
    return after! - before!;
  }, undefined, { operation: "rendered-simulation-batch" });
  expect(submittedFrames).toBe(1);
  expect(recorder.counts().errorCount).toBe(0);
});

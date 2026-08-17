import { expect, test } from "@playwright/test";
import { getGameplayProfileIdentity } from "../../shared/gameplayProfile";
import {
  attachConsoleRecorder,
  buildRuntimeUrl,
  gotoAgentRuntime,
  gotoHumanShot,
  readDocumentedAgentState,
} from "../scripts/lib/runtimePlaywright.mjs";

const DESKTOP_AGENT_IDENTITY = getGameplayProfileIdentity("desktop-agent");
const MOBILE_HUMAN_IDENTITY = getGameplayProfileIdentity("mobile-human");

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
  expect(Math.abs(revealingLandmark.screenX - activeLandmark.screenX)).toBeLessThan(0.5);
  expect(Math.abs(revealingLandmark.screenY - activeLandmark.screenY)).toBeLessThan(0.5);

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
        props: "bazaar",
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

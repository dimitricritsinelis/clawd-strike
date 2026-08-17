import { expect, test } from "@playwright/test";
import { getGameplayProfileIdentity } from "../../shared/gameplayProfile";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  readDocumentedAgentState,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

const DESKTOP_HUMAN_IDENTITY = getGameplayProfileIdentity("desktop-human");

test("desktop-human profile freezes its five-second intermission and continues once after two seconds", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  const championReadUrls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/high-score" && request.method() === "GET") {
      championReadUrls.push(url.toString());
    }
  });

  await page.goto(
    buildRuntimeUrl(testInfo.project.use.baseURL as string, {
      autostart: "human",
      agentName: "HumanProfile",
      extraSearchParams: {
        qa: 1,
        floors: "blockout",
        walls: "blockout",
        ao: 0,
      },
    }),
    { waitUntil: "domcontentloaded" },
  );
  await waitForRuntimeReady(page, { routeId: "desktop-human-profile" });

  const initialPublicState = await readDocumentedAgentState(page);
  const initialRuntimeState = await readRuntimeState(page);
  expect(initialPublicState.profile).toEqual(DESKTOP_HUMAN_IDENTITY);
  expect(initialRuntimeState.profile).toEqual(DESKTOP_HUMAN_IDENTITY);
  expect(initialPublicState.health).toBe(100);
  expect(initialPublicState.ammo).toMatchObject({ mag: 30, reserve: 120, reloading: false });
  expect(initialRuntimeState.bots).toMatchObject({ waveNumber: 1, tier: 0, aliveCount: 10 });
  expect(championReadUrls.some((rawUrl) => {
    const url = new URL(rawUrl);
    return url.searchParams.get("profileId") === DESKTOP_HUMAN_IDENTITY.profileId
      && url.searchParams.get("tuningRevision") === DESKTOP_HUMAN_IDENTITY.tuningRevision
      && url.searchParams.get("balanceSeason") === DESKTOP_HUMAN_IDENTITY.balanceSeason;
  })).toBe(true);

  const eliminated = await page.evaluate(() => window.__debug_eliminate_all_bots?.() ?? 0);
  expect(eliminated).toBe(10);
  // One frame is enough to detect the all-dead boundary. Keep it short so the
  // same advance call does not also consume a meaningful part of intermission.
  await advanceRuntime(page, 17);

  const roundComplete = page.getByText("ROUND COMPLETE", { exact: true });
  const roundOverlay = roundComplete.locator("..");
  const continueButton = page.getByTestId("continue-next-wave");
  await expect(roundComplete).toBeVisible();
  await expect(roundOverlay.getByText("Wave 1 cleared", { exact: true })).toBeVisible();
  await expect(roundOverlay.getByText("5", { exact: true })).toBeVisible();
  await expect(continueButton).toBeHidden();

  const frozenAtStart = await readRuntimeState(page);
  await advanceRuntime(page, 1_800);
  const frozenBeforeContinue = await readRuntimeState(page);
  expect(frozenBeforeContinue.bots.waveNumber).toBe(1);
  expect(frozenBeforeContinue.bots.waveElapsedS).toBe(frozenAtStart.bots.waveElapsedS);
  expect(frozenBeforeContinue.gameplay.health).toBe(frozenAtStart.gameplay.health);
  await expect(continueButton).toBeHidden();

  await advanceRuntime(page, 250);
  await expect(continueButton).toBeVisible();

  await page.keyboard.press("Escape");
  await advanceRuntime(page, 50);
  await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await advanceRuntime(page, 50);
  const blockedByPause = await readRuntimeState(page);
  expect(blockedByPause.bots.waveNumber).toBe(1);
  await expect(roundComplete).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText("PAUSED", { exact: true })).toBeHidden();
  await page.keyboard.press("Enter");

  await expect(roundComplete).toBeHidden();
  const waveTwo = await readRuntimeState(page);
  expect(waveTwo.bots).toMatchObject({ waveNumber: 2, tier: 0, aliveCount: 10 });

  await page.keyboard.press("Enter");
  await advanceRuntime(page, 100);
  const afterDuplicateContinue = await readRuntimeState(page);
  expect(afterDuplicateContinue.bots.waveNumber).toBe(2);
  expect(
    recorder.snapshot().filter((event) => event.type === "error" || event.kind === "pageerror"),
  ).toEqual([]);
});

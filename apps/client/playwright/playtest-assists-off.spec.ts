import { expect, test } from "@playwright/test";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

/**
 * Manual-playtest assists (unlimited health, boosted run speed) used to switch
 * themselves on for ANY localhost human run. That silently made every
 * automated or agent-driven playtest invincible and 50% faster than production,
 * so nothing measured in that state — difficulty, damage, hit registration,
 * movement feel — described the build real players get.
 *
 * They are now opt-in and hard-off under automation. This spec is the guard.
 */
async function bootHumanRuntime(page, baseURL: string, extra: Record<string, unknown> = {}) {
  await page.goto(
    buildRuntimeUrl(baseURL, {
      autostart: "human",
      agentName: "AssistProbe",
      extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0, ...extra },
    }),
    { waitUntil: "domcontentloaded" },
  );
  await waitForRuntimeReady(page, { routeId: "AssistProbe" });
}

test("an automated human run is not invincible", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await bootHumanRuntime(page, testInfo.project.use.baseURL as string);

  const before = await readRuntimeState(page);
  expect(before.gameplay?.alive).toBe(true);

  // Ten enemies spawn at wave 1 and will engage. Let the fight actually happen.
  let damaged = false;
  for (let i = 0; i < 40 && !damaged; i += 1) {
    await advanceRuntime(page, 1000);
    const state = await readRuntimeState(page);
    const health = state.gameplay?.health;
    if (typeof health === "number" && health < 100) damaged = true;
    if (state.gameplay?.alive === false) damaged = true;
  }

  expect(
    damaged,
    "a headless human run took no damage across 40s of combat — playtest assists are leaking into automation",
  ).toBe(true);
});

test("automation cannot switch the assists back on with the flag", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  // Even asking for them explicitly must not grant them under webdriver.
  await bootHumanRuntime(page, testInfo.project.use.baseURL as string, { god: 1 });

  let damaged = false;
  for (let i = 0; i < 40 && !damaged; i += 1) {
    await advanceRuntime(page, 1000);
    const state = await readRuntimeState(page);
    const health = state.gameplay?.health;
    if (typeof health === "number" && health < 100) damaged = true;
    if (state.gameplay?.alive === false) damaged = true;
  }

  expect(
    damaged,
    "?god=1 granted invincibility under automation — the webdriver guard is not holding",
  ).toBe(true);
});

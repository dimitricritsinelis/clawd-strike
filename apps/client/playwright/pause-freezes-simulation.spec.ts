import { expect, test } from "@playwright/test";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

async function readWaveClock(page): Promise<number> {
  const state = await readRuntimeState(page);
  const elapsed = state.bots?.waveElapsedS;
  expect(typeof elapsed).toBe("number");
  return elapsed as number;
}

/**
 * Regression: the pause menu called game.setFreezeInput(true) and then ran
 * game.update(dt) unconditionally on the very next line. That froze the
 * player's own input but left enemies, weapon timers and buff durations running
 * on the simulation clock, so a player could be shot dead while staring at the
 * pause screen.
 *
 * The wave clock (EnemyManager.waveElapsedS) only advances from the simulation
 * delta, so it is a direct probe of whether the simulation is running. The only
 * thing that changes between the two measurements below is the Escape press.
 */
test("opening the pause menu freezes the simulation clock", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);

  await page.goto(
    buildRuntimeUrl(testInfo.project.use.baseURL as string, {
      autostart: "human",
      agentName: "PauseProbe",
      extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0 },
    }),
    { waitUntil: "domcontentloaded" },
  );
  await waitForRuntimeReady(page, { routeId: "PauseProbe" });

  // Baseline: with the game running, the wave clock tracks simulated time.
  const runningBefore = await readWaveClock(page);
  await advanceRuntime(page, 2000);
  const runningAdvance = (await readWaveClock(page)) - runningBefore;
  expect(runningAdvance).toBeGreaterThan(1.5);

  // Escape shows the pause menu behind a 50ms pointer-lock settle timer.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Paused: the simulation clock must not move at all.
  const pausedBefore = await readWaveClock(page);
  await advanceRuntime(page, 2000);
  const pausedAdvance = (await readWaveClock(page)) - pausedBefore;
  expect(pausedAdvance).toBe(0);
});

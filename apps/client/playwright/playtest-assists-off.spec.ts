import { expect, test, type Page } from "@playwright/test";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

// Normal automated runs take damage. Explicit localhost no-damage tests may
// opt in without changing enemy behavior or the production combat profile.
async function bootHumanRuntime(page, baseURL: string, extra: Record<string, unknown> = {}) {
  await page.goto(
    buildRuntimeUrl(baseURL, {
      autostart: "human",
      agentName: "AssistProbe",
      extraSearchParams: { qa: 1, debug: 1, floors: "blockout", walls: "blockout", ao: 0, ...extra },
    }),
    { waitUntil: "domcontentloaded" },
  );
  await waitForRuntimeReady(page, { routeId: "AssistProbe" });
}

async function engageEnemy(page: Page) {
  await page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text());
    const position = state.bots.enemies.find((enemy: { health: number; position: { x: number; y: number; z: number } }) => enemy.health > 0).position;
    window.__debug_set_player_pose({ ...position, x: position.x + (position.x > 32 ? -1.3 : 1.3), pitchDeg: 0 });
  });
}

test("an automated human run is not invincible", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await bootHumanRuntime(page, testInfo.project.use.baseURL as string);

  await engageEnemy(page);
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

for (const controlMode of ["human", "agent"] as const) {
  test(`explicit localhost ${controlMode} playtests survive enemy fire`, async ({ page }, testInfo) => {
    attachConsoleRecorder(page);
    await page.goto(buildRuntimeUrl(testInfo.project.use.baseURL as string, {
      autostart: controlMode,
      agentName: "NoDamageProbe",
      extraSearchParams: { qa: 1, debug: 1, god: 1, floors: "blockout", walls: "blockout", ao: 0 },
    }));
    await waitForRuntimeReady(page, { routeId: "NoDamageProbe" });
    await engageEnemy(page);
    let engaged = false;
    for (let i = 0; i < 40; i += 1) {
      await advanceRuntime(page, 1000);
      const sample = await readRuntimeState(page);
      engaged ||= sample.bots.enemies.some((enemy: { directSight: boolean; mag: number }) => enemy.directSight && enemy.mag < 30);
    }
    expect(engaged, "the no-damage scenario must include actual enemy engagement").toBe(true);
    const state = await readRuntimeState(page);
    expect(state.gameplay.health).toBe(100);
    expect(state.gameplay.alive).toBe(true);
    expect(state.bots.aliveCount).toBeGreaterThan(0);
  });
}

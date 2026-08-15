import { expect, test } from "@playwright/test";
import {
  advanceRuntime,
  attachConsoleRecorder,
  gotoAgentRuntime,
  readRuntimeState,
} from "../scripts/lib/runtimePlaywright.mjs";

/**
 * Regression: enemies aimed at a hardcoded 1.5 m above the target's feet while
 * a crouching player's collision box only reaches 1.4 m. Every shot passed over
 * their head, so holding crouch was total immunity to enemy fire at close
 * range — the single most exploitable bug in the build.
 *
 * Enemies now aim at the target's live eye height. This drives a real runtime
 * with crouch held down for the whole fight and requires damage to land.
 */
async function fightWhileCrouching(page, holdCrouch: boolean): Promise<number> {
  let lowestHealth = 100;

  for (let tick = 0; tick < 70; tick += 1) {
    // Firing is what makes this deterministic: gunshots are reported to the
    // enemy manager as audible intel, so the squad reliably converges instead
    // of the test depending on them wandering into a silent, stationary player.
    await page.evaluate(({ crouch, fire }) => {
      window.agent_apply_action?.({ crouch, fire, moveX: 0, moveZ: 0, lookYawDelta: 2 });
    }, { crouch: holdCrouch, fire: tick % 2 === 0 });

    await advanceRuntime(page, 1000);

    const state = await readRuntimeState(page);
    const health = state.gameplay?.health;
    if (typeof health === "number") lowestHealth = Math.min(lowestHealth, health);
    if (state.gameplay?.alive === false) return 0;
  }

  return lowestHealth;
}

test("a crouching player is still hittable by enemy fire", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: "CrouchProbe",
    extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0, seed: 20260814 },
  });

  const lowestHealth = await fightWhileCrouching(page, true);

  expect(
    lowestHealth,
    `player held crouch through the whole fight and never dropped below ${lowestHealth} HP — crouch is granting immunity again`,
  ).toBeLessThan(100);
});

test("a standing player is hittable too (control)", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: "StandProbe",
    extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0, seed: 20260814 },
  });

  const lowestHealth = await fightWhileCrouching(page, false);

  expect(
    lowestHealth,
    "a standing player took no damage either — the scenario is not exercising combat at all",
  ).toBeLessThan(100);
});

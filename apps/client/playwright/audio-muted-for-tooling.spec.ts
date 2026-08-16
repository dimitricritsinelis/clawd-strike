import { expect, test } from "@playwright/test";
import {
  advanceRuntime,
  attachConsoleRecorder,
  gotoAgentRuntime,
  readRuntimeState,
} from "../scripts/lib/runtimePlaywright.mjs";

/**
 * Nobody is sitting at the keyboard during an automated or agent-driven run, so
 * the game must stay silent — otherwise whoever is watching an LLM play gets
 * gunfire and ambience out of their speakers.
 *
 * The check is that no AudioContext is constructed at all: muting by zeroing a
 * gain would still spin up the audio graph, and a regression there would be
 * inaudible to this test but very audible to a person.
 */
async function instrumentAudio(page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __audioContextCount: number; AudioContext: unknown };
    w.__audioContextCount = 0;
    const Original = window.AudioContext;
    if (!Original) return;
    class CountingAudioContext extends Original {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        w.__audioContextCount += 1;
      }
    }
    w.AudioContext = CountingAudioContext;
  });
}

async function audioContextCount(page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __audioContextCount?: number }).__audioContextCount ?? 0,
  );
}

test("an agent-driven run never starts the audio engine", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await instrumentAudio(page);

  await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: "MuteProbe",
    extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0 },
  });

  expect(await audioContextCount(page)).toBe(0);

  // Gunfire is the loudest thing the game plays — fire a sustained burst.
  for (let tick = 0; tick < 12; tick += 1) {
    await page.evaluate(() => {
      window.agent_apply_action?.({ fire: true, lookYawDelta: 4 });
    });
    await advanceRuntime(page, 250);
  }

  const state = await readRuntimeState(page);
  expect(state.gameplay?.active).toBe(true);

  expect(
    await audioContextCount(page),
    "the audio engine started during an agent run — a watching human would hear it",
  ).toBe(0);

  // No <audio> element either: the loading-screen ambience must stay silent too.
  expect(await page.locator("audio").count()).toBe(0);
});

test("audio can still be forced on for an agent run when explicitly asked", async ({ page }, testInfo) => {
  attachConsoleRecorder(page);
  await instrumentAudio(page);

  await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: "MuteOverride",
    extraSearchParams: { floors: "blockout", walls: "blockout", ao: 0, audio: 1 },
  });

  const state = await readRuntimeState(page);
  expect(state.gameplay?.active).toBe(true);
  // The override must not crash the boot; whether the browser actually grants
  // an AudioContext without a gesture is the browser's call, so only the
  // suppression path is asserted strictly above.
});

import { expect, test } from "@playwright/test";
import {
  attachConsoleRecorder,
  buildRuntimeUrl,
  readRuntimeState,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

/**
 * The human boot gate (asset settle -> whole-scene compileAsync -> batched
 * texture upload -> one hidden render) is what every real player boots through,
 * and it is deliberately skipped for deterministic QA, authored shots, software
 * GL and automation. That left the single most user-visible boot path with no
 * coverage at all: an earlier revision of this code was documented as having
 * hung the loading overlay indefinitely, and nothing would have caught it.
 *
 * ?bootGate=1 opts automation back in so the path is exercised for real.
 */
test("the human boot gate completes and reveals a ready runtime", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);

  await page.goto(
    buildRuntimeUrl(testInfo.project.use.baseURL as string, {
      autostart: "human",
      agentName: "BootGateProbe",
      extraSearchParams: { bootGate: 1, floors: "blockout", walls: "blockout", ao: 0 },
    }),
    { waitUntil: "domcontentloaded" },
  );

  // The whole point is that this resolves rather than hanging behind the overlay.
  await waitForRuntimeReady(page, { routeId: "BootGateProbe", timeoutMs: 120_000 });

  const state = await readRuntimeState(page);

  expect(state.boot?.revealPhase).toBe("active");
  expect(state.gameplay?.active).toBe(true);
  expect(state.map?.loaded).toBe(true);
  expect(state.player?.pos).toBeTruthy();

  // The gate must actually have run, not been silently skipped.
  expect(state.boot?.hiddenWarmupRenderDone).toBe(true);

  // A compile that times out is tolerated (it is raced against a deadline), but
  // it must resolve one way or the other rather than hanging.
  expect(
    state.boot?.precompiled === true || state.boot?.precompileTimedOut === true,
  ).toBe(true);

  expect(recorder.counts().errorCount).toBe(0);
});

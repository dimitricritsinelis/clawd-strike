import { expect, test } from "@playwright/test";
import {
  attachConsoleRecorder,
  captureRuntimeSnapshot,
  evaluateRuntimeShotCameraPose,
  gotoHumanShot,
  loadShotsSpec,
  readRuntimeState,
  selectReviewShotIds,
  validateReviewShotInventory,
} from "../scripts/lib/runtimePlaywright.mjs";

test("loads the authored compare alias without injecting a debug shot", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  const state = await gotoHumanShot(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    shot: "compare",
    extraSearchParams: {
      floors: "blockout",
      walls: "blockout",
      ao: 0,
      vm: 0,
    },
  });

  await page.waitForTimeout(250);
  const capturedState = await captureRuntimeSnapshot(page, {
    imagePath: testInfo.outputPath("compare-shot.png"),
    statePath: testInfo.outputPath("compare-shot.state.json"),
    beauty: true,
  });

  expect(state.mode).toBe("runtime");
  expect(state.shot?.active).toBe(true);
  expect(state.shot?.id).toBe("SHOT_02_SPAWN_A_TO_BAZAAR");
  expect(evaluateRuntimeShotCameraPose(capturedState).matches).toBe(true);
  expect(capturedState.weapon?.visible).toBe(false);
  expect(state.render?.warnings ?? []).toEqual([]);
  expect(state.landmarks?.nearest).toBeTruthy();
  expect(recorder.counts().errorCount).toBe(0);
});

test("keeps a non-spawn authored camera locked across rendered frames", async ({ page }, testInfo) => {
  const initialState = await gotoHumanShot(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    shot: "SHOT_05_TEA_TERRACE",
    extraSearchParams: { vm: 0 },
  });
  expect(evaluateRuntimeShotCameraPose(initialState).matches).toBe(true);

  await page.waitForTimeout(300);
  const laterState = await readRuntimeState(page);
  const verification = evaluateRuntimeShotCameraPose(laterState);
  expect(verification.matches, verification.reason ?? undefined).toBe(true);
  expect(laterState.view?.camera?.pos).toEqual({ x: 15, y: 3.1, z: 59 });
});

test("publishes the exact authored 12 core plus four closeup inventory", async ({}, testInfo) => {
  const shots = await loadShotsSpec(testInfo.project.use.baseURL as string);
  const inventory = validateReviewShotInventory(shots);
  expect(inventory.errors).toEqual([]);
  expect(inventory.coreShotIds).toHaveLength(12);
  expect(inventory.closeupShotIds).toHaveLength(4);
  expect(inventory.auditShotIds).toHaveLength(6);
  expect(selectReviewShotIds(shots)).toEqual(inventory.reviewShotIds);
  expect(inventory.allShotIds).not.toContain("SHOT_BLOCKOUT_COMPARE");
});

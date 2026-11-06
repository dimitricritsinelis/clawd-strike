import { expect, test, type Locator } from "@playwright/test";
import { getGameplayProfileIdentity } from "../../shared/gameplayProfile";
import {
  attachConsoleRecorder,
  waitForRuntimeReady,
} from "../scripts/lib/runtimePlaywright.mjs";

const IPHONE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
test.use({ trace: "off" });
const VIEWPORTS = [
  { name: "portrait iPhone", width: 390, height: 844 },
  { name: "landscape iPhone", width: 844, height: 390 },
  { name: "open square screen", width: 900, height: 900 },
];

async function expectWithinViewport(locator: Locator, width: number, height: number): Promise<void> {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
}

for (const viewport of VIEWPORTS) {
  test(`human name entry launches touch gameplay on ${viewport.name}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      screen: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: IPHONE_USER_AGENT,
    });
    const page = await context.newPage();
    const recorder = attachConsoleRecorder(page);

    try {
      // Exercise the normal menu and name submission, not the autostart bypass.
      const url = new URL(testInfo.project.use.baseURL as string);
      url.searchParams.set("qa", "1");
      // Full default assets still load on software-rendered CI hosts; give
      // that QA capture gate its supported CPU-rendering budget.
      url.searchParams.set("qaAssetTimeoutMs", "60000");
      await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await expect(page.locator("#start")).toHaveAttribute("data-assets-ready", "true", { timeout: 30_000 });
      await expect(page.getByText(/Rotate your device to/)).toHaveCount(0);
      const human = page.getByRole("button", { name: "Human", exact: true });
      await expectWithinViewport(human, viewport.width, viewport.height);
      await human.tap();

      const name = page.getByPlaceholder("HUMAN NAME", { exact: true });
      await expectWithinViewport(name, viewport.width, viewport.height);
      expect((await name.boundingBox())!.height).toBeGreaterThanOrEqual(40);
      await name.fill("TouchPilot");
      const enter = page.getByRole("button", { name: "Enter game", exact: true });
      await expectWithinViewport(enter, viewport.width, viewport.height);
      await enter.tap();

      const state = await waitForRuntimeReady(page, { routeId: `mobile-onboarding-${viewport.name}` });
      expect(state.mode).toBe("runtime");
      expect(state.profile).toEqual(getGameplayProfileIdentity("mobile-human"));
      expect(state.map?.loaded).toBe(true);
      await expect(page.locator("#overlay")).toBeHidden();
      await expect(page.getByText(/Rotate your device to/)).toHaveCount(0);
      await expectWithinViewport(page.getByText("FIRE", { exact: true }), viewport.width, viewport.height);
      await expectWithinViewport(page.getByText("R", { exact: true }), viewport.width, viewport.height);

      const canvas = page.getByTestId("game-canvas");
      await expectWithinViewport(canvas, viewport.width, viewport.height);
      // An open/close or rotation event must retain the live canvas and touch UI.
      const resized = { width: viewport.height, height: viewport.width };
      await page.setViewportSize(resized);
      await expect.poll(async () => canvas.boundingBox()).toMatchObject(resized);
      await expectWithinViewport(page.getByText("FIRE", { exact: true }), resized.width, resized.height);
      await expect(page.getByText(/Rotate your device to/)).toHaveCount(0);
      expect(recorder.snapshot().filter((event) => event.kind === "pageerror" || event.type === "error")).toEqual([]);
    } catch (error) {
      console.error(`[mobile-onboarding] ${viewport.name}`, error);
      throw error;
    } finally {
      await context.close();
    }
  });
}

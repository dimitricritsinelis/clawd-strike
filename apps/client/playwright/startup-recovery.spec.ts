import { expect, test } from "@playwright/test";

test("wide touch name entry dismisses the keyboard and can retry a failed launch", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 932, height: 430 },
    screen: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  // Exercise menu submission and recovery without depending on GPU startup.
  await page.route("**/src/runtime/warmup.ts", (route) => route.fulfill({
    contentType: "text/javascript",
    body: "export async function warmupRuntimeAssets() { return null; }",
  }));
  await page.route("**/src/runtime/bootstrap.ts", (route) => route.fulfill({
    contentType: "text/javascript",
    body: `
      let attempts = 0;
      export async function bootstrapRuntime() {
        if (++attempts === 1) throw new Error("Startup recovery probe");
        const root = document.createElement("div");
        root.id = "recovered-runtime";
        document.body.append(root);
        return {
          getRootElement: () => root,
          beginReveal() {},
          activate() { root.dataset.active = "true"; },
          teardown() { root.remove(); },
        };
      }
    `,
  }));

  try {
    await page.goto(testInfo.project.use.baseURL as string, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#start[data-assets-ready="true"]');
    await expect(page.locator(".orientation-overlay")).toHaveCount(0);
    await page.locator("#single-player-btn").tap();
    const input = page.locator("#player-name-input");
    await input.fill("iPhonePilot");
    await input.focus();
    const enter = page.locator("#enter-game-btn");
    await expect(enter).toBeVisible();
    await enter.tap();
    await expect(input).not.toBeFocused();
    await expect(page.locator("#start")).toHaveAttribute("data-transitioning", "false");
    await expect(page.getByText("Could not start game. Submit your name to retry.")).toBeVisible();
    await enter.tap();
    await expect(page.locator("#recovered-runtime")).toHaveAttribute("data-active", "true");
    await expect(page.locator("#overlay")).toBeHidden();
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

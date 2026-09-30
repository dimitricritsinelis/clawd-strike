import { defineConfig } from "@playwright/test";
const baseURL = process.env.PW_BASE_URL;
if (!baseURL) {
  throw new Error(
    "Playwright QA requires PW_BASE_URL. Run it through the package scripts so an isolated Vite server is owned and cleaned up.",
  );
}

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 150_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  use: {
    baseURL,
    // CI installs the Playwright-pinned Chromium, not the runner's system Chrome.
    channel: process.env.CI ? "chromium" : "chrome",
    launchOptions: process.env.PW_SOFTWARE_RENDERING === "1"
      ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
      : {},
    // Gameplay smoke runs still draw the complete scene on CPU-only CI hosts.
    // Desktop visual captures retain their own authored viewport settings.
    viewport: process.env.CI || process.env.PW_SOFTWARE_RENDERING === "1"
      ? { width: 640, height: 400 }
      : { width: 1440, height: 900 },
    // Playwright awaits DOM snapshots before/after each API response. On Linux
    // software GL, a valid 7.4s Ready response incurred another 3.7–3.9s snapshot
    // delay and falsely exceeded the 9s operation budget. Keep API/console/source
    // traces and explicit failure screenshots without timing visual recording.
    trace: {
      mode: "retain-on-failure",
      screenshots: !(process.env.CI || process.env.PW_SOFTWARE_RENDERING === "1"),
      snapshots: !(process.env.CI || process.env.PW_SOFTWARE_RENDERING === "1"),
      sources: true,
    },
    screenshot: "only-on-failure",
    video: "off",
  },
});

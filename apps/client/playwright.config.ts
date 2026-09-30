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
    // CI installs Playwright's pinned Chromium headless shell. Omitting the
    // channel selects that supported default rather than full new-headless
    // Chromium; local hardware QA keeps the user's full system Chrome.
    channel: process.env.CI ? undefined : "chrome",
    launchOptions: process.env.PW_SOFTWARE_RENDERING === "1"
      ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
      : {},
    // Gameplay smoke runs still draw the complete scene on CPU-only CI hosts.
    // Desktop visual captures retain their own authored viewport settings.
    viewport: process.env.CI || process.env.PW_SOFTWARE_RENDERING === "1"
      ? { width: 640, height: 400 }
      : { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
});

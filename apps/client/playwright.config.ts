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
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
});

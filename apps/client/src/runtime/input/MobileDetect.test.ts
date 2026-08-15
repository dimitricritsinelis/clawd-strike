import assert from "node:assert/strict";
import test from "node:test";
import { isMobileDevice, resetMobileDetectionCacheForTest } from "./MobileDetect";

type FakeEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  platform: string;
  hasOnTouchStart: boolean;
};

function withEnvironment<T>(env: FakeEnvironment, run: () => T): T {
  const globals = globalThis as Record<string, unknown>;
  const hadWindow = "window" in globals;
  const previousWindow = globals.window;
  const previousNavigator = Object.getOwnPropertyDescriptor(globals, "navigator");

  const fakeWindow: Record<string, unknown> = {};
  if (env.hasOnTouchStart) fakeWindow.ontouchstart = null;
  globals.window = fakeWindow;

  Object.defineProperty(globals, "navigator", {
    value: {
      userAgent: env.userAgent,
      maxTouchPoints: env.maxTouchPoints,
      platform: env.platform,
    },
    configurable: true,
    writable: true,
  });

  resetMobileDetectionCacheForTest();
  try {
    return run();
  } finally {
    if (hadWindow) globals.window = previousWindow;
    else delete globals.window;
    if (previousNavigator) Object.defineProperty(globals, "navigator", previousNavigator);
    else delete globals.navigator;
    resetMobileDetectionCacheForTest();
  }
}

// Regression: iPadOS 13+ Safari reports a desktop Macintosh user-agent with no
// "iPad" token. A UA-only check classified every modern iPad as a desktop, so
// it got the pointer-lock path (unsupported on iPadOS) and no touch controls
// were mounted — the game booted completely unplayable.
test("modern iPadOS reporting a desktop Macintosh UA is detected as mobile", () => {
  const detected = withEnvironment(
    {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      maxTouchPoints: 5,
      platform: "MacIntel",
      hasOnTouchStart: true,
    },
    isMobileDevice,
  );
  assert.equal(detected, true);
});

test("a real Mac is not detected as mobile", () => {
  const detected = withEnvironment(
    {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      maxTouchPoints: 0,
      platform: "MacIntel",
      hasOnTouchStart: false,
    },
    isMobileDevice,
  );
  assert.equal(detected, false);
});

test("iPhone and Android are still detected as mobile", () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ]) {
    const detected = withEnvironment(
      { userAgent, maxTouchPoints: 5, platform: "", hasOnTouchStart: true },
      isMobileDevice,
    );
    assert.equal(detected, true, `expected mobile for ${userAgent}`);
  }
});

test("a touch-enabled Windows laptop is not detected as mobile", () => {
  const detected = withEnvironment(
    {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      maxTouchPoints: 10,
      platform: "Win32",
      hasOnTouchStart: true,
    },
    isMobileDevice,
  );
  assert.equal(detected, false);
});

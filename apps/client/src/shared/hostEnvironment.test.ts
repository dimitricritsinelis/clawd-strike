import assert from "node:assert/strict";
import test from "node:test";
import { isAutomatedClient, isLocalhostHostname } from "./hostEnvironment";

const REAL_PLAYER_AGENTS = [
  // Chrome on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  // Safari on iOS
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  // Firefox on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
  // Chrome on Android
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  // An Electron app that is not Claude — must not be caught by the token check.
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) SomeApp/2.0 Chrome/120.0.0.0 Electron/30.0.0 Safari/537.36",
];

// The Claude browser reports navigator.webdriver as false, so a webdriver-only
// check would classify an LLM playtest as a human one — which is exactly the
// case this exists to catch.
const CLAUDE_BROWSER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.30096.5 Chrome/148.0.7778.280 Electron/42.7.0 Safari/537.36";

test("a real player's browser is never treated as automation", () => {
  for (const userAgent of REAL_PLAYER_AGENTS) {
    assert.equal(
      isAutomatedClient({ webdriver: false, userAgent }),
      false,
      `misclassified as automation: ${userAgent}`,
    );
  }
});

test("the Claude browser is detected even though webdriver is false", () => {
  assert.equal(isAutomatedClient({ webdriver: false, userAgent: CLAUDE_BROWSER_AGENT }), true);
});

test("a WebDriver session is detected regardless of user agent", () => {
  for (const userAgent of REAL_PLAYER_AGENTS) {
    assert.equal(isAutomatedClient({ webdriver: true, userAgent }), true, userAgent);
  }
});

test("a missing or empty navigator is treated as a real client", () => {
  assert.equal(isAutomatedClient(undefined), false);
  assert.equal(isAutomatedClient({}), false);
});

test("localhost hostnames are matched exactly", () => {
  for (const hostname of ["127.0.0.1", "localhost", "::1", "[::1]"]) {
    assert.equal(isLocalhostHostname(hostname), true, hostname);
  }
  // A production host must never be mistaken for localhost, including one that
  // merely contains the word.
  for (const hostname of ["clawdstrike.vercel.app", "localhost.evil.com", "mylocalhost", ""]) {
    assert.equal(isLocalhostHostname(hostname), false, hostname);
  }
});

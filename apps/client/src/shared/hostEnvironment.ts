const LOCALHOST_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function isLocalhostHostname(hostname: string): boolean {
  return LOCALHOST_HOSTNAMES.has(hostname);
}

/**
 * True when the page is being driven by tooling rather than a person: a
 * WebDriver session (Playwright, Selenium) or the Claude in-app browser.
 *
 * `navigator.webdriver` alone is not enough — the Claude browser reports it as
 * false, so an LLM playtest looks exactly like a human one to that check.
 * The Claude build identifies itself with a `Claude/<version>` UA token.
 *
 * Real players' browsers match none of this, so anything gated on it stays on
 * in production.
 */
export function isAutomatedClient(
  nav: { webdriver?: boolean; userAgent?: string } | undefined =
    typeof navigator === "undefined" ? undefined : navigator,
): boolean {
  if (!nav) return false;
  if (nav.webdriver === true) return true;
  return /\bClaude\/[\d.]+/i.test(nav.userAgent ?? "");
}

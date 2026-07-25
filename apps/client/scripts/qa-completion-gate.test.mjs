import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const completionSource = await readFile(
  new URL("./qa-completion-gate.mjs", import.meta.url),
  "utf8",
);

test("qa:completion is wired to the shared three-route completion contract", () => {
  assert.match(completionSource, /const routes = resolveCompletionRoutes\(\);/);
  assert.match(completionSource, /for \(const route of routes\)/);
  assert.doesNotMatch(completionSource, /process\.env\.(?:BAZAAR_ROUTE|ROUTE_IDS)/);
});

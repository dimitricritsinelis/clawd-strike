import assert from "node:assert/strict";
import test from "node:test";
import { runAgentSmoke } from "./agent-smoke-runner.mjs";

test("agent smoke is a thin owned-server canonical Playwright wrapper", async () => {
  let invocation = null;
  const exitCode = await runAgentSmoke({
    environment: {
      BASE_URL: "http://stale.example/",
      BAZAAR_TRAVERSAL_PROFILE: "final",
    },
    runPlaywright: async (args, options) => {
      invocation = {
        args,
        options,
        scope: process.env.BAZAAR_TRAVERSAL_SCOPE,
        profile: process.env.BAZAAR_TRAVERSAL_PROFILE,
      };
      return 0;
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(invocation.args, [
    "test",
    "playwright/bazaar-v3-traversal.spec.ts",
    "--workers=1",
  ]);
  assert.equal(invocation.scope, "canonical");
  assert.equal(invocation.profile, "final");
  assert.deepEqual(invocation.options.serverOptions, { profile: "final" });
});

test("agent smoke requires explicit focused scope and rejects unknown route ids", async () => {
  let invoked = false;
  await assert.rejects(
    runAgentSmoke({
      environment: { ROUTE_IDS: "main-a-to-b" },
      runPlaywright: async () => {
        invoked = true;
        return 0;
      },
    }),
    /canonical validation rejects route selectors/,
  );
  assert.equal(invoked, false);

  await assert.rejects(
    runAgentSmoke({
      environment: {
        BAZAAR_TRAVERSAL_SCOPE: "focused",
        BAZAAR_ROUTE: "not-authored",
      },
      runPlaywright: async () => {
        invoked = true;
        return 0;
      },
    }),
    /unknown route ids: not-authored/,
  );
  assert.equal(invoked, false);
});

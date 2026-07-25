import { pathToFileURL } from "node:url";
import { resolveTraversalSelection } from "./lib/traversalRoutes.mjs";
import { runPlaywrightQa } from "./run-playwright-qa.mjs";

const TRAVERSAL_SPEC = "playwright/bazaar-v3-traversal.spec.ts";

export async function runAgentSmoke(options = {}) {
  const environment = options.environment ?? process.env;
  const scope = environment.BAZAAR_TRAVERSAL_SCOPE ?? "canonical";
  const profile = environment.BAZAAR_TRAVERSAL_PROFILE === "blockout"
    ? "blockout"
    : "final";

  // Resolve before starting the owned server so unknown IDs, conflicting
  // selectors, and accidental subsets fail immediately.
  resolveTraversalSelection({
    scope,
    routeIdsRaw: environment.BAZAAR_ROUTE,
    legacyRouteIdsRaw: environment.ROUTE_IDS,
  });

  const previousScope = process.env.BAZAAR_TRAVERSAL_SCOPE;
  const previousProfile = process.env.BAZAAR_TRAVERSAL_PROFILE;
  process.env.BAZAAR_TRAVERSAL_SCOPE = scope;
  process.env.BAZAAR_TRAVERSAL_PROFILE = profile;
  try {
    return await (options.runPlaywright ?? runPlaywrightQa)(
      ["test", TRAVERSAL_SPEC, "--workers=1"],
      {
        ...(options.playwrightOptions ?? {}),
        serverOptions: { profile },
      },
    );
  } finally {
    if (previousScope === undefined) delete process.env.BAZAAR_TRAVERSAL_SCOPE;
    else process.env.BAZAAR_TRAVERSAL_SCOPE = previousScope;
    if (previousProfile === undefined) delete process.env.BAZAAR_TRAVERSAL_PROFILE;
    else process.env.BAZAAR_TRAVERSAL_PROFILE = previousProfile;
  }
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await runAgentSmoke().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    return 1;
  });
}

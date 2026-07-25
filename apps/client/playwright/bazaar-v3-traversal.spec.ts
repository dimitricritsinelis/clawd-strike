import { expect, test } from "@playwright/test";
import {
  SHIP_QA_SEARCH_PARAMS,
  attachConsoleRecorder,
  evaluateRuntimeState,
  gotoAgentRuntime,
  readRouteRuntimeState,
  runWaypointRoute,
  writeJson,
} from "../scripts/lib/runtimePlaywright.mjs";
import {
  resolveTraversalSelection,
} from "../scripts/lib/traversalRoutes.mjs";

const TRAVERSAL_PROFILE = process.env.BAZAAR_TRAVERSAL_PROFILE === "blockout"
  ? "blockout"
  : "final";
const TRAVERSAL_SCOPE = process.env.BAZAAR_TRAVERSAL_SCOPE ?? "canonical";
const SELECTED_ROUTES = resolveTraversalSelection({
  scope: TRAVERSAL_SCOPE,
  routeIdsRaw: process.env.BAZAAR_ROUTE,
  legacyRouteIdsRaw: process.env.ROUTE_IDS,
});

test.describe(`Bazaar v3 ${TRAVERSAL_PROFILE} traversal`, () => {
  for (const route of SELECTED_ROUTES) {
    test(route.id, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const recorder = attachConsoleRecorder(page);
      const artifactDir = testInfo.outputPath("route-diagnostics");
      recorder.clear();
      try {
        await gotoAgentRuntime(page, {
          baseUrl: testInfo.project.use.baseURL as string,
          agentName: route.id,
          spawn: route.spawn,
          routeId: route.id,
          artifactDir,
          extraSearchParams: TRAVERSAL_PROFILE === "blockout"
            ? {
                qa: 1,
                floors: "blockout",
                walls: "blockout",
                props: 0,
                ao: 0,
                unlimitedHealth: 1,
              }
            : {
                ...SHIP_QA_SEARCH_PARAMS,
                unlimitedHealth: 1,
              },
        });
        await evaluateRuntimeState(
          page,
          () => window.__debug_eliminate_all_bots?.() ?? 0,
          undefined,
          { operation: "eliminate-bots", routeId: route.id, artifactDir },
        );
        const summary = await runWaypointRoute(page, route, { artifactDir });
        expect(summary.reachedWaypoints).toHaveLength(route.waypoints.length - 1);
        expect(summary.distanceM).toBeGreaterThanOrEqual(route.expectedMinDistanceM);
        expect(summary.maxStationaryTicks).toBeLessThanOrEqual(route.maxStationaryTicks);
        expect(summary.withinPlayableBounds).toBe(true);
        expect(summary.endedAlive).toBe(true);
        expect(recorder.counts().errorCount, `[${route.id}] console errors`).toBe(0);
      } catch (error) {
        const lastValidState = await readRouteRuntimeState(page, {
          operation: "route-failure-state",
          routeId: route.id,
          artifactDir,
        }).catch(() => null);
        await writeJson(testInfo.outputPath("route-failure.json"), {
          routeId: route.id,
          profile: TRAVERSAL_PROFILE,
          failedAt: new Date().toISOString(),
          lastValidPlayerState: lastValidState?.player ?? null,
          currentUrl: page.url(),
          console: {
            events: recorder.snapshot(),
            counts: recorder.counts(),
          },
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack ?? null,
          } : { message: String(error) },
        });
        throw error;
      }
    });
  }
});

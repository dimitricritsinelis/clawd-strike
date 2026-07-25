import { expect, test } from "@playwright/test";
import {
  attachConsoleRecorder,
  gotoAgentRuntime,
  runWaypointRoute,
} from "../scripts/lib/runtimePlaywright.mjs";
import { resolveTraversalRoutes } from "../scripts/lib/traversalRoutes.mjs";

const [SMOKE_ROUTE] = resolveTraversalRoutes(["main-a-to-b"]);

test("completes the canonical main-lane smoke route without leaving bounds", async ({ page }, testInfo) => {
  const recorder = attachConsoleRecorder(page);
  await gotoAgentRuntime(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: SMOKE_ROUTE.id,
    spawn: SMOKE_ROUTE.spawn,
    routeId: SMOKE_ROUTE.id,
    extraSearchParams: {
      qa: 1,
      floors: "blockout",
      walls: "blockout",
      props: 0,
      ao: 0,
      unlimitedHealth: 1,
    },
  });
  const summary = await runWaypointRoute(page, SMOKE_ROUTE);
  expect(summary.reachedWaypoints).toHaveLength(SMOKE_ROUTE.waypoints.length - 1);
  expect(summary.distanceM).toBeGreaterThanOrEqual(SMOKE_ROUTE.expectedMinDistanceM);
  expect(summary.maxStationaryTicks).toBeLessThanOrEqual(SMOKE_ROUTE.maxStationaryTicks);
  expect(summary.withinPlayableBounds).toBe(true);
  expect(summary.endedAlive).toBe(true);
  expect(recorder.counts().errorCount).toBe(0);
});

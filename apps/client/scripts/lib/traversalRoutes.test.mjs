import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_TRAVERSAL_ROUTE_COUNT,
  COMPLETION_ROUTE_IDS,
  TRAVERSAL_ROUTES,
  assertCanonicalTraversalRoutes,
  resolveCompletionRoutes,
  resolveTraversalRoutes,
  resolveTraversalSelection,
} from "./traversalRoutes.mjs";

test("publishes one stable twelve-route waypoint manifest", () => {
  assert.equal(TRAVERSAL_ROUTES.length, CANONICAL_TRAVERSAL_ROUTE_COUNT);
  assert.deepEqual(TRAVERSAL_ROUTES.map((route) => route.id), [
    "main-a-to-b",
    "main-b-to-a",
    "west-a-to-b",
    "west-b-to-a",
    "east-a-to-b",
    "east-b-to-a",
    "terrace-ramp-to-stairs",
    "terrace-stairs-to-ramp",
    "west-mid-main-to-west",
    "east-mid-east-to-main",
    "west-upper-main-to-west",
    "east-upper-main-to-east",
  ]);
  assert.deepEqual(
    TRAVERSAL_ROUTES[0].waypoints.map(({ zoneId, x, z }) => ({ zoneId, x, z })),
    [
      { zoneId: "SPAWN_A_COURTYARD", x: 28, z: 7 },
      { zoneId: "SPICE_STREET", x: 27, z: 23 },
      { zoneId: "FOUNTAIN_COURT", x: 28, z: 40 },
      { zoneId: "TEXTILE_ARCADE", x: 29.5, z: 56 },
      { zoneId: "RUG_GATE", x: 27.5, z: 71 },
      { zoneId: "SPAWN_B_COURTYARD", x: 28, z: 85 },
    ],
  );
  assert.deepEqual(
    TRAVERSAL_ROUTES[1].waypoints,
    [...TRAVERSAL_ROUTES[0].waypoints].reverse(),
  );
});

test("completion gate selects three representative routes from the shared authority", () => {
  assert.deepEqual(COMPLETION_ROUTE_IDS, ["main-a-to-b", "west-a-to-b", "east-a-to-b"]);
  assert.deepEqual(resolveCompletionRoutes().map((route) => route.id), COMPLETION_ROUTE_IDS);
});

test("route selection preserves request order and rejects every unknown id", () => {
  assert.deepEqual(
    resolveTraversalRoutes(["east-a-to-b", "main-a-to-b"]).map((route) => route.id),
    ["east-a-to-b", "main-a-to-b"],
  );
  assert.throws(
    () => resolveTraversalRoutes("main-a-to-b,not-authored"),
    /unknown route ids: not-authored/,
  );
  assert.throws(
    () => resolveTraversalRoutes("main-a-to-b,main-a-to-b"),
    /duplicate route ids/,
  );
});

test("canonical traversal rejects ambient selectors and always asserts exact manifest coverage", () => {
  assert.deepEqual(resolveTraversalSelection().map((route) => route.id), TRAVERSAL_ROUTES.map((route) => route.id));
  assert.throws(
    () => resolveTraversalSelection({ routeIdsRaw: "main-a-to-b" }),
    /canonical validation rejects route selectors/,
  );
  assert.throws(
    () => assertCanonicalTraversalRoutes(TRAVERSAL_ROUTES.slice(0, 11)),
    /requires exactly 12 authored routes/,
  );
});

test("focused traversal requires an explicit scope and rejects conflicting selectors", () => {
  assert.deepEqual(
    resolveTraversalSelection({
      scope: "focused",
      routeIdsRaw: "east-a-to-b,main-a-to-b",
    }).map((route) => route.id),
    ["east-a-to-b", "main-a-to-b"],
  );
  assert.throws(
    () => resolveTraversalSelection({ scope: "focused" }),
    /focused traversal requires/,
  );
  assert.throws(
    () => resolveTraversalSelection({
      scope: "focused",
      routeIdsRaw: "main-a-to-b",
      legacyRouteIdsRaw: "east-a-to-b",
    }),
    /conflicting/,
  );
});

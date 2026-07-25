const waypoint = (zoneId, x, z, options = {}) => Object.freeze({
  zoneId,
  x,
  z,
  ...options,
});

const A = waypoint("SPAWN_A_COURTYARD", 28, 7);
const B = waypoint("SPAWN_B_COURTYARD", 28, 85);

const MAIN_SOUTH_TO_NORTH = Object.freeze([
  A,
  waypoint("SPICE_STREET", 27, 23),
  waypoint("FOUNTAIN_COURT", 28, 40),
  waypoint("TEXTILE_ARCADE", 29.5, 56),
  waypoint("RUG_GATE", 27.5, 71),
  B,
]);

const WEST_GROUND_SOUTH_TO_NORTH = Object.freeze([
  A,
  waypoint("LINK_SOUTH_WEST", 13.5, 10.5),
  waypoint("SERVICE_SOUTH", 6.5, 20),
  waypoint("CARAVAN_COURT", 8, 39),
  waypoint("SERVICE_NORTH", 6.5, 62),
  // Keep the service-lane centreline until the north link. A direct diagonal
  // crosses the adjacent raised terrace and stairs.
  waypoint("SERVICE_NORTH", 6.5, 76),
  waypoint("LINK_NORTH_WEST", 13.5, 78.5),
  B,
]);

const EAST_SOUTH_TO_NORTH = Object.freeze([
  A,
  waypoint("LINK_SOUTH_EAST", 42.5, 10.5),
  waypoint("DYERS_ALLEY", 49.5, 21),
  waypoint("COVERED_SOUK", 47, 40),
  waypoint("DYERS_DOGLEG", 49.5, 55),
  waypoint("NORTH_COURT", 47, 70),
  waypoint("LINK_NORTH_EAST", 42.5, 78.5),
  B,
]);

const TERRACE_SOUTH_TO_NORTH = Object.freeze([
  A,
  waypoint("LINK_SOUTH_WEST", 13.5, 10.5),
  waypoint("SERVICE_SOUTH", 6.5, 20),
  waypoint("CARAVAN_COURT", 8, 39),
  waypoint("TEA_RAMP", 15, 52, { elevationRangeM: Object.freeze([0.4, 1.05]) }),
  waypoint("TEA_TERRACE", 15, 61, { elevationM: 1.4 }),
  waypoint("TEA_STAIRS", 15, 69, { elevationRangeM: Object.freeze([0.35, 1.1]) }),
  waypoint("TEA_LANDING", 15, 74),
  waypoint("LINK_WEST_UPPER", 20, 74),
  waypoint("RUG_GATE", 27.5, 71),
  B,
]);

function route(id, label, spawn, waypoints) {
  const authoredDistanceM = waypoints.slice(1).reduce((sum, current, index) => {
    const previous = waypoints[index];
    return sum + Math.hypot(current.x - previous.x, current.z - previous.z);
  }, 0);
  return Object.freeze({
    id,
    label,
    spawn,
    waypoints: Object.freeze([...waypoints]),
    // The waypoint reach and zone checks are authoritative. This derived bound
    // catches a broken movement trace without introducing another hand-authored
    // route threshold.
    expectedMinDistanceM: Number((authoredDistanceM * 0.65).toFixed(3)),
    maxStationaryTicks: 12,
  });
}

function reverseRoute(id, label, waypoints) {
  return route(id, label, "B", [...waypoints].reverse());
}

export const TRAVERSAL_ROUTES = Object.freeze([
  route("main-a-to-b", "Main lane A to B", "A", MAIN_SOUTH_TO_NORTH),
  reverseRoute("main-b-to-a", "Main lane B to A", MAIN_SOUTH_TO_NORTH),
  route("west-a-to-b", "West service lane A to B", "A", WEST_GROUND_SOUTH_TO_NORTH),
  reverseRoute("west-b-to-a", "West service lane B to A", WEST_GROUND_SOUTH_TO_NORTH),
  route("east-a-to-b", "East lane A to B", "A", EAST_SOUTH_TO_NORTH),
  reverseRoute("east-b-to-a", "East lane B to A", EAST_SOUTH_TO_NORTH),
  route("terrace-ramp-to-stairs", "Tea terrace ramp to stairs", "A", TERRACE_SOUTH_TO_NORTH),
  reverseRoute("terrace-stairs-to-ramp", "Tea terrace stairs to ramp", TERRACE_SOUTH_TO_NORTH),
  route("west-mid-main-to-west", "West middle cross-link", "A", [
    A,
    MAIN_SOUTH_TO_NORTH[1],
    MAIN_SOUTH_TO_NORTH[2],
    waypoint("FOUNTAIN_COURT", 27, 35),
    waypoint("FOUNTAIN_COURT", 21.5, 35),
    waypoint("LINK_WEST_MID", 17.5, 38.5),
    waypoint("CARAVAN_COURT", 8, 39),
  ]),
  route("east-mid-east-to-main", "East middle cross-link", "A", [
    A,
    EAST_SOUTH_TO_NORTH[1],
    EAST_SOUTH_TO_NORTH[2],
    EAST_SOUTH_TO_NORTH[3],
    waypoint("LINK_EAST_MID", 38.5, 41.5),
    waypoint("FOUNTAIN_COURT", 28, 40),
  ]),
  route("west-upper-main-to-west", "West upper cross-link", "B", [
    B,
    waypoint("RUG_GATE", 27.5, 73),
    waypoint("LINK_WEST_UPPER", 20, 74),
    waypoint("TEA_LANDING", 15, 74),
  ]),
  route("east-upper-main-to-east", "East upper cross-link", "B", [
    B,
    waypoint("RUG_GATE", 27.5, 70),
    waypoint("LINK_EAST_UPPER", 37.5, 69.5),
    waypoint("NORTH_COURT", 47, 70),
  ]),
]);

const ROUTES_BY_ID = new Map(TRAVERSAL_ROUTES.map((candidate) => [candidate.id, candidate]));
export const CANONICAL_TRAVERSAL_ROUTE_COUNT = 12;
export const TRAVERSAL_ROUTE_IDS = Object.freeze(TRAVERSAL_ROUTES.map((route) => route.id));
export const COMPLETION_ROUTE_IDS = Object.freeze([
  "main-a-to-b",
  "west-a-to-b",
  "east-a-to-b",
]);

export function assertCanonicalTraversalRoutes(routes) {
  const routeIds = routes.map((route) => route.id);
  if (
    routes.length !== CANONICAL_TRAVERSAL_ROUTE_COUNT
    || routeIds.some((routeId, index) => routeId !== TRAVERSAL_ROUTE_IDS[index])
  ) {
    throw new Error(
      `[traversal-routes] canonical validation requires exactly ${CANONICAL_TRAVERSAL_ROUTE_COUNT} authored routes in manifest order`,
    );
  }
  return routes;
}

export function resolveTraversalRoutes(routeIdsRaw) {
  if (routeIdsRaw === undefined || routeIdsRaw === null || routeIdsRaw === "") {
    return [...TRAVERSAL_ROUTES];
  }
  const requestedIds = typeof routeIdsRaw === "string"
    ? routeIdsRaw.split(",").map((value) => value.trim()).filter(Boolean)
    : [...routeIdsRaw];
  if (requestedIds.length === 0) {
    throw new Error("[traversal-routes] at least one authored route id is required");
  }
  const duplicateIds = requestedIds.filter((id, index) => requestedIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`[traversal-routes] duplicate route ids: ${[...new Set(duplicateIds)].join(", ")}`);
  }
  const unknownIds = requestedIds.filter((id) => !ROUTES_BY_ID.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`[traversal-routes] unknown route ids: ${unknownIds.join(", ")}`);
  }
  return requestedIds.map((id) => ROUTES_BY_ID.get(id));
}

export function resolveCompletionRoutes() {
  return resolveTraversalRoutes(COMPLETION_ROUTE_IDS);
}

export function resolveTraversalSelection(options = {}) {
  const {
    scope = "canonical",
    routeIdsRaw,
    legacyRouteIdsRaw,
  } = options;
  if (scope !== "canonical" && scope !== "focused") {
    throw new Error(`[traversal-routes] unknown traversal scope '${scope}'`);
  }
  const selectors = [routeIdsRaw, legacyRouteIdsRaw]
    .filter((value) => value !== undefined && value !== null && value !== "");
  if (scope === "canonical") {
    if (selectors.length > 0) {
      throw new Error(
        "[traversal-routes] canonical validation rejects route selectors; use BAZAAR_TRAVERSAL_SCOPE=focused explicitly",
      );
    }
    return assertCanonicalTraversalRoutes(resolveTraversalRoutes());
  }
  if (selectors.length === 0) {
    throw new Error("[traversal-routes] focused traversal requires BAZAAR_ROUTE or ROUTE_IDS");
  }
  if (selectors.length > 1 && String(selectors[0]) !== String(selectors[1])) {
    throw new Error("[traversal-routes] conflicting BAZAAR_ROUTE and ROUTE_IDS selectors");
  }
  return resolveTraversalRoutes(selectors[0]);
}

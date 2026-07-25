import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeBlockoutSpec } from "../map/types";
import {
  buildTacticalGraph,
  findTacticalPath,
  findZoneForPoint,
} from "./TacticalGraph";

function makeElevatedGraphSpec(): RuntimeBlockoutSpec {
  return {
    mapId: "bazaar-map",
    formatVersion: "3.0",
    mapCenter: { x: 12, y: 8 },
    playable_boundary: { x: 0, y: 0, w: 24, h: 18 },
    defaults: {
      wall_height: 6,
      wall_thickness: 0.35,
      ceiling_height: 8,
      floor_height: 0,
    },
    wall_details: {
      enabled: false,
      style: "bazaar",
      density: 0,
      maxProtrusion: 0.2,
      facadeOverrides: [],
      doorLayoutOverrides: [],
      windowLayoutOverrides: [],
      balconyLayoutOverrides: [],
      moduleRegistry: { windowModules: [], doorModules: [], heroBayModules: [] },
      compositionLayoutOverrides: [],
    },
    zones: [
      {
        id: "WEST_GROUND",
        type: "side_hall",
        rect: { x: 0, y: 0, w: 8, h: 8 },
        label: "Ground",
        notes: "",
        surfaceId: "SURFACE_GROUND",
        macroLane: "west",
      },
      {
        id: "WEST_RAMP",
        type: "connector",
        rect: { x: 8, y: 0, w: 8, h: 8 },
        label: "Ramp",
        notes: "",
        surfaceId: "SURFACE_RAMP",
        macroLane: "west",
      },
      {
        id: "WEST_TERRACE",
        type: "side_hall",
        rect: { x: 16, y: 0, w: 8, h: 8 },
        label: "Terrace",
        notes: "",
        surfaceId: "SURFACE_TERRACE",
        macroLane: "west",
      },
      {
        id: "MAIN_DISCONNECTED",
        type: "main_lane_segment",
        rect: { x: 8, y: 10, w: 8, h: 8 },
        label: "Disconnected",
        notes: "",
        surfaceId: "SURFACE_DISCONNECTED",
        macroLane: "main",
      },
    ],
    exterior_wall_patches: [],
    traversalSurfaces: [
      {
        id: "SURFACE_GROUND",
        zoneId: "WEST_GROUND",
        kind: "flat",
        rect: { x: 0, y: 0, w: 8, h: 8 },
        elevationM: 0,
      },
      {
        id: "SURFACE_RAMP",
        zoneId: "WEST_RAMP",
        kind: "ramp",
        rect: { x: 8, y: 0, w: 8, h: 8 },
        axis: "x",
        startElevationM: 0,
        endElevationM: 1.4,
      },
      {
        id: "SURFACE_TERRACE",
        zoneId: "WEST_TERRACE",
        kind: "flat",
        rect: { x: 16, y: 0, w: 8, h: 8 },
        elevationM: 1.4,
      },
      {
        id: "SURFACE_DISCONNECTED",
        zoneId: "MAIN_DISCONNECTED",
        kind: "flat",
        rect: { x: 8, y: 10, w: 8, h: 8 },
        elevationM: 0,
      },
    ],
    explicitConnectivity: [
      {
        fromZoneId: "WEST_GROUND",
        toZoneId: "WEST_RAMP",
        transitionSurfaceId: "SURFACE_RAMP",
        cost: 1,
      },
      {
        fromZoneId: "WEST_RAMP",
        toZoneId: "WEST_TERRACE",
        transitionSurfaceId: "SURFACE_RAMP",
        cost: 1.25,
      },
    ],
    constraints: {
      min_path_width_main_lane: 6,
      min_path_width_side_halls: 4.5,
    },
  };
}

test("builds elevated tactical nodes from authored surfaces and macro lanes", () => {
  const graph = buildTacticalGraph(makeElevatedGraphSpec(), null);
  assert.equal(graph.nodeById.get("zone:WEST_GROUND")?.y, 0);
  assert.ok(Math.abs((graph.nodeById.get("zone:WEST_RAMP")?.y ?? -1) - 0.7) < 1e-9);
  assert.equal(graph.nodeById.get("zone:WEST_TERRACE")?.y, 1.4);
  assert.equal(graph.nodeById.get("zone:WEST_TERRACE")?.lane, "west");
  assert.equal(findZoneForPoint(graph, 18, 3, 1.4)?.id, "WEST_TERRACE");
});

test("uses explicit weighted connectivity instead of inferred rectangle proximity", () => {
  const graph = buildTacticalGraph(makeElevatedGraphSpec(), null);
  assert.deepEqual(graph.zoneAdjacency.get("WEST_GROUND"), ["WEST_RAMP"]);
  assert.deepEqual(graph.zoneAdjacency.get("MAIN_DISCONNECTED"), []);

  const path = findTacticalPath(
    graph,
    graph.zoneCenterNodeIds.get("WEST_GROUND") ?? null,
    graph.zoneCenterNodeIds.get("WEST_TERRACE") ?? null,
  );
  assert.equal(path[0], "zone:WEST_GROUND");
  assert.equal(path.at(-1), "zone:WEST_TERRACE");
  assert.ok(path.some((nodeId) => graph.nodeById.get(nodeId)?.zoneId === "WEST_RAMP"));
});

test("places authored transition nodes on the declared transition surface", () => {
  const graph = buildTacticalGraph(makeElevatedGraphSpec(), null);

  const groundToRamp = graph.nodeById.get("edge:WEST_GROUND->WEST_RAMP");
  const rampFromGround = graph.nodeById.get("edge:WEST_RAMP->WEST_GROUND");
  assert.deepEqual(
    { x: groundToRamp?.x, y: groundToRamp?.y, z: groundToRamp?.z },
    { x: 8, y: 0, z: 4 },
  );
  assert.deepEqual(
    { x: rampFromGround?.x, y: rampFromGround?.y, z: rampFromGround?.z },
    { x: 8, y: 0, z: 4 },
  );

  const rampToTerrace = graph.nodeById.get("edge:WEST_RAMP->WEST_TERRACE");
  const terraceFromRamp = graph.nodeById.get("edge:WEST_TERRACE->WEST_RAMP");
  assert.deepEqual(
    { x: rampToTerrace?.x, y: rampToTerrace?.y, z: rampToTerrace?.z },
    { x: 16, y: 1.4, z: 4 },
  );
  assert.deepEqual(
    { x: terraceFromRamp?.x, y: terraceFromRamp?.y, z: terraceFromRamp?.z },
    { x: 16, y: 1.4, z: 4 },
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { captureEvidenceErrors, deriveReviewUnits, detectProtectedChanges, hasFrameMeasurement } from "./mapShoot";
import type { CaptureEvidence } from "./mapShoot";

const source = JSON.parse(readFileSync(new URL("../../docs/map-design/specs/map_spec.json", import.meta.url), "utf8"));

test("B spawn survey includes both entrance wings even when a frontage is shorter than three metres", () => {
  const unit = deriveReviewUnits(source).find((unit) => unit.id === "unit-spawn-b-courtyard")!;
  for (const side of ["WEST", "EAST"]) {
    assert.ok(unit.views.some((view) => view.id === `elev:FRONTAGE_SPAWN_B_SOUTH_${side}`));
  }
});

test("static guard catches tactical inputs and cover transforms outside the old projection", () => {
  const edits = [
    (spec: typeof source) => { spec.map_center.x += 1; },
    (spec: typeof source) => { spec.anchors.find((row: any) => row.type === "open_node").x += 1; },
    (spec: typeof source) => { spec.dressing_clusters.find((row: any) => row.classification === "gameplay_cover").classification = "soft_visual"; },
    (spec: typeof source) => { spec.dressing_clusters.find((row: any) => row.classification === "soft_visual").classification = "gameplay_cover"; },
    (spec: typeof source) => {
      const cluster = spec.dressing_clusters.find((row: any) => row.classification === "gameplay_cover");
      spec.asset_registry.find((row: any) => row.id === cluster.assetIds[0]).transform = { authoredScale: { x: 2, y: 1, z: 1 } };
    },
    (spec: typeof source) => { spec.traversal_surfaces[0].elevationM += 1; },
  ];
  for (const edit of edits) {
    const changed = structuredClone(source);
    edit(changed);
    assert.ok(detectProtectedChanges(source, changed, []).length, String(edit));
  }
  assert.ok(detectProtectedChanges(source, source, ["apps/client/src/runtime/combat/PlayerController.ts"]).length);
});

test("visual dressing and authored composition pass without freezing noncolliding asset dimensions", () => {
  const changed = structuredClone(source);
  for (const classification of ["soft_visual", "overhead"]) {
    const cluster = changed.dressing_clusters.find((row: any) => row.classification === classification);
    changed.dressing_placements.find((row: any) => row.clusterId === cluster.id).offsetM.x += 0.1;
  }
  // The fountain visual is compiled separately from its legacy anchor collider.
  changed.dressing_placements.find((row: any) => row.id === "PLACE_FOUNTAIN").scale.x += 0.1;
  changed.asset_registry.find((row: any) => row.id === "ASSET_FOUNTAIN").dimensionsM.width += 0.1;
  changed.frontages[0].layoutIntent = {
    mode: "authored", columns: [{ id: "AXIS", along: 0.5 }],
    bays: [{ id: "BAY", moduleId: "blind_niche", columnId: "AXIS" }],
  };
  changed.anchors.find((row: any) => row.type === "cover_cluster").notes = "Updated description.";
  assert.deepEqual(detectProtectedChanges(source, changed, []), []);
});

test("moving an anchor that can produce a legacy collider is protected", () => {
  const changed = structuredClone(source);
  changed.anchors.find((row: any) => row.type === "landmark").x += 1;
  assert.ok(detectProtectedChanges(source, changed, []).some((reason) => reason.includes("gameplayAnchors")));
});

function evidence(): CaptureEvidence {
  return {
    valid: true, synthetic: false, protectedAuthorityHash: "stable-colliders",
    units: [{ id: "unit-test", views: { primary: { valid: true }, context: { valid: true } } }],
  };
}

test("only fresh finite frame measurements support performance comparison", () => {
  const good = { drawCalls: 400, triangles: 800_000, medianFrameMs: 5, measurement: "per-view-qa-frame" };
  assert.equal(hasFrameMeasurement(good), true);
  assert.equal(hasFrameMeasurement(undefined), false);
  assert.equal(hasFrameMeasurement({ ...good, measurement: "rolling-runtime-median" }), false);
  for (const medianFrameMs of [0, -1, NaN, Infinity, null]) {
    assert.equal(hasFrameMeasurement({ ...good, medianFrameMs }), false);
  }
  assert.equal(hasFrameMeasurement({ ...good, drawCalls: 0 }), false);
  assert.equal(hasFrameMeasurement({ ...good, triangles: NaN }), false);
});

test("paired runtime evidence catches builder changes that static spec checks cannot", () => {
  const before = evidence();
  const after = evidence();
  assert.deepEqual(captureEvidenceErrors(after, before), []);
  // Render builders are editable; actual collider output, not the filename, decides.
  assert.deepEqual(detectProtectedChanges(source, source, ["apps/client/src/runtime/map/buildProps.ts"]), []);
  after.protectedAuthorityHash = "changed-colliders";
  assert.ok(captureEvidenceErrors(after, before).includes("runtime colliders changed since before capture"));
});

test("invalid, empty, synthetic, and partial evidence cannot pass", () => {
  const changes = [
    (row: CaptureEvidence) => { row.valid = false; },
    (row: CaptureEvidence) => { row.synthetic = true; },
    (row: CaptureEvidence) => { row.protectedAuthorityHash = ""; },
    (row: CaptureEvidence) => { row.units = []; },
    (row: CaptureEvidence) => { row.units[0]!.views = {}; },
    (row: CaptureEvidence) => { row.units[0]!.views.primary!.valid = false; },
    (row: CaptureEvidence) => { delete row.units[0]!.views.context; },
  ];
  for (const change of changes) {
    const bad = evidence();
    change(bad);
    assert.ok(captureEvidenceErrors(bad, evidence()).length, String(change));
    assert.ok(captureEvidenceErrors(evidence(), bad).length, String(change));
  }
});

// ---- authored placement guard ----
import { authoredPlacementReasons, glbBounds, placementDesignBounds, walkableBoundarySegments } from "./mapShoot";
import type { MapSpec } from "./mapShoot";

function glb(gltf: object): Buffer {
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const header = Buffer.alloc(20);
  [0x46546c67, 2, 20 + padded.length, padded.length, 0x4e4f534a].forEach((value, i) => header.writeUInt32LE(value, i * 4));
  return Buffer.concat([header, padded]);
}
const near = (actual: readonly number[], expected: readonly number[]) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]!) < 1e-6, `[${actual.join(", ")}] vs [${expected.join(", ")}]`));
};
const meshBox = (min: number[], max: number[]) => ({
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min, max }],
});

test("glbBounds walks the node hierarchy with translation, rotation and scale", () => {
  const scaled = glb({ scenes: [{ nodes: [0] }], nodes: [{ children: [1], translation: [1, 0, 0] }, { mesh: 0, scale: [2, 2, 2] }], ...meshBox([-0.5, 0, -0.5], [0.5, 1, 0.5]) });
  assert.deepEqual(glbBounds(scaled), { min: [0, 0, -1], max: [2, 2, 1] });
  const s = Math.SQRT1_2; // 90 degrees about +Y turns +X toward -Z
  const turned = glb({ nodes: [{ mesh: 0, rotation: [0, s, 0, s] }], ...meshBox([0, 0, 0], [2, 1, 1]) });
  const b = glbBounds(turned)!;
  near(b.min, [0, 0, -2]);
  near(b.max, [1, 1, 0]);
  assert.equal(glbBounds(glb({ asset: { version: "2.0" } })), null);
  assert.throws(() => glbBounds(Buffer.from("not a glb at all")), /not a GLB/);
});

test("placementDesignBounds mirrors the runtime: yaw 0 faces south, yaw 90 turns the footprint", () => {
  const shelf = { min: [-1, 0, -0.15] as [number, number, number], max: [1, 0.6, 0.15] as [number, number, number] };
  const flat = placementDesignBounds(shelf, { id: "p", modelId: "m", position: { x: 5, y: 0.15, z: 0 }, yawDeg: 0 });
  near(flat.min, [4, 0, 0]);
  near(flat.max, [6, 0.3, 0.6]);
  const turned = placementDesignBounds(shelf, { id: "p", modelId: "m", position: { x: 5, y: 0.15, z: 0 }, yawDeg: 90 });
  near(turned.min, [4.85, -0.85, 0]);
  near(turned.max, [5.15, 1.15, 0.6]);
});

test("walkableBoundarySegments treats a shared edge as an opening, not a wall", () => {
  const segments = walkableBoundarySegments([{ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 10 }]);
  assert.equal(segments.some((s) => s.orientation === "vertical" && s.coord === 10), false);
  assert.deepEqual(segments.filter((s) => s.orientation === "vertical").map((s) => s.coord).sort((a, b) => a - b), [0, 15]);
  assert.equal(segments.filter((s) => s.orientation === "horizontal").length, 4); // y=0 and y=10, split at x=10
});

test("authoredPlacementReasons rejects walk-through props, floating bases and sunk bases, and passes wall relief and overheads", () => {
  const shelf = { min: [-1, 0, -0.15] as [number, number, number], max: [1, 0.6, 0.15] as [number, number, number] };
  const court = { id: "S_COURT", zoneId: "COURT", kind: "flat" as const, rect: { x: 0, y: 0, w: 10, h: 10 }, elevationM: 0 };
  const lane = { id: "S_LANE", zoneId: "LANE", kind: "flat" as const, rect: { x: 10, y: 0, w: 5, h: 10 }, elevationM: 0 };
  const ramp = { id: "S_RAMP", zoneId: "RAMP", kind: "ramp" as const, rect: { x: 0, y: 10, w: 10, h: 8 }, axis: "y" as const, startElevationM: 0, endElevationM: 1.4 };
  const reasonsFor = (placements: object[]) => authoredPlacementReasons(
    { zones: [], traversal_surfaces: [court, lane, ramp], authored_placements: placements } as unknown as MapSpec,
    (modelId) => (modelId === "empty" ? null : shelf),
  );
  const at = (id: string, x: number, y: number, z: number, yawDeg = 0, modelId = "shelf") => ({ id, modelId, position: { x, y, z }, yawDeg, role: "dressing" });
  assert.match(reasonsFor([at("mid", 5, 5, 0)]).join("\n"), /placement mid \(shelf\) has geometry below 2.2 m standing 5\.\d\d m from the nearest wall/); // the ramp rect opens the court's north edge
  assert.match(reasonsFor([at("opening", 10, 5, 0, 90)]).join("\n"), /placement opening .* from the nearest wall/);
  assert.match(reasonsFor([at("turned", 5, 0.15, 0, 90)]).join("\n"), /placement turned .* standing 1\.\d\d m from the nearest wall/);
  assert.deepEqual(reasonsFor([at("relief", 5, 0.15, 0)]), []);
  assert.deepEqual(reasonsFor([at("sign", 5, 0.15, 1.8)]), []);
  assert.deepEqual(reasonsFor([at("overhead", 5, 5, 2.5)]), []);
  assert.deepEqual(reasonsFor([at("outside", 20, 5, 0)]), []);
  assert.deepEqual(reasonsFor([at("none", 5, 5, 0, 0, "empty")]), []);
  assert.match(reasonsFor([at("float", 5, 0.15, 0.3)]).join("\n"), /placement float \(shelf\) floats 0\.30 m above the ground .* \(S_COURT at 0\.00 m\)/);
  assert.deepEqual(reasonsFor([at("ramp-ok", 0.15, 14, 0.7, 90)]), []);
  assert.match(reasonsFor([at("ramp-sunk", 0.15, 14, 0, 90)]).join("\n"), /placement ramp-sunk \(shelf\) sinks 0\.70 m into the ground .* \(S_RAMP at 0\.70 m\)/);
});

test("authored geometry guard leaves disconnected empty space open and rejects a spanning triangle", async () => {
  const { glbTriangleBounds } = await import("./mapShoot");
  const make = (points: number[]) => {
    const binary=Buffer.alloc(points.length*4);points.forEach((v,i)=>binary.writeFloatLE(v,i*4));
    const data={asset:{version:"2.0"},buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:binary.length}],accessors:[{bufferView:0,componentType:5126,count:points.length/3,type:"VEC3"}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0,translation:[1,0,0]}],scenes:[{nodes:[0]}],scene:0};
    const json=Buffer.from(JSON.stringify(data).padEnd(Math.ceil(JSON.stringify(data).length/4)*4," "));
    const result=Buffer.alloc(28+json.length+binary.length);result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(json.length,12);result.writeUInt32LE(0x4e4f534a,16);json.copy(result,20);result.writeUInt32LE(binary.length,20+json.length);result.writeUInt32LE(0x004e4942,24+json.length);binary.copy(result,28+json.length);return result;
  };
  const vertices: [number, number, number][] = [];
  const apart=glbTriangleBounds(make([-3,0,0,-2,0,0,-2,0,10, 10,0,0,11,0,10,10,0,10]), vertex => vertices.push(vertex));
  assert.deepEqual(vertices.slice(0,3), [[-2,0,0],[-1,0,0],[-1,0,10]]);
  assert.deepEqual(apart[0],{min:[-2,0,0],max:[-1,0,10]});
  const spec={zones:[],traversal_surfaces:[{id:"court",kind:"flat",rect:{x:0,y:0,w:10,h:10},elevationM:0}],authored_placements:[{id:"shared",modelId:"model",position:{x:0,y:0,z:0},yawDeg:180}]} as unknown as MapSpec;
  const enclosing={min:[-2,0,0],max:[12,0,10]} as import("./mapShoot").Bounds3;
  assert.match(authoredPlacementReasons(spec,()=>enclosing).join("\n"),/geometry below/);
  assert.deepEqual(authoredPlacementReasons(spec,()=>enclosing,undefined,undefined,()=>apart),[]);
  const crossing=glbTriangleBounds(make([-3,0,-2,11,0,-2,4,0,12]));
  assert.match(authoredPlacementReasons(spec,()=>enclosing,undefined,undefined,()=>crossing).join("\n"),/geometry below/);
  assert.throws(()=>glbTriangleBounds(make([0,0,0,1,0,0,Number.NaN,0,1])),/non-finite/);
});


test("placement contact uses transformed mesh vertices on a slope and still rejects sinking and floating", () => {
  const local = { min: [0.1,0,10], max: [0.1,3,18] } as import("./mapShoot").Bounds3;
  const points: [number,number,number][] = [[0.1,0,10],[0.1,1.4,18],[0.1,3,10]];
  const ramp = { id:"ramp",kind:"ramp",rect:{x:0,y:10,w:10,h:8},axis:"y",startElevationM:0,endElevationM:1.4 };
  const reasons = (z: number, vertices = points) => authoredPlacementReasons(
    { zones:[],traversal_surfaces:[ramp],authored_placements:[{id:"sloped",modelId:"mesh",position:{x:0,y:0,z},yawDeg:180}] } as unknown as MapSpec,
    () => local, undefined, undefined, undefined, () => vertices,
  );
  assert.deepEqual(reasons(0), []);
  assert.match(reasons(-0.2).join("\n"), /sinks 0\.20 m/);
  assert.match(reasons(0.3).join("\n"), /floats 0\.30 m/);
  assert.match(reasons(0, [[0.1,0,10],[0.1,1.1,18],[0.1,3,10]]).join("\n"), /sinks 0\.30 m/);
});

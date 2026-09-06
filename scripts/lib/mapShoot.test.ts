import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { captureEvidenceErrors, detectProtectedChanges, hasFrameMeasurement } from "./mapShoot";
import type { CaptureEvidence } from "./mapShoot";

const source = JSON.parse(readFileSync(new URL("../../docs/map-design/specs/map_spec.json", import.meta.url), "utf8"));

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

import assert from "node:assert/strict";
import test from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, TorusKnotGeometry, Vector3 } from "three";
import { DeterministicRng } from "../utils/Rng";
import { createBvhTriangleHit, GeometryBvh } from "./decalSurfaceBvh";

test("BVH raycasts agree with three.js on a dense mesh", () => {
  const geometry = new TorusKnotGeometry(1, 0.35, 160, 24);
  const bvh = GeometryBvh.fromGeometry(geometry)!;
  assert.equal(bvh.triangleCount, geometry.index!.count / 3);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
  const raycaster = new Raycaster();
  const rng = new DeterministicRng(7);
  const hit = createBvhTriangleHit();
  let hits = 0;
  for (let i = 0; i < 300; i++) {
    const origin = new Vector3(rng.range(-3, 3), rng.range(-3, 3), rng.range(-3, 3)).setLength(4);
    const target = new Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-0.4, 0.4));
    const direction = target.sub(origin).normalize();
    raycaster.set(origin, direction);
    const expected = raycaster.intersectObject(mesh)[0];
    const found = bvh.raycast(origin.x, origin.y, origin.z, direction.x, direction.y, direction.z, 0, 100, hit);
    assert.equal(found, expected !== undefined, `ray ${i}`);
    if (!expected) continue;
    hits++;
    assert.ok(Math.abs(hit.t - expected.distance) < 1e-4, `ray ${i}: ${hit.t} vs ${expected.distance}`);
    assert.equal(hit.triangle, expected.faceIndex);
  }
  assert.ok(hits > 150, `only ${hits} hits`);
});

test("BVH respects the [tMin, tMax] window and reports the facing side", () => {
  const geometry = new SphereGeometry(1, 32, 16);
  const bvh = GeometryBvh.fromGeometry(geometry)!;
  const hit = createBvhTriangleHit();
  assert.ok(bvh.raycast(0.013, 0.021, 5, 0, 0, -1, 0, 100, hit));
  const first = hit.t;
  assert.ok(hit.frontFacing, "entering the surface meets its outside");
  assert.ok(!bvh.raycast(0.013, 0.021, 5, 0, 0, -1, 0, first - 0.01, hit), "tMax cuts the hit off");
  assert.ok(bvh.raycast(0.013, 0.021, 5, 0, 0, -1, first + 1e-4, 100, hit));
  assert.ok(hit.t > first);
  assert.ok(!hit.frontFacing, "leaving the sphere meets its inside");
  assert.ok(Math.abs(first - 4) < 0.01 && Math.abs(hit.t - 6) < 0.01);
});

import assert from "node:assert/strict";
import test from "node:test";
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { resolveCoplanarSurfaces } from "./resolveCoplanarSurfaces";

/** Axis-aligned quad in the z = `z` plane facing +Z, UVs following world x/y. */
function quad(x0: number, x1: number, y0: number, y1: number, z: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3));
  geometry.setAttribute("normal", new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setAttribute("uv", new Float32BufferAttribute([x0, y0, x1, y0, x1, y1, x0, y1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

function triangles(mesh: Mesh): Vector3[][] {
  const geometry = mesh.geometry as BufferGeometry;
  const position = geometry.getAttribute("position");
  const index = geometry.index!;
  const out: Vector3[][] = [];
  for (let i = 0; i < index.count; i += 3) {
    out.push([0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index.getX(i + k)).applyMatrix4(mesh.matrixWorld)));
  }
  return out;
}

function area(mesh: Mesh): number {
  return triangles(mesh).reduce((sum, [a, b, c]) => sum + new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).length() / 2, 0);
}

/** True when any triangle of `mesh` covers the point (x, y) in its plane. */
function covers(mesh: Mesh, x: number, y: number): boolean {
  return triangles(mesh).some(([a, b, c]) => {
    const sign = (p: Vector3, q: Vector3) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
    const s0 = sign(a!, b!), s1 = sign(b!, c!), s2 = sign(c!, a!);
    return (s0 > 0 && s1 > 0 && s2 > 0) || (s0 < 0 && s1 < 0 && s2 < 0);
  });
}

function world(...meshes: Mesh[]): Group {
  const root = new Group();
  root.add(...meshes);
  return root;
}

test("a flush trim keeps its face and the wall run behind it is clipped away", () => {
  const wall = new Mesh(quad(0, 4, 0, 3, 0), new MeshStandardMaterial());
  const trim = new Mesh(quad(1, 1.5, 0, 3, 0), new MeshStandardMaterial());
  const trimGeometry = trim.geometry;
  const stats = resolveCoplanarSurfaces([world(wall, trim)]);

  assert.equal(trim.geometry, trimGeometry, "the detail surface wins untouched");
  assert.ok(Math.abs(area(wall) - (12 - 1.5)) < 1e-4, `wall keeps only the uncovered area, got ${area(wall)}`);
  assert.equal(covers(wall, 1.23, 1.47), false);
  assert.equal(covers(wall, 0.37, 1.13), true);
  assert.equal(covers(wall, 3.41, 2.77), true);
  assert.equal(stats.unresolvedConflicts, 0);
});

test("the surface in front wins even when it is larger", () => {
  const wall = new Mesh(quad(0, 1, 0, 1, 0), new MeshStandardMaterial());
  const course = new Mesh(quad(0, 4, 0, 1, 0.006), new MeshStandardMaterial());
  const courseGeometry = course.geometry;
  resolveCoplanarSurfaces([world(wall, course)]);
  assert.equal(course.geometry, courseGeometry);
  assert.ok(area(wall) < 1e-6, "the covered wall face is removed entirely");
});

test("clipped vertices carry interpolated attributes", () => {
  const wall = new Mesh(quad(0, 4, 0, 3, 0), new MeshStandardMaterial());
  const trim = new Mesh(quad(1, 1.5, 0.5, 2, 0), new MeshStandardMaterial());
  resolveCoplanarSurfaces([world(wall, trim)]);
  const geometry = wall.geometry as BufferGeometry;
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const normal = geometry.getAttribute("normal");
  for (let i = 0; i < position.count; i += 1) {
    assert.ok(Math.abs(uv.getX(i) - position.getX(i)) < 1e-5 && Math.abs(uv.getY(i) - position.getY(i)) < 1e-5, `uv ${i} follows position`);
    assert.ok(Math.abs(normal.getZ(i) - 1) < 1e-6, `normal ${i} stays unit +Z`);
  }
});

test("surfaces farther apart than the fighting range, or facing away, are left alone", () => {
  const wall = new Mesh(quad(0, 4, 0, 3, 0), new MeshStandardMaterial());
  const panel = new Mesh(quad(1, 2, 0, 3, 0.02), new MeshStandardMaterial());
  const back = new Mesh(quad(1, 2, 0, 3, 0), new MeshStandardMaterial());
  back.rotation.y = Math.PI;
  back.position.x = 3;
  const wallGeometry = wall.geometry;
  const stats = resolveCoplanarSurfaces([world(wall, panel, back)]);
  assert.equal(wall.geometry, wallGeometry);
  assert.equal(stats.conflicts, 0);
});

test("translucent or alpha-tested covers never clip what shows through them", () => {
  const wall = new Mesh(quad(0, 4, 0, 3, 0), new MeshStandardMaterial());
  const glass = new Mesh(quad(1, 2, 0, 3, 0.002), new MeshStandardMaterial({ transparent: true, opacity: 0.5 }));
  const grille = new Mesh(quad(2, 3, 0, 3, 0.002), new MeshStandardMaterial({ alphaTest: 0.5 }));
  const wallGeometry = wall.geometry;
  resolveCoplanarSurfaces([world(wall, glass, grille)]);
  assert.equal(wall.geometry, wallGeometry);
});

test("shared template geometry is copied before a clone is clipped", () => {
  const shared = quad(0, 4, 0, 3, 0);
  const loser = new Mesh(shared, new MeshStandardMaterial());
  const elsewhere = new Mesh(shared, new MeshStandardMaterial());
  elsewhere.position.x = 50;
  const trim = new Mesh(quad(1, 1.5, 0, 3, 0.003), new MeshStandardMaterial());
  resolveCoplanarSurfaces([world(loser, elsewhere, trim)]);
  assert.notEqual(loser.geometry, shared);
  assert.equal(elsewhere.geometry, shared);
  assert.equal(shared.index!.count, 6);
});

test("flush faces resolve per surface pair instead of per triangle", () => {
  // Two walls over the same area with different triangulations: a per-triangle
  // rule would leave a patchwork of both finishes.
  const a = new Mesh(quad(0, 2, 0, 3, 0), new MeshStandardMaterial());
  const bGeometry = new BufferGeometry();
  bGeometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 2, 0, 0, 2, 3, 0, 0, 3, 0], 3));
  bGeometry.setIndex([0, 1, 3, 1, 2, 3]);
  const b = new Mesh(bGeometry, new MeshStandardMaterial());
  resolveCoplanarSurfaces([world(a, b)]);
  const remaining = [area(a), area(b)].sort((x, y) => x - y);
  assert.ok(remaining[0]! < 1e-6 && Math.abs(remaining[1]! - 6) < 1e-6, `one finish survives whole, got ${remaining.join(", ")}`);
});

test("a losing instance is lifted out and clipped while its siblings stay instanced", () => {
  const material = new MeshStandardMaterial();
  const courses = new InstancedMesh(quad(0, 4, 0, 1, 0), material, 2);
  courses.setMatrixAt(0, new Matrix4());
  courses.setMatrixAt(1, new Matrix4().makeTranslation(20, 0, 0));
  const plinth = new Mesh(quad(1, 2, 0, 1, 0.004), new MeshStandardMaterial());
  const stats = resolveCoplanarSurfaces([world(courses, plinth)]);

  assert.equal(stats.instancesExtracted, 1);
  const collapsed = new Matrix4();
  courses.getMatrixAt(0, collapsed);
  assert.ok(collapsed.elements.slice(0, 11).every((value) => value === 0), "the losing instance is collapsed");
  const untouched = new Matrix4();
  courses.getMatrixAt(1, untouched);
  assert.equal(untouched.elements[12], 20);
  const extracted = courses.children.find((child) => child.name.includes("coplanar-extract")) as InstancedMesh;
  assert.ok(extracted);
  extracted.updateMatrixWorld(true);
  assert.equal(covers(extracted, 1.53, 0.47), false);
  assert.equal(covers(extracted, 3.23, 0.61), true);
});

test("a shadow caster that loses to a non-caster keeps its shadow through a proxy", () => {
  const wall = new Mesh(quad(0, 4, 0, 3, 0), new MeshStandardMaterial());
  wall.castShadow = true;
  const trim = new Mesh(quad(1, 1.5, 0, 3, 0.002), new MeshStandardMaterial());
  trim.castShadow = false;
  const root = world(wall, trim);
  const stats = resolveCoplanarSurfaces([root]);
  assert.equal(stats.shadowProxies, 1);
  const proxy = root.children.find((child) => child.name === "coplanar-shadow-proxy") as Mesh;
  assert.ok(proxy?.castShadow);
  assert.equal((proxy.material as MeshStandardMaterial).colorWrite, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  type Object3D,
} from "three";
import {
  BulletHoleManager,
  DECAL_CLASS_SIZE_SCALE,
  DECAL_SIZE_BASE_M,
  DECAL_SIZE_VARIATION,
  MAX_DECALS,
  SURFACE_BEHIND_COLLIDER_TOLERANCE_M,
  resolveDecalSizeM,
} from "./BulletHoleManager";

const DOWN = { x: 0, y: -1, z: 0 };
const FORWARD = { x: 0, y: 0, z: -1 };

function decalMesh(scene: Scene): InstancedMesh {
  return scene.children.find((child) => child instanceof InstancedMesh && child.name === "bullet-hole-decals") as InstancedMesh;
}

function decalTransform(scene: Scene, index: number): { position: Vector3; scale: Vector3; normal: Vector3 } {
  const matrix = new Matrix4();
  decalMesh(scene).getMatrixAt(index, matrix);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  matrix.decompose(position, quaternion, scale);
  return { position, scale, normal: new Vector3(0, 0, 1).applyQuaternion(quaternion) };
}

/** A 6 m x 4 m plaster wall whose face is the plane z = 0, facing +z. */
function makeWall(name = "bz06_sand_plaster-cast", z = 0): Mesh {
  const wall = new Mesh(new BoxGeometry(6, 4, 0.4), new MeshStandardMaterial({ name }));
  wall.position.set(0, 2, z - 0.2);
  wall.name = name;
  return wall;
}

function makeWorld(...meshes: Mesh[]): { scene: Scene; holes: BulletHoleManager; root: Object3D } {
  const scene = new Scene();
  const root = new Scene();
  for (const mesh of meshes) root.add(mesh);
  root.updateMatrixWorld(true);
  const holes = new BulletHoleManager(scene, 42, { getSurfaceRoots: () => [root] });
  return { scene, holes, root };
}

test("decals are 0.22 m base with +/-20% variation and per-surface scales", () => {
  assert.equal(DECAL_SIZE_BASE_M, 0.22);
  assert.equal(DECAL_SIZE_VARIATION, 0.2);
  assert.ok(Math.abs(resolveDecalSizeM(0) - DECAL_SIZE_BASE_M * 0.8) < 1e-12);
  assert.ok(Math.abs(resolveDecalSizeM(0.5) - DECAL_SIZE_BASE_M) < 1e-12);
  assert.ok(resolveDecalSizeM(0.999999) < DECAL_SIZE_BASE_M * 1.2);
  assert.equal(DECAL_CLASS_SIZE_SCALE.masonry, 1);
  assert.ok(DECAL_CLASS_SIZE_SCALE.metal < DECAL_CLASS_SIZE_SCALE.masonry);
  assert.ok(DECAL_CLASS_SIZE_SCALE.soft < DECAL_CLASS_SIZE_SCALE.masonry);
});

test("the hole lands on the visible wall, not on a collider face in front of it", () => {
  const { scene, holes } = makeWorld(makeWall());
  // Collider face 0.6 m in front of the art (the old decal would float there).
  holes.spawnFromShot({ x: 0, y: 1.5, z: 5 }, FORWARD, { distance: 4.4, point: { x: 0, y: 1.5, z: 0.6 }, normal: { x: 0, y: 0, z: 1 } }, 4.4);
  const info = holes.getLastDecalInfo();
  assert.equal(info.placement, "surface");
  assert.equal(info.surface, "masonry");
  const decal = decalTransform(scene, 0);
  assert.ok(Math.abs(decal.position.z - 0.003) < 1e-4, `decal z ${decal.position.z}`);
  assert.ok(decal.normal.z > 0.999);
  assert.ok(Math.abs(decal.scale.x - decal.scale.y) < 1e-9);
  assert.ok(decal.scale.x >= DECAL_SIZE_BASE_M * 0.8 - 1e-9 && decal.scale.x <= DECAL_SIZE_BASE_M * 1.2 + 1e-9);
  holes.dispose(scene);
});

test("the hole lands on the visible wall when the collider face is inside the art", () => {
  const { scene, holes } = makeWorld(makeWall());
  // Collider 0.5 m behind the face: the bullet was stopped by a box the art hides.
  holes.spawnFromShot({ x: 0.5, y: 2, z: 5 }, FORWARD, { distance: 5.5, point: { x: 0.5, y: 2, z: -0.5 }, normal: { x: 0, y: 0, z: 1 } }, 5.5);
  assert.equal(holes.getLastDecalInfo().placement, "surface");
  assert.ok(Math.abs(decalTransform(scene, 0).position.z - 0.003) < 1e-4);
  holes.dispose(scene);
});

test("floors without a gameplay collider still take holes", () => {
  const floor = new Mesh(new PlaneGeometry(10, 10), new MeshStandardMaterial({ name: "bz06_rough_service_paving" }));
  floor.rotation.x = -Math.PI / 2;
  const { scene, holes } = makeWorld(floor);
  holes.spawnFromShot({ x: 1, y: 1.6, z: 1 }, { x: 0, y: -0.8, z: -0.6 }, null, 200);
  assert.equal(holes.getLastDecalInfo().placement, "surface");
  const decal = decalTransform(scene, 0);
  assert.ok(Math.abs(decal.position.y - 0.003) < 1e-4);
  assert.ok(decal.normal.y > 0.999);
  holes.dispose(scene);
});

test("an invisible blocker with no art near it leaves no floating hole", () => {
  const { scene, holes } = makeWorld(makeWall("bz06_sand_plaster-cast", -8));
  const blockerDistance = 2;
  assert.ok(6 + 5 - blockerDistance > SURFACE_BEHIND_COLLIDER_TOLERANCE_M);
  holes.spawnFromShot({ x: 0, y: 1.5, z: 5 }, FORWARD, { distance: blockerDistance, point: { x: 0, y: 1.5, z: 2 }, normal: { x: 0, y: 0, z: 1 } }, blockerDistance);
  assert.equal(holes.getLastDecalInfo().placement, "none");
  assert.equal(holes.getDecalCount(), 0);
  assert.ok(holes.getImpactParticles().getActiveParticles("dust").length > 0, "the bullet still kicks up dust");
  holes.dispose(scene);
});

test("foliage, water and back faces of one-sided art are shot through", () => {
  const frond = new Mesh(new PlaneGeometry(2, 2), new MeshStandardMaterial({ name: "palm" }));
  frond.name = "decorative-palms-fronds-full";
  frond.position.set(0, 1.5, 2);
  const water = new Mesh(new PlaneGeometry(2, 2), new MeshStandardMaterial({ name: "water", transparent: true, opacity: 0.34 }));
  water.name = "v3-fountain-shallow-water";
  water.position.set(0, 1.5, 1.5);
  // One-sided panel seen from behind (its front faces -z).
  const panel = new Mesh(new PlaneGeometry(2, 2), new MeshStandardMaterial({ name: "bz06_cream_plaster" }));
  panel.rotation.y = Math.PI;
  panel.position.set(0, 1.5, 1);
  const { scene, holes } = makeWorld(frond, water, panel, makeWall());
  holes.spawnFromShot({ x: 0, y: 1.5, z: 5 }, FORWARD, null, 200);
  const info = holes.getLastDecalInfo();
  assert.equal(info.placement, "surface");
  assert.equal(info.objectName, "bz06_sand_plaster-cast");
  holes.dispose(scene);
});

test("surface classes follow the struck material", () => {
  const cases: [string, string][] = [
    ["bz11_rug_timber-cast", "wood"],
    ["bz04_craft_dark_iron-cast", "metal"],
    ["bz04_fixed_glass-receive", "glass"],
    ["bz21_souk_cloth-cast", "soft"],
    ["bz10_textile_sand-cast", "masonry"],
  ];
  for (const [name] of cases) {
    const { scene, holes } = makeWorld(makeWall(name));
    holes.spawnFromShot({ x: 0, y: 2, z: 5 }, FORWARD, null, 200);
    const expected = cases.find(([n]) => n === name)![1];
    assert.equal(holes.getLastDecalInfo().surface, expected, name);
    holes.dispose(scene);
  }
});

test("holes near an outside corner shrink instead of overhanging it", () => {
  // Post 0.07 m wide: a full masonry crater would hang over both edges.
  const post = new Mesh(new BoxGeometry(0.07, 3, 0.07), new MeshStandardMaterial({ name: "bz06_dressed_sandstone" }));
  post.position.set(0, 1.5, 0);
  post.name = "gate-post";
  const { scene, holes } = makeWorld(post, makeWall("bz06_sand_plaster-cast", -3));
  holes.spawnFromShot({ x: 0, y: 1.5, z: 5 }, FORWARD, null, 200);
  const info = holes.getLastDecalInfo();
  assert.equal(info.objectName, "gate-post");
  assert.equal(info.placement, "surface");
  assert.ok(info.scale < 1, `scale ${info.scale}`);

  holes.spawnFromShot({ x: 1.5, y: 1.5, z: 5 }, FORWARD, null, 200);
  assert.equal(holes.getLastDecalInfo().scale, 1, "an open wall keeps the full size");
  holes.dispose(scene);
});

test("a proud neighbouring stone does not shrink the hole", () => {
  // Stone standing 0.1 m proud of the wall, 0.05 m beside the impact.
  const stone = new Mesh(new BoxGeometry(0.5, 0.5, 0.1), new MeshStandardMaterial({ name: "bz06_service_stone" }));
  stone.position.set(0.3, 1.5, 0.05);
  const { scene, holes } = makeWorld(stone, makeWall("bz06_service_stone-cast"));
  holes.spawnFromShot({ x: 0, y: 1.5, z: 5 }, FORWARD, null, 200);
  const info = holes.getLastDecalInfo();
  assert.equal(info.objectName, "bz06_service_stone-cast");
  assert.equal(info.scale, 1);
  holes.dispose(scene);
});

test("instanced art is struck per instance", () => {
  const crates = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ name: "wooden_crate_01" }), 2);
  crates.name = "v3-cover-crate-horizontal-slat";
  crates.setMatrixAt(0, new Matrix4().makeTranslation(-3, 0.5, 0));
  crates.setMatrixAt(1, new Matrix4().makeTranslation(3, 0.5, 0));
  const { scene, holes } = makeWorld(crates as unknown as Mesh);
  holes.spawnFromShot({ x: 3, y: 0.5, z: 5 }, FORWARD, null, 200);
  assert.equal(holes.getLastDecalInfo().surface, "wood");
  assert.ok(Math.abs(decalTransform(scene, 0).position.z - 0.503) < 1e-4);
  holes.spawnFromShot({ x: 0, y: 0.5, z: 5 }, FORWARD, null, 200);
  assert.equal(holes.getLastDecalInfo().placement, "none", "the gap between instances is empty");
  holes.dispose(scene);
});

test("decals recycle after the pool fills and every hit fires impact particles", () => {
  const { scene, holes } = makeWorld(makeWall());
  for (let i = 0; i < MAX_DECALS + 10; i++) {
    holes.spawnFromShot({ x: -2 + (i % 40) * 0.1, y: 1 + Math.floor(i / 40) * 0.1, z: 5 }, FORWARD, null, 200);
  }
  assert.equal(decalMesh(scene).count, MAX_DECALS);
  assert.equal(holes.getImpactParticles().getActiveParticles("flash").length, 12, "flash pool recycles");

  holes.clear();
  assert.equal(decalMesh(scene).count, 0);
  assert.equal(holes.getImpactParticles().getActiveParticles().length, 0);
  holes.dispose(scene);
});

test("without surface roots the collider hit is still marked", () => {
  const scene = new Scene();
  const holes = new BulletHoleManager(scene, 42);
  holes.spawnFromShot({ x: 0, y: 1, z: 5 }, FORWARD, { distance: 5, point: { x: 0, y: 1, z: 0 }, normal: { x: 0, y: 0, z: 1 } }, 5);
  assert.equal(holes.getLastDecalInfo().placement, "collider");
  assert.equal(decalMesh(scene).count, 1);
  holes.spawnFromShot({ x: 0, y: 1, z: 5 }, DOWN, null, 200);
  assert.equal(decalMesh(scene).count, 1, "a miss with nothing to mark leaves nothing");
  holes.dispose(scene);
});

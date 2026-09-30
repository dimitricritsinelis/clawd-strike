import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Quaternion, Scene, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  DEATH_DURATION_S,
  DEATH_FALL_DURATION_S,
  DEATH_FALL_RAD,
  DEATH_SINK_M,
  EnemyVisual,
  HIT_FLASH_DURATION_S,
  instanceEnemyMaterials,
  resolveDeathPose,
  setEnemyVisualModelStreamingEnabled,
} from "./EnemyVisual";

const noop: any = new Proxy(function () {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? undefined : noop),
  apply: () => noop,
  set: () => true,
});
(globalThis as { document?: unknown }).document ??= {
  createElement: () => ({ width: 0, height: 0, getContext: () => noop }),
};
// Headless: exercise the capsule fallback, which uses the root-tilt flinch.
setEnemyVisualModelStreamingEnabled(false);

function createVisual(): { visual: EnemyVisual; root: Object3D; bodyMat: MeshStandardMaterial } {
  const scene = new Scene();
  const visual = new EnemyVisual("Test", scene, new GLTFLoader());
  const root = scene.children[0]!;
  const body = root.children.find((child) => child instanceof Mesh) as Mesh<BoxGeometry, MeshStandardMaterial>;
  return { visual, root, bodyMat: body.material };
}

function worldUp(object: Object3D): Vector3 {
  return new Vector3(0, 1, 0).applyQuaternion(object.getWorldQuaternion(new Quaternion()));
}

test("death fall eases in to 80 deg over 0.4 s, sinks 0.15 m and hides at 0.55 s", () => {
  assert.equal(resolveDeathPose(0).fallRad, 0);
  assert.ok(Math.abs(resolveDeathPose(DEATH_FALL_DURATION_S / 2).fallRad - DEATH_FALL_RAD / 4) < 1e-12, "ease-in");
  assert.ok(Math.abs(resolveDeathPose(DEATH_FALL_DURATION_S).fallRad - DEATH_FALL_RAD) < 1e-12);
  assert.ok(Math.abs(resolveDeathPose(DEATH_DURATION_S - 1e-9).sinkM - DEATH_SINK_M) < 1e-6);
  assert.equal(resolveDeathPose(DEATH_DURATION_S - 1e-3).visible, true);
  assert.equal(resolveDeathPose(DEATH_DURATION_S).visible, false);
  assert.ok(Math.abs(DEATH_FALL_RAD - 80 * Math.PI / 180) < 1e-12);
  assert.equal(DEATH_DURATION_S, 0.55);
});

test("a killed enemy tips over about its feet along the shot, then disappears", () => {
  const { visual, root } = createVisual();
  visual.update(3, 0.5, -2, 0, true, 1 / 60);
  // Shot from the front of a -Z-facing enemy travels +Z.
  visual.startDeathFade({ dirX: 0, dirZ: 1, headshot: false });
  const frames: Vector3[] = [];
  let hiddenAt = -1;
  for (let frame = 1; frame <= 40; frame++) {
    const done = visual.updateDeathFade(1 / 60);
    frames.push(worldUp(root));
    if (done && hiddenAt < 0) hiddenAt = frame / 60;
  }
  // 6 frames (0.1 s) in, the body is visibly tilting; by 0.4 s it lies at 80 deg.
  const early = frames[5]!;
  assert.ok(early.z > 0 && early.z < Math.sin(DEATH_FALL_RAD), `${early.z}`);
  const landed = frames[Math.round(DEATH_FALL_DURATION_S * 60) - 1]!;
  assert.ok(Math.abs(Math.acos(landed.y) - DEATH_FALL_RAD) < 1e-3);
  assert.ok(landed.z > 0.9, "falls away from the shooter");
  assert.ok(hiddenAt >= DEATH_DURATION_S && hiddenAt < DEATH_DURATION_S + 1 / 60 + 1e-9, `${hiddenAt}`);
  assert.equal(root.visible, false);
  // Feet stay the pivot: the root origin only sinks.
  assert.ok(Math.abs(root.position.x - 3) < 1e-12 && Math.abs(root.position.z + 2) < 1e-12);
  assert.ok(Math.abs(root.position.y - (0.5 - DEATH_SINK_M)) < 1e-9);

  visual.reset();
  visual.update(3, 0.5, -2, 0, true, 1 / 60);
  assert.equal(root.visible, true);
  assert.ok(worldUp(root).angleTo(new Vector3(0, 1, 0)) < 1e-9, "respawn stands upright");
  assert.equal(root.position.y, 0.5);
});

test("without a shot direction the body falls straight back from its facing", () => {
  const { visual, root } = createVisual();
  const yaw = Math.PI / 2; // forward = -X, backward = +X
  visual.update(0, 0, 0, yaw, true, 1 / 60);
  visual.startDeathFade(null);
  for (let frame = 0; frame < 24; frame++) visual.updateDeathFade(1 / 60);
  const up = worldUp(root);
  assert.ok(up.x > 0.9 && Math.abs(up.z) < 1e-9, `${up.x},${up.z}`);
});

test("a hit flashes this enemy for 70 ms and tilts the fallback root away from the shot", () => {
  const { visual, root, bodyMat } = createVisual();
  const other = createVisual();
  visual.update(0, 0, 0, 0, true, 1 / 60);
  other.visual.update(0, 0, 0, 0, true, 1 / 60);
  visual.triggerHitReaction({ dirX: 0, dirZ: 1, headshot: false });
  assert.ok(bodyMat.emissive.r > 0.5, "flash peaks on the hit frame");
  assert.equal(other.bodyMat.emissive.getHex(), 0, "other enemies never flash");
  let maxLean = 0;
  for (let frame = 0; frame < 6; frame++) {
    visual.update(0, 0, 0, 0, true, 1 / 120);
    visual.updateFx(1 / 120);
    maxLean = Math.max(maxLean, worldUp(root).z);
  }
  assert.ok(maxLean > Math.sin(5 * Math.PI / 180) && maxLean < Math.sin(7 * Math.PI / 180), `${maxLean}`);
  visual.updateFx(HIT_FLASH_DURATION_S);
  assert.equal(visual.getHitFlashAmount(), 0);
  assert.equal(bodyMat.emissive.getHex(), 0);
  for (let frame = 0; frame < 60; frame++) visual.update(0, 0, 0, 0, true, 1 / 60);
  assert.ok(worldUp(root).angleTo(new Vector3(0, 1, 0)) < 0.2 * Math.PI / 180);
});

test("the hit flash peak is drawn on the hit frame at any frame rate (runtime call order)", () => {
  // EnemyManager calls triggerHitReaction, then update, then updateFx(dt) in
  // the same loop iteration; the render happens after updateFx.
  for (const fps of [120, 60, 30, 20]) {
    const dt = 1 / fps;
    const { visual, bodyMat } = createVisual();
    visual.update(0, 0, 0, 0, true, dt);
    visual.triggerHitReaction({ dirX: 0, dirZ: 1, headshot: false });
    visual.update(0, 0, 0, 0, true, dt);
    visual.updateFx(dt);
    assert.equal(visual.getHitFlashAmount(), 1, `${fps} fps first rendered frame`);
    const peak = bodyMat.emissive.r;
    assert.ok(peak > 0.5, `${fps} fps peak ${peak}`);
    let frames = 1;
    while (visual.getHitFlashAmount() > 0 && frames < 100) {
      visual.updateFx(dt);
      frames++;
    }
    assert.equal(frames, 1 + Math.ceil(HIT_FLASH_DURATION_S / dt - 1e-9), `${fps} fps lasts 70 ms`);
  }
});

test("a killing hit also draws its flash peak before the first death-fade step ages it", () => {
  for (const fps of [60, 20]) {
    const dt = 1 / fps;
    const { visual, bodyMat } = createVisual();
    visual.update(0, 0, 0, 0, true, dt);
    visual.startDeathFade({ dirX: 0, dirZ: 1, headshot: true });
    visual.updateDeathFade(dt);
    assert.equal(visual.getHitFlashAmount(), 1, `${fps} fps`);
    assert.ok(bodyMat.emissive.r > 0.5);
    visual.updateDeathFade(dt);
    assert.ok(visual.getHitFlashAmount() < 1);
  }
});

test("per-instance materials leave the shared template untouched", () => {
  const shared = new MeshStandardMaterial({ color: 0x808080 });
  const template = new Group();
  const high = new Mesh(new BoxGeometry(), shared);
  const low = new Mesh(new BoxGeometry(), shared);
  template.add(high, low);
  const clones = instanceEnemyMaterials(template);
  assert.equal(clones.length, 1, "LODs sharing a material share one clone");
  assert.notEqual(high.material, shared);
  assert.equal(high.material, low.material);
  (high.material as MeshStandardMaterial).emissive.setRGB(1, 1, 1);
  assert.equal(shared.emissive.getHex(), 0);
  assert.equal((high.material as MeshStandardMaterial).map, shared.map);
});

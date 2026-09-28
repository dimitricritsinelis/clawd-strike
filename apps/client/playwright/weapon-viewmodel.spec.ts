import { expect, test } from "@playwright/test";
import type { Bone, Object3D, Skeleton, SkinnedMesh } from "three";

/**
 * Installs window.__gloveProbe in the page. It counts glove vertices inside
 * the rifle and magazine meshes with the generalized winding number, which
 * stays reliable on those meshes' open and non-manifold edges (the magazine's
 * open top, the receiver's overlapping parts) where ray parity or a convex
 * hull does not. Distant triangle cells use the far-field dipole term. Each
 * inside vertex reports its depth: the distance to the nearest surface.
 */
async function installGloveProbe(): Promise<void> {
  const threeUrl = "/node_modules/.vite/deps/three.js";
  const { Triangle, Vector3 } = await import(threeUrl);
  const CELL = .02;
  type Cell = { tris: number[]; n: number[]; c: number[]; r: number; min: number[]; max: number[] };
  type Solid = { mesh: import("three").Mesh; tri: Float64Array; cells: Cell[]; min: number[]; max: number[] };
  const solids = (root: import("three").Object3D): Solid[] => {
    const list: Solid[] = [];
    root.traverse((object) => {
      const mesh = object as import("three").Mesh;
      if (!mesh.isMesh || (mesh as import("three").SkinnedMesh).isSkinnedMesh) return;
      const position = mesh.geometry.getAttribute("position"), index = mesh.geometry.getIndex();
      const count = index?.count ?? position.count;
      const tri = new Float64Array(count * 3);
      for (let i = 0; i < count; i++) {
        const v = index ? index.getX(i) : i;
        tri[i * 3] = position.getX(v); tri[i * 3 + 1] = position.getY(v); tri[i * 3 + 2] = position.getZ(v);
      }
      const byCell = new Map<string, number[]>();
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let t = 0; t < tri.length; t += 9) {
        const key = [0, 1, 2].map((axis) => Math.floor((tri[t + axis]! + tri[t + 3 + axis]! + tri[t + 6 + axis]!) / 3 / CELL)).join();
        (byCell.get(key) ?? byCell.set(key, []).get(key)!).push(t);
        for (let k = 0; k < 9; k++) { min[k % 3] = Math.min(min[k % 3]!, tri[t + k]!); max[k % 3] = Math.max(max[k % 3]!, tri[t + k]!); }
      }
      const cells = [...byCell.values()].map((tris) => {
        const n = [0, 0, 0], c = [0, 0, 0], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        let area = 0;
        for (const t of tris) {
          const e1 = [0, 1, 2].map((axis) => tri[t + 3 + axis]! - tri[t + axis]!), e2 = [0, 1, 2].map((axis) => tri[t + 6 + axis]! - tri[t + axis]!);
          const cross = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
          const a = Math.hypot(cross[0]!, cross[1]!, cross[2]!) / 2;
          for (let axis = 0; axis < 3; axis++) {
            n[axis] = n[axis]! + cross[axis]! / 2;
            c[axis] = c[axis]! + a * (tri[t + axis]! + tri[t + 3 + axis]! + tri[t + 6 + axis]!) / 3;
            for (const k of [0, 3, 6]) { lo[axis] = Math.min(lo[axis]!, tri[t + k + axis]!); hi[axis] = Math.max(hi[axis]!, tri[t + k + axis]!); }
          }
          area += a;
        }
        const center = area > 0 ? c.map((v) => v / area) : lo.map((v, axis) => (v + hi[axis]!) / 2);
        let r = 0;
        for (const t of tris) for (const k of [0, 3, 6]) r = Math.max(r, Math.hypot(tri[t + k]! - center[0]!, tri[t + k + 1]! - center[1]!, tri[t + k + 2]! - center[2]!));
        return { tris, n, c: center, r, min: lo, max: hi };
      });
      list.push({ mesh, tri, cells, min, max });
    });
    return list;
  };
  const solidAngle = (tri: Float64Array, t: number, x: number, y: number, z: number) => {
    const ax = tri[t]! - x, ay = tri[t + 1]! - y, az = tri[t + 2]! - z;
    const bx = tri[t + 3]! - x, by = tri[t + 4]! - y, bz = tri[t + 5]! - z;
    const cx = tri[t + 6]! - x, cy = tri[t + 7]! - y, cz = tri[t + 8]! - z;
    const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz), lc = Math.hypot(cx, cy, cz);
    const det = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    const div = la * lb * lc + (ax * bx + ay * by + az * bz) * lc + (ax * cx + ay * cy + az * cz) * lb + (bx * cx + by * cy + bz * cz) * la;
    return 2 * Math.atan2(det, div);
  };
  const winding = (solid: Solid, x: number, y: number, z: number) => {
    let omega = 0;
    for (const cell of solid.cells) {
      const dx = cell.c[0]! - x, dy = cell.c[1]! - y, dz = cell.c[2]! - z, d = Math.hypot(dx, dy, dz);
      if (d > 3 * cell.r) omega += (cell.n[0]! * dx + cell.n[1]! * dy + cell.n[2]! * dz) / (d * d * d);
      else for (const t of cell.tris) omega += solidAngle(solid.tri, t, x, y, z);
    }
    return omega / (4 * Math.PI);
  };
  const triangle = new Triangle(), closest = new Vector3();
  const depthOf = (solid: Solid, point: import("three").Vector3) => {
    const order = solid.cells.map((cell) => {
      const gap = [0, 1, 2].map((axis) => Math.max(cell.min[axis]! - point.getComponent(axis), 0, point.getComponent(axis) - cell.max[axis]!));
      return { cell, bound: Math.hypot(gap[0]!, gap[1]!, gap[2]!) };
    }).sort((a, b) => a.bound - b.bound);
    let best = Infinity;
    for (const { cell, bound } of order) {
      if (bound >= best) break;
      for (const t of cell.tris) {
        triangle.a.fromArray(solid.tri, t); triangle.b.fromArray(solid.tri, t + 3); triangle.c.fromArray(solid.tri, t + 6);
        best = Math.min(best, triangle.closestPointToPoint(point, closest).distanceTo(point));
      }
    }
    return best;
  };
  /** Glove vertices inside the shown solids: how many, the deepest (m) and where. */
  const penetration = (list: Solid[], gloves: import("three").SkinnedMesh[]) => {
    let count = 0, depth = 0, where = "";
    const point = new Vector3(), scale = new Vector3();
    for (const solid of list) {
      if (!solid.mesh.visible || solid.mesh.getWorldScale(scale).x < .01) continue;
      const inverse = solid.mesh.matrixWorld.clone().invert();
      for (const glove of gloves) {
        const vertices = glove.geometry.getAttribute("position").count;
        for (let i = 0; i < vertices; i++) {
          glove.getVertexPosition(i, point).applyMatrix4(glove.matrixWorld).applyMatrix4(inverse);
          if (point.x < solid.min[0]! || point.y < solid.min[1]! || point.z < solid.min[2]!
            || point.x > solid.max[0]! || point.y > solid.max[1]! || point.z > solid.max[2]!) continue;
          if (Math.abs(winding(solid, point.x, point.y, point.z)) < .5) continue;
          count++;
          const d = depthOf(solid, point);
          if (d > depth) { depth = d; where = `${glove.name}#${i} in ${solid.mesh.name}`; }
        }
      }
    }
    return { count, depth, where };
  };
  /** Distance (solid-local units, i.e. rig metres) from a world point to the nearest shown solid's surface. */
  const nearest = (list: Solid[], world: import("three").Vector3) => {
    let best = Infinity;
    const scale = new Vector3();
    for (const solid of list) {
      if (!solid.mesh.visible || solid.mesh.getWorldScale(scale).x < .01) continue;
      best = Math.min(best, depthOf(solid, world.clone().applyMatrix4(solid.mesh.matrixWorld.clone().invert())));
    }
    return best;
  };
  (window as unknown as { __gloveProbe: unknown }).__gloveProbe = { solids, penetration, nearest };
}

/** Glove vertices may sit this far inside a magazine: cloth resting on its ribs, not a finger through it. */
const SHALLOW_CONTACT_M = .001;

test("AK viewmodel: ready grip, firing, and the magazine-only reload on the shared marks", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/weapon-viewmodel-test", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body></body></html>",
  }));
  await page.goto("/weapon-viewmodel-test");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const marksUrl = "/src/runtime/weapons/ak47ReloadMarks.ts";
    const { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } = await import(marksUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { Triangle, Vector3 } = await import(threeUrl);
    const provenance = await (await fetch("/assets/models/weapons/ak47-next/provenance.json")).json();
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    vm.setAspect(16 / 9);
    const camera = vm.viewModelCamera.clone(false);
    camera.rotation.set(0, 0, 0);
    vm.updateFromMainCamera(camera, 1 / 60);
    const scene = vm.viewModelScene;
    const get = (name: string) => scene.getObjectByName(name) as Object3D;
    const bolt = get("Bolt"), magazine = get("Magazine"), spare = get("MagazineSpare"), hand = get("SupportHand");
    const flash = get("MuzzleFlame"), pose = get("AK47_AnimatedPose"), rig = get("AK47_Rig");
    const world = (object: Object3D) => object.getWorldPosition(new Vector3());
    const worldScale = (object: Object3D) => object.getWorldScale(new Vector3()).x;
    const packageScale = {
      weapon: pose.scale.toArray(),
      rig: rig.getWorldScale(new Vector3()).toArray(),
      muzzle: flash.parent!.getWorldScale(new Vector3()).toArray(),
    };
    type Action = { getClip(): { name: string; duration: number }; getEffectiveWeight(): number };
    const reloadAction = (vm as unknown as { reloadAction: Action }).reloadAction;
    const clip = { name: reloadAction.getClip().name, duration: reloadAction.getClip().duration };
    const gloveMaterial = (get("L_GloveAndForearm") as SkinnedMesh).material as import("three").MeshStandardMaterial;
    const surfaceGap = (root: Object3D, point: import("three").Vector3): number => {
      let gap = Infinity;
      root.traverse((object: Object3D) => {
        const mesh = object as SkinnedMesh;
        if (mesh.isSkinnedMesh || !mesh.geometry) return;
        const position = mesh.geometry.getAttribute("position"), index = mesh.geometry.getIndex();
        const localPoint = mesh.worldToLocal(point.clone()), nearest = point.clone();
        const triangle = new Triangle();
        for (let i = 0; i < (index?.count ?? position.count); i += 3) {
          triangle.a.fromBufferAttribute(position, index ? index.getX(i) : i);
          triangle.b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
          triangle.c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
          triangle.closestPointToPoint(localPoint, nearest);
          gap = Math.min(gap, nearest.distanceTo(localPoint));
        }
      });
      return gap;
    };
    const rigLocal = (object: Object3D) => rig.worldToLocal(world(object));
    const rest = { bolt: bolt.position.x, magazine: magazine.position.toArray(), magazineScale: worldScale(magazine), hand: rigLocal(hand).toArray(), spareScale: worldScale(spare) };
    const elbow = get("L_forearm");
    const handScreen = world(hand).project(vm.viewModelCamera), elbowScreen = world(elbow).project(vm.viewModelCamera);
    // In the exported rig, negative Z is the rifle's left side; positive Z is right.
    const readyGrip = {
      thumbSide: rigLocal(get("GripContact_thumb")).z,
      fingerSides: ["index", "middle", "ring", "pinky"].map((finger) => rigLocal(get("GripContact_f_" + finger)).z),
      palmAcrossGun: rigLocal(get("L_f_middle01")).z - rigLocal(hand).z,
      palmHeight: (rigLocal(get("L_f_middle01")).y + rigLocal(hand).y) / 2,
      armSlope: Math.abs((handScreen.x - elbowScreen.x) * vm.viewModelCamera.aspect / (handScreen.y - elbowScreen.y)),
      elbowBelowHand: elbowScreen.y < handScreen.y,
    };
    const foreEndFingerGaps = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"].map((finger) => surfaceGap(rig, world(get("GripContact_" + finger))));
    vm.triggerShotFx();
    vm.updateFromMainCamera(camera, .1);
    const fired = { bolt: bolt.position.x, flash: flash.visible, rise: pose.rotation.x };
    const frozen = { bolt: bolt.position.toArray(), pose: pose.position.toArray(), rotation: pose.rotation.toArray() };
    vm.updateFromMainCamera(camera, 0);
    const paused = { bolt: bolt.position.toArray(), pose: pose.position.toArray(), rotation: pose.rotation.toArray() };
    const lowFpsBolt: number[] = [];
    for (let shot = 0; shot < 5; shot++) {
      vm.triggerShotFx();
      vm.updateFromMainCamera(camera, .1);
      lowFpsBolt.push(bolt.position.x);
    }
    vm.updateFromMainCamera(camera, .1);
    const flashEnded = !flash.visible;
    vm.reset();
    const marks = AK47_RELOAD_MARKS as Record<string, number>;
    const duration = AK47_RELOAD_DURATION_S as number;
    const reloadState = (seconds: number, reloading = true) => ({ mag: 12, reserve: 90, reloading, reloadT01: Math.min(1, Math.max(0, seconds / duration)) });
    // Start a reload and advance two render frames before sampling, and assert
    // the Reload action carries full weight, so samples show the clip itself
    // (the runtime switches from Idle at once; an older runtime faded in over
    // 0.12 s, which frames sampled with dt 0 never passed).
    let sampled = -Infinity;
    const blendIn = (seconds: number) => {
      vm.setAmmoState(reloadState(seconds));
      vm.updateFromMainCamera(camera, .1);
      vm.updateFromMainCamera(camera, .1);
      sampled = seconds;
    };
    // The runtime detects a restart only by a new reloadSerial; these
    // snapshots carry none, so scrubbing reloadT01 back never restarts. An
    // earlier sample still starts a fresh, fully blended reload (vm.reset())
    // so every sample begins from the same state.
    const at = (seconds: number) => {
      if (seconds < sampled) {
        vm.reset();
        blendIn(seconds);
        return;
      }
      vm.setAmmoState(reloadState(seconds));
      vm.updateFromMainCamera(camera, 0);
      sampled = seconds;
    };
    const relative = (holder: Object3D) => {
      const inverse = holder.matrixWorld.clone().invert();
      const matrix = inverse.multiply(hand.matrixWorld);
      return { position: new Vector3().setFromMatrixPosition(matrix), quaternion: hand.quaternion.clone().setFromRotationMatrix(matrix) };
    };
    blendIn(0);
    const reloadWeight = reloadAction.getEffectiveWeight();
    const start = { hand: rigLocal(hand).toArray(), magazine: magazine.position.toArray(), magazineScale: worldScale(magazine), spareScale: worldScale(spare), bolt: bolt.position.x };
    at(duration);
    const end = { hand: rigLocal(hand).toArray(), magazine: magazine.position.toArray(), magazineScale: worldScale(magazine), spareScale: worldScale(spare), bolt: bolt.position.x };
    // The hand carries each magazine rigidly while it holds it: the old one
    // from just after the paddle press until just before it is let go, the
    // fresh one from when it comes into view until the latch. During the press
    // (grip to release + 0.025 s) the magazine is still latched and the hand
    // shifts a few millimetres on it while the thumb pushes the paddle; that
    // stretch is bounded separately and more loosely.
    const windows = {
      press: [marks.grip! + .02, marks.release! + .025],
      old: [marks.release! + .025, marks.drop! - .02],
      spare: [marks.newMagazineInView!, marks.latch! - .01],
    };
    const hold = { pressMaxDrift: 0, oldMaxDrift: 0, oldMaxRotationDeg: 0, oldMinScale: Infinity, spareMaxDrift: 0, spareMaxRotationDeg: 0, spareMinScale: Infinity };
    let reference: ReturnType<typeof relative> | null = null;
    for (let t = windows.press[0]!; t <= windows.press[1]! + 1e-9; t += 1 / 120) {
      at(t);
      const r = relative(magazine);
      reference ??= r;
      hold.pressMaxDrift = Math.max(hold.pressMaxDrift, r.position.distanceTo(reference.position));
    }
    reference = null;
    for (let t = windows.old[0]!; t <= windows.old[1]! + 1e-9; t += 1 / 120) {
      at(t);
      const r = relative(magazine);
      reference ??= r;
      hold.oldMaxDrift = Math.max(hold.oldMaxDrift, r.position.distanceTo(reference.position));
      hold.oldMaxRotationDeg = Math.max(hold.oldMaxRotationDeg, r.quaternion.angleTo(reference.quaternion) * 180 / Math.PI);
      hold.oldMinScale = Math.min(hold.oldMinScale, worldScale(magazine));
    }
    reference = null;
    for (let t = windows.spare[0]!; t <= windows.spare[1]! + 1e-9; t += 1 / 120) {
      at(t);
      const r = relative(spare);
      reference ??= r;
      hold.spareMaxDrift = Math.max(hold.spareMaxDrift, r.position.distanceTo(reference.position));
      hold.spareMaxRotationDeg = Math.max(hold.spareMaxRotationDeg, r.quaternion.angleTo(reference.quaternion) * 180 / Math.PI);
      hold.spareMinScale = Math.min(hold.spareMinScale, worldScale(spare));
    }
    let maxArmStepDeg = 0, maxDigitDisplacement = 0, maxBoltTravel = 0;
    // From the hook to the end one magazine is always at full size: the swap
    // at the latch must not blink at any sampled time between frames.
    let minSeatedScale = Infinity;
    const wrists = { maxScaleError: 0, maxShear: 0 };
    const skeletons: Skeleton[] = [];
    scene.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (mesh.isSkinnedMesh && !skeletons.includes(mesh.skeleton)) skeletons.push(mesh.skeleton);
    });
    const digitRest = skeletons.flatMap((skeleton) => skeleton.bones.flatMap((bone, index) => {
      if (!/^L_(?:f_|thumb)/.test(bone.name)) return [];
      const parent = skeleton.bones.indexOf(bone.parent as Bone);
      const local = skeleton.boneInverses[parent]!.clone().multiply(skeleton.boneInverses[index]!.clone().invert());
      return [{ bone, position: new Vector3().setFromMatrixPosition(local) }];
    }));
    const armBones = ["L_upper_arm", "L_forearm", "L_forearm001", "SupportHand"].filter((name) => scene.getObjectByName(name));
    const previous = new Map<string, import("three").Quaternion>();
    for (let frame = 0; frame <= Math.round(duration * 120); frame++) {
      at(frame / 120);
      maxBoltTravel = Math.max(maxBoltTravel, Math.abs(bolt.position.x - rest.bolt));
      for (const { bone, position } of digitRest) maxDigitDisplacement = Math.max(maxDigitDisplacement, bone.position.distanceTo(position));
      for (const name of armBones) {
        const bone = get(name);
        const rotation = rig.getWorldQuaternion(rig.quaternion.clone()).invert().multiply(bone.getWorldQuaternion(bone.quaternion.clone()));
        const last = previous.get(name);
        if (last) maxArmStepDeg = Math.max(maxArmStepDeg, rotation.angleTo(last) * 180 / Math.PI);
        previous.set(name, rotation);
      }
      for (const handName of ["SupportHand", "GripHand"]) {
        const wrist = get(handName) as Bone;
        const skeleton = skeletons.find((skin) => skin.bones.includes(wrist))!;
        const matrix = rig.matrixWorld.clone().invert().multiply(wrist.matrixWorld).multiply(skeleton.boneInverses[skeleton.bones.indexOf(wrist)]!);
        const axes = [0, 1, 2].map((column) => new Vector3().setFromMatrixColumn(matrix, column));
        wrists.maxScaleError = Math.max(wrists.maxScaleError, ...axes.map((axis) => Math.abs(axis.length() - 1)));
        wrists.maxShear = Math.max(wrists.maxShear, Math.abs(axes[0]!.dot(axes[1]!)), Math.abs(axes[0]!.dot(axes[2]!)), Math.abs(axes[1]!.dot(axes[2]!)));
      }
    }
    for (let t = marks.hook!; t <= duration + 1e-9; t += 1 / 240) {
      at(t);
      minSeatedScale = Math.min(minSeatedScale, Math.max(worldScale(magazine), worldScale(spare)));
    }
    // A magazine is either shown at full size or hidden, at any time the game
    // samples, not only on the clip's keys: a linearly interpolated scale key
    // draws a half-size magazine for a frame and puts the glove inside it.
    const partialScale: string[] = [];
    at(0);
    for (let frame = 0; frame <= Math.round(duration * 240); frame++) {
      at(frame / 240);
      for (const object of [magazine, spare]) {
        const scale = worldScale(object);
        if (scale > .001 && scale < .899) partialScale.push(`${object.name} ${scale.toFixed(3)} at ${(frame / 240).toFixed(4)} s`);
      }
    }
    at(marks.drop! + .1);
    const midSwap = { oldScale: worldScale(magazine), spareScale: worldScale(spare), contactAo: (gloveMaterial.userData.contactOcclusion as { value: number }).value };
    const afterLatch = [marks.latch! + .03, marks.gripOpens!, marks.handOnHandguard!].map((t) => {
      at(t);
      return { t, magazine: magazine.position.toArray(), magazineScale: worldScale(magazine), spareScale: worldScale(spare) };
    });
    // Cancelling and restarting are covered frame by frame in the cancel/restart test below.
    vm.reset();
    const casings = () => scene.children.filter((child: { geometry?: { type: string }; visible: boolean }) => child.geometry?.type === "LatheGeometry" && child.visible);
    const sequence = () => {
      vm.updateFromMainCamera(camera, 1 / 60);
      vm.triggerShotFx();
      vm.updateFromMainCamera(camera, 1 / 60);
      return casings().map((child: { position: { toArray(): number[] } }) => child.position.toArray());
    };
    const firstSequence = sequence();
    const ejectedCase = casings()[0];
    const caseStart = ejectedCase.position.clone();
    for (let frame = 0; frame < 3; frame++) vm.updateFromMainCamera(camera, .1);
    const caseTravel = ejectedCase.position.clone().sub(caseStart).toArray();
    for (let frame = 0; frame < 8; frame++) vm.updateFromMainCamera(camera, .1);
    const caseExpired = !ejectedCase.visible;
    vm.reset();
    const resetSequence = sequence();
    vm.reset();
    vm.updateFromMainCamera(camera, 1 / 60);
    vm.updateFromMainCamera(camera, 1 / 60);
    const beforeCameraKick = pose.rotation.toArray();
    vm.reset();
    vm.updateFromMainCamera(camera, 1 / 60);
    camera.rotation.x += .15;
    camera.rotation.y += .10;
    vm.setFrameInput(0, true, 0, 0);
    vm.updateFromMainCamera(camera, 1 / 60);
    const afterCameraKick = pose.rotation.toArray();
    camera.rotation.set(0, 0, 0);
    vm.reset();
    vm.triggerShotFx();
    vm.setAmmoState({ mag: 0, reserve: 90, reloading: true, reloadT01: 0 });
    vm.updateFromMainCamera(camera, 1 / 60);
    const finalRound = { bolt: bolt.position.x, flash: flash.visible };
    const socketParent = flash.parent!.name;
    const texturedMaterials = new Set<string>();
    const detailTextures: { material: string; size: number; anisotropy: number }[] = [];
    let handContactOcclusion = false;
    const persistentOcclusion: string[] = [];
    scene.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const pbr = material as import("three").MeshStandardMaterial;
        if (pbr.map && pbr.normalMap && pbr.roughnessMap) {
          texturedMaterials.add(pbr.name);
          for (const texture of [pbr.map, pbr.normalMap, pbr.roughnessMap]) {
            const image = texture.image as { width: number; height: number };
            detailTextures.push({ material: pbr.name, size: Math.min(image.width, image.height), anisotropy: texture.anisotropy });
          }
        }
        if (pbr.name === "Urban Breacher glove" && pbr.aoMap && pbr.userData.contactOcclusion) handContactOcclusion = true;
        if (pbr.aoMap && pbr.aoMapIntensity === 1 && !persistentOcclusion.includes(pbr.name)) persistentOcclusion.push(pbr.name);
      }
    });
    const triangleCount = (predicate: (mesh: SkinnedMesh) => boolean) => {
      let count = 0;
      scene.traverse((object: Object3D) => {
        const mesh = object as SkinnedMesh;
        if (!mesh.isMesh || !predicate(mesh)) return;
        count += (mesh.geometry.getIndex()?.count ?? mesh.geometry.getAttribute("position").count) / 3;
      });
      return count;
    };
    const armTriangles = triangleCount((mesh) => Boolean(mesh.isSkinnedMesh));
    vm.dispose();
    const legacy = createAk47ViewModel({ vmDebug: false, search: "?weapon=legacy" });
    await legacy.load();
    const legacyLoaded = legacy.getAlignmentSnapshot().loaded;
    const legacyName = legacy.constructor.name;
    legacy.dispose();
    return {
      packageScale, marks, duration, clip, provenance: { animations: provenance.animations, clips: provenance.reload?.clips, audioMarks: provenance.reload?.audioMarks },
      rest, readyGrip, foreEndFingerGaps, fired, frozen, paused, lowFpsBolt, flashEnded, reloadWeight, start, end, windows, hold,
      maxBoltTravel, minSeatedScale, partialScale, midSwap, afterLatch, armBones, maxArmStepDeg, maxDigitDisplacement, wrists,
      firstSequence, caseTravel, caseExpired, resetSequence, beforeCameraKick, afterCameraKick, finalRound, socketParent,
      texturedMaterials: [...texturedMaterials].sort(), detailTextures, handContactOcclusion, persistentOcclusion: persistentOcclusion.sort(), armTriangles, legacyLoaded, legacyName,
    };
  });
  console.info("Viewmodel reload:", JSON.stringify({
    clip: result.clip, hold: result.hold, midSwap: result.midSwap, afterLatch: result.afterLatch, minSeatedScale: result.minSeatedScale,
    maxBoltTravel: result.maxBoltTravel, armBones: result.armBones, armStep: result.maxArmStepDeg, wrists: result.wrists, armTriangles: result.armTriangles,
  }));
  for (const scale of Object.values(result.packageScale)) scale.forEach((axis: number) => expect(axis).toBeCloseTo(.90, 6));
  // One magazine-only "Reload" clip, authored to the shared timeline.
  expect(result.clip.name).toBe("Reload");
  expect(result.clip.duration).toBeCloseTo(result.duration, 3);
  expect(result.marks.end).toBeCloseTo(result.duration, 6);
  expect(result.provenance.animations).toEqual(["Idle", "Fire", "Reload"]);
  expect(result.provenance.clips).toEqual({ Reload: result.duration });
  expect(result.provenance.audioMarks).toEqual(result.marks);
  // Idle support grip on the handguard (unchanged from the approved ready pose).
  expect(result.readyGrip.thumbSide).toBeLessThan(-.015);
  expect(result.readyGrip.fingerSides.every((side: number) => side > .005)).toBe(true);
  expect(result.readyGrip.palmAcrossGun, "palm must cup from near side to far side").toBeGreaterThan(.04);
  expect(result.readyGrip.palmHeight, "palm must support the underside of the wood").toBeLessThan(.039);
  expect(result.readyGrip.armSlope).toBeLessThan(1);
  expect(result.readyGrip.elbowBelowHand).toBe(true);
  expect(result.foreEndFingerGaps.every((gap: number) => gap < .015), JSON.stringify(result.foreEndFingerGaps)).toBe(true);
  // Firing.
  expect(result.fired.bolt).toBeLessThan(result.rest.bolt - .01);
  expect(result.fired.rise).toBeGreaterThan(.005);
  expect(result.fired.flash).toBe(true);
  expect(result.socketParent).toBe("MuzzleSocket");
  expect(result.frozen).toEqual(result.paused);
  expect(result.lowFpsBolt.every((x: number) => x < -.01)).toBe(true);
  expect(result.flashEnded).toBe(true);
  expect(result.finalRound.bolt).toBeLessThan(-.01);
  expect(result.finalRound.flash).toBe(true);
  // The reload is fully blended in, then starts and ends exactly on the idle
  // pose with the magazine seated and the spare hidden.
  expect(result.reloadWeight).toBe(1);
  for (const [key, ends] of Object.entries({ start: result.start, end: result.end })) {
    ends.hand.forEach((value: number, i: number) => expect(value, `${key} hand`).toBeCloseTo(result.rest.hand[i]!, 4));
    ends.magazine.forEach((value: number, i: number) => expect(value, `${key} magazine`).toBeCloseTo(result.rest.magazine[i]!, 5));
    expect(ends.magazineScale, `${key} magazine visible`).toBeCloseTo(result.rest.magazineScale, 3);
    expect(ends.spareScale, `${key} spare hidden`).toBeLessThan(.001);
    expect(ends.bolt, `${key} bolt`).toBeCloseTo(result.rest.bolt, 5);
  }
  expect(result.rest.magazineScale).toBeCloseTo(.9, 3);
  expect(result.rest.spareScale).toBeLessThan(.001);
  // Magazine change only: the bolt never moves during the reload.
  expect(result.maxBoltTravel, "no charging-handle rack").toBeLessThan(.0001);
  // Each magazine is carried rigidly by the support hand, and is visible while held.
  expect(result.hold.pressMaxDrift, "hand slides on the latched magazine during the paddle press").toBeLessThan(.005);
  expect(result.hold.oldMaxDrift, "old magazine drifts in the hand").toBeLessThan(.001);
  expect(result.hold.oldMaxRotationDeg).toBeLessThan(.5);
  expect(result.hold.oldMinScale).toBeCloseTo(.9, 3);
  expect(result.hold.spareMaxDrift, "fresh magazine drifts in the hand").toBeLessThan(.001);
  expect(result.hold.spareMaxRotationDeg).toBeLessThan(.5);
  expect(result.hold.spareMinScale).toBeCloseTo(.9, 3);
  expect(result.minSeatedScale, "a magazine is always shown from the hook onward").toBeCloseTo(.9, 3);
  expect(result.partialScale, "magazines are shown at full size or hidden, never in between").toEqual([]);
  expect(result.midSwap.oldScale, "the dropped magazine is gone mid-reload").toBeLessThan(.001);
  expect(result.midSwap.spareScale, "the fresh magazine is in hand mid-reload").toBeCloseTo(.9, 3);
  expect(result.midSwap.contactAo).toBe(0);
  for (const sample of result.afterLatch) {
    sample.magazine.forEach((value: number, i: number) => expect(value, `seated at ${sample.t}`).toBeCloseTo(result.rest.magazine[i]!, 5));
    expect(sample.magazineScale, `seated magazine shown at ${sample.t}`).toBeCloseTo(.9, 3);
    expect(sample.spareScale, `spare hidden at ${sample.t}`).toBeLessThan(.001);
  }
  expect(result.armBones).toContain("SupportHand");
  expect(result.maxArmStepDeg, "no arm bone jumps between 120 Hz frames").toBeLessThan(10);
  expect(result.maxDigitDisplacement, "digit joints must not translate from their bind positions").toBeLessThan(.000001);
  expect(result.wrists.maxScaleError).toBeLessThan(.001);
  expect(result.wrists.maxShear).toBeLessThan(.001);
  // Spent cases: one per shot, thrown right, falling, gone within a second.
  expect(result.firstSequence).toHaveLength(1);
  expect(result.caseTravel[0], "spent case ejects to the right").toBeGreaterThan(.1);
  expect(result.caseTravel[1], "spent case falls under gravity").toBeLessThan(0);
  expect(result.caseExpired).toBe(true);
  expect(result.resetSequence).toEqual(result.firstSequence);
  expect(result.afterCameraKick).toEqual(result.beforeCameraKick);
  expect(result.texturedMaterials).toEqual(["Graphite suede reinforcement", "Khaki ripstop sleeve", "Moulded knuckle guard", "Navy rolled binding", "Right Urban Breacher glove", "Saddle leather closure", "Urban Breacher glove"]);
  expect(result.handContactOcclusion).toBe(true);
  // Baked occlusion stays on for both gloves, their trims and the sleeve; only the contact term fades.
  expect(result.persistentOcclusion).toEqual(result.texturedMaterials);
  for (const texture of result.detailTextures) {
    expect(texture.size, texture.material).toBe(2048);
    expect(texture.anisotropy, texture.material).toBe(16);
  }
  expect(result.armTriangles, "arm budget").toBeLessThan(130000);
  expect(result.legacyLoaded).toBe(true);
  expect(result.legacyName).toBe("Ak47ViewModel");
  expect(errors).toEqual([]);
});

test("reload glove fingers do not intersect one another or sink into the magazines", async ({ page }) => {
  test.setTimeout(240_000);
  await page.route("**/reload-finger-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-finger-test");
  await page.evaluate(installGloveProbe);
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const marksUrl = "/src/runtime/weapons/ak47ReloadMarks.ts";
    const { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } = await import(marksUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { Box3, PerspectiveCamera, Ray, Triangle, Vector3 } = await import(threeUrl);
    type Probe = { solids(root: Object3D): unknown[]; penetration(solids: unknown[], gloves: SkinnedMesh[]): { count: number; depth: number; where: string } };
    const probe = (window as unknown as { __gloveProbe: Probe }).__gloveProbe;
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    const camera = new PerspectiveCamera();
    const scene = vm.viewModelScene;
    type Action = { getEffectiveWeight(): number };
    const reloadAction = (vm as unknown as { reloadAction: Action }).reloadAction;
    const marks = AK47_RELOAD_MARKS as Record<string, number>;
    const duration = AK47_RELOAD_DURATION_S as number;
    const magazines = [...probe.solids(scene.getObjectByName("Magazine")!), ...probe.solids(scene.getObjectByName("MagazineSpare")!)];
    const fingers = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"];
    const surfaces = ["L_GloveAndForearm", "Palm_heel_suede_overlay"].map((name) => {
      const mesh = scene.getObjectByName(name) as SkinnedMesh;
      const positions = mesh.geometry.getAttribute("position");
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      // Only triangles belonging wholly to one digit count. This excludes the
      // shared palm/web roots where adjoining fingers legitimately meet.
      const digit = Array.from({ length: positions.count }, (_, vertex) => fingers.findIndex((finger) => {
        let influence = 0;
        for (let c = 0; c < 4; c++) {
          if (mesh.skeleton.bones[indices.getComponent(vertex, c)]!.name.startsWith("L_" + finger)) influence += weights.getComponent(vertex, c);
        }
        return influence > .8;
      }));
      const allTriangles: { indices: number[]; thumbRelated: boolean }[] = [];
      // The glTF export splits vertices along UV and normal seams, so
      // neighbours across a seam share a position but no index. Weld by bind
      // position before deciding adjacency: unwelded, those seam neighbours
      // counted as 17-28 thumb/palm "crossings" at every sample and 27 at idle,
      // all of which vanish once welded.
      const firstAt = new Map<string, number>();
      const weld = Array.from({ length: positions.count }, (_, vertex) => {
        const key = `${positions.getX(vertex)},${positions.getY(vertex)},${positions.getZ(vertex)}`;
        if (!firstAt.has(key)) firstAt.set(key, vertex);
        return firstAt.get(key)!;
      });
      const thumbVertices = Array.from({ length: positions.count }, () => false);
      for (let vertex = 0; vertex < positions.count; vertex++) {
        let influence = 0;
        for (let c = 0; c < 4; c++) if (mesh.skeleton.bones[indices.getComponent(vertex, c)]!.name.startsWith("L_thumb")) influence += weights.getComponent(vertex, c);
        if (influence > .01) thumbVertices[weld[vertex]!] = true;
      }
      const triangles: number[][][] = fingers.map(() => []);
      const index = mesh.geometry.getIndex();
      for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
        const vertices = [0, 1, 2].map((corner) => index ? index.getX(i + corner) : i + corner);
        const welded = vertices.map((vertex) => weld[vertex]!);
        allTriangles.push({ indices: welded, thumbRelated: welded.some((vertex) => thumbVertices[vertex]) });
        const finger = digit[vertices[0]!]!;
        if (finger >= 0 && vertices.every((vertex) => digit[vertex] === finger)) triangles[finger]!.push(vertices);
      }
      return { mesh, positions, triangles, allTriangles };
    });
    const gloves = surfaces.map(({ mesh }) => mesh);
    const ray = new Ray(), hit = new Vector3(), direction = new Vector3();
    const crosses = (a: import("three").Triangle, b: import("three").Triangle) => {
      for (const [start, end] of [[a.a, a.b], [a.b, a.c], [a.c, a.a]]) {
        const length = direction.subVectors(end!, start!).length();
        ray.set(start!, direction.normalize());
        if (ray.intersectTriangle(b.a, b.b, b.c, false, hit)) {
          const distance = hit.distanceTo(start!);
          if (distance > .000001 && distance < length - .000001) return true;
        }
      }
      return false;
    };
    const cells = (bounds: import("three").Box3) => {
      const keys: string[] = [];
      for (let x = Math.floor(bounds.min.x / .01); x <= Math.floor(bounds.max.x / .01); x++)
        for (let y = Math.floor(bounds.min.y / .01); y <= Math.floor(bounds.max.y / .01); y++)
          for (let z = Math.floor(bounds.min.z / .01); z <= Math.floor(bounds.max.z / .01); z++) keys.push(`${x},${y},${z}`);
      return keys;
    };
    // Every beat of the clip: the reach, the grip and release on the old
    // magazine, its rock-out and carry, the fresh magazine in hand, the hook,
    // the latch and seat tap, the grip opening and the return.
    const times = [.12, marks.grip!, marks.release!, .374, marks.rockedOut!, marks.drop! - .02, marks.newMagazineInView! + .02, .85,
      marks.hook!, marks.latch!, marks.latch! + .03, marks.gripOpens!, 1.28, marks.handOnHandguard!, 1.55].map((t) => +t.toFixed(3));
    const samples: { seconds: number; weight: number; triangles: number[]; intersections: Record<string, number>; magazine: { count: number; depth: number; where: string } }[] = [];
    for (const seconds of times) {
      // Start a fresh reload at this time and advance two render frames; the
      // weight assertion below proves the glove is in the clip's pose.
      vm.reset();
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: seconds / duration });
      vm.updateFromMainCamera(camera, .1);
      vm.updateFromMainCamera(camera, .1);
      const digits = fingers.map((_, finger) => surfaces.flatMap(({ mesh, triangles }) => triangles[finger]!.map((indices) => {
        const points = indices.map((index) => mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld));
        return { triangle: new Triangle(...points), bounds: new Box3().setFromPoints(points) };
      })));
      const grids = digits.map((digit) => {
        const grid = new Map<string, typeof digit>();
        for (const triangle of digit) for (const key of cells(triangle.bounds)) {
          const bucket = grid.get(key) ?? [];
          bucket.push(triangle);
          grid.set(key, bucket);
        }
        return grid;
      });
      const intersections: Record<string, number> = {};
      for (let first = 0; first < fingers.length; first++) for (let second = first + 1; second < fingers.length; second++) {
        let count = 0;
        for (const a of digits[first]!) {
          const candidates = new Set(cells(a.bounds).flatMap((key) => grids[second]!.get(key) ?? []));
          for (const b of candidates) {
            if (a.bounds.intersectsBox(b.bounds) && (crosses(a.triangle, b.triangle) || crosses(b.triangle, a.triangle))) count++;
          }
        }
        if (count) intersections[`${fingers[first]}/${fingers[second]}`] = count;
      }
      // A whole-digit check misses the thumb folding through its own base or
      // the palm. Check the continuous glove body against itself as well.
      const { mesh, positions, allTriangles } = surfaces[0]!;
      const vertices = Array.from({ length: positions.count }, (_, index) => mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld));
      const bodyTriangles = allTriangles.map((item, id) => {
        const points = item.indices.map((index) => vertices[index]!);
        return { ...item, id, triangle: new Triangle(...points), bounds: new Box3().setFromPoints(points) };
      });
      const grid = new Map<string, typeof bodyTriangles>();
      for (const triangle of bodyTriangles) for (const key of cells(triangle.bounds)) {
        const bucket = grid.get(key) ?? [];
        bucket.push(triangle); grid.set(key, bucket);
      }
      let count = 0;
      for (const a of bodyTriangles) {
        if (!a.thumbRelated) continue;
        const candidates = new Set(cells(a.bounds).flatMap((key) => grid.get(key) ?? []));
        for (const b of candidates) {
          if ((b.thumbRelated && b.id <= a.id) || a.indices.some((index) => b.indices.includes(index))) continue;
          if (a.bounds.intersectsBox(b.bounds) && (crosses(a.triangle, b.triangle) || crosses(b.triangle, a.triangle))) count++;
        }
      }
      if (count) intersections["thumb/palm self-intersection"] = count;
      // Against the magazines, surface crossings alone cannot tell cloth
      // grazing a rib from a finger through the body, so measure how deep any
      // glove vertex sits inside the old or fresh magazine while it is shown.
      samples.push({ seconds, weight: reloadAction.getEffectiveWeight(), triangles: digits.map((digit) => digit.length), intersections, magazine: probe.penetration(magazines, gloves) });
    }
    // The beat samples above missed a glove inside a magazine between beats
    // (the let-go just after the drop, the latch-to-hide frame). Scan every
    // 1/240 s from the grip until the grip opens: the clip is keyed at 120 Hz
    // and the game samples between keys.
    const between: { seconds: number; weight: number; count: number; depth: number; where: string }[] = [];
    for (let frame = Math.round(marks.grip! * 240); frame <= Math.round((marks.gripOpens! + .04) * 240); frame++) {
      const seconds = frame / 240;
      vm.reset();
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: seconds / duration });
      vm.updateFromMainCamera(camera, .1);
      vm.updateFromMainCamera(camera, .1);
      between.push({ seconds: +seconds.toFixed(4), weight: reloadAction.getEffectiveWeight(), ...probe.penetration(magazines, gloves) });
    }
    vm.dispose();
    return { samples, between };
  });
  const { samples, between } = result;
  console.info("Reload finger surface intersections:", JSON.stringify(samples.map(({ seconds, intersections, magazine }) => ({
    seconds, intersections, magazine: { count: magazine.count, depthMm: +(magazine.depth * 1000).toFixed(2), where: magazine.where },
  }))));
  for (const sample of samples) {
    expect(sample.weight, `reload fully blended in at ${sample.seconds} s`).toBe(1);
    sample.triangles.forEach((count) => expect(count).toBeGreaterThan(100));
    expect.soft(sample.intersections, `Crossing glove surfaces at reload ${sample.seconds} s`).toEqual({});
    expect.soft(sample.magazine.depth, `glove inside a magazine at ${sample.seconds} s: ${sample.magazine.count} vertices, deepest ${sample.magazine.where}`).toBeLessThanOrEqual(SHALLOW_CONTACT_M);
  }
  const deep = between.filter((frame) => frame.depth > SHALLOW_CONTACT_M);
  console.info("Reload glove inside a magazine, 240 Hz scan:", JSON.stringify(deep.map((frame) => `${frame.seconds} s: ${frame.count} vertices, ${(frame.depth * 1000).toFixed(2)} mm at ${frame.where}`)));
  expect(between.every((frame) => frame.weight === 1)).toBe(true);
  expect.soft(deep.map((frame) => frame.seconds), "frames with the glove deeper than 1 mm inside a shown magazine").toEqual([]);
});

/**
 * Thumb flexion hinge of L_thumb.02/.03 in bone space, from the hand calibration
 * (assets/source/ak47/hand_pose.py THUMB_HINGE): perpendicular to the thumb's
 * suede pad. Bending about bone +X instead tips the thumb sideways out of the
 * palm plane, which is how the shipped rig bent it.
 */
const THUMB_HINGE = [.32, 0, -.948] as const;
/**
 * Held-grip thumb thresholds. Bone-space angles are segment angles about
 * THUMB_HINGE; distances are magazine-local (rig metres). The screen checks use
 * the game's own viewmodel camera at 960x540.
 *
 * padSideMinShare replaces the all-vertex distalPadMinShare 0.2, which a pad
 * cannot reach within the 1 mm depth limit: a pad laid square on a flat face
 * brings 6.9-9.0% of all distal vertices within 2 mm (0.5-1 mm deep), 15-20% at
 * the best orientation, and a thumb touching with its side scores more (10-15%)
 * than a pad does. Of the suede-facing vertices the same square pad brings
 * 19.9-26.1% within 2 mm, and a pad laid along its curve 43-56%; a side or nail
 * contact scores near 0.
 */
const HELD_THUMB = {
  ipMinDeg: 30, mcpMinDeg: 15, sideBendMaxDeg: 15, distalPadMaxM: .002, padSideMinShare: .2, proximalMaxM: .003, tipBehindRearMaxM: .002,
  screenIpMinDeg: 35, screenMcpMinDeg: 20, ringMagazineMinShare: .8,
};

test("reload thumb wraps each held magazine: bent at MCP and IP, pad on the magazine, tip not past its rear edge", async ({ page }) => {
  // The top acceptance criterion. Contact distances alone passed (0.45 mm pad)
  // while the thumb lay straight along the near face and ran past the rear
  // edge toward the trigger guard as a flat lobe: a mitten, not a grip.
  test.setTimeout(240_000);
  await page.route("**/reload-thumb-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-thumb-test");
  await page.evaluate(installGloveProbe);
  const result = await page.evaluate(async ({ hingeArray }) => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const marksUrl = "/src/runtime/weapons/ak47ReloadMarks.ts";
    const { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } = await import(marksUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector3, WebGLRenderer } = await import(threeUrl);
    type V3 = import("three").Vector3;
    type Probe = { solids(root: Object3D): unknown[]; nearest(solids: unknown[], world: V3): number };
    const probe = (window as unknown as { __gloveProbe: Probe }).__gloveProbe;
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    const camera = new PerspectiveCamera();
    const scene = vm.viewModelScene;
    type Action = { getEffectiveWeight(): number };
    const reloadAction = (vm as unknown as { reloadAction: Action }).reloadAction;
    const marks = AK47_RELOAD_MARKS as Record<string, number>;
    const duration = AK47_RELOAD_DURATION_S as number;
    const glove = scene.getObjectByName("L_GloveAndForearm") as SkinnedMesh;
    const overlay = scene.getObjectByName("Palm_heel_suede_overlay") as SkinnedMesh;
    const skeleton = glove.skeleton;
    const thumb = ["L_thumb01", "L_thumb02", "L_thumb03"].map((name) => skeleton.bones.find((bone) => bone.name === name)!);
    const HINGE = new Vector3(...hingeArray).normalize(), AXIS = new Vector3(0, 1, 0);
    const deg = (radians: number) => radians * 180 / Math.PI;
    const bindOf = (bone: Bone) => {
      const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
      skeleton.boneInverses[skeleton.bones.indexOf(bone)]!.clone().invert().decompose(position, rotation, scale);
      return { position, rotation };
    };
    const bind = thumb.map(bindOf);
    const weightTo = (mesh: SkinnedMesh, vertex: number, name: string) => {
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      let weight = 0;
      for (let c = 0; c < 4; c++) if (mesh.skeleton.bones[indices.getComponent(vertex, c)]!.name === name) weight += weights.getComponent(vertex, c);
      return weight;
    };
    const skinned = (name: string) => [glove, overlay].flatMap((mesh) => Array.from({ length: mesh.geometry.getAttribute("position").count }, (_, vertex) => vertex)
      .filter((vertex) => weightTo(mesh, vertex, name) > .5).map((vertex) => ({ mesh, vertex })));
    const distal = skinned("L_thumb03"), proximal = skinned("L_thumb02");
    const bindPoint = ({ mesh, vertex }: { mesh: SkinnedMesh; vertex: number }) => new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), vertex).applyMatrix4(mesh.bindMatrix);
    // Axis conventions, checked on the bind pose so a re-export that changes
    // bone axes fails here rather than silently measuring the wrong bend:
    // bone +Y runs along each phalanx, and THUMB_HINGE x +Y is the pad side
    // (where the suede overlay sits on the distal phalanx).
    const alongBone = deg(new Vector3(0, 1, 0).applyQuaternion(bind[1]!.rotation).angleTo(bind[2]!.position.clone().sub(bind[1]!.position)));
    const centroid = (list: typeof distal) => list.reduce((sum, item) => sum.add(bindPoint(item)), new Vector3()).divideScalar(list.length);
    const pad = centroid(distal.filter(({ mesh }) => mesh === overlay)).sub(centroid(distal.filter(({ mesh }) => mesh === glove)))
      .applyQuaternion(bind[2]!.rotation.clone().invert());
    pad.y = 0;
    const padOffHingeSideDeg = deg(pad.angleTo(new Vector3().crossVectors(HINGE, AXIS)));
    // Pad-side (suede-facing) distal vertices: bind normal within 60 degrees of
    // the measured pad direction in L_thumb.03 space.
    const padDirection = pad.clone().normalize(), unbind = bind[2]!.rotation.clone().invert();
    const padSide = distal.map(({ mesh, vertex }) => new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("normal"), vertex)
      .transformDirection(mesh.bindMatrix).applyQuaternion(unbind).dot(padDirection) > .5);
    // The thumb tip: the glove vertex on the distal phalanx farthest along it.
    const distalAxis = AXIS.clone().applyQuaternion(bind[2]!.rotation);
    const tip = distal.filter(({ mesh }) => mesh === glove)
      .reduce((a, b) => bindPoint(b).sub(bind[2]!.position).dot(distalAxis) > bindPoint(a).sub(bind[2]!.position).dot(distalAxis) ? b : a);
    // Signed bend from segment a to segment b about hinge h, and b's tilt out of the hinge plane.
    const bend = (a: V3, b: V3, h: V3) => {
      const pa = a.clone().projectOnPlane(h).normalize(), pb = b.clone().projectOnPlane(h).normalize();
      return { flex: deg(Math.atan2(new Vector3().crossVectors(pa, pb).dot(h), pa.dot(pb))), side: deg(Math.asin(Math.max(-1, Math.min(1, b.dot(h))))) };
    };
    const shells = [
      { root: scene.getObjectByName("Magazine")!, surfaces: scene.getObjectByName("Magazine_Surfaces") as import("three").Mesh },
      { root: scene.getObjectByName("MagazineSpare")!, surfaces: scene.getObjectByName("MagazineSpare_Surfaces") as import("three").Mesh },
    ].map((shell) => {
      const position = shell.surfaces.geometry.getAttribute("position");
      const vertices = Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i));
      return { ...shell, solids: probe.solids(shell.root), vertices, low: Math.min(...vertices.map((v) => v.y)), high: Math.max(...vertices.map((v) => v.y)) };
    });
    const shown = (object: Object3D) => object.getWorldScale(new Vector3()).x > .01;
    // Game-camera ID pass: magazines green, left-hand vertices red, everything
    // else blue, background black. Bone-space bends passed while the player saw
    // a thumb bent into depth (a lobe) and a thumb/index "OK ring" pinching air
    // with daylight inside it, so the grip is also judged as the player sees it.
    const W = 960, H = 540, pixels = new Uint8Array(W * H * 4);
    const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    document.body.appendChild(renderer.domElement);
    renderer.setSize(W, H);
    vm.setAspect(W / H);
    scene.traverse((object: Object3D) => {
      if ((object as { isSprite?: boolean }).isSprite || (object as { isPoints?: boolean }).isPoints) { object.visible = false; return; }
      const mesh = object as SkinnedMesh;
      if (!mesh.isMesh) return;
      let magazine = false;
      for (let o: Object3D | null = mesh; o; o = o.parent) if (o.name === "Magazine" || o.name === "MagazineSpare") magazine = true;
      // The left glove and its trims are the meshes skinned to the left skeleton
      // (SupportHand and the L_ bones); the right hand has its own skin.
      const leftHand = mesh.isSkinnedMesh && mesh.skeleton.bones.some((bone) => bone.name === "L_thumb01");
      mesh.material = new MeshBasicMaterial({ color: magazine ? 0x00ff00 : leftHand ? 0xff0000 : 0x0000ff });
    });
    const boneNamed = (name: string) => skeleton.bones.find((bone) => bone.name === name)!;
    const thumbChain = [...thumb, scene.getObjectByName("GripContact_thumb")!];
    const indexChain = [scene.getObjectByName("GripContact_f_index")!, ...["L_f_index03", "L_f_index02", "L_f_index01"].map(boneNamed)];
    // Pixel coordinates with y up, matching readPixels rows.
    const toScreen = (object: Object3D) => {
      const ndc = object.getWorldPosition(new Vector3()).project(vm.viewModelCamera);
      return [(ndc.x + 1) / 2 * W, (ndc.y + 1) / 2 * H] as [number, number];
    };
    // Turn angle at b between screen segments a-b and b-c; null when any point
    // is out of frame (the thumb has left the view, nothing to judge).
    const screenTurn = (a: number[], b: number[], c: number[]) => {
      if ([a, b, c].some((p) => p[0]! < 0 || p[0]! > W || p[1]! < 0 || p[1]! > H)) return null;
      const u = [b[0]! - a[0]!, b[1]! - a[1]!], v = [c[0]! - b[0]!, c[1]! - b[1]!];
      return deg(Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!))))));
    };
    const insidePolygon = (x: number, y: number, polygon: number[][]) => {
      let odd = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]!, [xj, yj] = polygon[j]!;
        if ((yi! > y) !== (yj! > y) && x < (xj! - xi!) * (y - yi!) / (yj! - yi!) + xi!) odd = !odd;
      }
      return odd;
    };
    const gameView = () => {
      renderer.render(scene, vm.viewModelCamera);
      renderer.getContext().readPixels(0, 0, W, H, renderer.getContext().RGBA, renderer.getContext().UNSIGNED_BYTE, pixels);
      const thumbScreen = thumbChain.map(toScreen), indexScreen = indexChain.map(toScreen);
      // The ring: thumb from its CMC to its tip, across to the index tip, down
      // the index to its MCP and back across the thumb-index web.
      const ring = [...thumbScreen, ...indexScreen];
      const xs = ring.map((p) => p[0]!), ys = ring.map((p) => p[1]!);
      const count = { magazine: 0, hand: 0, other: 0, background: 0 };
      for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(H, Math.ceil(Math.max(...ys))); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(W, Math.ceil(Math.max(...xs))); x++) {
          if (!insidePolygon(x + .5, y + .5, ring)) continue;
          const i = (y * W + x) * 4, red = pixels[i]!, green = pixels[i + 1]!, blue = pixels[i + 2]!;
          if (green > 200 && red < 50) count.magazine++;
          else if (red > 200 && green < 50) count.hand++;
          else if (blue > 200) count.other++;
          else count.background++;
        }
      }
      // Of the ring's interior not covered by the hand itself, the share that
      // is magazine. Daylight (background) or rifle inside the ring lowers it.
      const seen = count.magazine + count.other + count.background;
      return {
        screenMcpDeg: screenTurn(thumbScreen[0]!, thumbScreen[1]!, thumbScreen[2]!),
        screenIpDeg: screenTurn(thumbScreen[1]!, thumbScreen[2]!, thumbScreen[3]!),
        ring: count, ringMagazineShare: seen >= 50 ? count.magazine / seen : 1,
        ringScreen: ring.map((p) => [Math.round(p[0]!), Math.round(H - p[1]!)]),
      };
    };
    // Held windows: the old magazine from just after the paddle press (the tip
    // is allowed behind the rear edge on the paddle, about 0.26-0.33 s) until
    // just before it is let go; the fresh one from when it enters view until
    // the grip opens after the seat tap.
    const windows = { old: [marks.release! + .04, marks.drop! - .02], fresh: [marks.newMagazineInView!, marks.gripOpens!] };
    const times = Object.values(windows).flatMap(([from, to]) => {
      const list: number[] = [];
      for (let t = from!; t <= to! + 1e-9; t += 1 / 60) list.push(+t.toFixed(4));
      return list;
    });
    const world = ({ mesh, vertex }: { mesh: SkinnedMesh; vertex: number }) => mesh.getVertexPosition(vertex, new Vector3()).applyMatrix4(mesh.matrixWorld);
    const samples = times.map((seconds) => {
      vm.reset();
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: seconds / duration });
      vm.updateFromMainCamera(camera, .1);
      vm.updateFromMainCamera(camera, .1);
      const head = thumb.map((bone) => bone.getWorldPosition(new Vector3()));
      const turn = thumb.map((bone) => bone.getWorldQuaternion(new Quaternion()));
      const metacarpal = head[1]!.clone().sub(head[0]!).normalize(), proximalAxis = head[2]!.clone().sub(head[1]!).normalize();
      const distalWorld = AXIS.clone().applyQuaternion(turn[2]!);
      const mcp = bend(metacarpal, proximalAxis, HINGE.clone().applyQuaternion(turn[1]!));
      // The IP bend is measured in the proximal phalanx's hinge frame, so a
      // sideways (bone +X) bend shows up as side-bend rather than flexion.
      const ip = bend(proximalAxis, distalWorld, HINGE.clone().applyQuaternion(turn[1]!));
      const tipWorld = world(tip);
      const held = shells.filter((shell) => shown(shell.root))
        .map((shell) => ({ shell, gap: probe.nearest(shell.solids, tipWorld) }))
        .sort((a, b) => a.gap - b.gap)[0]!.shell;
      const distalGaps = distal.map((item) => probe.nearest(held.solids, world(item)));
      const proximalGap = Math.min(...proximal.map((item) => probe.nearest(held.solids, world(item))));
      // Rear edge: the magazine's rearmost point (magazine-local -x) in a
      // 4 mm band at the tip's height, clamped to the magazine's height.
      const tipLocal = held.surfaces.worldToLocal(tipWorld.clone());
      const height = Math.min(held.high, Math.max(held.low, tipLocal.y));
      const rear = Math.min(...held.vertices.filter((v) => Math.abs(v.y - height) < .004).map((v) => v.x));
      const padGaps = distalGaps.filter((_, i) => padSide[i]);
      return {
        seconds, weight: reloadAction.getEffectiveWeight(), magazine: held.root.name,
        mcpDeg: mcp.flex, mcpSideDeg: Math.abs(mcp.side - bend(proximalAxis, metacarpal, HINGE.clone().applyQuaternion(turn[1]!)).side), ipDeg: ip.flex, ipSideDeg: Math.abs(ip.side),
        distalMin: Math.min(...distalGaps), distalShare: distalGaps.filter((gap) => gap <= .002).length / distalGaps.length,
        padSideShare: padGaps.filter((gap) => gap <= .002).length / padGaps.length,
        proximalMin: proximalGap, tipBehindRear: rear - tipLocal.x,
        ...gameView(),
      };
    });
    vm.dispose();
    renderer.dispose();
    return { alongBone, padOffHingeSideDeg, distalCount: distal.length, padSideCount: padSide.filter(Boolean).length, proximalCount: proximal.length, samples };
  }, { hingeArray: [...THUMB_HINGE] as [number, number, number] });
  const r = (value: number, digits = 1) => +value.toFixed(digits);
  console.info("Reload held thumb:", JSON.stringify({
    alongBoneDeg: r(result.alongBone, 3), padOffHingeSideDeg: r(result.padOffHingeSideDeg), distal: result.distalCount, padSide: result.padSideCount, proximal: result.proximalCount,
    samples: result.samples.map((s) => `${s.seconds} ${s.magazine}: mcp ${r(s.mcpDeg)} (side ${r(s.mcpSideDeg)}) ip ${r(s.ipDeg)} (side ${r(s.ipSideDeg)}) distal ${r(s.distalMin * 1000, 2)} mm, ${r(s.distalShare * 100)}% <= 2 mm, pad side ${r(s.padSideShare * 100)}%; proximal ${r(s.proximalMin * 1000, 2)} mm; tip ${r(s.tipBehindRear * 1000)} mm behind rear edge; screen mcp ${s.screenMcpDeg === null ? "out of frame" : r(s.screenMcpDeg)} ip ${s.screenIpDeg === null ? "out of frame" : r(s.screenIpDeg)}; ring magazine ${r(s.ringMagazineShare * 100)}% ${JSON.stringify(s.ring)}`),
  }));
  console.info("Reload held thumb ring, top-left pixels (thumb CMC, MCP, IP, tip, index tip, DIP, PIP, MCP):", JSON.stringify(result.samples.map((s) => [s.seconds, s.ringScreen])));
  // Bone axes as calibrated: +Y along the phalanx, and the hinge's pad side on
  // the suede pad (measured 30 degrees off on the September 26 GLB; a flipped
  // or swapped axis is 90-180).
  expect(result.alongBone, "L_thumb.02 +Y runs to L_thumb.03").toBeLessThan(1);
  expect(result.padOffHingeSideDeg, "THUMB_HINGE x +Y points at the distal suede pad").toBeLessThan(45);
  expect(result.distalCount).toBeGreaterThan(100);
  expect(result.proximalCount).toBeGreaterThan(100);
  expect(result.padSideCount, "suede-facing distal vertices").toBeGreaterThan(100);
  // The screen checks skip samples where the thumb has left the frame (the old
  // magazine is carried out of the bottom-left before the let-go); they must
  // still judge most of the hold.
  expect(result.samples.filter((s) => s.screenIpDeg !== null && s.screenMcpDeg !== null).length, "held samples with the thumb in frame").toBeGreaterThan(result.samples.length / 2);
  for (const s of result.samples) {
    const at = `${s.seconds} s (${s.magazine})`;
    expect(s.weight, `reload fully blended in at ${at}`).toBe(1);
    expect.soft(s.ipDeg, `thumb IP bend at ${at}`).toBeGreaterThanOrEqual(HELD_THUMB.ipMinDeg);
    expect.soft(s.mcpDeg, `thumb MCP bend at ${at}`).toBeGreaterThanOrEqual(HELD_THUMB.mcpMinDeg);
    expect.soft(Math.max(s.ipSideDeg, s.mcpSideDeg), `thumb side-bend at ${at}`).toBeLessThanOrEqual(HELD_THUMB.sideBendMaxDeg);
    expect.soft(s.distalMin, `distal thumb pad gap to the magazine at ${at}`).toBeLessThanOrEqual(HELD_THUMB.distalPadMaxM);
    expect.soft(s.padSideShare, `share of suede-facing distal thumb vertices within 2 mm of the magazine at ${at}`).toBeGreaterThanOrEqual(HELD_THUMB.padSideMinShare);
    expect.soft(s.proximalMin, `proximal thumb gap to the magazine at ${at}`).toBeLessThanOrEqual(HELD_THUMB.proximalMaxM);
    expect.soft(s.tipBehindRear, `thumb tip behind the magazine's rear edge at ${at}`).toBeLessThanOrEqual(HELD_THUMB.tipBehindRearMaxM);
    if (s.screenIpDeg !== null) expect.soft(s.screenIpDeg, `game-camera thumb IP bend (L_thumb02-03 to L_thumb03-tip) at ${at}`).toBeGreaterThanOrEqual(HELD_THUMB.screenIpMinDeg);
    if (s.screenMcpDeg !== null) expect.soft(s.screenMcpDeg, `game-camera thumb MCP bend (L_thumb01-02 to L_thumb02-03) at ${at}`).toBeGreaterThanOrEqual(HELD_THUMB.screenMcpMinDeg);
    expect.soft(s.ringMagazineShare, `game-camera thumb/index ring interior (not hand) that is magazine at ${at}: ${JSON.stringify(s.ring)}`).toBeGreaterThanOrEqual(HELD_THUMB.ringMagazineMinShare);
  }
});

test("reload framing exposes the trigger and its contacting index finger", async ({ page }) => {
  await page.route("**/reload-visibility-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-visibility-test");
  const samples = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { WebGLRenderer, PerspectiveCamera, BufferAttribute, MeshBasicMaterial } = await import(threeUrl);
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    type Action = { getEffectiveWeight(): number };
    const reloadAction = (vm as unknown as { reloadAction: Action }).reloadAction;
    const rig = vm.viewModelScene.getObjectByName("AK47_Rig");
    // Render object IDs through the actual depth buffer. Contact markers alone
    // passed while the player's view hid almost all of the trigger and index.
    rig.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isMesh) return;
      const colors = new Float32Array(mesh.geometry.getAttribute("position").count * 3);
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      for (let i = 0; i < colors.length / 3; i++) {
        let indexWeight = 0;
        if (mesh.isSkinnedMesh) for (let c = 0; c < 4; c++) {
          if (mesh.skeleton.bones[indices.getComponent(i, c)]!.name.startsWith("R_f_index")) indexWeight += weights.getComponent(i, c);
        }
        colors.set(mesh.name === "Trigger_Surfaces" ? [1, 0, 0] : indexWeight > .5 ? [0, 1, 0] : [.05, .05, .05], i * 3);
      }
      mesh.geometry.setAttribute("color", new BufferAttribute(colors, 3));
      mesh.material = new MeshBasicMaterial({ vertexColors: true });
    });
    const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    document.body.appendChild(renderer.domElement);
    const camera = new PerspectiveCamera();
    const samples: { aspect: number; progress: number; weight: number; triggerPixels: number; indexPixels: number }[] = [];
    for (const height of [540, 600]) {
      renderer.setSize(960, height);
      vm.setAspect(960 / height);
      const gl = renderer.getContext(), pixels = new Uint8Array(960 * height * 4);
      for (const progress of [.16, .35, .5, .7, .8]) {
        // Start a fresh reload here and advance two render frames; the weight
        // assertion below proves the frame shows the clip, not the idle pose.
        vm.reset();
        vm.setAmmoState({ mag: 21, reserve: 90, reloading: true, reloadT01: progress });
        vm.updateFromMainCamera(camera, .1);
        vm.updateFromMainCamera(camera, .1);
        renderer.render(vm.viewModelScene, vm.viewModelCamera);
        gl.readPixels(0, 0, 960, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let triggerPixels = 0, indexPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i]! > 200 && pixels[i + 1]! < 50) triggerPixels++;
          if (pixels[i + 1]! > 200 && pixels[i]! < 50) indexPixels++;
        }
        samples.push({ aspect: 960 / height, progress, weight: reloadAction.getEffectiveWeight(), triggerPixels, indexPixels });
      }
    }
    vm.dispose();
    renderer.dispose();
    return samples;
  });
  for (const sample of samples) {
    expect(sample.weight, JSON.stringify(sample)).toBe(1);
    expect(sample.triggerPixels, JSON.stringify(sample)).toBeGreaterThan(500);
    expect(sample.indexPixels, JSON.stringify(sample)).toBeGreaterThan(300);
  }
});

test("reload cancel and restart play the hand home along the clip: no joint blend, no snap, no sweep through the rifle or magazines", async ({ page }) => {
  // Runtime contract (Ak47AnimatedViewModel): the viewmodel never cross-fades
  // joints between Idle and Reload, because a per-joint blend between the
  // magazine grip and the handguard grip swept the glove up to 16 mm into the
  // rifle and 11 mm into the held magazine. A stopped or restarted reload plays
  // the clip itself home instead: backwards before the release mark, forwards
  // from it; a restart then plays up to the new reload's time.
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/reload-fade-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-fade-test");
  await page.evaluate(installGloveProbe);
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const marksUrl = "/src/runtime/weapons/ak47ReloadMarks.ts";
    const { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } = await import(marksUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { Box3, Frustum, Matrix4, Quaternion, Vector3 } = await import(threeUrl);
    type Probe = { solids(root: Object3D): unknown[]; penetration(solids: unknown[], gloves: SkinnedMesh[]): { count: number; depth: number; where: string } };
    const probe = (window as unknown as { __gloveProbe: Probe }).__gloveProbe;
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    vm.setAspect(16 / 9);
    /** Whether a shown magazine is inside the 16:9 view (for the log only; hidden penetration still fails). */
    const inView = (object: Object3D) => {
      const view = vm.viewModelCamera;
      view.updateMatrixWorld();
      const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse));
      return worldScale(object) > .01 && frustum.intersectsBox(new Box3().setFromObject(object));
    };
    const camera = vm.viewModelCamera.clone(false);
    camera.rotation.set(0, 0, 0);
    const scene = vm.viewModelScene;
    const get = (name: string) => scene.getObjectByName(name) as Object3D;
    const rig = get("AK47_Rig"), hand = get("SupportHand"), magazine = get("Magazine"), spare = get("MagazineSpare"), bolt = get("Bolt");
    type Action = { getEffectiveWeight(): number; time: number };
    const reloadAction = (vm as unknown as { reloadAction: Action }).reloadAction;
    const gloveMaterial = (get("L_GloveAndForearm") as SkinnedMesh).material as import("three").MeshStandardMaterial;
    const duration = AK47_RELOAD_DURATION_S as number;
    const release = (AK47_RELOAD_MARKS as Record<string, number>).release!;
    // Ak47Weapon bumps reloadSerial at every reload start; a new serial while
    // the previous reload is still shown is what marks a restart.
    const reloadState = (seconds: number, reloading = true, reloadSerial = 1) => ({
      mag: 12, reserve: 90, reloading, reloadT01: Math.min(1, Math.max(0, seconds / duration)), reloadSerial,
    });
    const worldScale = (object: Object3D) => object.getWorldScale(new Vector3()).x;
    const gloves = ["L_GloveAndForearm", "Palm_heel_suede_overlay"].map((name) => get(name) as SkinnedMesh);
    const magazines = [...probe.solids(magazine), ...probe.solids(spare)];
    const rifle = [...probe.solids(get("AK47_Rig_Surfaces")), ...probe.solids(get("Bolt_Surfaces"))];
    // Every left-arm bone and both magazines, in rifle space.
    const tracked: Object3D[] = [];
    get("L_Armature").traverse((object: Object3D) => { if ((object as Bone).isBone) tracked.push(object); });
    tracked.push(magazine, spare);
    const pose = () => {
      const inverse = rig.matrixWorld.clone().invert();
      return tracked.map((object) => {
        const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
        inverse.clone().multiply(object.matrixWorld).decompose(position, rotation, scale);
        return { position, rotation, shown: object === magazine || object === spare ? worldScale(object) > .01 : true };
      });
    };
    type Pose = ReturnType<typeof pose>;
    const FRAME = 1 / 120;
    /** The largest move of any tracked object between two poses. */
    const jump = (a: Pose, b: Pose) => a.reduce((worst, from, i) => {
      const to = b[i]!;
      if (!from.shown || !to.shown) return worst;
      const mm = from.position.distanceTo(to.position) * 1000, deg = from.rotation.angleTo(to.rotation) * 180 / Math.PI;
      return mm > worst.mm || deg > worst.deg ? { mm: Math.max(mm, worst.mm), deg: Math.max(deg, worst.deg), object: tracked[i]!.name } : worst;
    }, { mm: 0, deg: 0, object: "" });
    type Frame = { frame: number; time: number; weight: number; pose: Pose };
    const sample = (frame: number): Frame => ({ frame, time: reloadAction.time, weight: reloadAction.getEffectiveWeight(), pose: pose() });
    /**
     * Frame-to-frame checks. While the Reload clip is shown the pose is the
     * clip at action.time, and the clip starts and ends on the Idle pose
     * (checked below), so Idle counts as clip time 0, which is also the end.
     * Clip time may then only move at the return or catch-up rate; any faster
     * jump is a snap unless every tracked object stays within 1 mm and 0.5
     * degrees.
     */
    const apart = (a: number, b: number) => Math.min(Math.abs(a - b), a + duration - b, duration - a + b);
    const audit = (frames: Frame[], maxRate: number) => {
      let blended = 0, fastest = 0, snap = { mm: 0, deg: 0, object: "", frame: -1 };
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1]!, b = frames[i]!;
        if (b.weight !== 0 && b.weight !== 1) blended++;
        const dt = apart(a.weight === 1 ? a.time : 0, b.weight === 1 ? b.time : 0);
        if (dt <= maxRate * FRAME + 1e-6) { fastest = Math.max(fastest, dt / FRAME); continue; }
        const step = jump(a.pose, b.pose);
        if (step.mm > snap.mm || step.deg > snap.deg) snap = { ...step, frame: b.frame };
      }
      return { blended, fastest, snap };
    };
    const blendIn = (seconds: number) => {
      vm.reset();
      vm.setAmmoState(reloadState(seconds));
      vm.updateFromMainCamera(camera, .1);
      vm.updateFromMainCamera(camera, .1);
    };
    const rigLocal = (object: Object3D) => rig.worldToLocal(object.getWorldPosition(new Vector3()));
    vm.reset();
    vm.updateFromMainCamera(camera, 1 / 60);
    const rest = { hand: rigLocal(hand).toArray(), magazine: magazine.position.toArray(), bolt: bolt.position.x };
    const idleRifle = probe.penetration(rifle, gloves);
    const idle = pose();
    // Both ends of the clip are the Idle pose, digits included.
    const ends = [0, duration].map((t) => {
      blendIn(t);
      return { t, weight: reloadAction.getEffectiveWeight(), ...jump(idle, pose()) };
    });
    // Cancel from every phase at 120 Hz until the Idle action is back. Where
    // the hand holds or works a magazine, measure penetration on every third
    // frame of the way home.
    const penetrationAt = [.374, .5, .66, .9, 1.13];
    const MAX_FRAMES = 240;
    const cancels = [.1, .27, .374, .5, .66, .9, 1.05, 1.13, 1.3, 1.55].map((t) => {
      blendIn(t);
      const frames = [sample(0)];
      const reachedRifle = probe.penetration(rifle, gloves);
      const inside: { frame: number; time: number; inView: boolean[]; magazine: { count: number; depth: number; where: string }; rifle: { count: number; depth: number; where: string } }[] = [];
      let home = -1;
      for (let frame = 1; frame <= MAX_FRAMES && home < 0; frame++) {
        vm.setAmmoState(reloadState(t, false));
        vm.updateFromMainCamera(camera, FRAME);
        frames.push(sample(frame));
        if (reloadAction.getEffectiveWeight() === 0) home = frame;
        else if (penetrationAt.includes(t) && frame % 3 === 1) inside.push({ frame, time: reloadAction.time, inView: [inView(magazine), inView(spare)], magazine: probe.penetration(magazines, gloves), rifle: probe.penetration(rifle, gloves) });
      }
      const direction = frames.slice(1).filter((f) => f.weight === 1).map((f, i, list) => Math.sign(f.time - (i ? list[i - 1]!.time : t)));
      return {
        t, homeS: home * FRAME, audit: audit(frames, 3), backward: direction.filter((d) => d < 0).length, forward: direction.filter((d) => d > 0).length,
        expectForward: t >= release, reachedRifle, inside,
        after: { hand: rigLocal(hand).toArray(), magazine: magazine.position.toArray(), magazineScale: worldScale(magazine), spareScale: worldScale(spare), bolt: bolt.position.x, ao: (gloveMaterial.userData.contactOcclusion as { value: number }).value },
      };
    });
    // A restart while the old reload is still shown: on the same frame (the
    // last round fired before the latch starts a new reload at once) and
    // three frames into a cancel. The new reload runs on real time from 0.
    const restarts = [.1, .5, 1.13].flatMap((t) => [0, 3].map((cancelFrames) => {
      blendIn(t);
      const frames = [sample(0)];
      for (let frame = 1; frame <= cancelFrames; frame++) {
        vm.setAmmoState(reloadState(t, false));
        vm.updateFromMainCamera(camera, FRAME);
        frames.push(sample(frame));
      }
      let caughtUp = -1, target = 0;
      for (let frame = 0; frame < MAX_FRAMES && caughtUp < 0; frame++) {
        target = frame * FRAME;
        vm.setAmmoState(reloadState(target, true, 2));
        vm.updateFromMainCamera(camera, FRAME);
        frames.push(sample(cancelFrames + 1 + frame));
        if (frame > 0 && reloadAction.getEffectiveWeight() === 1 && Math.abs(reloadAction.time - target) < 1e-6) caughtUp = frame;
      }
      const reached = pose(), time = reloadAction.time, weight = reloadAction.getEffectiveWeight();
      blendIn(target);
      const reference = pose();
      const offTrack = reached.reduce((max, b, i) => Math.max(max, b.position.distanceTo(reference[i]!.position)), 0);
      return { t, cancelFrames, caughtUpS: caughtUp * FRAME, audit: audit(frames, 4), weight, time, target, offTrack };
    }));
    vm.dispose();
    return { rest, idleRifle, ends, cancels, restarts };
  });
  const mm = (value: number) => +(value * 1000).toFixed(2);
  console.info("Reload cancel/restart:", JSON.stringify({
    idleRifle: { count: result.idleRifle.count, depthMm: mm(result.idleRifle.depth) },
    cancels: result.cancels.map(({ t, homeS, audit, backward, forward, reachedRifle, inside }) => ({
      t, homeS: +homeS.toFixed(3), audit, backward, forward, reachedRifle: { count: reachedRifle.count, depthMm: mm(reachedRifle.depth) },
      worstMagazineMm: mm(Math.max(0, ...inside.map((f) => f.magazine.depth))), worstRifleMm: mm(Math.max(0, ...inside.map((f) => f.rifle.depth))),
    })),
    restarts: result.restarts,
  }));
  for (const end of result.ends) {
    expect(end.weight, `clip at ${end.t} s shown`).toBe(1);
    expect(end.mm, `clip at ${end.t} s is the Idle pose: ${JSON.stringify(end)}`).toBeLessThan(.1);
    expect(end.deg, `clip at ${end.t} s is the Idle pose: ${JSON.stringify(end)}`).toBeLessThan(.1);
  }
  for (const { t, homeS, audit, backward, forward, expectForward, reachedRifle, inside, after } of result.cancels) {
    const label = `cancel at ${t} s`;
    expect(homeS, `${label}: the hand is home within 0.6 s`).toBeGreaterThan(0);
    expect(homeS, `${label}: the hand is home within 0.6 s`).toBeLessThanOrEqual(.6);
    expect.soft(audit.blended, `${label}: frames with Idle and Reload blended`).toBe(0);
    expect.soft(audit.fastest, `${label}: clip rate`).toBeLessThanOrEqual(3 + 1e-3);
    expect.soft(audit.snap.mm, `${label}: snap ${JSON.stringify(audit.snap)}`).toBeLessThanOrEqual(1);
    expect.soft(audit.snap.deg, `${label}: snap ${JSON.stringify(audit.snap)}`).toBeLessThanOrEqual(.5);
    // Before the release the reach is undone; from it the clip plays on.
    expect.soft(expectForward ? backward : forward, `${label}: the clip plays ${expectForward ? "forwards" : "backwards"} only`).toBe(0);
    // Once home the idle is back exactly.
    after.hand.forEach((value: number, i: number) => expect(value, `hand after ${label}`).toBeCloseTo(result.rest.hand[i]!, 4));
    after.magazine.forEach((value: number, i: number) => expect(value, `magazine after ${label}`).toBeCloseTo(result.rest.magazine[i]!, 5));
    expect(after.magazineScale, `magazine shown after ${label}`).toBeCloseTo(.9, 3);
    expect(after.spareScale, `spare hidden after ${label}`).toBeLessThan(.001);
    expect(after.bolt, `bolt after ${label}`).toBeCloseTo(result.rest.bolt, 5);
    expect(after.ao, `contact occlusion after ${label}`).toBe(1);
    if (!inside.length) continue;
    // The way home is the authored clip: no deeper than cloth contact into a
    // magazine, nor deeper into the rifle than either end pose already rests.
    const rifleDepth = Math.max(reachedRifle.depth, result.idleRifle.depth) + SHALLOW_CONTACT_M;
    const inMagazine = inside.reduce((a, b) => b.magazine.depth > a.magazine.depth ? b : a);
    const inRifle = inside.reduce((a, b) => b.rifle.depth > a.rifle.depth ? b : a);
    expect.soft(inMagazine.magazine.depth, `${label}, frame ${inMagazine.frame} (clip ${inMagazine.time.toFixed(3)} s, old/fresh magazine in view ${inMagazine.inView}): ${inMagazine.magazine.count} glove vertices in a magazine, deepest ${mm(inMagazine.magazine.depth)} mm at ${inMagazine.magazine.where}`)
      .toBeLessThanOrEqual(SHALLOW_CONTACT_M);
    expect.soft(inRifle.rifle.depth, `${label}, frame ${inRifle.frame} (clip ${inRifle.time.toFixed(3)} s): glove ${mm(inRifle.rifle.depth)} mm into the rifle at ${inRifle.rifle.where} (end poses ${mm(reachedRifle.depth)} and ${mm(result.idleRifle.depth)} mm)`)
      .toBeLessThanOrEqual(rifleDepth);
  }
  for (const restart of result.restarts) {
    const label = `restart from ${restart.t} s after ${restart.cancelFrames} cancel frames`;
    expect(restart.caughtUpS, `${label}: caught up with the new reload`).toBeGreaterThan(0);
    expect.soft(restart.audit.blended, `${label}: frames with Idle and Reload blended`).toBe(0);
    expect.soft(restart.audit.fastest, `${label}: clip rate`).toBeLessThanOrEqual(4 + 1e-3);
    expect.soft(restart.audit.snap.mm, `${label}: snap ${JSON.stringify(restart.audit.snap)}`).toBeLessThanOrEqual(1);
    expect.soft(restart.audit.snap.deg, `${label}: snap ${JSON.stringify(restart.audit.snap)}`).toBeLessThanOrEqual(.5);
    // The new reload ends up shown on its own timeline, matching a fresh one.
    expect(restart.weight, label).toBe(1);
    expect(restart.time, label).toBeCloseTo(restart.target, 5);
    expect(restart.offTrack, label).toBeLessThan(.0001);
  }
  expect(errors).toEqual([]);
});

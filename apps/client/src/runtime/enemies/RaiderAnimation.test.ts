import assert from "node:assert/strict";
import test from "node:test";
import {
  AnimationClip, Bone, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Skeleton,
  SkinnedMesh, Uint16BufferAttribute, Vector3, type Object3D,
} from "three";
import {
  FLINCH_PEAK_S, FLINCH_PITCH_RAD, FlinchSpring, HEADSHOT_HEAD_SNAP_RAD, RaiderAnimation, RaiderMotion,
  resolveHitReactionFrame,
} from "./RaiderAnimation";

test("raider footsteps follow collision-resolved distance and stop against a wall", () => {
  const motion = new RaiderMotion();
  const position = new Vector3();
  motion.update(position, 0, 1 / 60, true);
  for (let frame = 0; frame < 60; frame++) {
    position.z -= 1.1 / 60;
    motion.update(position, 0, 1 / 60, true);
  }
  assert.ok(Math.abs(motion.phase - 1.1 / 1.35) < 1e-10);
  assert.ok(motion.moveWeight > .99);
  assert.equal(motion.forward, 1);
  const phase = motion.phase;
  for (let frame = 0; frame < 30; frame++) motion.update(position, 0, 1 / 60, true);
  assert.equal(motion.phase, phase);
  assert.equal(motion.moving, false);
  assert.ok(motion.moveWeight < .0001);
});

test("raider direction follows movement relative to aim, including diagonal stride", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const [forward, right] of [[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]) {
      const motion = new RaiderMotion();
      motion.update(new Vector3(), yaw, .1, true);
      const p = new Vector3(
        (-Math.sin(yaw) * forward! + Math.cos(yaw) * right!) * .11, 0,
        (-Math.cos(yaw) * forward! - Math.sin(yaw) * right!) * .11,
      );
      motion.update(p, yaw, .1, true);
      assert.ok(Math.abs(motion.forward - forward!) < 1e-10);
      assert.ok(Math.abs(motion.right - right!) < 1e-10);
      assert.ok(Math.abs(motion.phase * (forward! > 0 ? 1.35 : 1.1) * motion.forwardWeight - .11 * Math.abs(forward!)) < 1e-10);
      assert.ok(Math.abs(motion.phase * .6 * motion.sideWeight - .11 * Math.abs(right!)) < 1e-10);
    }
  }
});

test("raider stride grows with speed while full-speed cadence stays natural", () => {
  for (const [forward, right, maxCadence] of [[1, 0, 1.5], [-1, 0, 1.5], [0, 1, 2.5], [0, -1, 2.5]]) {
    const strides: number[] = [];
    for (const speed of [1.1, 1.9, 3]) {
      const motion = new RaiderMotion();
      const position = new Vector3();
      motion.update(position, 0, 1 / 60, true);
      let cycles = 0;
      for (let frame = 0; frame < 120; frame++) {
        position.x += right! * speed / 60;
        position.z -= forward! * speed / 60;
        const previousPhase = motion.phase;
        motion.update(position, 0, 1 / 60, true);
        cycles += (motion.phase - previousPhase + 1) % 1;
      }
      const cadence = cycles / 2;
      if (speed === 1.1) assert.ok(Math.abs(speed / cadence - (forward! > 0 ? 1.35 : forward! < 0 ? 1.1 : .6)) < 1e-10);
      strides.push(speed / cadence);
      if (speed === 3) assert.ok(Math.abs(cadence - maxCadence!) < 1e-10);
    }
    assert.ok(strides[1]! > strides[0]! * 1.2, `${forward},${right}: ${strides}`);
    assert.ok(strides[2]! > strides[1]! * 1.2, `${forward},${right}: ${strides}`);
  }
});

test("pause, falling, respawn and teleports cannot drive a false walking cycle", () => {
  const motion = new RaiderMotion();
  motion.update(new Vector3(), 0, .1, true);
  motion.update(new Vector3(0,0,-.11), 0, .1, true);
  const beforePause = JSON.stringify(motion);
  for (const dt of [0, -1, NaN, Infinity]) motion.update(new Vector3(50,0,50), 0, dt, true);
  assert.equal(JSON.stringify(motion), beforePause);
  const phase = motion.phase;
  motion.update(new Vector3(0,-.1,-.22), 0, .1, false);
  assert.equal(motion.phase, phase);
  motion.update(new Vector3(50,0,50), 0, .1, true);
  assert.equal(motion.phase, phase);
  motion.reset();
  motion.update(new Vector3(-50,0,-50), 0, .1, true);
  assert.equal(motion.phase, 0);
  assert.equal(motion.moving, false);
});

// ── Hit flinch and death ────────────────────────────────────────────────────

function stubCanvasDocument(): void {
  const noop: any = new Proxy(function () {}, {
    get: (_target, key) => (key === Symbol.toPrimitive ? undefined : noop),
    apply: () => noop,
    set: () => true,
  });
  (globalThis as { document?: unknown }).document ??= {
    createElement: () => ({ width: 0, height: 0, getContext: () => noop }),
  };
}

/** Minimal raider rig: the bones, rigid boot vertices and clip names the runtime requires. */
function buildTestRaider(): { model: Group; chest: Bone; head: Bone } {
  const model = new Group();
  const bone = (name: string, x: number, y: number, parent?: Bone): Bone => {
    const result = new Bone();
    result.name = name;
    result.position.set(x, y, 0);
    parent?.add(result);
    return result;
  };
  const pelvis = bone("Pelvis", 0, 1);
  const chest = bone("Chest", 0, .45, pelvis);
  const head = bone("Head", 0, .35, chest);
  const bones = [pelvis, chest, head];
  const footVertices: number[] = [];
  const skinIndex: number[] = [];
  for (const [side, x] of [["L", .1], ["R", -.1]] as const) {
    const thigh = bone(`Thigh_${side}`, x, 0, pelvis);
    const shin = bone(`Shin_${side}`, 0, -.45, thigh);
    const foot = bone(`Foot_${side}`, 0, -.42, shin);
    bones.push(thigh, shin, foot);
    for (const dz of [-.1, .1]) {
      footVertices.push(x, .0, dz);
      skinIndex.push(bones.indexOf(foot), 0, 0, 0);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(footVertices, 3));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(skinIndex.map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
  const high = new SkinnedMesh(geometry, new MeshBasicMaterial());
  high.name = "Raider_High";
  high.add(pelvis);
  model.add(high);
  model.updateMatrixWorld(true);
  high.bind(new Skeleton(bones));
  const low = new Group();
  low.name = "Raider_Low";
  model.add(low);
  return { model, chest, head };
}

const CLIP_NAMES = ["Idle", ...["Walk", "Run"].flatMap((gait) =>
  ["Forward", "Backward", "Left", "Right"].map((direction) => gait + direction))];

function worldUp(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false);
  return new Vector3(0, 1, 0).applyQuaternion(object.getWorldQuaternion(new Quaternion()));
}

test("flinch spring peaks at 1 about 40 ms after a kick and is under 3% by 0.3 s", () => {
  const spring = new FlinchSpring();
  spring.kick();
  let peak = 0;
  let peakAt = 0;
  for (let t = 1; t <= 300; t++) {
    spring.step(.001);
    if (spring.value > peak) { peak = spring.value; peakAt = t / 1000; }
  }
  assert.ok(Math.abs(peak - 1) < 1e-3, `${peak}`);
  assert.ok(Math.abs(peakAt - FLINCH_PEAK_S) < .0011 && FLINCH_PEAK_S > .035 && FLINCH_PEAK_S < .045, `${peakAt}`);
  assert.ok(Math.abs(spring.value) < .03, `${spring.value}`);
  // The first lobe (the visible flinch) is over in roughly 0.1 s.
  const lobe = new FlinchSpring();
  lobe.kick();
  lobe.step(.12);
  assert.ok(lobe.value < .05);
});

test("flinch spring is frame-rate independent", () => {
  const at = (steps: number) => {
    const spring = new FlinchSpring();
    spring.kick();
    for (let i = 0; i < steps; i++) spring.step(.1 / steps);
    return spring.value;
  };
  for (const steps of [3, 6, 12, 15]) assert.ok(Math.abs(at(steps) - at(1)) < 1e-9, `${steps}`);
});

test("hit reaction leans along the shot and twists away from the shooter", () => {
  // Facing -Z (yaw 0), shot from the front travels +Z.
  const front = resolveHitReactionFrame(0, 0, 1, 1)!;
  // Positive rotation about the lean axis tips the up vector along the shot.
  const up = new Vector3(0, 1, 0).applyAxisAngle(new Vector3(front.leanAxisX, 0, front.leanAxisZ), .1);
  assert.ok(up.z > 0 && Math.abs(up.x) < 1e-12);
  // Head-on: the entry point's side picks the twist, else the fallback.
  assert.equal(front.twistSign, 1);
  assert.equal(resolveHitReactionFrame(0, 0, 1, 1, .2, 0)!.twistSign, -1);
  assert.equal(resolveHitReactionFrame(0, 0, 1, -1, -.2, 0)!.twistSign, 1);
  // Shooter on the right (+X) of a -Z-facing raider: forward turns toward -X.
  const side = resolveHitReactionFrame(0, -1, 0, -1)!;
  assert.equal(side.twistSign, 1);
  const forward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), side.twistSign * .1);
  assert.ok(forward.x < 0);
  assert.equal(resolveHitReactionFrame(0, 0, 0, 1), null);
});

test("raider flinch is an additive chest rotation on top of the sampled clip", () => {
  stubCanvasDocument();
  const { model, chest } = buildTestRaider();
  const animation = new RaiderAnimation(model, CLIP_NAMES.map((name) => new AnimationClip(name, 1, [])));
  const position = new Vector3();
  animation.update(position, 0, 1 / 60, true);
  const rest = worldUp(chest);
  const frame = resolveHitReactionFrame(0, 0, 1, 1)!;
  animation.hit(frame.leanAxisX, frame.leanAxisZ, frame.twistSign);
  let maxTilt = 0;
  let towardShot = 0;
  for (let i = 0; i < 6; i++) {
    animation.update(position, 0, 1 / 120, true);
    const upNow = worldUp(chest);
    const tilt = upNow.angleTo(rest);
    if (tilt > maxTilt) { maxTilt = tilt; towardShot = upNow.z - rest.z; }
  }
  assert.ok(Math.abs(maxTilt - FLINCH_PITCH_RAD) < .15 * FLINCH_PITCH_RAD, `${maxTilt * 180 / Math.PI} deg`);
  assert.ok(towardShot > 0, "the chest leans away from the shooter");
  for (let i = 0; i < 60; i++) animation.update(position, 0, 1 / 120, true);
  assert.ok(worldUp(chest).angleTo(rest) < .2 * Math.PI / 180, "the flinch settles and never compounds");
  animation.dispose();
});

test("raider death freezes the pose and a headshot snaps the head back 15 deg until reset", () => {
  stubCanvasDocument();
  const { model, chest, head } = buildTestRaider();
  const animation = new RaiderAnimation(model, CLIP_NAMES.map((name) => new AnimationClip(name, 1, [])));
  const position = new Vector3();
  animation.update(position, 0, 1 / 60, true);
  const headRest = head.quaternion.clone();
  const headUp = worldUp(head);
  const shadow = model.children.find((child) => child instanceof Mesh && child.geometry instanceof PlaneGeometry) as Mesh;
  assert.ok(shadow, "contact shadow is parented to the model");
  assert.equal(shadow.visible, true, "grounded raider shows its contact shadow");
  const frame = resolveHitReactionFrame(0, 0, 1, 1)!;
  animation.die(frame.leanAxisX, frame.leanAxisZ, true);
  assert.equal(animation.isFrozen(), true);
  assert.equal(shadow.visible, false, "the shadow must not tip up with the falling body");
  const snapped = worldUp(head);
  assert.ok(Math.abs(snapped.angleTo(headUp) - HEADSHOT_HEAD_SNAP_RAD) < 1e-6);
  assert.ok(snapped.z > headUp.z, "the head is thrown back along the shot");
  const chestPose = chest.quaternion.clone();
  animation.hit(frame.leanAxisX, frame.leanAxisZ, 1);
  animation.update(new Vector3(0, 0, -.05), 0, 1 / 60, true);
  assert.ok(chest.quaternion.equals(chestPose), "no sampling or flinch after death");
  assert.equal(shadow.visible, false, "frozen update does not re-show the shadow");
  animation.reset();
  assert.equal(animation.isFrozen(), false);
  assert.equal(shadow.visible, true, "reset restores the contact shadow");
  assert.ok(head.quaternion.angleTo(headRest) < 1e-9);
  animation.dispose();
});

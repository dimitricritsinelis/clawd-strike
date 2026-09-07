import {
  AnimationMixer, Bone, CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SkinnedMesh, Vector3,
  type AnimationAction, type AnimationClip, type Object3D,
} from "three";
import type { TraversalSurfaceResolver } from "../sim/TraversalSurfaceResolver";

const UP = new Vector3(0, 1, 0);
const FOOT_HEIGHT_M = .13;
const WALK_STRIDE_M = 1.35;
const BACKWARD_WALK_STRIDE_M = 1.1;
const RUN_STRIDE_M = 2;
const STRAFE_WALK_STRIDE_M = .6;
const STRAFE_RUN_STRIDE_M = 1.2;

/** Movement is measured after collision and overlap resolution, in metres. */
export class RaiderMotion {
  phase = 0;
  idleTime = 0;
  moveWeight = 0;
  runWeight = 0;
  forward = 1;
  right = 0;
  forwardWeight = 1;
  sideWeight = 0;
  moving = false;
  private previous: Vector3 | null = null;

  reset(): void {
    this.phase = this.idleTime = this.moveWeight = this.runWeight = 0;
    this.forward = 1;
    this.right = 0;
    this.forwardWeight = 1;
    this.sideWeight = 0;
    this.moving = false;
    this.previous = null;
  }

  update(position: Vector3, yaw: number, deltaSeconds: number, grounded: boolean): boolean {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    const dt = Math.min(deltaSeconds, .1);
    const dx = this.previous ? position.x - this.previous.x : 0;
    const dz = this.previous ? position.z - this.previous.z : 0;
    const distance = Math.hypot(dx, dz);
    if (!this.previous) this.previous = new Vector3();
    this.previous.copy(position);
    this.idleTime += dt;
    this.moving = grounded && distance > .0001 && distance < 1;
    this.moveWeight += ((this.moving ? 1 : 0) - this.moveWeight) * (1 - Math.exp(-dt * 24));
    if (this.moving) {
      this.forward = -(Math.sin(yaw) * dx + Math.cos(yaw) * dz) / distance;
      this.right = (Math.cos(yaw) * dx - Math.sin(yaw) * dz) / distance;
      this.runWeight = Math.max(0, Math.min(1, (distance / dt - 1.1) / 1.9));
      const walkStride = this.forward >= 0 ? WALK_STRIDE_M : BACKWARD_WALK_STRIDE_M;
      const forwardStride = walkStride + (RUN_STRIDE_M - walkStride) * this.runWeight;
      const sideStride = STRAFE_WALK_STRIDE_M + (STRAFE_RUN_STRIDE_M - STRAFE_WALK_STRIDE_M) * this.runWeight;
      // Side steps have shorter travel. Weight by cycles/metre so diagonal
      // blends still match displacement on both axes without sliding.
      const forwardCycles = Math.abs(this.forward) / forwardStride;
      const sideCycles = Math.abs(this.right) / sideStride;
      const cycles = forwardCycles + sideCycles;
      this.forwardWeight = forwardCycles / cycles;
      this.sideWeight = sideCycles / cycles;
      this.phase = (this.phase + distance * cycles) % 1;
    }
    return true;
  }
}

type Leg = {
  thigh: Bone; shin: Bone; foot: Bone; anchor: Vector3; target: Vector3; normal: Vector3;
  releaseOffset: Vector3; planted: boolean; shift: number; solePoints: Vector3[]; contactHeight: number;
  plantPivot: Vector3; plantPosition: Vector3; plantRotation: Quaternion; rollingPlant: boolean;
};

function contactShadow(): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32,32,3,32,32,32);
  gradient.addColorStop(0,"rgba(0,0,0,.48)");
  gradient.addColorStop(.4,"rgba(0,0,0,.28)");
  gradient.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,64,64);
  const mesh = new Mesh(new PlaneGeometry(.7,.65), new MeshBasicMaterial({
    map:new CanvasTexture(canvas), transparent:true, depthWrite:false,
    polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1,
  }));
  mesh.name = "Raider_ContactShadow";
  mesh.position.y = .006;
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Blender-authored clips, with render-only foot locking and terrain correction. */
export class RaiderAnimation {
  readonly motion = new RaiderMotion();
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly legs: Leg[];
  private readonly chest: Bone;
  private readonly pelvis: Bone;
  private readonly sampledPelvisPosition = new Vector3();
  private readonly directionWeights = { Forward: 1, Backward: 0, Left: 0, Right: 0 };
  private runBlend = 0;
  private readonly high: Object3D;
  private readonly low: Object3D;
  private readonly sampledRotations: { bone: Bone; rotation: Quaternion }[];
  private readonly shadow = contactShadow();
  private shotAge = 1;
  private readonly hip = new Vector3();
  private readonly knee = new Vector3();
  private readonly ankle = new Vector3();
  private readonly target = new Vector3();
  private readonly axis = new Vector3();
  private readonly bend = new Vector3();
  private readonly desiredKnee = new Vector3();
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly forward = new Vector3();
  private readonly normal = new Vector3();
  private readonly worldRotation = new Quaternion();
  private readonly parentRotation = new Quaternion();
  private readonly deltaRotation = new Quaternion();
  private readonly footRotation = new Quaternion();

  constructor(private readonly model: Object3D, clips: readonly AnimationClip[]) {
    this.mixer = new AnimationMixer(model);
    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      action.play();
      action.paused = true;
      action.setEffectiveWeight(0);
      this.actions.set(clip.name, action);
    }
    for (const name of ["Idle", ...["Walk", "Run"].flatMap((gait) =>
      ["Forward", "Backward", "Left", "Right"].map((direction) => gait + direction))]) {
      if (!this.actions.has(name)) throw new Error(`Raider asset missing animation ${name}`);
    }
    const bone = (name: string): Bone => {
      const result = model.getObjectByName(name);
      if (!(result instanceof Bone)) throw new Error(`Raider asset missing bone ${name}`);
      return result;
    };
    this.chest = bone("Chest");
    this.pelvis = bone("Pelvis");
    this.sampledPelvisPosition.copy(this.pelvis.position);
    this.high = model.getObjectByName("Raider_High")!;
    this.low = model.getObjectByName("Raider_Low")!;
    this.high.visible = true;
    this.low.visible = false;
    this.legs = ["R", "L"].map((side, i) => {
      const foot = bone(`Foot_${side}`);
      const solePoints: Vector3[] = [];
      for (const mesh of [this.high, this.low]) {
        if (!(mesh instanceof SkinnedMesh)) continue;
        const index = mesh.skeleton.bones.indexOf(foot);
        const positions = mesh.geometry.getAttribute("position");
        const indices = mesh.geometry.getAttribute("skinIndex");
        const weights = mesh.geometry.getAttribute("skinWeight");
        for (let vertex = 0; vertex < positions.count; vertex++) {
          let weight = 0;
          for (let component = 0; component < 4; component++) {
            if (indices.getComponent(vertex, component) === index) weight += weights.getComponent(vertex, component);
          }
          if (weight > .999) solePoints.push(new Vector3().fromBufferAttribute(positions, vertex)
            .applyMatrix4(mesh.bindMatrix).applyMatrix4(mesh.skeleton.boneInverses[index]!));
        }
      }
      if (!solePoints.length) throw new Error(`Raider asset missing rigid boot vertices ${side}`);
      return {
        thigh: bone(`Thigh_${side}`), shin: bone(`Shin_${side}`), foot,
        anchor: new Vector3(), target: new Vector3(), normal: new Vector3(),
        releaseOffset: new Vector3(), planted: false, shift: i * .5,
        solePoints, contactHeight: FOOT_HEIGHT_M,
        plantPivot: new Vector3(), plantPosition: new Vector3(), plantRotation: new Quaternion(), rollingPlant: false,
      };
    });
    this.sampledRotations = [this.chest, ...this.legs.flatMap(({ thigh, shin, foot }) => [thigh, shin, foot])]
      .map((bone) => ({ bone, rotation: bone.quaternion.clone() }));
    // The bind-pose box cannot cull a posed limb or its shadow correctly.
    model.traverse((child) => {
      if (child instanceof SkinnedMesh) child.frustumCulled = false;
      if (child instanceof Mesh) child.receiveShadow = true;
    });
    // ponytail: contact shadows ground moving raiders while the sun shadow map
    // stays cached; use a dynamic character shadow pass for long cast shadows.
    model.add(this.shadow);
    this.reset();
  }

  reset(): void {
    this.motion.reset();
    this.shotAge = 1;
    for (const leg of this.legs) { leg.planted = leg.rollingPlant = false; leg.releaseOffset.set(0, 0, 0); }
    this.sampleClips();
  }

  shoot(): void { this.shotAge = 0; }

  update(position: Vector3, yaw: number, dt: number, grounded: boolean,
    surfaces?: TraversalSurfaceResolver, viewerDistanceM = 0): void {
    const wasIdle = this.motion.moveWeight < .01;
    if (!this.motion.update(position, yaw, dt, grounded)) return;
    // Hysteresis avoids silhouette flicker while crossing the 12 m LOD boundary.
    if (viewerDistanceM < 11) this.high.visible = true;
    if (viewerDistanceM > 13) this.high.visible = false;
    this.low.visible = !this.high.visible;
    // Starting a strafe needs its landing lanes immediately; only crossfade
    // directions when there is an outgoing gait to transition from.
    this.sampleClips(wasIdle ? Infinity : Math.min(dt, .1));
    this.shotAge += Math.min(dt, .1);
    const recoil = Math.exp(-this.shotAge * 28) * .025;
    this.model.updateWorldMatrix(true, true);
    // Bone roll is arbitrary. Pitch around the character's lateral axis,
    // expressed in chest space, rather than twisting around a local bone axis.
    this.model.getWorldQuaternion(this.worldRotation);
    this.axis.set(0, 0, 1).applyQuaternion(this.worldRotation);
    this.chest.getWorldQuaternion(this.worldRotation).invert();
    this.axis.applyQuaternion(this.worldRotation);
    this.chest.rotateOnAxis(this.axis, recoil);
    this.chest.updateWorldMatrix(false, true);
    this.model.getWorldQuaternion(this.worldRotation);
    this.forward.set(1, 0, 0).applyQuaternion(this.worldRotation);
    this.shadow.visible = grounded;
    const rootGround = surfaces?.sample(position.x, position.z, position.y);
    this.normal.set(rootGround?.normal.x ?? 0, rootGround?.normal.y ?? 1, rootGround?.normal.z ?? 0);
    this.normal.applyQuaternion(this.worldRotation.invert());
    this.shadow.quaternion.setFromUnitVectors(this.axis.set(0,0,1),this.normal);
    let pelvisDrop = 0;
    for (const leg of this.legs) {
      if (!grounded) { leg.planted = leg.rollingPlant = false; leg.releaseOffset.set(0, 0, 0); continue; }
      leg.foot.getWorldPosition(this.target);
      let footHeight = FOOT_HEIGHT_M;
      if (this.directionWeights.Forward > .001) {
        // Forward heel/toe roll changes ankle clearance. Ground the rigid boot
        // surface, rather than forcing the rolling ankle back to a fixed height.
        leg.foot.getWorldQuaternion(this.footRotation).invert();
        this.axis.copy(UP).applyQuaternion(this.footRotation);
        footHeight = -Infinity;
        for (const point of leg.solePoints) {
          const height = -point.dot(this.axis);
          if (height > footHeight) { footHeight = height; leg.plantPivot.copy(point); }
        }
      }
      const phase = (this.motion.phase + leg.shift) % 1;
      // A reversal must finish transferring weight before taking a new plant;
      // an anchor from the outgoing stride is soon beyond the new leg's reach.
      const directionWeight = this.directionWeights[this.motion.forward >= 0 ? "Forward" : "Backward"]
        + this.directionWeights[this.motion.right >= 0 ? "Right" : "Left"];
      // Match the authored contact intervals: fast steps spend less of each
      // cycle planted, covering more ground without forcing a crouched split.
      const sideBlend = this.directionWeights.Left + this.directionWeights.Right;
      const stanceEnd = .5 + ((.32 * this.directionWeights.Forward + .35 * this.directionWeights.Backward + .27 * sideBlend) - .5) * this.runBlend;
      const stance = this.motion.moving && this.motion.moveWeight > .9 && directionWeight > .9 && phase <= stanceEnd
        && (this.directionWeights.Forward < .001 || this.target.y - position.y - footHeight < .003);
      const rollingPlant = stance && this.directionWeights.Forward > .001;
      if (stance) {
        if (rollingPlant) {
          // Keep the supporting surface point still, not the ankle. Switching
          // from heel to forefoot rebases on the previous resolved pose, so the
          // ankle can roll continuously without snapping to a new anchor.
          if (leg.planted && leg.rollingPlant && leg.plantPosition.distanceTo(this.target) < .6) {
            const ground = surfaces?.sample(this.target.x, this.target.z, position.y);
            this.normal.set(ground?.normal.x ?? 0, ground?.normal.y ?? 1, ground?.normal.z ?? 0);
            leg.foot.getWorldQuaternion(this.footRotation);
            this.deltaRotation.setFromUnitVectors(UP, this.normal);
            this.footRotation.premultiply(this.deltaRotation);
            leg.anchor.copy(leg.plantPivot).applyQuaternion(leg.plantRotation).add(leg.plantPosition);
            this.to.copy(leg.plantPivot).applyQuaternion(this.footRotation);
            this.target.x = leg.anchor.x - this.to.x;
            this.target.z = leg.anchor.z - this.to.z;
          }
        } else {
          if (!leg.planted || leg.rollingPlant || leg.anchor.distanceTo(this.target) > .6) leg.anchor.copy(this.target);
          this.target.x = leg.anchor.x;
          this.target.z = leg.anchor.z;
        }
        leg.foot.getWorldPosition(leg.releaseOffset);
        leg.releaseOffset.subVectors(this.target, leg.releaseOffset);
        leg.releaseOffset.y = 0;
      } else {
        // Carry the planting correction into swing/idle, then release it
        // continuously instead of snapping back to the sampled clip.
        leg.releaseOffset.multiplyScalar(Math.exp(-Math.min(dt, .1) * 12));
        this.target.add(leg.releaseOffset);
      }
      leg.planted = stance;
      leg.rollingPlant = rollingPlant;
      const ground = surfaces?.sample(this.target.x, this.target.z, position.y);
      const groundY = ground?.elevationM ?? position.y;
      const lift = stance ? 0 : Math.max(0, this.target.y - position.y - footHeight);
      leg.contactHeight = footHeight / (this.directionWeights.Forward > .001 ? ground?.normal.y ?? 1 : 1);
      this.target.y = position.y + Math.max(-.35, Math.min(.35, groundY - position.y)) + leg.contactHeight + lift;
      leg.target.copy(this.target);
      leg.normal.set(ground?.normal.x ?? 0, ground?.normal.y ?? 1, ground?.normal.z ?? 0);
      leg.thigh.getWorldPosition(this.hip);
      leg.shin.getWorldPosition(this.knee);
      leg.foot.getWorldPosition(this.ankle);
      // Leave some knee flexion instead of reaching the straight-leg singularity.
      const reach = this.hip.distanceTo(this.knee) + this.knee.distanceTo(this.ankle) - .005;
      const horizontalSq = (this.hip.x - this.target.x) ** 2 + (this.hip.z - this.target.z) ** 2;
      pelvisDrop = Math.max(pelvisDrop, this.hip.y - this.target.y - Math.sqrt(Math.max(0, reach * reach - horizontalSq)));
    }
    if (grounded) {
      // Lower the render rig to reach a downhill plant. Targets retain their
      // sampled swing lift; recomputing them after this would erase that lift.
      this.pelvis.getWorldPosition(this.target);
      this.target.y -= Math.min(.18, pelvisDrop);
      this.pelvis.position.copy(this.pelvis.parent!.worldToLocal(this.target));
      this.pelvis.updateWorldMatrix(false, true);
      for (const leg of this.legs) {
        this.target.copy(leg.target);
        this.normal.copy(leg.normal);
        this.solveLeg(leg);
        leg.foot.getWorldPosition(leg.plantPosition);
        leg.foot.getWorldQuaternion(leg.plantRotation);
      }
    }
  }

  private sampleClips(dt = Infinity): void {
    // PropertyMixer skips writes when sampled values are unchanged. Restore
    // the last raw sample so procedural recoil/IK cannot compound frame to frame.
    for (const { bone, rotation } of this.sampledRotations) bone.quaternion.copy(rotation);
    this.pelvis.position.copy(this.sampledPelvisPosition);
    const motion = this.motion;
    for (const action of this.actions.values()) action.setEffectiveWeight(0);
    const idle = this.actions.get("Idle")!;
    idle.time = motion.idleTime % idle.getClip().duration;
    idle.setEffectiveWeight(1 - motion.moveWeight);
    const transition = 1 - Math.exp(-dt * 8);
    this.runBlend += (motion.runWeight - this.runBlend) * transition;
    for (const direction of ["Forward", "Backward", "Left", "Right"] as const) {
      const desired = direction === (motion.forward >= 0 ? "Forward" : "Backward") ? motion.forwardWeight
        : direction === (motion.right >= 0 ? "Right" : "Left") ? motion.sideWeight : 0;
      this.directionWeights[direction] += (desired - this.directionWeights[direction]) * transition;
      for (const [gait, blend] of [["Walk", 1 - this.runBlend], ["Run", this.runBlend]] as const) {
        const action = this.actions.get(gait + direction)!;
        action.time = motion.phase * action.getClip().duration;
        action.setEffectiveWeight(motion.moveWeight * this.directionWeights[direction] * blend);
      }
    }
    this.mixer.update(0);
    for (const { bone, rotation } of this.sampledRotations) rotation.copy(bone.quaternion);
    this.sampledPelvisPosition.copy(this.pelvis.position);
  }

  private rotateBone(bone: Bone, from: Vector3, to: Vector3): void {
    this.deltaRotation.setFromUnitVectors(from.normalize(), to.normalize());
    bone.getWorldQuaternion(this.worldRotation);
    bone.parent!.getWorldQuaternion(this.parentRotation).invert();
    bone.quaternion.copy(this.parentRotation).multiply(this.deltaRotation).multiply(this.worldRotation);
    bone.updateWorldMatrix(false, true);
  }

  private solveLeg(leg: Leg): void {
    leg.thigh.getWorldPosition(this.hip);
    leg.shin.getWorldPosition(this.knee);
    leg.foot.getWorldPosition(this.ankle);
    leg.foot.getWorldQuaternion(this.footRotation);
    const upper = this.hip.distanceTo(this.knee);
    const lower = this.knee.distanceTo(this.ankle);
    this.axis.subVectors(this.target, this.hip);
    const distance = Math.max(Math.abs(upper - lower) + .0001, Math.min(this.axis.length(), upper + lower - .0001));
    this.axis.normalize();
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    // Preserve the authored knee pole, including the strafe hip turn. Forcing
    // every knee toward aim erases lower-body direction during foot correction.
    this.bend.subVectors(this.knee, this.hip);
    this.bend.addScaledVector(this.axis, -this.bend.dot(this.axis));
    if (this.bend.lengthSq() < .000001) {
      this.bend.copy(this.forward).addScaledVector(this.axis, -this.forward.dot(this.axis));
    }
    this.bend.normalize();
    this.desiredKnee.copy(this.hip).addScaledVector(this.axis, along)
      .addScaledVector(this.bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    this.rotateBone(leg.thigh, this.from.subVectors(this.knee, this.hip), this.to.subVectors(this.desiredKnee, this.hip));
    leg.shin.getWorldPosition(this.knee);
    leg.foot.getWorldPosition(this.ankle);
    this.rotateBone(leg.shin, this.from.subVectors(this.ankle, this.knee), this.to.subVectors(this.target, this.knee));
    this.deltaRotation.setFromUnitVectors(UP, this.normal);
    leg.foot.parent!.getWorldQuaternion(this.parentRotation).invert();
    leg.foot.quaternion.copy(this.parentRotation).multiply(this.deltaRotation).multiply(this.footRotation);
    leg.foot.updateWorldMatrix(false, true);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    const skeletons = new Set<SkinnedMesh["skeleton"]>();
    this.model.traverse((child) => { if (child instanceof SkinnedMesh) skeletons.add(child.skeleton); });
    for (const skeleton of skeletons) skeleton.dispose();
    this.shadow.removeFromParent();
    this.shadow.geometry.dispose();
    this.shadow.material.map!.dispose();
    this.shadow.material.dispose();
  }
}

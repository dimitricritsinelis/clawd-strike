import {
  AdditiveBlending, AnimationMixer, CanvasTexture, CylinderGeometry,
  DirectionalLight, DoubleSide, Group, HemisphereLight,
  LoopOnce, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PointLight,
  Quaternion, Scene, Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
  type AnimationAction, type Object3D, type SkinnedMesh, type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DeterministicRng } from "../utils/Rng";
import { Ak47ViewModel, type WeaponAlignmentSnapshot } from "./Ak47ViewModel";
import { Ak47Motion } from "./Ak47Motion";
import type { Ak47AmmoSnapshot } from "./Ak47Weapon";

export type WeaponViewModel = Pick<Ak47ViewModel,
  "viewModelScene" | "viewModelCamera" | "load" | "setAspect" | "setFrameInput" |
  "updateFromMainCamera" | "triggerShotFx" | "getAlignmentSnapshot" | "dispose"
> & {
  setAmmoState?: (ammo: Ak47AmmoSnapshot) => void;
  setEnvironment?: (environment: Texture | null) => void;
  reset?: () => void;
};

/** The previous implementation and GLB stay intact until the candidate is approved. */
export function createAk47ViewModel(options: { vmDebug: boolean; search: string }): WeaponViewModel {
  return new URLSearchParams(options.search).get("weapon") === "legacy"
    ? new Ak47ViewModel(options)
    : new Ak47AnimatedViewModel();
}

const BASE_POSITION = new Vector3(.151, -.143, -.30);
const BASE_ROLL = -.065;
const VIEWMODEL_SCALE = .90;
const FLASH_SECONDS = .026;
const RAD_TO_DEG = 180 / Math.PI;

function muzzleTexture(profile: "front" | "side"): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(size, size);
  const random = new DeterministicRng(0x47f1a6);
  const noise = Float32Array.from({ length: 32 * 32 }, () => random.next());
  const sample = (x: number, y: number): number => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = noise[(iy & 31) * 32 + (ix & 31)]!;
    const b = noise[(iy & 31) * 32 + ((ix + 1) & 31)]!;
    const c = noise[((iy + 1) & 31) * 32 + (ix & 31)]!;
    const d = noise[((iy + 1) & 31) * 32 + ((ix + 1) & 31)]!;
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1), v = y / (size - 1);
      const n = sample(u * 13, v * 13) * .7 + sample(u * 29, v * 29) * .3;
      let intensity: number;
      if (profile === "front") {
        const dx = (u - .5) * 2, dy = (v - .5) * 2;
        const r = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
        const reach = .44 + Math.sin(angle * 3 + .7) * .07 + Math.sin(angle * 7 + 1.9) * .045 + n * .12;
        const plume = Math.pow(Math.max(0, 1 - r / reach), 1.1) * (.18 + n * .82);
        intensity = Math.min(1, Math.exp(-r * r * 48) + plume * 1.6);
      } else {
        const center = .5 + Math.sin(u * 15) * .022;
        const width = Math.pow(1 - u, .7) * (.10 + n * .17);
        const crossSection = Math.exp(-Math.pow(Math.abs(v - center) / Math.max(.001, width), 2.4));
        intensity = Math.min(1, u * 28) * Math.pow(1 - u, .6) * crossSection * (.45 + n * .85);
      }
      const i = (y * size + x) * 4;
      pixels.data[i] = 255;
      pixels.data[i + 1] = Math.round(120 + Math.min(1, intensity * 1.5) * 132);
      pixels.data[i + 2] = Math.round(24 + Math.pow(Math.min(1, intensity * 1.4), 3) * 203);
      pixels.data[i + 3] = Math.round(Math.min(1, intensity) * 255);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function smokeTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(170,165,151,0.35)");
  gradient.addColorStop(.45, "rgba(150,145,133,0.19)");
  gradient.addColorStop(1, "rgba(130,125,113,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class Ak47AnimatedViewModel implements WeaponViewModel {
  readonly viewModelScene = new Scene();
  readonly viewModelCamera = new PerspectiveCamera(54, 1, .01, 10);
  private readonly weaponRoot = new Group();
  private readonly modelRoot = new Group();
  private readonly effectsRoot = new Group();
  private readonly motion = new Ak47Motion();
  private readonly rng = new DeterministicRng(0x47f1a5);
  private readonly alignment: WeaponAlignmentSnapshot = { loaded: false, dot: -1, angleDeg: 180 };
  private readonly frontFlashTexture = muzzleTexture("front");
  private readonly sideFlashTexture = muzzleTexture("side");
  private readonly flashPlaneGeometry = new PlaneGeometry(.13, .08);
  private readonly flashCoreMaterial = new SpriteMaterial({
    map: this.frontFlashTexture, transparent: true, depthWrite: false,
    blending: AdditiveBlending, toneMapped: false,
  });
  private readonly flashCore = new Sprite(this.flashCoreMaterial);
  private readonly flashMaterial = new MeshBasicMaterial({
    map: this.sideFlashTexture, transparent: true, opacity: 1, depthWrite: false,
    blending: AdditiveBlending, side: DoubleSide, toneMapped: false,
  });
  private readonly flash = new Group();
  private readonly flashLight = new PointLight(0xffc47c, 0, 1.3 * VIEWMODEL_SCALE, 2);
  private readonly caseGeometry = new CylinderGeometry(.0036, .0042, .025, 10);
  private readonly caseMaterial = new MeshStandardMaterial({ color: 0xb18a43, metalness: .75, roughness: .32 });
  private readonly smokeMap = smokeTexture();
  private readonly cases = Array.from({ length: 8 }, () => ({
    mesh: new Mesh(this.caseGeometry, this.caseMaterial), velocity: new Vector3(), spin: new Vector3(), age: 1,
  }));
  private readonly smoke = Array.from({ length: 4 }, () => ({
    sprite: new Sprite(new SpriteMaterial({ map: this.smokeMap, transparent: true, depthWrite: false, opacity: 0 })), age: 1,
  }));
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private readonly cameraForward = new Vector3();
  private readonly barrelForward = new Vector3();
  private readonly worldQuaternion = new Quaternion();
  private model: Object3D | null = null;
  private muzzle: Object3D | null = null;
  private ejection: Object3D | null = null;
  private mixer: AnimationMixer | null = null;
  private idleAction: AnimationAction | null = null;
  private fireAction: AnimationAction | null = null;
  private reloadAction: AnimationAction | null = null;
  private readonly idleContactMaterials: MeshStandardMaterial[] = [];
  private loadPromise: Promise<void> | null = null;
  private disposed = false;
  private speed = 0;
  private grounded = true;
  private flashAge = 1;
  private shotPending = false;
  private caseIndex = 0;
  private smokeIndex = 0;
  private reloading = false;
  private reloadProgress = 0;

  constructor() {
    this.weaponRoot.name = "AK47_AnimatedPose";
    this.weaponRoot.position.copy(BASE_POSITION);
    this.weaponRoot.rotation.z = BASE_ROLL;
    this.weaponRoot.scale.setScalar(VIEWMODEL_SCALE);
    this.effectsRoot.name = "AK47_Effects";
    this.effectsRoot.scale.setScalar(VIEWMODEL_SCALE);
    this.modelRoot.rotation.y = Math.PI / 2;
    this.weaponRoot.add(this.modelRoot);
    this.viewModelCamera.add(this.weaponRoot, this.effectsRoot);
    this.viewModelScene.add(this.viewModelCamera);
    this.flash.visible = false;
    this.flash.name = "MuzzleFlame";
    for (const angle of [0, Math.PI / 2]) {
      const plume = new Mesh(this.flashPlaneGeometry, this.flashMaterial);
      plume.position.x = .055;
      plume.rotation.x = angle;
      this.flash.add(plume);
    }
    this.flashCore.position.x = .014;
    this.flashCore.scale.setScalar(.125);
    this.flash.add(this.flashCore, this.flashLight);
    const key = new DirectionalLight(0xffeedc, 1.8);
    key.position.set(-.6, 1.5, .8);
    key.target.position.set(.12, -.14, -.6);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -.65, right: .65, top: .65, bottom: -.65, near: .1, far: 3 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -.00002;
    key.shadow.normalBias = .0004;
    key.shadow.radius = 2;
    const rim = new DirectionalLight(0xe2e7e9, .35);
    rim.position.set(.9, .6, -1.2);
    this.viewModelCamera.add(key, key.target, rim);
    this.viewModelScene.add(new HemisphereLight(0xf2eee6, 0x554d43, .7));
    // The world caches its shadows. This separate scene contains moving hands
    // and attachments, whose contact shadows must follow every rendered pose.
    this.viewModelScene.onBeforeRender = (renderer) => { renderer.shadowMap.needsUpdate = true; };
    for (const item of this.cases) {
      item.mesh.visible = false;
      this.effectsRoot.add(item.mesh);
    }
    for (const item of this.smoke) {
      item.sprite.visible = false;
      this.effectsRoot.add(item.sprite);
    }
  }

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = new GLTFLoader().loadAsync("/assets/models/weapons/ak47-next/ak47.glb").then((gltf) => {
      this.model = gltf.scene;
      if (this.disposed) { this.disposeModel(); return; }
      this.muzzle = gltf.scene.getObjectByName("MuzzleSocket") ?? null;
      this.ejection = gltf.scene.getObjectByName("EjectionSocket") ?? null;
      const idle = gltf.animations.find((clip) => clip.name === "Idle");
      const fire = gltf.animations.find((clip) => clip.name === "Fire");
      const reload = gltf.animations.find((clip) => clip.name === "Reload");
      if (!this.muzzle || !this.ejection || !idle || !fire || !reload) {
        this.disposeModel();
        throw new Error("AK47 candidate requires MuzzleSocket, EjectionSocket, Idle, Fire and Reload clips");
      }
      this.modelRoot.add(gltf.scene);
      gltf.scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const pbr = material as MeshStandardMaterial;
          if (pbr.name === "Urban Breacher glove" && pbr.aoMap && !this.idleContactMaterials.includes(pbr)) {
            this.idleContactMaterials.push(pbr);
          }
          // The sleeve and receiver are viewed at grazing angles. Preserve
          // their fine material detail instead of blurring it into mip bands.
          for (const value of Object.values(material)) {
            if (value && typeof value === "object" && "isTexture" in value) {
              (value as Texture).anisotropy = 16;
            }
          }
        }
      });
      this.muzzle.add(this.flash);
      this.mixer = new AnimationMixer(gltf.scene);
      this.idleAction = this.mixer.clipAction(idle);
      this.idleAction.play().paused = true;
      this.fireAction = this.mixer.clipAction(fire).setLoop(LoopOnce, 1);
      this.reloadAction = this.mixer.clipAction(reload).setLoop(LoopOnce, 1);
      this.fireAction.clampWhenFinished = true;
      this.reloadAction.clampWhenFinished = true;
      this.reloadAction.play().paused = true;
      this.reloadAction.setEffectiveWeight(0);
      this.mixer.update(0);
      this.alignment.loaded = true;
    });
    return this.loadPromise;
  }

  setAspect(aspect: number): void {
    this.viewModelCamera.aspect = aspect;
    this.viewModelCamera.updateProjectionMatrix();
  }

  setEnvironment(environment: Texture | null): void {
    // The world owns this PMREM texture; the viewmodel borrows it without disposing it.
    this.viewModelScene.environment = environment;
    this.viewModelScene.environmentIntensity = .25;
  }

  setFrameInput(speedMps: number, grounded: boolean, mouseDeltaX: number, mouseDeltaY: number): void {
    this.speed = speedMps;
    this.grounded = grounded;
    this.lookDeltaX = mouseDeltaX;
    this.lookDeltaY = mouseDeltaY;
  }

  setAmmoState(ammo: Ak47AmmoSnapshot): void {
    this.reloading = ammo.reloading;
    this.reloadProgress = ammo.reloadT01;
    this.idleAction?.setEffectiveWeight(this.reloading ? 0 : 1);
    const awayFromForeEnd = this.reloading
      ? Math.max(0, Math.min(1, this.reloadProgress / .10, (1 - this.reloadProgress) / .08))
      : 0;
    for (const material of this.idleContactMaterials) material.aoMapIntensity = 1 - awayFromForeEnd;
    if (this.reloadAction) {
      this.reloadAction.setEffectiveWeight(this.reloading ? 1 : 0);
      this.reloadAction.paused = true;
      this.reloadAction.time = (this.reloading ? this.reloadProgress : 0) * this.reloadAction.getClip().duration;
    }
  }

  triggerShotFx(): void {
    if (!this.alignment.loaded) return;
    this.motion.shot();
    this.fireAction?.reset().play();
    this.flashAge = 0;
    this.shotPending = true;
    this.flash.visible = true;
    this.flash.rotation.x = this.rng.range(-Math.PI, Math.PI);
    this.flash.scale.set(this.rng.range(.85, 1.4), this.rng.range(.8, 1.2), this.rng.range(.8, 1.2));
    this.flashMaterial.opacity = 1;
    this.flashCoreMaterial.opacity = 1;
    this.flashCoreMaterial.rotation = this.rng.range(-Math.PI, Math.PI);
    this.flashLight.intensity = 1.2;
    this.viewModelCamera.updateMatrixWorld(true);
    const casing = this.cases[this.caseIndex++ % this.cases.length]!;
    this.ejection!.getWorldPosition(casing.mesh.position);
    this.effectsRoot.worldToLocal(casing.mesh.position);
    casing.velocity.set(this.rng.range(.65, 1.1), this.rng.range(.3, .65), this.rng.range(.1, .45));
    casing.spin.set(this.rng.range(8, 16), this.rng.range(12, 25), this.rng.range(-15, 15));
    casing.age = 0;
    casing.mesh.rotation.set(this.rng.range(-Math.PI, Math.PI), 0, Math.PI / 2);
    casing.mesh.visible = true;
    const smoke = this.smoke[this.smokeIndex++ % this.smoke.length]!;
    this.muzzle!.getWorldPosition(smoke.sprite.position);
    this.effectsRoot.worldToLocal(smoke.sprite.position);
    smoke.age = 0;
  }

  updateFromMainCamera(mainCamera: PerspectiveCamera, deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(.1, deltaSeconds)) : 0;
    // Intentional look input excludes gameplay recoil and camera shake.
    this.motion.update(dt, this.speed, this.grounded,
      dt > 0 ? -this.lookDeltaX * .002 / dt : 0,
      dt > 0 ? -this.lookDeltaY * .002 / dt : 0);
    this.lookDeltaX = this.lookDeltaY = 0;
    this.viewModelCamera.quaternion.copy(mainCamera.quaternion);
    const pose = this.motion.pose;
    const smooth = (x: number): number => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const reloadTilt = this.reloading ? smooth(this.reloadProgress / .16) * (1 - smooth((this.reloadProgress - .80) / .20)) : 0;
    this.weaponRoot.position.set(BASE_POSITION.x + pose.x - reloadTilt * .045, BASE_POSITION.y + pose.y + reloadTilt * .075, BASE_POSITION.z + pose.z - reloadTilt * .035);
    this.weaponRoot.rotation.set(pose.pitch - reloadTilt * .08, pose.yaw + reloadTilt * .16, BASE_ROLL + pose.roll - reloadTilt * .65);
    // Keep the bolt's first visible pose even when a slow frame spans its entire cycle.
    this.mixer?.update(this.shotPending ? Math.min(dt, 1 / 60) : dt);
    if (!this.shotPending) this.flashAge += dt;
    this.shotPending = false;
    const life = Math.max(0, 1 - this.flashAge / FLASH_SECONDS);
    this.flash.visible = life > 0;
    this.flashMaterial.opacity = life * life;
    this.flashCoreMaterial.opacity = life * life;
    this.flashLight.intensity = 1.2 * life * life;
    for (const casing of this.cases) {
      casing.age += dt;
      casing.mesh.visible = casing.age < .55;
      if (!casing.mesh.visible) continue;
      casing.velocity.y -= dt * 3.2;
      casing.mesh.position.addScaledVector(casing.velocity, dt);
      casing.mesh.rotation.x += casing.spin.x * dt;
      casing.mesh.rotation.y += casing.spin.y * dt;
      casing.mesh.rotation.z += casing.spin.z * dt;
    }
    for (const smoke of this.smoke) {
      smoke.age += dt;
      smoke.sprite.visible = smoke.age > .025 && smoke.age < .32;
      smoke.sprite.position.y += dt * .12;
      smoke.sprite.scale.setScalar(.025 + smoke.age * .20);
      smoke.sprite.material.opacity = Math.max(0, 1 - smoke.age / .32) * .34;
    }
    this.viewModelCamera.updateMatrixWorld(true);
    mainCamera.getWorldDirection(this.cameraForward);
    this.modelRoot.getWorldQuaternion(this.worldQuaternion);
    this.barrelForward.set(1, 0, 0).applyQuaternion(this.worldQuaternion);
    this.alignment.dot = Math.max(-1, Math.min(1, this.cameraForward.dot(this.barrelForward)));
    this.alignment.angleDeg = Math.acos(this.alignment.dot) * RAD_TO_DEG;
  }

  getAlignmentSnapshot(): WeaponAlignmentSnapshot { return this.alignment; }

  reset(): void {
    this.motion.reset();
    this.rng.reset();
    this.mixer?.stopAllAction();
    if (this.idleAction) {
      this.idleAction.reset().setEffectiveWeight(1).play().paused = true;
    }
    if (this.reloadAction) {
      this.reloadAction.reset().play().paused = true;
      this.reloadAction.setEffectiveWeight(0);
      this.mixer?.update(0);
    }
    this.reloading = false;
    this.reloadProgress = 0;
    for (const material of this.idleContactMaterials) material.aoMapIntensity = 1;
    this.flashAge = 1;
    this.shotPending = false;
    this.lookDeltaX = this.lookDeltaY = 0;
    this.caseIndex = this.smokeIndex = 0;
    this.flash.visible = false;
    this.flashLight.intensity = 0;
    for (const item of this.cases) { item.age = 1; item.mesh.visible = false; }
    for (const item of this.smoke) { item.age = 1; item.sprite.visible = false; }
  }

  private disposeModel(): void {
    this.flash.removeFromParent();
    const textures = new Set<Texture>();
    const materials = new Set<MeshStandardMaterial>();
    this.model?.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      if ((mesh as SkinnedMesh).isSkinnedMesh) (mesh as SkinnedMesh).skeleton.dispose();
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material as MeshStandardMaterial);
        for (const value of Object.values(material)) {
          if (value && typeof value === "object" && "isTexture" in value) textures.add(value as Texture);
        }
      }
    });
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    this.model?.removeFromParent();
    this.idleContactMaterials.length = 0;
    this.model = null;
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    this.disposeModel();
    this.flashPlaneGeometry.dispose();
    this.frontFlashTexture.dispose();
    this.sideFlashTexture.dispose();
    this.flashCoreMaterial.dispose();
    this.flashMaterial.dispose();
    this.caseGeometry.dispose();
    this.caseMaterial.dispose();
    this.smokeMap.dispose();
    for (const item of this.smoke) item.sprite.material.dispose();
    this.viewModelScene.traverse((object) => {
      if (object instanceof DirectionalLight) object.shadow.dispose();
    });
    this.viewModelScene.environment = null;
    this.viewModelScene.clear();
  }
}

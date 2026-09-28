import {
  AdditiveBlending, AmbientLight, AnimationMixer, CanvasTexture, Color,
  DirectionalLight, DoubleSide, Group, HemisphereLight, LatheGeometry,
  LoopOnce, Mesh, MeshBasicMaterial, NormalBlending, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PointLight,
  Quaternion, Scene, ShaderChunk, Sprite, SpriteMaterial, SRGBColorSpace, Vector2, Vector3,
  type AnimationAction, type IUniform, type Object3D, type SkinnedMesh, type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DeterministicRng } from "../utils/Rng";
import { Ak47Motion, type Ak47MotionShot } from "./Ak47Motion";
import type { Ak47AmmoSnapshot } from "./Ak47Weapon";
import { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } from "./ak47ReloadMarks";
import type { ViewModelLighting } from "./viewModelLighting";

type WeaponAlignmentSnapshot = {
  loaded: boolean;
  dot: number;
  angleDeg: number;
};

export type WeaponViewModel = {
  readonly viewModelScene: Scene;
  readonly viewModelCamera: PerspectiveCamera;
  load: () => Promise<void>;
  setAspect: (aspect: number) => void;
  setFrameInput: (speedMps: number, grounded: boolean, mouseDeltaX: number, mouseDeltaY: number) => void;
  updateFromMainCamera: (mainCamera: PerspectiveCamera, deltaSeconds: number) => void;
  getAlignmentSnapshot: () => WeaponAlignmentSnapshot;
  dispose: () => void;
  /** Shot facts from the fire controller. */
  triggerShotFx: (event?: Ak47MotionShot) => void;
  /** Footstep cadence from the bootstrap timer (seconds until the next step). */
  onFootstep?: (intervalS: number) => void;
  setAmmoState?: (ammo: Ak47AmmoSnapshot) => void;
  setEnvironment?: (environment: Texture | null) => void;
  /** World light at the eye; null keeps the neutral studio rig (flat preset). */
  setWorldLighting?: (lighting: ViewModelLighting | null) => void;
  /**
   * Current muzzle-flash light strength (0..1). Writes the muzzle offset from
   * the camera, in world orientation, so the world can be lit by the shot.
   */
  getMuzzleFlash?: (outOffset: Vector3) => number;
  reset?: () => void;
};

export function createAk47ViewModel(): WeaponViewModel {
  return new Ak47AnimatedViewModel();
}

const BASE_POSITION = new Vector3(.147, -.128, -.30);
const BASE_ROLL = -.065;
const VIEWMODEL_SCALE = .90;
/** A shot's flash spans about three 60 Hz frames: full, then two fading. */
const FLASH_SECONDS = .06;
const FLASH_VARIANTS = 4;
/** Playtest: the flash read about a third too big. Scales the whole group, so it stays seated on the muzzle. */
const FLASH_SIZE = .7;
const CASING_LIFE_S = .9;
const SMOKE_LIFE_S = .55;
const GRAVITY_MPS2 = 9.81;
const RAD_TO_DEG = 180 / Math.PI;
/**
 * Normalised window in which the left hand is off the handguard, so the idle
 * contact occlusion fades: it lifts off just after leaveHandguard and is back
 * on at handOnHandguard.
 */
const HAND_AWAY: readonly [number, number, number, number] = [
  (AK47_RELOAD_MARKS.leaveHandguard + .04) / AK47_RELOAD_DURATION_S,
  (AK47_RELOAD_MARKS.leaveHandguard + .12) / AK47_RELOAD_DURATION_S,
  (AK47_RELOAD_MARKS.handOnHandguard - .08) / AK47_RELOAD_DURATION_S,
  AK47_RELOAD_MARKS.handOnHandguard / AK47_RELOAD_DURATION_S,
];
const RELOAD_CLIP = "Reload";
/**
 * The Reload clip starts and ends on the Idle pose, so the viewmodel switches
 * between the two actions only at those ends and never cross-fades joints: a
 * per-joint blend between the magazine grip and the handguard grip sweeps the
 * glove through the rifle and the magazine. When a reload stops early the clip
 * itself plays the hand home instead:
 * - before the release mark (old magazine still seated) it plays backwards to
 *   its start, the reach undone;
 * - from the release on it plays forwards to its end, through the authored
 *   seat, grip-open and handguard return (a fire press after the latch).
 * Rates are multiples of the clip's own speed, reached over RETURN_RAMP_S.
 */
const RETURN_BACKWARD_RATE = 2;
const RETURN_FORWARD_RATE = 3;
const RETURN_RAMP_S = .05;
/** A reload that starts while the hand is still going home plays up to it at this rate. */
const CATCH_UP_RATE = 4;
const RELOAD_RELEASE_S = AK47_RELOAD_MARKS.release;

/**
 * The glove's glTF occlusion (ORM red) is permanent. Its ORM blue channel (metallic factor 0) holds the idle
 * contact occlusion from the handguard, multiplied in by `contactOcclusion` and faded out while the hand is away.
 */
const CONTACT_OCCLUSION_FRAGMENT = ShaderChunk.aomap_fragment.replace(
  "* aoMapIntensity + 1.0;",
  "* aoMapIntensity + 1.0;\n\tambientOcclusion *= mix( 1.0, texture2D( metalnessMap, vMetalnessMapUv ).b, contactOcclusion );",
);

function installContactOcclusion(material: MeshStandardMaterial): IUniform<number> {
  if (CONTACT_OCCLUSION_FRAGMENT === ShaderChunk.aomap_fragment) throw new Error("three.js aomap_fragment changed; update the glove contact occlusion");
  const contact: IUniform<number> = { value: 1 };
  material.userData.contactOcclusion = contact;
  material.customProgramCacheKey = () => "ak47-glove-contact-occlusion";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.contactOcclusion = contact;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float contactOcclusion;")
      .replace("#include <aomap_fragment>", CONTACT_OCCLUSION_FRAGMENT);
  };
  return contact;
}

function handAway(t01: number): number {
  const [outStart, outEnd, backStart, backEnd] = HAND_AWAY;
  const leave = Math.min(1, Math.max(0, (t01 - outStart) / (outEnd - outStart)));
  const back = Math.min(1, Math.max(0, (t01 - backStart) / (backEnd - backStart)));
  return leave * (1 - back);
}

function noiseSampler(seed: number): (x: number, y: number) => number {
  const random = new DeterministicRng(seed);
  const noise = Float32Array.from({ length: 32 * 32 }, () => random.next());
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = noise[(iy & 31) * 32 + (ix & 31)]!;
    const b = noise[(iy & 31) * 32 + ((ix + 1) & 31)]!;
    const c = noise[((iy + 1) & 31) * 32 + (ix & 31)]!;
    const d = noise[((iy + 1) & 31) * 32 + ((ix + 1) & 31)]!;
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
}

/** Emission ramp: white-hot core through yellow to orange at the fringe. */
function writeFlashPixel(data: Uint8ClampedArray, i: number, intensity: number): void {
  const x = Math.min(1, Math.max(0, intensity));
  data[i] = 255;
  data[i + 1] = Math.round(110 + Math.min(1, x * 1.35) * 145);
  data[i + 2] = Math.round(20 + Math.pow(x, 2.2) * 235);
  data[i + 3] = Math.round(Math.min(1, x * 1.15) * 255);
}

/** Muzzle-facing star: a hot core and 4-6 irregular petals (the AK's slant brake throws uneven prongs). */
function frontFlashTexture(variant: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(size, size);
  const sample = noiseSampler(0x47f1a6 + variant * 101);
  const random = new DeterministicRng(0x5a11 + variant);
  const petals = 4 + (variant % 3);
  const phase = random.range(0, Math.PI * 2);
  const reach = Array.from({ length: petals }, () => random.range(.55, 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / (size - 1) - .5) * 2, dy = (y / (size - 1) - .5) * 2;
      const r = Math.hypot(dx, dy), angle = Math.atan2(dy, dx) - phase;
      const n = sample(x / size * 11, y / size * 11) * .65 + sample(x / size * 27, y / size * 27) * .35;
      const sector = ((angle / (Math.PI * 2)) * petals % petals + petals) % petals;
      const k = Math.floor(sector), f = sector - k;
      const petalReach = reach[k]! * .92;
      const lobe = Math.pow(Math.max(0, Math.cos((f - .5) * Math.PI)), 3.5);
      const edge = .16 + lobe * petalReach * (.75 + n * .45);
      const petal = Math.max(0, 1 - r / edge);
      const core = Math.exp(-r * r * 30);
      const halo = Math.exp(-r * r * 6) * .35;
      writeFlashPixel(pixels.data, (y * size + x) * 4, core * 1.2 + Math.pow(petal, 1.3) * (.55 + n * .7) + halo);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Side-on plume: a bright throat at the muzzle breaking into turbulent tongues. */
function sideFlashTexture(variant: number): CanvasTexture {
  const w = 256, h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(w, h);
  const sample = noiseSampler(0x2f00d + variant * 37);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1), v = y / (h - 1);
      const n = sample(u * 9 + variant * 3, v * 5) * .6 + sample(u * 23, v * 13 + variant) * .4;
      const center = .5 + (sample(u * 4 + variant, 1.5) - .5) * .18 * u;
      const width = (.07 + .30 * Math.pow(u, .55)) * (.65 + n * .6) * Math.pow(1 - u, .45);
      const cross = Math.exp(-Math.pow(Math.abs(v - center) / Math.max(.002, width), 2.2));
      const along = Math.min(1, u * 22) * Math.pow(1 - u, .9);
      const throat = Math.exp(-u * 9) * Math.exp(-Math.pow((v - .5) / .08, 2));
      writeFlashPixel(pixels.data, (y * w + x) * 4, along * cross * (.35 + n * .95) + throat * .9);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function smokeTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(size, size);
  const sample = noiseSampler(0x5307e);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x / (size - 1) - .5, dy = y / (size - 1) - .5;
      const r = Math.hypot(dx, dy) * 2;
      const n = sample(x / size * 7, y / size * 7) * .6 + sample(x / size * 17, y / size * 17) * .4;
      const a = Math.max(0, 1 - r / (.62 + n * .38)) * (.35 + n * .65);
      const i = (y * size + x) * 4;
      pixels.data[i] = 176; pixels.data[i + 1] = 170; pixels.data[i + 2] = 158;
      pixels.data[i + 3] = Math.round(Math.min(1, a) * 150);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** 7.62x39 case: rim, extractor groove, tapered body, shoulder and neck (metres, axis +Y). */
function casingGeometry(): LatheGeometry {
  const profile = [
    [0, 0], [.00560, 0], [.00560, .0015], [.00470, .0019], [.00470, .0038], [.00560, .0045],
    [.00500, .0300], [.00440, .0325], [.00430, .0387], [.00385, .0387], [0, .0387],
  ].map(([r, y]) => new Vector2(r!, y! - .0194));
  return new LatheGeometry(profile, 12);
}

class Ak47AnimatedViewModel implements WeaponViewModel {
  readonly viewModelScene = new Scene();
  readonly viewModelCamera = new PerspectiveCamera(54, 1, .01, 10);
  private readonly weaponRoot = new Group();
  private readonly modelRoot = new Group();
  private readonly motion = new Ak47Motion();
  private readonly rng = new DeterministicRng(0x47f1a5);
  private readonly alignment: WeaponAlignmentSnapshot = { loaded: false, dot: -1, angleDeg: 180 };
  private readonly frontFlashTextures = Array.from({ length: FLASH_VARIANTS }, (_, i) => frontFlashTexture(i));
  private readonly sideFlashTextures = Array.from({ length: FLASH_VARIANTS }, (_, i) => sideFlashTexture(i));
  private readonly flashPlaneGeometry = new PlaneGeometry(.3, .15);
  private readonly flashCoreMaterial = new SpriteMaterial({
    map: this.frontFlashTextures[0]!, transparent: true, depthWrite: false,
    blending: AdditiveBlending, toneMapped: false,
  });
  private readonly flashCore = new Sprite(this.flashCoreMaterial);
  /** Wide, faint bloom so the shot reads as a burst of light, not a sticker. */
  private readonly flashGlowMaterial = new SpriteMaterial({
    map: this.frontFlashTextures[0]!, transparent: true, depthWrite: false, opacity: .35,
    blending: AdditiveBlending, toneMapped: false,
  });
  private readonly flashGlow = new Sprite(this.flashGlowMaterial);
  // Alpha-blended plumes stay visible against sunlit walls, where an additive flash washes out.
  private readonly flashMaterial = new MeshBasicMaterial({
    map: this.sideFlashTextures[0]!, transparent: true, opacity: 1, depthWrite: false,
    blending: NormalBlending, side: DoubleSide, toneMapped: false,
  });
  private readonly flash = new Group();
  // Placed ahead of the muzzle so the handguard and glove are lit without hot spots.
  private readonly flashLight = new PointLight(0xffa24d, 0, 1.1, 2);
  private readonly caseGeometry = casingGeometry();
  private readonly caseMaterial = new MeshStandardMaterial({ color: 0xc19a52, metalness: .85, roughness: .34 });
  private readonly smokeMap = smokeTexture();
  /** Casings and smoke live in the world-oriented scene, not on the camera, so turning never drags them. */
  private readonly cases = Array.from({ length: 10 }, () => ({
    mesh: new Mesh(this.caseGeometry, this.caseMaterial), velocity: new Vector3(), spin: new Vector3(), age: CASING_LIFE_S,
  }));
  private readonly smoke = Array.from({ length: 8 }, () => ({
    sprite: new Sprite(new SpriteMaterial({ map: this.smokeMap, transparent: true, depthWrite: false, opacity: 0 })),
    velocity: new Vector3(), age: SMOKE_LIFE_S, spin: 0,
  }));
  private readonly key = new DirectionalLight(0xffeedc, 1.8);
  private readonly fill = new DirectionalLight(0xe2e7e9, .35);
  private readonly hemi = new HemisphereLight(0xf2eee6, 0x554d43, .7);
  private readonly ambient = new AmbientLight(0xffffff, 0);
  private worldLit = false;
  private sunVisibility = 1;
  private readonly lighting = { sunDirection: new Vector3(), sunColor: new Color(), sunIntensity: 0, sunVisible: true };
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private readonly cameraForward = new Vector3();
  private readonly barrelForward = new Vector3();
  private readonly worldQuaternion = new Quaternion();
  private readonly cameraPosition = new Vector3();
  private readonly cameraDelta = new Vector3();
  private hasCameraPosition = false;
  private model: Object3D | null = null;
  private muzzle: Object3D | null = null;
  private ejection: Object3D | null = null;
  private mixer: AnimationMixer | null = null;
  private idleAction: AnimationAction | null = null;
  private fireAction: AnimationAction | null = null;
  private reloadAction: AnimationAction | null = null;
  private readonly idleContact: IUniform<number>[] = [];
  private readonly idleContactMaterials: MeshStandardMaterial[] = [];
  private loadPromise: Promise<void> | null = null;
  private disposed = false;
  private speed = 0;
  private grounded = true;
  private flashAge = 1;
  private flashStrength = 0;
  private shotPending = false;
  private caseIndex = 0;
  private smokeIndex = 0;
  private reloading = false;
  /** Gameplay reload position on the clip, in clip seconds. */
  private reloadTargetS = 0;
  /** Shown clip time; equals reloadTargetS except while going home or catching up. */
  private clipTimeS = 0;
  /** The Reload action is shown (weight 1) instead of Idle. */
  private reloadShown = false;
  /** Playing the hand home: -1 backwards to the clip start, 1 forwards to its end, 0 not. */
  private returnDirection: -1 | 0 | 1 = 0;
  private returnElapsedS = 0;
  /** A reload started while the hand was going home: play up to its position, then follow it. */
  private catchingUp = false;
  /** Last Ak47AmmoSnapshot.reloadSerial seen; a change means a new reload started. */
  private reloadSerial: number | undefined = undefined;

  constructor() {
    this.weaponRoot.name = "AK47_AnimatedPose";
    this.weaponRoot.position.copy(BASE_POSITION);
    this.weaponRoot.rotation.z = BASE_ROLL;
    this.weaponRoot.scale.setScalar(VIEWMODEL_SCALE);
    this.modelRoot.rotation.y = Math.PI / 2;
    this.weaponRoot.add(this.modelRoot);
    this.viewModelCamera.add(this.weaponRoot);
    this.viewModelScene.add(this.viewModelCamera);
    this.flash.visible = false;
    this.flash.name = "MuzzleFlame";
    for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
      const plume = new Mesh(this.flashPlaneGeometry, this.flashMaterial);
      plume.position.x = .128;
      plume.rotation.x = angle;
      this.flash.add(plume);
    }
    this.flashCore.position.x = .025;
    this.flashCore.scale.setScalar(.44);
    this.flashGlow.position.x = .05;
    this.flashGlow.scale.setScalar(.9);
    this.flashLight.position.x = .12;
    this.flash.add(this.flashGlow, this.flashCore, this.flashLight);
    // The key follows the world sun in scene space (the camera sits at the origin with the
    // player's orientation), so the rifle is lit from where the map is lit.
    this.key.position.set(-.6, 1.5, .8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -.65, right: .65, top: .65, bottom: -.65, near: .1, far: 4 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.key.shadow.bias = -.00003;
    this.key.shadow.normalBias = .0005;
    this.key.shadow.radius = 2;
    this.fill.position.set(.9, .6, -1.2);
    this.viewModelCamera.add(this.fill);
    this.viewModelScene.add(this.key, this.key.target, this.hemi, this.ambient);
    // The world caches its shadows. This separate scene contains moving hands
    // and attachments, whose contact shadows must follow every rendered pose.
    this.viewModelScene.onBeforeRender = (renderer) => { renderer.shadowMap.needsUpdate = true; };
    for (const item of this.cases) {
      item.mesh.visible = false;
      item.mesh.castShadow = true;
      item.mesh.scale.setScalar(VIEWMODEL_SCALE);
      this.viewModelScene.add(item.mesh);
    }
    for (const item of this.smoke) {
      item.sprite.visible = false;
      this.viewModelScene.add(item.sprite);
    }
  }

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = new GLTFLoader().loadAsync("/assets/models/weapons/ak47-next/ak47.glb").then((gltf) => {
      this.model = gltf.scene;
      if (this.disposed) { this.disposeModel(); return; }
      this.muzzle = gltf.scene.getObjectByName("MuzzleSocket") ?? null;
      this.ejection = gltf.scene.getObjectByName("EjectionSocket") ?? null;
      const clip = (name: string) => gltf.animations.find((candidate) => candidate.name === name);
      const idle = clip("Idle");
      const fire = clip("Fire");
      const reload = clip(RELOAD_CLIP);
      if (!this.muzzle || !this.ejection || !idle || !fire || !reload) {
        this.disposeModel();
        throw new Error(`AK47 viewmodel requires MuzzleSocket, EjectionSocket, Idle, Fire and ${RELOAD_CLIP}`);
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
          if (pbr.name === "Urban Breacher glove" && pbr.aoMap && pbr.metalnessMap && !this.idleContactMaterials.includes(pbr)) {
            this.idleContactMaterials.push(pbr);
            this.idleContact.push(installContactOcclusion(pbr));
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
      this.fireAction.clampWhenFinished = true;
      this.reloadAction = this.mixer.clipAction(reload).setLoop(LoopOnce, 1);
      this.reloadAction.clampWhenFinished = true;
      this.reloadAction.play().paused = true;
      this.applyReloadTime();
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
    if (!this.worldLit) this.viewModelScene.environmentIntensity = .25;
  }

  setWorldLighting(lighting: ViewModelLighting | null): void {
    this.worldLit = lighting !== null;
    if (!lighting) {
      this.key.color.set(0xffeedc);
      this.key.intensity = 1.8;
      this.key.position.set(-.6, 1.5, .8);
      this.hemi.color.set(0xf2eee6);
      this.hemi.groundColor.set(0x554d43);
      this.hemi.intensity = .7;
      this.ambient.intensity = 0;
      this.fill.intensity = .35;
      return;
    }
    this.lighting.sunDirection.copy(lighting.sunDirection);
    this.lighting.sunColor.copy(lighting.sunColor);
    this.lighting.sunIntensity = lighting.sunIntensity;
    this.lighting.sunVisible = lighting.sunVisible;
    this.hemi.color.copy(lighting.skyColor);
    this.hemi.groundColor.copy(lighting.groundColor);
    this.hemi.intensity = lighting.hemiIntensity;
    this.ambient.color.copy(lighting.ambientColor);
    this.ambient.intensity = lighting.ambientIntensity;
    // A little more reflection than the world: the rifle's metal reads from its reflections.
    this.viewModelScene.environmentIntensity = Math.max(.12, lighting.environmentIntensity * 1.6);
    this.fill.intensity = .12;
  }

  setFrameInput(speedMps: number, grounded: boolean, mouseDeltaX: number, mouseDeltaY: number): void {
    this.speed = speedMps;
    this.grounded = grounded;
    this.lookDeltaX = mouseDeltaX;
    this.lookDeltaY = mouseDeltaY;
  }

  setAmmoState(ammo: Ak47AmmoSnapshot): void {
    this.reloading = ammo.reloading;
    const duration = this.reloadAction?.getClip().duration ?? AK47_RELOAD_DURATION_S;
    if (ammo.reloading) this.reloadTargetS = Math.min(1, Math.max(0, ammo.reloadT01)) * duration;
    // A new reload while the previous one is still shown, e.g. a pre-release
    // press that fires the last round and reloads on the same frame.
    const serial = ammo.reloadSerial;
    const restarted = ammo.reloading && this.reloadShown && serial !== undefined
      && this.reloadSerial !== undefined && serial !== this.reloadSerial;
    if (serial !== undefined) this.reloadSerial = serial;
    if (!this.reloadShown) {
      // Clip time 0 is the Idle pose, so a new reload switches over at once.
      if (ammo.reloading) {
        this.reloadShown = true;
        this.clipTimeS = this.reloadTargetS;
      }
    } else if (restarted || !ammo.reloading) {
      // Stopped or restarted: the hand goes home along the clip (see RETURN_*).
      if (this.returnDirection === 0) this.startReturn(duration);
      this.catchingUp = false;
    } else if (this.returnDirection === 0 && !this.catchingUp) {
      // Follows gameplay exactly, including scrubbed (hand-built) snapshots.
      this.clipTimeS = this.reloadTargetS;
    }
    this.applyReloadTime();
  }

  private startReturn(duration: number): void {
    this.returnElapsedS = 0;
    if (this.clipTimeS <= 1e-4) this.finishReturn(0);
    else if (this.clipTimeS >= duration - 1e-4) this.finishReturn(duration);
    else this.returnDirection = this.clipTimeS < RELOAD_RELEASE_S ? -1 : 1;
  }

  /** The hand is home (clip start or end, both the Idle pose). */
  private finishReturn(clipTimeS: number): void {
    this.returnDirection = 0;
    if (this.reloading) {
      this.clipTimeS = 0;
      this.catchingUp = this.reloadTargetS > 0;
      if (!this.catchingUp) this.clipTimeS = this.reloadTargetS;
    } else {
      this.clipTimeS = clipTimeS;
      this.reloadShown = false;
    }
  }

  /** Advances a return or catch-up on the render clock. */
  private advanceReloadClip(dt: number): void {
    const duration = this.reloadAction?.getClip().duration ?? AK47_RELOAD_DURATION_S;
    if (this.returnDirection !== 0) {
      const forward = this.returnDirection > 0;
      const peak = forward ? RETURN_FORWARD_RATE : RETURN_BACKWARD_RATE;
      this.returnElapsedS += dt;
      const ramp = Math.min(1, this.returnElapsedS / RETURN_RAMP_S);
      // Forwards continues the clip's own motion, so it starts at 1x; backwards reverses it from rest.
      const rate = forward ? 1 + (peak - 1) * ramp : peak * ramp;
      this.clipTimeS += this.returnDirection * rate * dt;
      if (forward && this.clipTimeS >= duration) this.finishReturn(duration);
      else if (!forward && this.reloading && this.clipTimeS <= this.reloadTargetS) {
        // Going back met the new reload coming forward: follow it from here.
        this.returnDirection = 0;
        this.clipTimeS = this.reloadTargetS;
      } else if (!forward && this.clipTimeS <= 0) this.finishReturn(0);
    } else if (this.catchingUp) {
      this.clipTimeS += CATCH_UP_RATE * dt;
      if (this.clipTimeS >= this.reloadTargetS) {
        this.clipTimeS = this.reloadTargetS;
        this.catchingUp = false;
      }
    }
    this.applyReloadTime();
  }

  /** Clip time, action weights and the idle contact occlusion. */
  private applyReloadTime(): void {
    const action = this.reloadAction;
    if (action) {
      action.paused = true;
      action.time = this.clipTimeS;
    }
    const shown = this.reloadShown ? 1 : 0;
    this.idleAction?.setEffectiveWeight(1 - shown);
    action?.setEffectiveWeight(shown);
    const away = handAway(this.clipTimeS / AK47_RELOAD_DURATION_S) * shown;
    for (const contact of this.idleContact) contact.value = 1 - away;
  }

  onFootstep(intervalS: number): void {
    this.motion.onFootstep(intervalS);
  }

  triggerShotFx(event?: Ak47MotionShot): void {
    if (!this.alignment.loaded) return;
    this.motion.shot(event);
    this.fireAction?.reset().play();
    this.flashAge = 0;
    this.shotPending = true;
    this.flash.visible = true;
    const variant = this.rng.int(0, FLASH_VARIANTS);
    this.flashCoreMaterial.map = this.frontFlashTextures[variant]!;
    this.flashMaterial.map = this.sideFlashTextures[(variant + this.rng.int(1, FLASH_VARIANTS)) % FLASH_VARIANTS]!;
    this.flash.rotation.x = this.rng.range(-Math.PI, Math.PI);
    this.flash.scale.set(
      this.rng.range(.8, 1.35) * FLASH_SIZE,
      this.rng.range(.85, 1.2) * FLASH_SIZE,
      this.rng.range(.85, 1.2) * FLASH_SIZE,
    );
    this.flashCoreMaterial.rotation = this.rng.range(-Math.PI, Math.PI);
    this.flashCore.scale.setScalar(this.rng.range(.38, .5));
    this.flashGlowMaterial.map = this.frontFlashTextures[(variant + 2) % FLASH_VARIANTS]!;
    this.flashGlowMaterial.rotation = this.rng.range(-Math.PI, Math.PI);
    this.flashStrength = this.rng.range(.85, 1);
    this.viewModelCamera.updateMatrixWorld(true);
    const casing = this.cases[this.caseIndex++ % this.cases.length]!;
    this.ejection!.getWorldPosition(casing.mesh.position);
    // Ejection: right, up and slightly back relative to the view, then world physics.
    casing.velocity.set(this.rng.range(1.1, 1.55), this.rng.range(.55, .9), this.rng.range(.05, .35))
      .applyQuaternion(this.viewModelCamera.quaternion);
    casing.spin.set(this.rng.range(-8, 8), this.rng.range(14, 26), this.rng.range(18, 32));
    casing.age = 0;
    casing.mesh.quaternion.copy(this.viewModelCamera.quaternion);
    casing.mesh.rotateZ(Math.PI / 2 + this.rng.range(-.25, .25));
    casing.mesh.visible = true;
    const smoke = this.smoke[this.smokeIndex++ % this.smoke.length]!;
    this.muzzle!.getWorldPosition(smoke.sprite.position);
    smoke.velocity.set(this.rng.range(-.03, .03), this.rng.range(.05, .12), this.rng.range(-.2, -.1))
      .applyQuaternion(this.viewModelCamera.quaternion);
    smoke.spin = this.rng.range(-1, 1);
    smoke.age = 0;
  }

  getMuzzleFlash(outOffset: Vector3): number {
    if (!this.muzzle || !this.flash.visible) return 0;
    this.flashLight.getWorldPosition(outOffset);
    return this.flashLight.intensity / 1.4;
  }

  updateFromMainCamera(mainCamera: PerspectiveCamera, deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(.1, deltaSeconds)) : 0;
    // Intentional look input excludes gameplay recoil and camera shake.
    this.motion.update(dt, this.speed, this.grounded,
      dt > 0 ? -this.lookDeltaX * .002 / dt : 0,
      dt > 0 ? -this.lookDeltaY * .002 / dt : 0);
    this.lookDeltaX = this.lookDeltaY = 0;
    this.viewModelCamera.quaternion.copy(mainCamera.quaternion);
    // Casings and smoke stay where they were thrown while the player moves.
    if (this.hasCameraPosition) this.cameraDelta.copy(mainCamera.position).sub(this.cameraPosition);
    else this.cameraDelta.set(0, 0, 0);
    this.cameraPosition.copy(mainCamera.position);
    this.hasCameraPosition = true;
    if (this.cameraDelta.lengthSq() > 4) this.cameraDelta.set(0, 0, 0);
    const pose = this.motion.pose;
    this.weaponRoot.position.set(BASE_POSITION.x + pose.x, BASE_POSITION.y + pose.y, BASE_POSITION.z + pose.z);
    this.weaponRoot.rotation.set(pose.pitch, pose.yaw, BASE_ROLL + pose.roll);
    this.advanceReloadClip(dt);
    // Keep the bolt's first visible pose even when a slow frame spans its entire cycle.
    this.mixer?.update(this.shotPending ? Math.min(dt, 1 / 60) : dt);
    if (!this.shotPending) this.flashAge += dt;
    this.shotPending = false;
    const life = Math.max(0, 1 - this.flashAge / FLASH_SECONDS);
    this.flash.visible = life > 0;
    const glow = life * life * this.flashStrength;
    this.flashMaterial.opacity = glow;
    this.flashCoreMaterial.opacity = Math.min(1, glow * 1.1);
    this.flashGlowMaterial.opacity = glow * .35;
    this.flashLight.intensity = 1.4 * glow;
    this.updateLighting(dt);
    for (const casing of this.cases) {
      if (casing.age >= CASING_LIFE_S) continue;
      casing.age += dt;
      casing.velocity.y -= dt * GRAVITY_MPS2;
      casing.mesh.position.addScaledVector(casing.velocity, dt).sub(this.cameraDelta);
      casing.mesh.rotateX(casing.spin.x * dt);
      casing.mesh.rotateY(casing.spin.y * dt);
      casing.mesh.rotateZ(casing.spin.z * dt);
      // Below the eye by a body height it has hit the ground out of view.
      casing.mesh.visible = casing.age < CASING_LIFE_S && casing.mesh.position.y > -1.4;
      if (!casing.mesh.visible) casing.age = CASING_LIFE_S;
    }
    for (const smoke of this.smoke) {
      if (smoke.age >= SMOKE_LIFE_S) continue;
      smoke.age += dt;
      const t = smoke.age / SMOKE_LIFE_S;
      smoke.velocity.multiplyScalar(Math.exp(-dt * 2.5));
      smoke.velocity.y += dt * .08;
      smoke.sprite.position.addScaledVector(smoke.velocity, dt).sub(this.cameraDelta);
      smoke.sprite.visible = smoke.age > .03 && smoke.age < SMOKE_LIFE_S;
      smoke.sprite.scale.setScalar(.03 + Math.sqrt(t) * .16);
      smoke.sprite.material.rotation += smoke.spin * dt;
      smoke.sprite.material.opacity = Math.min(1, smoke.age / .06) * Math.pow(1 - t, 1.6) * .22;
    }
    this.viewModelCamera.updateMatrixWorld(true);
    mainCamera.getWorldDirection(this.cameraForward);
    this.modelRoot.getWorldQuaternion(this.worldQuaternion);
    this.barrelForward.set(1, 0, 0).applyQuaternion(this.worldQuaternion);
    this.alignment.dot = Math.max(-1, Math.min(1, this.cameraForward.dot(this.barrelForward)));
    this.alignment.angleDeg = Math.acos(this.alignment.dot) * RAD_TO_DEG;
  }

  private updateLighting(dt: number): void {
    if (!this.worldLit) return;
    // Ease between sun and shade so crossing a shadow edge does not pop.
    const target = this.lighting.sunVisible ? 1 : 0;
    this.sunVisibility += (target - this.sunVisibility) * (1 - Math.exp(-dt * 7));
    this.key.color.copy(this.lighting.sunColor);
    this.key.intensity = this.lighting.sunIntensity * (.06 + .94 * this.sunVisibility);
    this.key.position.copy(this.lighting.sunDirection).multiplyScalar(2);
    this.key.target.position.set(0, 0, 0);
    this.key.target.updateMatrixWorld();
  }

  getAlignmentSnapshot(): WeaponAlignmentSnapshot { return this.alignment; }

  reset(): void {
    this.motion.reset();
    this.rng.reset();
    this.mixer?.stopAllAction();
    this.idleAction?.reset().play();
    if (this.idleAction) this.idleAction.paused = true;
    this.reloadAction?.reset().play();
    if (this.reloadAction) this.reloadAction.paused = true;
    this.reloading = false;
    this.reloadTargetS = 0;
    this.clipTimeS = 0;
    this.reloadShown = false;
    this.returnDirection = 0;
    this.returnElapsedS = 0;
    this.catchingUp = false;
    this.reloadSerial = undefined;
    this.applyReloadTime();
    this.mixer?.update(0);
    this.flashAge = 1;
    this.flashStrength = 0;
    this.shotPending = false;
    this.lookDeltaX = this.lookDeltaY = 0;
    this.caseIndex = this.smokeIndex = 0;
    this.hasCameraPosition = false;
    this.flash.visible = false;
    this.flashLight.intensity = 0;
    for (const item of this.cases) { item.age = CASING_LIFE_S; item.mesh.visible = false; }
    for (const item of this.smoke) { item.age = SMOKE_LIFE_S; item.sprite.visible = false; }
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
    this.idleContact.length = 0;
    this.model = null;
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    this.disposeModel();
    this.flashPlaneGeometry.dispose();
    for (const texture of [...this.frontFlashTextures, ...this.sideFlashTextures]) texture.dispose();
    this.flashCoreMaterial.dispose();
    this.flashGlowMaterial.dispose();
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

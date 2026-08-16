import { AmbientLight, Color, DirectionalLight, DoubleSide, Fog, HemisphereLight, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, type Texture, Vector3 } from "three";
import { installDesertSky, type DesertSkyHandle } from "../render/DesertSky";
import { AnchorsDebug, type AnchorsDebugState } from "../debug/AnchorsDebug";
import { Hud } from "../debug/Hud";
import { EnemyManager, type EnemyHitResult, type EnemyManagerDebugSnapshot } from "../enemies/EnemyManager";
import type { WeaponAudio } from "../audio/WeaponAudio";
import { buildBlockout } from "../map/buildBlockout";
import {
  buildProps,
  type PropsBuildStats,
  type RenderedPropPlacement,
} from "../map/buildProps";
import { designYawDegToWorldYawRad } from "../map/coordinateTransforms";
import type { WallDetailPlacementStats } from "../map/wallDetailPlacer";
import { resolveBlockoutPalette } from "../render/BlockoutMaterials";
import type { FloorMaterialLibrary } from "../render/materials/FloorMaterialLibrary";
import type { WallMaterialLibrary } from "../render/materials/WallMaterialLibrary";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import type { RuntimeAnchorsSpec, RuntimeBlockoutSpec } from "../map/types";
import {
  PLAYER_EYE_HEIGHT_M,
  PlayerController,
  type PlayerInputState,
} from "../sim/PlayerController";
import { type RuntimeColliderAabb, WorldColliders } from "../sim/collision/WorldColliders";
import { resolveRuntimeSeed } from "../utils/Rng";
import { disposeObjectRoot } from "../utils/disposeObjectRoot";
import type {
  RuntimeControlMode,
  RuntimeFloorMode,
  RuntimeFloorQuality,
  RuntimeLightingPreset,
  RuntimePropChaosOptions,
  RuntimePropVisualMode,
  RuntimeSpawnId,
  RuntimeWallMode,
} from "../utils/UrlParams";
import type { Ak47ShotEvent } from "../weapons/Ak47FireController";
import { Ak47Weapon, type Ak47AmmoSnapshot } from "../weapons/Ak47Weapon";
import { resetTickIntent, type AgentAction, type TickIntent } from "../input/AgentAction";

const DEFAULT_FOV = 75;
const LOOK_SENSITIVITY = 0.002;
const MOBILE_LOOK_SENSITIVITY = 0.15; // degrees per pixel of touch drag
const MIN_PITCH = -(Math.PI / 2) + 0.001;
const MAX_PITCH = (Math.PI / 2) - 0.001;
const EYE_HEIGHT_LERP_RATE = 17.1;
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const AGENT_LOOK_ACCUM_LIMIT_DEG = 540;
const MAP_PROPS_ENABLED = true;
// Lowered from 0.28. No longer coupled to the sky dome's tint: the PMREM bake in
// Renderer.createPmremEnvironment neutralises skyTint for the duration of the
// bake, so the dome's artistic colour and the irradiance it contributes are now
// independent. Before that decoupling, darkening the sky to match the targets
// dropped the frame's median luminance 92 -> 86 and had to be paid back here by
// raising this to 0.20; with the bake fixed, 0.14 holds the shade exactly on
// target (p5 24, median 92) while the visible sky is free to go as deep as it
// needs. If you tint the sky and the shade moves, that decoupling has regressed.
//
// This, not the hemisphere or ambient light, is what was
// holding the shade up: shaded surfaces here are lit overwhelmingly by the sky
// PMREM, so it behaves as the scene's real fill term while HEMI/AMBIENT are
// rounding errors against a key of 4.5. That is why every exposure and fill
// experiment behaved as a global tone curve - fitting a per-code-value LUT from
// before to after gave a residual under 2/255, i.e. no spatial selectivity at
// all. The same test on this constant gives 6.4/255 on Spawn-A and 7.8/255 on
// the west elevation: it is genuinely selective.
//
// The signature is visible in the percentiles. On Spawn-A, p95 does not move AT
// ALL (233 before, 233 after) while p5 falls 46 -> 34 and the median lands on
// target: 113 -> 92 against a target of 92, relative contrast 0.484 -> 0.555
// against a target of 0.552. Sunlit highlights untouched, shadow floor deepened.
//
// Known cost, and it is diagnostic rather than incidental. The Spice west
// elevation gets WORSE (relative contrast 0.462 -> 0.417, p95 124 -> 97) because
// that façade receives no direct sun, so the environment map is not its fill -
// it is its only key. Cutting it removes that camera's entire bright population.
// This is independent confirmation of the sun-azimuth finding recorded on
// HEMI_INTENSITY below; do not "fix" the elevation by putting this back.
const SCENE_ENVIRONMENT_INTENSITY = 0.14;
// Cutting these to tame the bright slivers along shutter frames, struts and
// door rails was tried and rejected: it removed only 22% of them on one camera,
// none on the other, and cost 3 luma of overall scene brightness in a frame
// that is already far too dim. The slivers are a symptom, not the defect — the
// target carries 27,000 bright pixels as broad sunlit stone and zero thin
// bright lines, where this render carries ~700 almost entirely AS thin lines.
// The fix is more lit surface, not less specular.
//
// RAISED, from 0.10 and 0.08. That earlier note only ruled out cutting these.
// Plaster is the dominant shaded surface in every street view, and at 0.10
// against a scene environment of 0.14 it was receiving an effective 0.014 of the
// indirect light - so the shaded walls had almost no fill by construction.
//
// This is the lever the shade deficit was waiting for, and it means that deficit
// was NOT purely a global-illumination ceiling. Sweeping to 0.28/0.24 moves the
// canopy camera 59 -> 68, the west elevation 51 -> 61 and the grounding closeup
// 49 -> 58 (targets 88/77/83), taking total absolute mean error across five
// cameras from 101 to 90 and total relative-contrast error from 0.372 to 0.363.
// Both metrics improve, which no exposure, fill or occlusion change managed.
//
// 0.45/0.40 was measured too and is NOT better: it buys more mean (error 82) but
// costs contrast badly (0.437), overshooting the cameras that were already on
// target. Two cameras still overshoot at 0.28 - Spawn-A 103 -> 107 against 101
// and the tea terrace 109 -> 122 against 98, the latter already over before this.
// Those two want per-area material work, not a lower value here.
const KIT_PLASTER_ENVIRONMENT_INTENSITY = 0.28;
// Timber was carrying 7-9x the plaster's environment response. Dry weathered
// wood is a rough dielectric: its specular lobe is small, and against a warm
// desert PMREM a lobe that size renders as a pink-copper film laid over the
// whole member. That film — not the albedo, and not gloss, since the shader
// already floors roughness at 0.97 — is why every shutter, lattice, frame and
// display post in the merchant closeup read as oxidised metal or plastic rather
// than wood. Pulled to just above plaster so timber still picks up sky bounce in
// shade while its own grain and tone decide its colour.
const KIT_TIMBER_ENVIRONMENT_INTENSITY = 0.18;
const KIT_METAL_ENVIRONMENT_INTENSITY = 1.15;
const DETAIL_PLASTER_ENVIRONMENT_INTENSITY = 0.24;
const DETAIL_TIMBER_ENVIRONMENT_INTENSITY = 0.12;
// Lowered from 0.72. Facade ironwork - shutter hinge clips, sign brackets, the
// small hardware scattered across every frontage - was rendering as pale BLUE
// tabs stuck onto warm timber: measured 71 luminance at a red-to-blue ratio of
// 0.96 (blue-dominant) against the shutter timber right beside it at 41 and
// 2.67. Brighter than the joinery it is bolted to, and the wrong hue, so it read
// as plastic rather than iron.
//
// The cause is that these members are almost entirely environment reflection,
// not albedo - which is why the tint on the hinge clips in v3Architecture could
// never fix it and is documented there as a dead end. Driving this to 0.05
// confirmed it: the clips fell to 17 and their ratio flipped to 1.72, while the
// timber beside them did not move at all. 0.20 puts them at 33 / 1.15 - darker
// than the joinery, warm-neutral rather than blue, and still readable, which is
// what the earlier floor on ironwork albedo was trying and failing to achieve.
const DETAIL_METAL_ENVIRONMENT_INTENSITY = 0.20;
const PROP_MODEL_ENVIRONMENT_INTENSITY = 0.18;

function applyStaticMaterialRenderBudget(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; material?: unknown };
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const candidate of materials) {
      if (!candidate || typeof candidate !== "object") continue;
      const material = candidate as {
        transparent?: boolean;
        side?: number;
        forceSinglePass?: boolean;
        needsUpdate?: boolean;
      };
      if (material.transparent !== true || material.side !== DoubleSide) continue;
      material.forceSinglePass = true;
      material.needsUpdate = true;
    }
  });
}

function applyKitEnvironmentResponse(root: Object3D, environment: Texture): void {
  const configured = new Set<MeshStandardMaterial>();
  root.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; material?: unknown };
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const candidate of materials) {
      if (!(candidate instanceof MeshStandardMaterial) || configured.has(candidate)) continue;
      const materialId = candidate.userData.kitPbrMaterialId;
      const detailMaterialId = candidate.userData.wallDetailPbrMaterialId;
      const propModelId = candidate.userData.propModelId;
      if (
        typeof materialId !== "string"
        && typeof detailMaterialId !== "string"
        && typeof propModelId !== "string"
      ) {
        continue;
      }
      configured.add(candidate);
      candidate.envMap = environment;
      if (typeof propModelId === "string") {
        candidate.envMapIntensity = PROP_MODEL_ENVIRONMENT_INTENSITY;
      } else if (detailMaterialId === "ph_rusty_metal_02") {
        candidate.envMapIntensity = DETAIL_METAL_ENVIRONMENT_INTENSITY;
      } else if (detailMaterialId === "ph_worn_planks" || detailMaterialId === "ph_rough_pine_door") {
        candidate.envMapIntensity = DETAIL_TIMBER_ENVIRONMENT_INTENSITY;
      } else if (typeof detailMaterialId === "string") {
        candidate.envMapIntensity = DETAIL_PLASTER_ENVIRONMENT_INTENSITY;
      } else if (materialId === "ph_rusty_metal_02") {
        candidate.envMapIntensity = KIT_METAL_ENVIRONMENT_INTENSITY;
      } else if (materialId === "ph_worn_planks" || materialId === "ph_rough_pine_door") {
        candidate.envMapIntensity = KIT_TIMBER_ENVIRONMENT_INTENSITY;
      } else {
        candidate.envMapIntensity = KIT_PLASTER_ENVIRONMENT_INTENSITY;
      }
      candidate.needsUpdate = true;
    }
  });
}

// ── Camera shake constants ────────────────────────────────────────────────────
/** Shake impulse added per bullet fired while trigger held (metres). */
const SHAKE_FIRE_IMPULSE = 0.008;
/** Maximum accumulated fire-shake amplitude (metres). */
const SHAKE_FIRE_MAX = 0.028;
/** Damage-hit shake impulse (metres) — scales with damage fraction. */
const SHAKE_DAMAGE_BASE = 0.045;
/** Spring stiffness for shake recovery. */
const SHAKE_STIFFNESS = 180;
/** Spring damping for shake recovery. */
const SHAKE_DAMPING = 18;
/**
 * Largest integration step the shake spring may take. Explicit (semi-implicit)
 * Euler on this spring stays stable only while dt is comfortably under
 * 2/SHAKE_DAMPING (0.111 s) — the step matrix crosses |eigenvalue| = 1 at
 * dt ≈ 0.078 s. 1/120 s leaves a wide margin at any frame rate.
 */
const SHAKE_MAX_STEP_S = 1 / 120;

export type ShakeSpringState = {
  offset: number;
  velocity: number;
};

/**
 * Advances one axis of the camera-shake spring, sub-stepped so the explicit
 * integrator never runs outside its stable region regardless of frame time.
 * Exported for the stability regression test.
 */
export function integrateShakeSpring(state: ShakeSpringState, deltaSeconds: number): void {
  let remaining = Math.max(0, deltaSeconds);
  while (remaining > 0) {
    const step = Math.min(SHAKE_MAX_STEP_S, remaining);
    remaining -= step;
    const accel = -state.offset * SHAKE_STIFFNESS - state.velocity * SHAKE_DAMPING;
    state.velocity += accel * step;
    state.offset += state.velocity * step;
  }
}

export type CameraPose = {
  pos: {
    x: number;
    y: number;
    z: number;
  };
  lookAt: {
    x: number;
    y: number;
    z: number;
  };
  fovDeg: number;
};

export type WeaponShotPayload = Ak47ShotEvent;

type GameOptions = {
  controlMode: RuntimeControlMode;
  mapId: string;
  seedOverride: number | null;
  propChaos: RuntimePropChaosOptions;
  freezeInput?: boolean;
  spawn?: RuntimeSpawnId;
  debug?: boolean;
  highVis?: boolean;
  floorMode: RuntimeFloorMode;
  wallMode: RuntimeWallMode;
  wallDetails: boolean;
  wallDetailDensity: number | null;
  floorQuality: RuntimeFloorQuality;
  lightingPreset: RuntimeLightingPreset;
  environmentLighting: boolean;
  createEnvironmentMap: (scene: Scene, position: Vector3) => Texture | null;
  floorMaterials: FloorMaterialLibrary | null;
  wallMaterials: WallMaterialLibrary | null;
  propVisuals: RuntimePropVisualMode;
  propModels: PropModelLibrary | null;
  doorModels: PropModelLibrary | null;
  onTogglePerfHud?: () => void;
  mountEl?: HTMLElement;
  anchorsDebug?: {
    showMarkers: boolean;
    showLabels: boolean;
    anchorTypes: readonly string[];
  };
  onWeaponShot?: (shot: WeaponShotPayload) => void;
  unlimitedHealth?: boolean;
  playerRunSpeedMps?: number;
};

type SpawnPose = {
  x: number;
  y: number;
  z: number;
  yawRad: number;
  zoneId: string | null;
};

export class Game {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  private desertSky: DesertSkyHandle | null = null;
  private sunLight: DirectionalLight | null = null;
  private controlMode: RuntimeControlMode = "human";
  private readonly pressedKeys = new Set<string>();
  private readonly lookDirection = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly playerController: PlayerController;
  private weapon = new Ak47Weapon({ seed: 1 });
  private readonly tickIntent: TickIntent = {
    moveX: 0,
    moveZ: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    jump: false,
    fire: false,
    reload: false,
    crouch: false,
  };
  private readonly frameInput: PlayerInputState = {
    forward: 0,
    right: 0,
    crouchHeld: false,
    jumpPressed: false,
  };

  private yaw = 0;
  private pitch = 0;
  private lockedCameraPose: CameraPose | null = null;
  private pointerLocked = false;
  private freezeInput = false;
  private humanFireHeld = false;
  private humanJumpQueued = false;
  private humanReloadQueued = false;
  private humanLookDeltaX = 0;
  private humanLookDeltaY = 0;
  private agentMoveX = 0;
  private agentMoveZ = 0;
  private agentLookYawDeltaDeg = 0;
  private agentLookPitchDeltaDeg = 0;
  private agentJumpQueued = false;
  private agentReloadQueued = false;
  private agentFireHeld = false;
  private agentCrouchHeld = false;
  private mobileActive = false;
  private mobileMoveX = 0;
  private mobileMoveZ = 0;
  private mobileLookDeltaX = 0;
  private mobileLookDeltaY = 0;
  private mobileFireHeld = false;
  private mobileJumpQueued = false;
  private mobileReloadQueued = false;
  private mobileCrouchHeld = false;
  private spawn: RuntimeSpawnId = "A";
  private mapId = "bazaar-map";
  private seedOverride: number | null = null;
  private highVis = false;
  private lightingPreset: RuntimeLightingPreset = "golden";
  private environmentLighting = true;
  private createEnvironmentMap: ((scene: Scene, position: Vector3) => Texture | null) | null = null;
  private floorMode: RuntimeFloorMode = "blockout";
  private wallMode: RuntimeWallMode = "blockout";
  private wallDetailsEnabled = true;
  private wallDetailDensity: number | null = null;
  private floorQuality: RuntimeFloorQuality = "4k";
  private floorMaterials: FloorMaterialLibrary | null = null;
  private wallMaterials: WallMaterialLibrary | null = null;
  private propVisuals: RuntimePropVisualMode = "blockout";
  private propModels: PropModelLibrary | null = null;
  private doorModels: PropModelLibrary | null = null;
  private propChaos: RuntimePropChaosOptions = {
    profile: "subtle",
    jitter: null,
    cluster: null,
    density: null,
  };
  private blockoutSpec: RuntimeBlockoutSpec | null = null;
  private anchorsSpec: RuntimeAnchorsSpec | null = null;
  private blockoutRoot: Object3D | null = null;
  private propsRoot: Object3D | null = null;
  private worldColliders: WorldColliders | null = null;
  private runtimeColliders: RuntimeColliderAabb[] = [];
  private propColliders: RuntimeColliderAabb[] = [];
  private renderedLandmarkAnchorIds: string[] = [];
  private renderedAnchorIds: string[] = [];
  private renderedPropPlacements: RenderedPropPlacement[] = [];
  private propStats: PropsBuildStats = {
    seed: 1,
    profile: "subtle",
    jitter: 0.28,
    cluster: 0.45,
    density: 0.55,
    totalAnchors: 0,
    candidatesTotal: 0,
    collidersPlaced: 0,
    rejectedClearZone: 0,
    rejectedBounds: 0,
    rejectedGapRule: 0,
    visualOnlyLandmarks: 0,
    stallFillersPlaced: 0,
  };
  private wallDetailStats: WallDetailPlacementStats = {
    enabled: false,
    seed: 1,
    density: 0,
    segmentCount: 0,
    segmentsDecorated: 0,
    instanceCount: 0,
  };
  private enemyManager: EnemyManager | null = null;
  private playerHealth = 100;
  private overshield = 0;
  private isDead = false;
  private spawnPoseCache: SpawnPose | null = null;
  private wasGrounded = true;
  private onLandingCallback: (() => void) | null = null;
  private hud: Hud | null = null;
  private anchorsDebug: AnchorsDebug | null = null;
  private debugHotkeysEnabled = false;
  private onTogglePerfHud: (() => void) | null = null;
  private onWeaponShot: ((shot: WeaponShotPayload) => void) | null = null;
  private unlimitedHealth = false;
  private weaponLoaded = false;
  private weaponAlignDot = -1;
  private weaponAlignAngleDeg = 180;
  private weaponShotsFiredLastFrame = 0;
  private weaponShotIndex = 0;
  private weaponSpreadDeg = 0;
  private weaponBloomDeg = 0;
  private weaponLastShotRecoilPitchDeg = 0;
  private weaponLastShotRecoilYawDeg = 0;

  // Camera shake: spring state for X and Y offset
  private shakeX = 0;
  private shakeXVel = 0;
  /** Reused scratch so the per-frame spring integration allocates nothing. */
  private readonly shakeSpringX: ShakeSpringState = { offset: 0, velocity: 0 };
  private readonly shakeSpringY: ShakeSpringState = { offset: 0, velocity: 0 };
  private shakeY = 0;
  private smoothedEyeHeight = PLAYER_EYE_HEIGHT_M;
  private shakeYVel = 0;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.debugHotkeysEnabled) {
      if (event.code === "F5") {
        this.onTogglePerfHud?.();
        event.preventDefault();
        return;
      }
      if (event.code === "F2" && this.anchorsDebug) {
        this.anchorsDebug.toggleMarkers();
        event.preventDefault();
        return;
      }
      if (event.code === "F3" && this.anchorsDebug) {
        this.anchorsDebug.toggleLabels();
        event.preventDefault();
        return;
      }
    }

    this.pressedKeys.add(event.code);
    if (event.code === "Space" && !event.repeat) {
      this.humanJumpQueued = true;
    }
    if (
      event.code === "KeyR" &&
      !event.repeat &&
      this.controlMode === "human" &&
      this.canAcceptGameplayInput()
    ) {
      this.humanReloadQueued = true;
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.code);
  };

  private readonly onWindowBlur = (): void => {
    if (this.controlMode === "human") {
      this.resetInputState();
    }
  };

  private readonly onVisibilityChange = (): void => {
    if (this.controlMode === "human" && document.visibilityState !== "visible") {
      this.resetInputState();
    }
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    if (this.controlMode !== "human" || !this.canAcceptGameplayInput()) return;
    this.humanFireHeld = true;
    event.preventDefault();
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.humanFireHeld = false;
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    if (this.controlMode !== "human" || !this.pointerLocked) return;
    event.preventDefault();
  };

  constructor(options: GameOptions) {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(DEFAULT_FOV, 1, 0.1, 1500);
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(0, PLAYER_EYE_HEIGHT_M, 8);

    this.controlMode = options.controlMode;
    this.mapId = options.mapId;
    this.seedOverride = options.seedOverride;
    this.highVis = options.highVis ?? false;
    this.lightingPreset = options.lightingPreset;
    this.environmentLighting = options.environmentLighting;
    this.createEnvironmentMap = options.createEnvironmentMap;
    this.floorMode = options.floorMode;
    this.wallMode = options.wallMode;
    this.wallDetailsEnabled = options.wallDetails;
    this.wallDetailDensity = options.wallDetailDensity;
    this.floorQuality = options.floorQuality;
    this.floorMaterials = options.floorMaterials;
    this.wallMaterials = options.wallMaterials;
    this.propVisuals = options.propVisuals;
    this.propModels = options.propModels;
    this.doorModels = options.doorModels;
    this.propChaos = options.propChaos;
    this.freezeInput = options.freezeInput ?? false;
    this.spawn = options.spawn ?? "A";
    this.debugHotkeysEnabled = options.debug ?? false;
    this.onTogglePerfHud = options.onTogglePerfHud ?? null;
    this.onWeaponShot = options.onWeaponShot ?? null;
    this.unlimitedHealth = options.unlimitedHealth ?? false;
    this.playerController = new PlayerController(options.playerRunSpeedMps);

    this.setupLighting();
    this.setupInitialView();
    this.enemyManager = new EnemyManager(this.scene);

    const weaponSeed = resolveRuntimeSeed(this.mapId, this.seedOverride);
    this.weapon = new Ak47Weapon({ seed: weaponSeed });

    const mountEl = options.mountEl ?? document.querySelector<HTMLElement>("#runtime-root") ?? document.querySelector<HTMLElement>("#app");
    const anchorsDebugOptions = options.anchorsDebug ?? {
      showMarkers: false,
      showLabels: false,
      anchorTypes: [],
    };

    if (mountEl) {
      this.anchorsDebug = new AnchorsDebug({
        mountEl,
        scene: this.scene,
        showMarkers: anchorsDebugOptions.showMarkers,
        showLabels: anchorsDebugOptions.showLabels,
        anchorTypes: anchorsDebugOptions.anchorTypes,
      });
    }

    if (options.debug) {
      if (mountEl) {
        this.hud = new Hud(mountEl);
      }
    }

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setViewportSize(width: number, height: number): void {
    this.anchorsDebug?.setViewport(width, height);
  }

  setPointerLocked(locked: boolean): void {
    this.pointerLocked = locked;
    if (!locked && this.controlMode === "human") {
      this.resetInputState();
    }
  }

  setMobileActive(active: boolean): void {
    this.mobileActive = active;
  }

  feedMobileInput(input: {
    moveX: number;
    moveZ: number;
    lookDeltaX: number;
    lookDeltaY: number;
    fire: boolean;
    jump: boolean;
    reload: boolean;
    crouch: boolean;
  }): void {
    this.mobileMoveX = input.moveX;
    this.mobileMoveZ = input.moveZ;
    this.mobileLookDeltaX += input.lookDeltaX;
    this.mobileLookDeltaY += input.lookDeltaY;
    this.mobileFireHeld = input.fire;
    if (input.jump) this.mobileJumpQueued = true;
    if (input.reload) this.mobileReloadQueued = true;
    this.mobileCrouchHeld = input.crouch;
  }

  setFreezeInput(freeze: boolean): void {
    this.freezeInput = freeze;
    if (freeze) {
      this.humanFireHeld = false;
      this.humanReloadQueued = false;
      this.agentFireHeld = false;
      this.agentReloadQueued = false;
      this.agentJumpQueued = false;
      this.weapon.cancelTrigger();
    }
  }

  setCameraPose(pose: CameraPose): void {
    this.lockedCameraPose = {
      pos: { ...pose.pos },
      lookAt: { ...pose.lookAt },
      fovDeg: pose.fovDeg,
    };
    this.applyLockedCameraPose();
  }

  setBlockoutSpec(spec: RuntimeBlockoutSpec): void {
    this.blockoutSpec = spec;
    this.applyMapLightingBounds(spec);
    this.rebuildWorld();
  }

  setAnchorsSpec(spec: RuntimeAnchorsSpec): void {
    this.anchorsSpec = spec;
    this.anchorsDebug?.setAnchors(spec);
    this.rebuildWorld();
  }

  /**
   * Assigns both map specs with a single world rebuild. The split setters each
   * trigger a full rebuild, which doubles boot-time map construction when both
   * specs arrive together.
   */
  setMapSpecs(blockout: RuntimeBlockoutSpec, anchors: RuntimeAnchorsSpec): void {
    this.blockoutSpec = blockout;
    this.applyMapLightingBounds(blockout);
    this.anchorsSpec = anchors;
    this.anchorsDebug?.setAnchors(anchors);
    this.rebuildWorld();
  }

  getColliderCount(): number {
    return this.runtimeColliders.length;
  }

  getPropsBuildStats(): PropsBuildStats {
    return this.propStats;
  }

  getRenderedLandmarkAnchorIds(): readonly string[] {
    return this.renderedLandmarkAnchorIds;
  }

  getRenderedAnchorIds(): readonly string[] {
    return this.renderedAnchorIds;
  }

  /** Internal visual-QA evidence from the exact dressing path rendered this frame. */
  getRenderedPropPlacements(): readonly RenderedPropPlacement[] {
    return this.renderedPropPlacements;
  }

  getWallDetailStats(): WallDetailPlacementStats {
    return this.wallDetailStats;
  }

  onMouseDelta(deltaX: number, deltaY: number): void {
    if (this.controlMode !== "human" || !this.canAcceptGameplayInput()) return;
    this.humanLookDeltaX += deltaX;
    this.humanLookDeltaY += deltaY;
  }

  update(deltaSeconds: number): void {
    if (this.worldColliders) {
      this.buildTickIntent();
      this.applyLookIntent();
      this.updateInputState();
      if (this.tickIntent.reload && this.canAcceptGameplayInput()) {
        this.weapon.queueReload();
      }
      this.playerController.step(deltaSeconds, this.frameInput, this.yaw);
      // Detect landing transition: airborne → grounded
      const nowGrounded = this.playerController.getGrounded();
      if (!this.wasGrounded && nowGrounded) {
        this.onLandingCallback?.();
        // Add a landing camera bob via damage shake channel
        this.shakeYVel -= 0.06;
      }
      this.wasGrounded = nowGrounded;
      if (this.lockedCameraPose) {
        this.applyLockedCameraPose();
      } else {
        this.updateCameraFromPlayer(deltaSeconds);
      }
      this.desertSky?.update();

      this.camera.getWorldDirection(this.cameraForward);
      const fireResult = this.weapon.update(
        {
          deltaSeconds,
          fireHeld: this.tickIntent.fire && this.canAcceptGameplayInput(),
          origin: this.camera.position,
          forward: this.cameraForward,
          grounded: this.playerController.getGrounded(),
          speedMps: this.playerController.getHorizontalSpeedMps(),
          world: this.worldColliders,
        },
        this.onWeaponShot ?? undefined,
      );

      this.weaponShotsFiredLastFrame = fireResult.shotsFired;
      this.weaponShotIndex = fireResult.shotIndex;
      this.weaponSpreadDeg = fireResult.spreadDeg;
      this.weaponBloomDeg = fireResult.bloomDeg;
      this.weaponLastShotRecoilPitchDeg = fireResult.lastShotRecoilPitchDeg;
      this.weaponLastShotRecoilYawDeg = fireResult.lastShotRecoilYawDeg;

      if (fireResult.recoilPitchRad !== 0 || fireResult.recoilYawRad !== 0) {
        this.setLookAngles(this.yaw + fireResult.recoilYawRad, this.pitch + fireResult.recoilPitchRad);
      }

      // ── Fire shake: add impulse per shot, capped at SHAKE_FIRE_MAX ─────────
      if (fireResult.shotsFired > 0) {
        const impulse = Math.min(SHAKE_FIRE_IMPULSE * fireResult.shotsFired, SHAKE_FIRE_MAX);
        this.shakeXVel += (Math.random() * 2 - 1) * impulse;
        this.shakeYVel += (Math.random() * 2 - 1) * impulse;
      }

      if (this.enemyManager) {
        this.enemyManager.update(
          deltaSeconds,
          this.playerController.getPosition(),
          this.playerHealth,
          this.worldColliders,
          this.playerController.getCurrentHeight(),
          this.playerController.getCurrentEyeHeight(),
        );
        const delta = this.enemyManager.getPlayerHealthDelta();
        if (this.unlimitedHealth) {
          this.playerHealth = 100;
        } else {
          let remaining = delta;
          if (this.overshield > 0 && remaining > 0) {
            const absorbed = Math.min(this.overshield, remaining);
            this.overshield -= absorbed;
            remaining -= absorbed;
          }
          this.playerHealth = Math.max(0, this.playerHealth - remaining);
        }
        // ── Damage shake: proportional to damage taken ──────────────────────
        if (delta > 0) {
          const damageNorm = Math.min(1, delta / 25); // 25 = one shot
          const impulse = SHAKE_DAMAGE_BASE * damageNorm;
          this.shakeXVel += (Math.random() * 2 - 1) * impulse;
          this.shakeYVel -= Math.abs(impulse) * 0.6; // bias upward jolt on damage
        }
        if (!this.unlimitedHealth && this.playerHealth <= 0 && !this.isDead) {
          this.isDead = true;
          this.setFreezeInput(true);
        }
      }

      // ── Shake spring update ───────────────────────────────────────────────
      // Explicit integration of this spring is only stable while
      // dt < ~2/SHAKE_DAMPING. At the loop's 100 ms dt clamp the step matrix has
      // an eigenvalue of -2, so every frame doubles the shake and the camera
      // diverges out of the world (and eventually to NaN) on any device that
      // drops below ~12 fps. Sub-stepping keeps each integration step inside the
      // stable region no matter how long the frame was.
      this.shakeSpringX.offset = this.shakeX;
      this.shakeSpringX.velocity = this.shakeXVel;
      this.shakeSpringY.offset = this.shakeY;
      this.shakeSpringY.velocity = this.shakeYVel;
      integrateShakeSpring(this.shakeSpringX, deltaSeconds);
      integrateShakeSpring(this.shakeSpringY, deltaSeconds);
      this.shakeX = this.shakeSpringX.offset;
      this.shakeXVel = this.shakeSpringX.velocity;
      this.shakeY = this.shakeSpringY.offset;
      this.shakeYVel = this.shakeSpringY.velocity;

      // Authored review shots own the camera for the entire frame. Player camera
      // shake continues to settle in the background but must not move the shot.
      if (this.lockedCameraPose) {
        this.applyLockedCameraPose();
      } else {
        this.camera.position.x += this.shakeX;
        this.camera.position.y += this.shakeY;
      }
    }
    this.anchorsDebug?.update(this.camera);

    if (this.hud) {
      const position = this.playerController.getPosition();
      this.hud.update({
        x: position.x,
        y: position.y,
        z: position.z,
        yawDeg: this.yaw * RAD_TO_DEG,
        pitchDeg: this.pitch * RAD_TO_DEG,
        grounded: this.playerController.getGrounded(),
        speedMps: this.playerController.getHorizontalSpeedMps(),
        propStats: this.propStats,
        weaponStats: {
          loaded: this.weaponLoaded,
          dot: this.weaponAlignDot,
          angleDeg: this.weaponAlignAngleDeg,
          shotsFired: this.weaponShotsFiredLastFrame,
          shotIndex: this.weaponShotIndex,
          spreadDeg: this.weaponSpreadDeg,
          bloomDeg: this.weaponBloomDeg,
          lastShotRecoilPitchDeg: this.weaponLastShotRecoilPitchDeg,
          lastShotRecoilYawDeg: this.weaponLastShotRecoilYawDeg,
        },
      });
    }
  }

  teardown(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.resetInputState();
    this.hud?.dispose();
    this.hud = null;
    if (this.anchorsDebug) {
      this.anchorsDebug.dispose(this.scene);
      this.anchorsDebug = null;
    }
    this.enemyManager?.dispose(this.scene);
    this.enemyManager = null;
    this.desertSky?.dispose();
    this.desertSky = null;
    this.clearBlockout();
    this.clearProps();
  }

  getGrounded(): boolean {
    return this.playerController.getGrounded();
  }

  getPlayerPosition(): { x: number; y: number; z: number } {
    const position = this.playerController.getPosition();
    return {
      x: position.x,
      y: position.y,
      z: position.z,
    };
  }

  getPlayerVelocity(): { x: number; y: number; z: number } {
    const velocity = this.playerController.getVelocity();
    return {
      x: velocity.x,
      y: velocity.y,
      z: velocity.z,
    };
  }

  getPlayerCollisionState(): { hitX: boolean; hitY: boolean; hitZ: boolean; grounded: boolean } {
    return this.playerController.getLastCollisionState();
  }

  isPlayerWithinPlayableBounds(): boolean {
    return this.playerController.isWithinPlayableBounds();
  }

  getSpeedMps(): number {
    return this.playerController.getHorizontalSpeedMps();
  }

  getYawPitchDeg(): { yaw: number; pitch: number } {
    return {
      yaw: this.yaw * RAD_TO_DEG,
      pitch: this.pitch * RAD_TO_DEG,
    };
  }

  getAnchorsDebugState(): AnchorsDebugState {
    if (!this.anchorsDebug) {
      return {
        markersVisible: false,
        labelsVisible: false,
        totalAnchors: 0,
        filteredAnchors: 0,
        shownLabels: 0,
        filterTypes: [],
      };
    }
    return this.anchorsDebug.getState();
  }

  setWeaponDebugSnapshot(loaded: boolean, dot: number, angleDeg: number): void {
    this.weaponLoaded = loaded;
    this.weaponAlignDot = dot;
    this.weaponAlignAngleDeg = angleDeg;
  }

  getWeaponDebugSnapshot(): { loaded: boolean; dot: number; angleDeg: number } {
    return {
      loaded: this.weaponLoaded,
      dot: this.weaponAlignDot,
      angleDeg: this.weaponAlignAngleDeg,
    };
  }

  getAmmoSnapshot(): Ak47AmmoSnapshot {
    return this.weapon.getAmmoSnapshot();
  }

  getPlayerHealth(): number {
    return this.playerHealth;
  }

  getOvershield(): number {
    return this.overshield;
  }

  setOvershield(amount: number): void {
    this.overshield = Math.max(0, amount);
  }

  setPlayerSpeedMultiplier(multiplier: number): void {
    this.playerController.setSpeedMultiplier(multiplier);
  }

  setWeaponFireInterval(intervalS: number): void {
    this.weapon.setFireIntervalS(intervalS);
  }

  setWeaponReloadSpeed(multiplier: number): void {
    this.weapon.setReloadSpeedMultiplier(multiplier);
  }

  setWeaponUnlimitedAmmo(unlimited: boolean): void {
    this.weapon.setUnlimitedAmmo(unlimited);
  }

  checkEnemyRaycastHit(origin: Vector3, dir: Vector3, maxDist: number): EnemyHitResult {
    return this.enemyManager?.checkRaycastHit(origin, dir, maxDist) ?? { hit: false };
  }

  applyDamageToEnemy(enemyId: string, damage: number, isHeadshot = false): void {
    this.enemyManager?.applyDamageToEnemy(enemyId, damage, isHeadshot);
  }

  eliminateAllEnemiesForDebug(): number {
    return this.enemyManager?.eliminateAllForDebug() ?? 0;
  }

  debugSetPlayerPose(position: { x: number; y: number; z: number }, yawRad?: number): void {
    this.playerController.setSpawn(position.x, position.y, position.z);
    if (typeof yawRad === "number") {
      this.setLookAngles(yawRad, 0);
    } else {
      this.updateCameraFromPlayer();
    }
    this.playerHealth = 100;
    this.isDead = false;
  }

  resetBotKnowledgeForDebug(): void {
    this.enemyManager?.resetKnowledgeForDebug();
  }

  suppressBotIntelForDebug(durationMs: number): void {
    this.enemyManager?.suppressPlayerIntelForDebug(durationMs);
  }

  setEnemyAudio(audio: WeaponAudio): void {
    this.enemyManager?.setAudio(audio);
  }

  setEnemyKillCallback(cb: (name: string, isHeadshot: boolean, deathPos: { x: number; y: number; z: number }, enemyIndex: number) => void): void {
    this.enemyManager?.setKillCallback(cb);
  }

  setEnemyNewWaveCallback(cb: (wave: number) => void): void {
    this.enemyManager?.setNewWaveCallback((wave) => {
      this.playerHealth = 100;
      this.overshield = 0;
      this.weapon.reset();
      cb(wave);
    });
  }

  reportPlayerGunshot(): void {
    this.enemyManager?.reportPlayerGunshot(this.playerController.getPosition());
  }

  reportPlayerFootstep(speedMps: number): void {
    if (speedMps <= 0.4) return;
    this.enemyManager?.reportPlayerFootstep(this.playerController.getPosition(), speedMps);
  }

  getBotDebugSnapshot(): EnemyManagerDebugSnapshot | null {
    return this.enemyManager?.getDebugSnapshot() ?? null;
  }

  setEnemyNameplatesVisible(visible: boolean): void {
    this.enemyManager?.setNameplatesVisible(visible);
  }

  setEnemyVisualsVisible(visible: boolean): void {
    this.enemyManager?.setVisualsVisible(visible);
  }

  getWaveElapsedS(): number {
    return this.enemyManager?.getWaveElapsedS() ?? 0;
  }

  setLandingCallback(cb: () => void): void {
    this.onLandingCallback = cb;
  }

  setWeaponCallbacks(cbs: {
    onReloadStart?: () => void;
    onReloadEnd?: () => void;
    onReloadCancel?: () => void;
    onDryFire?: () => void;
  }): void {
    if (cbs.onReloadStart !== undefined) this.weapon.onReloadStart = cbs.onReloadStart;
    if (cbs.onReloadEnd !== undefined) this.weapon.onReloadEnd = cbs.onReloadEnd;
    if (cbs.onReloadCancel !== undefined) this.weapon.onReloadCancel = cbs.onReloadCancel;
    if (cbs.onDryFire !== undefined) this.weapon.onDryFire = cbs.onDryFire;
  }

  getAllEnemiesDead(): boolean {
    return this.enemyManager?.allDead() ?? false;
  }

  getWaveNumber(): number {
    return this.enemyManager?.getWaveNumber() ?? 0;
  }

  /** Seconds remaining until next wave, or null if no countdown is active. */
  getWaveCountdownS(): number | null {
    return this.enemyManager?.getWaveCountdownS() ?? null;
  }

  getIsDead(): boolean {
    return this.isDead;
  }

  getControlMode(): RuntimeControlMode {
    return this.controlMode;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  applyAgentAction(action: AgentAction): void {
    if (action.moveX !== undefined) {
      this.agentMoveX = action.moveX;
    }
    if (action.moveZ !== undefined) {
      this.agentMoveZ = action.moveZ;
    }
    if (action.lookYawDelta !== undefined) {
      this.agentLookYawDeltaDeg = this.clamp(
        this.agentLookYawDeltaDeg + action.lookYawDelta,
        -AGENT_LOOK_ACCUM_LIMIT_DEG,
        AGENT_LOOK_ACCUM_LIMIT_DEG,
      );
    }
    if (action.lookPitchDelta !== undefined) {
      this.agentLookPitchDeltaDeg = this.clamp(
        this.agentLookPitchDeltaDeg + action.lookPitchDelta,
        -AGENT_LOOK_ACCUM_LIMIT_DEG,
        AGENT_LOOK_ACCUM_LIMIT_DEG,
      );
    }
    if (action.jump === true) {
      this.agentJumpQueued = true;
    }
    if (action.reload === true) {
      this.agentReloadQueued = true;
    }
    if (action.fire !== undefined) {
      this.agentFireHeld = action.fire;
    }
    if (action.crouch !== undefined) {
      this.agentCrouchHeld = action.crouch;
    }
  }

  restartRun(): void {
    this.playerHealth = 100;
    this.overshield = 0;
    this.isDead = false;
    this.wasGrounded = true;
    this.shakeX = 0; this.shakeXVel = 0;
    this.shakeY = 0; this.shakeYVel = 0;
    this.smoothedEyeHeight = PLAYER_EYE_HEIGHT_M;
    this.resetInputState();
    this.weapon.reset();
    this.resetWeaponDebugState();

    if (this.blockoutSpec && this.worldColliders && this.enemyManager) {
      const spawnPose = this.selectSpawnPose(this.blockoutSpec, this.spawn);
      this.spawnPoseCache = spawnPose;
      this.playerController.setSpawn(
        spawnPose.x,
        spawnPose.y,
        spawnPose.z,
      );
      this.setLookAngles(spawnPose.yawRad, 0);
      this.enemyManager.fullDispose(this.scene);
      this.enemyManager.setTacticalContext(this.blockoutSpec, this.anchorsSpec ?? null);
      this.enemyManager.spawn(this.worldColliders, {
        mode: "initial",
        playerPos: {
          x: spawnPose.x,
          y: spawnPose.y,
          z: spawnPose.z,
        },
        playerSpawnId: this.spawn,
      });
    } else if (this.blockoutSpec) {
      this.rebuildWorld();
    }

    if (!this.restorePlayerToSpawn()) {
      this.updateCameraFromPlayer();
    }
  }

  private setupLighting(): void {
    if (this.lightingPreset === "flat") {
      const palette = resolveBlockoutPalette(this.highVis);
      this.scene.background = new Color(palette.background);
      this.scene.fog = null;

      const ambient = new AmbientLight(0xffffff, 1.05);
      const hemi = new HemisphereLight(0xfafcff, 0xf0d7ad, 1.2);
      hemi.position.set(0, 20, 0);
      const key = new DirectionalLight(0xfff2d0, 0.7);
      key.position.set(22, 34, 16);
      key.castShadow = false;
      this.scene.add(ambient, hemi, key);
      return;
    }

    // ── High desert daylight rig ───────────────────────────────────────
    // The key sits ~50 degrees above the authored map center. Near-field air
    // stays clear; a pale linear fog only separates the far skyline.
    const FOG_COLOR = 0xDCE4E8;
    const FOG_NEAR_M = 82;
    const FOG_FAR_M = 190;
    // Fill-to-key balance is what produces desert daylight, not the absolute
    // levels. At 1.16 combined fill against a 3.15 key the shaded east-facing
    // frontages sat within 20 points of the sunlit paving, so every opening
    // read as a shallow box pasted on the wall and the street read as one flat
    // mid-tone. A sunlit scene carries most of its light in the key: the fill
    // here is cut to ~0.45x and the key raised, which drops shaded interiors
    // and lifts sunlit stone and paving into separate value bands. The sky
    // dome already supplies image-based fill, so the ambient and hemisphere
    // terms were partly double-counting it.
    // Shade in a desert street is filled mostly by warm bounce off sunlit stone
    // and paving, not by blue sky. Measured against the target the shade here is
    // both lighter and COOLER than it should be — right pier (89,76,54) against
    // a target of (73,56,40), red-to-blue 1.65 versus 1.83 — and both CS2
    // references show shade that is dark but strongly warm. The ambient term was
    // neutral and the hemisphere's ground half under-saturated, so nothing in the
    // fill carried the bounce colour.
    const AMBIENT_COLOR = 0xFFDFAC;
    const AMBIENT_INTENSITY = 0.08;
    // Warmed off pure sky-blue. At 0xDDEBF2 the sky half of the hemisphere has a
    // red-to-blue ratio of 0.91, and since a vertical wall takes roughly half sky
    // and half ground, that cold half was holding all shade at R/B ~1.5 where the
    // target reads 2.10-2.30 and the warm CS2 reference reads 1.91. A desert
    // street's shade is filled far more by bounce off sunlit stone than by sky.
    const HEMI_SKY = 0xEDE2D2;
    // Cooled from 0xE8B070 (red-to-blue 2.07) alongside SUN_COLOR below. Measured
  // map-wide, this render was WARMER than its targets on 15 of the 19 area
  // primary cameras, mean red-to-blue excess +0.178. The ground half of the
  // hemisphere was the most saturated warm term in the rig.
  const HEMI_GROUND = 0xDCBE9A;
    // Do not retune this to chase relative contrast on the Spawn-A camera. Both
    // directions have now been measured to exhaustion and neither is the fix.
    //
    // Raising fill flattens the shadow end: the end is compressed, not the mean.
    // At 0.52 the render's p5 luminance was 46 against the target's 23 and p1 24
    // against 11, while the medians nearly matched. Going to 0.70/ambient 0.105,
    // or further to 0.92, only made that worse.
    //
    // Cutting fill grades the frame instead of lighting it. Fill 0.32 with
    // ambient 0.05 and exposure 1.58 -> 1.28 did land Spawn-A almost exactly on
    // its target (relative contrast 0.484 -> 0.554 against 0.552, mean 122 -> 107
    // against 101), but a blind A/B fitted a per-code-value LUT from the old
    // render to the new one and got a residual under 0.8/255 on all three
    // cameras with the SAME curve — proof it was a global tone curve with no
    // spatial selectivity, not a change in light transport. It was reverted: it
    // cost the Spice west elevation 2.1x on mean error and drove the sunlit
    // stone pier's std/mean from 0.247 to 0.231 against a target of 0.496, the
    // only measurement in the set that moved away from target. A sunlit surface
    // stopped reading as sunlit.
    //
    // The actual deficit is an absent lit population, and it is visible on the
    // primary camera, not just the elevation. On the west frontage the target is
    // bimodal — direct sun on stone at median 106 / p95 176, punched through by
    // cast shadow at p5 24, std/mean 0.507. This render is a single ambient-lit
    // plane at median 50 / p95 109 with p5 only 15 levels under the median. That
    // gap is roughly 3.2x the magnitude of the entire grade above, and no value
    // of fill or exposure can synthesise a lit population that was never
    // rendered. Fix the sun, then re-derive exposure against the new scene.
    const HEMI_INTENSITY = 0.52;
    // Cooled from 0xFFF1D8 (red-to-blue 1.18). Together with HEMI_GROUND this
    // takes the mean red-to-blue error against target from 0.351 to 0.255 across
    // six representative cameras, every one improving and none overshooting,
    // with mean luminance unchanged.
    //
    // This does NOT undo the warm-shade result an earlier blind A/B confirmed -
    // it lands it. On the shaded band (luminance 40-110) that critic judged,
    // red-minus-blue goes 45.6 -> 42.3 against a target of 42.5 on the Spawn-A
    // camera and 47.0 -> 44.4 against 44.3 on the west elevation. The shade was
    // slightly over-warm as well; it is now essentially exact.
    const SUN_COLOR = 0xFFF7EC;
    // Do not raise this to chase "lit surfaces falling short" on the Spawn-A
    // approach. That reading comes from comparing the frame exposure-normalised
    // against the target; in ABSOLUTE terms this render is already brighter
    // than the target everywhere on that camera — plaza 178 vs 142, mid-street
    // 121 vs 102, pier 85 vs 54, arch soffit 133 vs 105. Raising the key to 6.0
    // was measured: it pushed the plaza to 190, further from target, and moved
    // relative contrast by 0.001 (0.396 -> 0.397). The deficit is contrast, not
    // brightness — the shadows sit too high relative to the lights, which reads
    // as dim on an all-shade camera and washed on a sunlit one.
    // Do not lower this to pull the over-bright sunlit paving toward target. An
    // 18% cut (4.5 -> 3.7) moved paving only 176 -> 167 because ACES compresses
    // the highlights, left shade unchanged at 56, and therefore made the
    // shade-to-paving RATIO worse (0.318 -> 0.334 against a target of 0.244)
    // while dimming the west elevation to mean 64 against its target of 77.
    // Raising it was tested earlier and also rejected. The paving problem is not
    // key intensity.
    const SUN_INTENSITY = 4.5;
    // Do not mirror this in X to "put sun on the west frontage". It was measured
    // and it is a regression on the binding camera. SUN_POS [88, 105, -22] makes
    // the sun direction (+0.458, 0.763, -0.458), which does light the west
    // frontage plane at x = 21 (outward normal +X) - and the Spice west
    // ELEVATION improves for it, mean 50 -> 62 against a target of 77 and
    // relative contrast 0.570 -> 0.619 against 0.641.
    //
    // But the Spawn-A approach looks up the street toward +Z, so the frontage
    // filling the left of that frame is the EAST one, and it is the east
    // frontage the current sun lights. Mirroring took that region from mean 65.7
    // to 51.2 against a target of 105.0, its std/mean from 0.423 to 0.306 against
    // 0.507, and its p95 from 127 to 78 against 176 - flatter and darker on every
    // measure. Globally the frame went to mean 113 / median 120 against a target
    // of 101 / 92.
    //
    // Opposing faces cannot both be lit, so this is a binary art-direction choice
    // between the two areas, not a bug with a correct answer. The current azimuth
    // favours the Spawn-A primary camera. Changing it is an owner decision.
    const SUN_POS: [number, number, number] = [-38, 105, -22];
    const SUN_TARGET: [number, number, number] = [25, 0, 41];
    const SHADOW_MAP_SIZE = 4096;
    // Bias is NOT the lever for the wall-detail shadow problem. Tested at 0.06
    // and 0.004 while wall detail had receiveShadow=false (pixel-identical, as
    // expected — those surfaces never sampled the map), and again at 0.05 with
    // receipt enabled: the blanketed west frontage stayed at 71 against a
    // target of 148, unmoved. The planes are not self-shadowing; they are
    // genuinely resolving as occluded.
    const SHADOW_BIAS = -0.00008;
    const SHADOW_NORMAL_BIAS = 0.012;
    const SHADOW_FALLBACK_BOUNDS = 58; // replaced by the authored light-space fit after map load
    const SHADOW_RADIUS = 1;           // API default; Three's PCF-soft path ignores this value

    this.scene.fog = new Fog(FOG_COLOR, FOG_NEAR_M, FOG_FAR_M);

    const ambient = new AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
    const hemi = new HemisphereLight(HEMI_SKY, HEMI_GROUND, HEMI_INTENSITY);
    hemi.position.set(0, 50, 0);

    const sun = new DirectionalLight(SUN_COLOR, SUN_INTENSITY);
    sun.position.set(...SUN_POS);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -SHADOW_FALLBACK_BOUNDS;
    sun.shadow.camera.right = SHADOW_FALLBACK_BOUNDS;
    sun.shadow.camera.top = SHADOW_FALLBACK_BOUNDS;
    sun.shadow.camera.bottom = -SHADOW_FALLBACK_BOUNDS;
    sun.shadow.bias = SHADOW_BIAS;
    sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
    sun.shadow.radius = SHADOW_RADIUS;
    sun.target.position.set(...SUN_TARGET);
    this.sunLight = sun;

    this.scene.add(ambient, hemi, sun, sun.target);

    // Live procedural desert skydome (scaled within camera.far, follows camera each frame)
    this.scene.background = null; // skydome IS the background; clearColor serves as fallback
    this.desertSky = installDesertSky({
      scene: this.scene,
      camera: this.camera,
      sunLight: sun,
      preset: "midday",
    });
    if (this.environmentLighting) {
      this.scene.environment = this.createEnvironmentMap?.(this.scene, this.camera.position) ?? null;
      this.scene.environmentIntensity = SCENE_ENVIRONMENT_INTENSITY;
    }
  }

  private applyMapLightingBounds(spec: RuntimeBlockoutSpec): void {
    const sun = this.sunLight;
    if (!sun) return;
    const center = spec.mapCenter ?? {
      x: spec.playable_boundary.x + spec.playable_boundary.w * 0.5,
      y: spec.playable_boundary.y + spec.playable_boundary.h * 0.5,
    };
    const traversalElevationsM = (spec.traversalSurfaces ?? []).flatMap((surface) => (
      surface.kind === "flat"
        ? [surface.elevationM]
        : [surface.startElevationM, surface.endElevationM]
    ));
    const maxReachableElevationM = Math.max(spec.defaults.floor_height, ...traversalElevationsM);
    const minReachableElevationM = Math.min(spec.defaults.floor_height, ...traversalElevationsM);
    const maxCasterElevationM = Math.max(
      spec.defaults.ceiling_height,
      maxReachableElevationM,
      ...(spec.architecturePlacements ?? []).map((placement) => (
        placement.center.z
        + placement.sizeM.height * 0.5
        + (placement.kind === "massing" ? placement.roof.parapetHeightM : 0)
      )),
    );
    const minCasterElevationM = Math.min(
      minReachableElevationM,
      ...(spec.architecturePlacements ?? []).map((placement) => (
        placement.center.z - placement.sizeM.height * 0.5
      )),
    );

    sun.target.position.set(center.x, maxReachableElevationM * 0.35, center.y);

    // Fit the orthographic shadow camera in light space. The old square bounds
    // spent half the 2048 map's vertical resolution on empty sky and clipped the
    // far edge at 200 m. Authored massing is included so parapets and return walls
    // cannot disappear from the map merely because they sit outside the route box.
    const shadowPoints: Vector3[] = [];
    const boundary = spec.playable_boundary;
    for (const x of [boundary.x, boundary.x + boundary.w]) {
      for (const z of [boundary.y, boundary.y + boundary.h]) {
        shadowPoints.push(
          new Vector3(x, minCasterElevationM, z),
          new Vector3(x, maxCasterElevationM, z),
        );
      }
    }
    for (const placement of spec.architecturePlacements ?? []) {
      const yawRad = placement.yawDeg * DEG_TO_RAD;
      const cosYaw = Math.cos(yawRad);
      const sinYaw = Math.sin(yawRad);
      for (const widthSign of [-1, 1]) {
        for (const depthSign of [-1, 1]) {
          const localX = widthSign * placement.sizeM.width * 0.5;
          const localZ = depthSign * placement.sizeM.depth * 0.5;
          const worldX = placement.center.x + localX * cosYaw - localZ * sinYaw;
          const worldZ = placement.center.y + localX * sinYaw + localZ * cosYaw;
          shadowPoints.push(
            new Vector3(worldX, placement.center.z - placement.sizeM.height * 0.5, worldZ),
            new Vector3(
              worldX,
              placement.center.z + placement.sizeM.height * 0.5
                + (placement.kind === "massing" ? placement.roof.parapetHeightM : 0),
              worldZ,
            ),
          );
        }
      }
    }

    const lightForward = sun.target.position.clone().sub(sun.position).normalize();
    const lightRight = lightForward.clone().cross(new Vector3(0, 1, 0));
    if (lightRight.lengthSq() < 1e-8) lightRight.set(1, 0, 0);
    lightRight.normalize();
    const lightUp = lightRight.clone().cross(lightForward).normalize();
    let minLightX = Number.POSITIVE_INFINITY;
    let maxLightX = Number.NEGATIVE_INFINITY;
    let minLightY = Number.POSITIVE_INFINITY;
    let maxLightY = Number.NEGATIVE_INFINITY;
    let minLightDepth = Number.POSITIVE_INFINITY;
    let maxLightDepth = Number.NEGATIVE_INFINITY;
    const fromTarget = new Vector3();
    const fromSun = new Vector3();
    for (const point of shadowPoints) {
      fromTarget.copy(point).sub(sun.target.position);
      fromSun.copy(point).sub(sun.position);
      const lightX = fromTarget.dot(lightRight);
      const lightY = fromTarget.dot(lightUp);
      const lightDepth = fromSun.dot(lightForward);
      minLightX = Math.min(minLightX, lightX);
      maxLightX = Math.max(maxLightX, lightX);
      minLightY = Math.min(minLightY, lightY);
      maxLightY = Math.max(maxLightY, lightY);
      minLightDepth = Math.min(minLightDepth, lightDepth);
      maxLightDepth = Math.max(maxLightDepth, lightDepth);
    }

    const SHADOW_XY_PADDING_M = 2;
    const SHADOW_DEPTH_PADDING_M = 6;
    sun.shadow.camera.left = minLightX - SHADOW_XY_PADDING_M;
    sun.shadow.camera.right = maxLightX + SHADOW_XY_PADDING_M;
    sun.shadow.camera.bottom = minLightY - SHADOW_XY_PADDING_M;
    sun.shadow.camera.top = maxLightY + SHADOW_XY_PADDING_M;
    sun.shadow.camera.near = Math.max(0.5, minLightDepth - SHADOW_DEPTH_PADDING_M);
    sun.shadow.camera.far = Math.max(
      sun.shadow.camera.near + 1,
      maxLightDepth + SHADOW_DEPTH_PADDING_M,
    );
    sun.shadow.camera.updateProjectionMatrix();
  }

  private setupInitialView(): void {
    this.camera.fov = DEFAULT_FOV;
    this.camera.position.set(0, PLAYER_EYE_HEIGHT_M, 8);
    this.camera.lookAt(0, PLAYER_EYE_HEIGHT_M, 0);
    this.camera.updateProjectionMatrix();
    this.syncAnglesFromCamera();
  }

  private canAcceptGameplayInput(): boolean {
    if (this.freezeInput) {
      return false;
    }
    if (this.controlMode === "human") {
      return this.pointerLocked || this.mobileActive;
    }
    return true;
  }

  private buildTickIntent(): void {
    resetTickIntent(this.tickIntent);

    if (this.controlMode === "human") {
      if (this.mobileActive) {
        this.buildMobileIntent();
      } else {
        this.buildHumanIntent();
      }
    } else {
      this.buildAgentIntent();
    }

    if (!this.canAcceptGameplayInput()) {
      this.tickIntent.moveX = 0;
      this.tickIntent.moveZ = 0;
      this.tickIntent.lookYawDelta = 0;
      this.tickIntent.lookPitchDelta = 0;
      this.tickIntent.jump = false;
      this.tickIntent.fire = false;
      this.tickIntent.reload = false;
    }
  }

  private buildHumanIntent(): void {
    this.tickIntent.moveZ = (this.pressedKeys.has("KeyW") ? 1 : 0) + (this.pressedKeys.has("KeyS") ? -1 : 0);
    this.tickIntent.moveX = (this.pressedKeys.has("KeyD") ? 1 : 0) + (this.pressedKeys.has("KeyA") ? -1 : 0);
    this.tickIntent.crouch = this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight");
    this.tickIntent.jump = this.humanJumpQueued;
    this.tickIntent.fire = this.humanFireHeld;
    this.tickIntent.reload = this.humanReloadQueued;
    this.tickIntent.lookYawDelta = this.humanLookDeltaX * LOOK_SENSITIVITY * RAD_TO_DEG;
    this.tickIntent.lookPitchDelta = -this.humanLookDeltaY * LOOK_SENSITIVITY * RAD_TO_DEG;

    this.humanJumpQueued = false;
    this.humanReloadQueued = false;
    this.humanLookDeltaX = 0;
    this.humanLookDeltaY = 0;
  }

  private buildMobileIntent(): void {
    this.tickIntent.moveX = Math.max(-1, Math.min(1, this.mobileMoveX));
    this.tickIntent.moveZ = Math.max(-1, Math.min(1, this.mobileMoveZ));
    this.tickIntent.crouch = this.mobileCrouchHeld;
    this.tickIntent.jump = this.mobileJumpQueued;
    this.tickIntent.fire = this.mobileFireHeld;
    this.tickIntent.reload = this.mobileReloadQueued;
    this.tickIntent.lookYawDelta = this.mobileLookDeltaX * MOBILE_LOOK_SENSITIVITY;
    this.tickIntent.lookPitchDelta = -this.mobileLookDeltaY * MOBILE_LOOK_SENSITIVITY;

    this.mobileJumpQueued = false;
    this.mobileReloadQueued = false;
    this.mobileLookDeltaX = 0;
    this.mobileLookDeltaY = 0;
  }

  private buildAgentIntent(): void {
    this.tickIntent.moveX = this.agentMoveX;
    this.tickIntent.moveZ = this.agentMoveZ;
    this.tickIntent.lookYawDelta = this.agentLookYawDeltaDeg;
    this.tickIntent.lookPitchDelta = this.agentLookPitchDeltaDeg;
    this.tickIntent.jump = this.agentJumpQueued;
    this.tickIntent.fire = this.agentFireHeld;
    this.tickIntent.reload = this.agentReloadQueued;
    this.tickIntent.crouch = this.agentCrouchHeld;

    this.agentLookYawDeltaDeg = 0;
    this.agentLookPitchDeltaDeg = 0;
    this.agentJumpQueued = false;
    this.agentReloadQueued = false;
  }

  private applyLookIntent(): void {
    if (!this.canAcceptGameplayInput()) return;
    if (this.tickIntent.lookYawDelta === 0 && this.tickIntent.lookPitchDelta === 0) return;

    // Agent API uses degrees-per-tick: +yaw turns right, +pitch turns up.
    const nextYaw = this.yaw - this.tickIntent.lookYawDelta * DEG_TO_RAD;
    const nextPitch = this.pitch + this.tickIntent.lookPitchDelta * DEG_TO_RAD;
    this.setLookAngles(nextYaw, nextPitch);
  }

  private updateInputState(): void {
    if (!this.canAcceptGameplayInput()) {
      this.resetFrameInput();
      return;
    }

    this.frameInput.forward = this.tickIntent.moveZ;
    this.frameInput.right = this.tickIntent.moveX;
    this.frameInput.crouchHeld = this.tickIntent.crouch;
    this.frameInput.jumpPressed = this.tickIntent.jump;
  }

  private resetInputState(): void {
    this.pressedKeys.clear();
    this.humanJumpQueued = false;
    this.humanReloadQueued = false;
    this.humanFireHeld = false;
    this.humanLookDeltaX = 0;
    this.humanLookDeltaY = 0;
    this.agentMoveX = 0;
    this.agentMoveZ = 0;
    this.agentLookYawDeltaDeg = 0;
    this.agentLookPitchDeltaDeg = 0;
    this.agentJumpQueued = false;
    this.agentReloadQueued = false;
    this.agentFireHeld = false;
    this.agentCrouchHeld = false;
    this.weapon.cancelTrigger();
    resetTickIntent(this.tickIntent);
    this.resetFrameInput();
  }

  private resetFrameInput(): void {
    this.frameInput.forward = 0;
    this.frameInput.right = 0;
    this.frameInput.crouchHeld = false;
    this.frameInput.jumpPressed = false;
  }

  private updateCameraFromPlayer(deltaSeconds = 1.0): void {
    const position = this.playerController.getPosition();
    const targetEyeHeight = this.playerController.getCurrentEyeHeight();
    this.smoothedEyeHeight += (targetEyeHeight - this.smoothedEyeHeight) *
      Math.min(1, deltaSeconds * EYE_HEIGHT_LERP_RATE);
    this.camera.position.set(position.x, position.y + this.smoothedEyeHeight, position.z);
    this.applyAnglesToCamera();
  }

  private applyLockedCameraPose(): void {
    const pose = this.lockedCameraPose;
    if (!pose) return;

    this.camera.fov = pose.fovDeg;
    this.camera.position.set(pose.pos.x, pose.pos.y, pose.pos.z);
    this.camera.lookAt(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
    this.camera.updateProjectionMatrix();
    this.syncAnglesFromCamera();
  }

  private setLookAngles(nextYaw: number, nextPitch: number): void {
    this.yaw = nextYaw;
    this.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, nextPitch));
    this.applyAnglesToCamera();
  }

  private syncAnglesFromCamera(): void {
    this.camera.getWorldDirection(this.lookDirection);
    this.pitch = Math.asin(this.lookDirection.y);
    this.yaw = Math.atan2(-this.lookDirection.x, -this.lookDirection.z);
    this.applyAnglesToCamera();
  }

  private applyAnglesToCamera(): void {
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.z = 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private selectSpawnPose(spec: RuntimeBlockoutSpec, spawn: RuntimeSpawnId): SpawnPose {
    const authoredPlayerSpawns = (spec.authoredSpawns ?? []).filter((candidate) => candidate.kind === "player");
    const authored = authoredPlayerSpawns.find((candidate) => (
      candidate.id.toUpperCase().includes(`SPAWN_${spawn}`)
      || candidate.zoneId.toUpperCase().includes(`SPAWN_${spawn}`)
    )) ?? authoredPlayerSpawns[spawn === "B" ? 1 : 0];
    if (authored) {
      const surface = (spec.traversalSurfaces ?? []).find((candidate) => candidate.id === authored.surfaceId);
      let elevationM = spec.defaults.floor_height;
      if (surface?.kind === "flat") {
        elevationM = surface.elevationM;
      } else if (surface?.kind === "ramp") {
        const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
        const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
        const axisCoord = surface.axis === "x" ? authored.x : authored.y;
        const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, 1e-6)));
        elevationM = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t;
      }
      return {
        x: authored.x,
        y: elevationM,
        z: authored.y,
        yawRad: designYawDegToWorldYawRad(authored.yawDeg),
        zoneId: authored.zoneId,
      };
    }

    const spawnZones = spec.zones.filter((zone) => zone.type === "spawn_plaza");
    const byId = spawn === "B" ? "SPAWN_B" : "SPAWN_A";
    const selected =
      spawnZones.find((zone) => zone.id.includes(byId)) ??
      spawnZones[0];

    if (selected) {
      return {
        x: selected.rect.x + selected.rect.w * 0.5,
        y: spec.defaults.floor_height,
        z: selected.rect.y + selected.rect.h * 0.5,
        yawRad: spawn === "B" ? 0 : Math.PI,
        zoneId: selected.id,
      };
    }

    return {
      x: spec.playable_boundary.x + spec.playable_boundary.w * 0.5,
      y: spec.defaults.floor_height,
      z: spec.playable_boundary.y + spec.playable_boundary.h * 0.5,
      yawRad: spawn === "B" ? 0 : Math.PI,
      zoneId: null,
    };
  }

  private rebuildWorld(): void {
    const blockoutSpec = this.blockoutSpec;
    if (!blockoutSpec) {
      return;
    }
    const runtimeSeed = resolveRuntimeSeed(this.mapId, this.seedOverride);

    this.clearBlockout();
    this.clearProps();

    const builtBlockout = buildBlockout(blockoutSpec, {
      highVis: this.highVis,
      seed: runtimeSeed,
      floorMode: this.floorMode,
      wallMode: this.wallMode,
      floorQuality: this.floorQuality,
      lightingPreset: this.lightingPreset,
      floorMaterials: this.floorMaterials,
      wallMaterials: this.wallMaterials,
      anchors: this.anchorsSpec,
      wallDetails: {
        enabled: this.wallDetailsEnabled,
        densityScale: this.wallDetailDensity,
      },
      doorModels: this.doorModels,
    });
    this.wallDetailStats = builtBlockout.wallDetailStats;
    this.blockoutRoot = builtBlockout.root;
    applyStaticMaterialRenderBudget(builtBlockout.root);
    this.scene.add(builtBlockout.root);

    this.propColliders = [];
    this.renderedLandmarkAnchorIds = [];
    this.renderedAnchorIds = [];
    this.renderedPropPlacements = [];
    this.propStats = {
      seed: runtimeSeed,
      profile: this.propChaos.profile,
      jitter: this.propChaos.jitter ?? 0.34,
      cluster: this.propChaos.cluster ?? 0.56,
      density: MAP_PROPS_ENABLED ? (this.propChaos.density ?? 0.44) : 0,
      totalAnchors: this.anchorsSpec?.anchors.length ?? 0,
      candidatesTotal: 0,
      collidersPlaced: 0,
      rejectedClearZone: 0,
      rejectedBounds: 0,
      rejectedGapRule: 0,
      visualOnlyLandmarks: 0,
      stallFillersPlaced: 0,
    };

    if (MAP_PROPS_ENABLED && this.anchorsSpec) {
      const builtProps = buildProps({
        mapId: this.mapId,
        blockout: blockoutSpec,
        anchors: this.anchorsSpec,
        seedOverride: this.seedOverride,
        propChaos: this.propChaos,
        propVisuals: this.propVisuals,
        propModels: this.propModels,
        highVis: this.highVis,
      });
      this.propsRoot = builtProps.root;
      applyStaticMaterialRenderBudget(builtProps.root);
      this.propColliders = builtProps.colliders;
      this.propStats = builtProps.stats;
      this.renderedLandmarkAnchorIds = builtProps.renderedLandmarkAnchorIds;
      this.renderedAnchorIds = builtProps.renderedAnchorIds;
      this.renderedPropPlacements = builtProps.renderedPlacements;
      this.scene.add(builtProps.root);
      if (this.scene.environment) {
        applyKitEnvironmentResponse(builtProps.root, this.scene.environment);
      }
    }
    if (this.scene.environment) {
      applyKitEnvironmentResponse(builtBlockout.root, this.scene.environment);
    }

    this.runtimeColliders = [...builtBlockout.colliders, ...this.propColliders].sort((a, b) => a.id.localeCompare(b.id));
    this.worldColliders = new WorldColliders(
      this.runtimeColliders,
      blockoutSpec.playable_boundary,
      blockoutSpec.traversalSurfaces ?? [],
    );
    this.playerController.setWorld(this.worldColliders);
    const spawnPose = this.selectSpawnPose(blockoutSpec, this.spawn);
    this.spawnPoseCache = spawnPose;
    this.playerController.setSpawn(spawnPose.x, spawnPose.y, spawnPose.z);
    this.setLookAngles(spawnPose.yawRad, 0);
    this.enemyManager?.fullDispose(this.scene);
    this.enemyManager?.setTacticalContext(blockoutSpec, this.anchorsSpec ?? null);
    this.enemyManager?.spawn(this.worldColliders, {
      mode: "initial",
      playerPos: {
        x: spawnPose.x,
        y: spawnPose.y,
        z: spawnPose.z,
      },
      playerSpawnId: this.spawn,
    });
    if (!this.freezeInput) {
      this.updateCameraFromPlayer();
    }
  }

  private restorePlayerToSpawn(): boolean {
    if (!this.blockoutSpec) return false;
    const pose = this.spawnPoseCache ?? this.selectSpawnPose(this.blockoutSpec, this.spawn);
    this.spawnPoseCache = pose;
    this.playerController.setSpawn(
      pose.x,
      pose.y,
      pose.z,
    );
    this.setLookAngles(pose.yawRad, 0);
    this.updateCameraFromPlayer();
    return true;
  }

  private resetWeaponDebugState(): void {
    this.weaponShotsFiredLastFrame = 0;
    this.weaponShotIndex = 0;
    this.weaponSpreadDeg = 0;
    this.weaponBloomDeg = 0;
    this.weaponLastShotRecoilPitchDeg = 0;
    this.weaponLastShotRecoilYawDeg = 0;
  }

  private clearBlockout(): void {
    if (this.blockoutRoot) {
      this.scene.remove(this.blockoutRoot);
      disposeObjectRoot(this.blockoutRoot);
      this.blockoutRoot = null;
    }
    this.worldColliders = null;
    this.runtimeColliders = [];
  }

  private clearProps(): void {
    if (this.propsRoot) {
      this.scene.remove(this.propsRoot);
      disposeObjectRoot(this.propsRoot);
      this.propsRoot = null;
    }
    this.propColliders = [];
    this.worldColliders = null;
    this.runtimeColliders = [];
  }
}

import {
  Box3,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import { Game } from "./game/Game";
import { resolveEnemyHitDamage } from "./combat/enemyHitZone";
import { PerfHud } from "./debug/PerfHud";
import { preloadEnemyVisualAssets, setEnemyVisualModelStreamingEnabled } from "./enemies/EnemyVisual";
import { ENEMIES_PER_WAVE } from "./enemies/EnemyManager";
import { PointerLockController } from "./input/PointerLock";
import { loadMap, RuntimeMapLoadError } from "./map/loadMap";
import { designToWorldVec3 } from "./map/coordinateTransforms";
import { resolveShot } from "./map/shots";
import type { RuntimeAnchor, RuntimeBlockoutSpec, RuntimeMapAssets } from "./map/types";
import { Renderer } from "./render/Renderer";
import {
  collectSceneTextures,
  uploadTexturesInBatches,
  waitForPendingAssetLoads,
} from "./render/sceneReadiness";
import { FloorMaterialLibrary } from "./render/materials/FloorMaterialLibrary";
import { WallMaterialLibrary } from "./render/materials/WallMaterialLibrary";
import { PropModelLibrary } from "./render/models/PropModelLibrary";
import { auditVisibleFacadeBacking } from "./qa/facadeBacking";
import { resolveVisualSupport, type VisualSupportCandidate } from "./qa/visualSupport";
import {
  QaAssetReadinessTracker,
  createQaAssetPlan,
  preloadQaDirectTextures,
  qaDoorModelRequestId,
  qaFloorMaterialRequestId,
  qaPropModelRequestId,
  qaWallMaterialRequestId,
  resolveQaAssetProfile,
  resolveQaAssetTimeoutMs,
} from "./qa/assetReadiness";
import { WeaponAudio } from "./audio/WeaponAudio";
import { AmmoHud } from "./ui/AmmoHud";
import { HealthHud } from "./ui/HealthHud";
import { DeathScreen } from "./ui/DeathScreen";
import { HitVignette } from "./ui/HitVignette";
import { KillFeed } from "./ui/KillFeed";
import { HitMarker } from "./ui/HitMarker";
import { ScoreHud } from "./ui/ScoreHud";
import { MobileScoreStrip } from "./ui/MobileScoreStrip";
import { RoundEndScreen, type RoundStats } from "./ui/RoundEndScreen";
import { TimerHud } from "./ui/TimerHud";
import { DamageNumbers } from "./ui/DamageNumbers";
import { PauseMenu } from "./ui/PauseMenu";
import { HowToPlayOverlay } from "./ui/HowToPlayOverlay";
import { ControlsOverlay } from "./ui/ControlsOverlay";
import { FadeOverlay } from "./ui/FadeOverlay";
import { HeadshotBanner } from "./ui/HeadshotBanner";
import { parseRuntimeUrlParams, type RuntimeControlMode } from "./utils/UrlParams";
import { normalizeAgentAction, type AgentAction } from "./input/AgentAction";
import { isMobileDevice } from "./input/MobileDetect";
import { TouchInputManager } from "./input/TouchInputManager";
import { MobileTouchHud } from "./ui/MobileTouchHud";
import { MobileOrientationGuard } from "./ui/MobileOrientationGuard";
import { MobileFullscreenHint } from "./ui/MobileFullscreenHint";
import { BulletHoleManager } from "./effects/BulletHoleManager";
import { BuffManager } from "./buffs/BuffManager";
import { warmupOrbMaterials } from "./buffs/BuffOrb";
import { BUFF_TYPES, type BuffType } from "./buffs/BuffTypes";
import { BuffHud } from "./ui/BuffHud";
import { BuffTextHud } from "./ui/BuffTextHud";
import { BuffVignette } from "./ui/BuffVignette";
import { getGameplayTuning } from "./tuning/gameplayTuning";
import type { RuntimeWarmupAssets } from "./warmup";
import { isAutomatedClient, isLocalhostHostname } from "../shared/hostEnvironment";
import {
  getSharedChampionSnapshot,
  loadSharedChampion,
  startSharedChampionRunSession,
  submitSharedChampionRunSession,
  type SharedChampionRunSession,
} from "../shared/sharedChampionClient";
import {
  SharedChampionRunLifecycle,
  createSharedChampionRunSummary,
  type SharedChampionRunCompletion,
} from "../shared/sharedChampionRunLifecycle";
import {
  SHARED_CHAMPION_SCORE_RULESET,
  deriveSharedChampionBoardKey,
  type SharedChampion,
  type SharedChampionRunSummary,
  type SharedChampionSnapshot,
} from "../../../shared/highScore";
import {
  resolveGameplayProfileIdentity,
  type GameplayProfileIdentity,
} from "../../../shared/gameplayProfile";
import {
  PUBLIC_AGENT_API_VERSION,
  PUBLIC_AGENT_CONTRACT,
} from "../../../shared/publicAgentContract";

type ViewModelInstance = InstanceType<typeof import("./weapons/Ak47ViewModel")["Ak47ViewModel"]>;

const OVERVIEW_VIEWMODEL_DISABLE_HEIGHT_M = 10;
const PERF_SCENE_SAMPLE_INTERVAL_MS = 300;
const PERF_CPU_FRAME_SAMPLE_LIMIT = 120;
const POINTER_LOCK_BANNER_GRACE_MS = 2600;
const FLOOR_MANIFEST_URL = "/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/materials.json";
const WALL_MANIFEST_URL = "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json";
const DOOR_MANIFEST_URL = "/assets/models/environment/bazaar/doors/models.json";
const PROP_MANIFEST_URL = "/assets/models/environment/bazaar/props/models.json";
const PBR_FLOORS_ENABLED = true;
const PBR_WALLS_ENABLED = true;
const MAP_PROPS_ENABLED = true;
const DOOR_MODELS_ENABLED = true;
const RUNTIME_TEXT_API_VERSION = 4;
const SCORE_STORAGE_PREFIX = "clawd-strike:score-best";
const SCORE_RULESET_KEY = SHARED_CHAMPION_SCORE_RULESET;
const AGENT_VISIBLE_RENDER_INTERVAL_MS = 1000 / 30;
const AGENT_BACKGROUND_STEP_INTERVAL_MS = 500;
/** Frames that may throw back-to-back before the loop stops trying. */
const MAX_CONSECUTIVE_FRAME_ERRORS = 10;
const TEXTURE_STABLE_WINDOW_MS = 500;
const SCENE_COMPILE_TIMEOUT_MS = 2_500;
// Human-play boot gate budgets. Every stage is individually bounded so a bad
// network or driver can delay the reveal by at most the sum of these caps.
const MAP_ASSET_SETTLE_TIMEOUT_MS = 10_000;
const MAP_SCENE_COMPILE_TIMEOUT_MS = 10_000;
const ENEMY_TEMPLATE_BOOT_TIMEOUT_MS = 10_000;

/**
 * Software rasterizers (headless SwiftShader, llvmpipe, Windows Basic Render)
 * have monopolized the main thread on whole-scene compiles/renders before.
 * The human boot gate skips them and keeps the historical fast-reveal boot.
 */
function isLikelySoftwareGl(renderer: Renderer): boolean {
  const gl = renderer.getWebGLRenderer()?.getContext();
  if (!gl) return true;
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}
const PUBLIC_AGENT_FEEDBACK_MAX_EVENTS = 24;
const OVERVIEW_MIN_VISIBLE_SPAN_M = 6;

type ScenePerfSnapshot = {
  materials: number;
  instancedMeshes: number;
  instancedInstances: number;
  meshes: number;
  potentialTriangles: number;
  groups: Record<string, { meshes: number; instancedMeshes: number; instances: number; potentialTriangles: number }>;
  topMeshes: Array<{ name: string; instances: number; potentialTriangles: number }>;
};

type PropManifestModel = {
  id: string;
  url: string;
  scale?: number;
};

function overviewQaSpan(object: Object3D): number | null {
  const records = Array.isArray(object.userData.visualQaInstances)
    ? object.userData.visualQaInstances
    : [object.userData.visualQa];
  let largest = Number.NEGATIVE_INFINITY;
  for (const raw of records) {
    if (!isRecordValue(raw) || !isRecordValue(raw.dimensions)) continue;
    const dimensions = raw.dimensions;
    for (const key of ["x", "y", "z"]) {
      const value = dimensions[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        largest = Math.max(largest, Math.abs(value));
      }
    }
  }
  return Number.isFinite(largest) ? largest : null;
}

function belongsToOverviewLandmark(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    const qa = isRecordValue(current.userData.visualQa) ? current.userData.visualQa : null;
    const placementId = typeof qa?.placementId === "string" ? qa.placementId : "";
    if (placementId.startsWith("LMK_") || placementId.includes("_LMK_")) return true;
    const instances = current === object ? current.userData.visualQaInstances : null;
    if (Array.isArray(instances) && instances.some((raw) => {
      if (!isRecordValue(raw)) return false;
      return typeof raw.placementId === "string"
        && (raw.placementId.startsWith("LMK_") || raw.placementId.includes("_LMK_"));
    })) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function applyOverviewRenderLod(scene: Object3D): () => void {
  scene.updateMatrixWorld(true);
  const worldScale = new Vector3();
  const changedVisibility = new Map<Object3D, boolean>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh) || !object.visible) return;
    if (belongsToOverviewLandmark(object)) return;

    const qaSpan = overviewQaSpan(object);
    if (qaSpan !== null) {
      if (qaSpan < OVERVIEW_MIN_VISIBLE_SPAN_M) {
        changedVisibility.set(object, object.visible);
        object.visible = false;
      }
      return;
    }

    if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
    const radius = object.geometry.boundingSphere?.radius;
    if (typeof radius !== "number" || !Number.isFinite(radius)) return;
    object.getWorldScale(worldScale);
    const diameterM = 2 * radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
    if (diameterM < OVERVIEW_MIN_VISIBLE_SPAN_M) {
      changedVisibility.set(object, object.visible);
      object.visible = false;
    }
  });
  return () => {
    for (const [object, visible] of changedVisibility) {
      object.visible = visible;
    }
    changedVisibility.clear();
  };
}

function requiredMobilePropModelIds(mapAssets: RuntimeMapAssets | null): Set<string> {
  const ids = new Set<string>();
  for (const placement of mapAssets?.blockout.dressingPlacements ?? []) {
    if (placement.runtime.mode === "model") {
      ids.add(placement.runtime.id);
    }
    // The authored cover composition is procedural as a layout, but its final
    // representation is assembled from this registered CC0 crate model.
    if (placement.runtime.id === "bazaar_cover_goods") {
      ids.add("ph_wooden_crate_01");
    }
  }
  return ids;
}

async function loadRegisteredPropModelSubset(
  manifestUrl: string,
  requiredIds: ReadonlySet<string>,
): Promise<PropModelLibrary> {
  const resolvedManifestUrl = new URL(manifestUrl, window.location.href);
  const response = await fetch(resolvedManifestUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch prop manifest (${response.status} ${response.statusText})`);
  }
  const rawManifest = await response.json() as { models?: unknown };
  if (!Array.isArray(rawManifest.models)) {
    throw new Error("models.json.models must be an array");
  }

  const selectedModels: PropManifestModel[] = [];
  for (const rawEntry of rawManifest.models) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as Record<string, unknown>;
    if (typeof entry.id !== "string" || !requiredIds.has(entry.id)) continue;
    if (typeof entry.url !== "string" || entry.url.length === 0) {
      throw new Error(`Registered prop model '${entry.id}' has no usable URL`);
    }
    selectedModels.push({
      id: entry.id,
      url: new URL(entry.url, resolvedManifestUrl).toString(),
      ...(typeof entry.scale === "number" ? { scale: entry.scale } : {}),
    });
  }

  const selectedIds = new Set(selectedModels.map((model) => model.id));
  const missingIds = [...requiredIds].filter((id) => !selectedIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Required registered prop models are missing: ${missingIds.join(", ")}`);
  }

  const subsetManifestUrl = URL.createObjectURL(new Blob(
    [JSON.stringify({ models: selectedModels })],
    { type: "application/json" },
  ));
  try {
    return await PropModelLibrary.load(subsetManifestUrl);
  } finally {
    URL.revokeObjectURL(subsetManifestUrl);
  }
}

type VisualQaDimensions = {
  width: number;
  depth: number;
  height: number;
};

type VisualQaPlacementSource = {
  placementId: string;
  anchorId?: string;
  assetId?: string;
  moduleId?: string;
  semanticClass: string;
  representation: string;
  materialMode: string;
  groundingGapM: number;
  supportPlacementId?: string;
  backingPlacementId?: string;
  structurallyBacked?: boolean;
  dimensionsM: VisualQaDimensions;
  shadowMode: string;
  center: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
  sourceObject: Object3D | null;
  sourceInstanceId: number | null;
};

type RuntimeVisibleAsset = Omit<
  VisualQaPlacementSource,
  "center" | "orientation" | "sourceObject" | "sourceInstanceId"
> & {
  screenAreaRatio: number;
  occluded: false;
};

const CANONICAL_VISUAL_ARTIFACT_TAGS = new Set([
  "backface",
  "duplicate-representation",
  "exposed-shell",
  "exterior-opening",
  "floor-gap",
  "interpenetration",
  "invalid-scale",
  "placeholder",
  "procedural-proxy",
  "unsupported-slab",
]);
const VISUAL_QA_OCCLUSION_EPSILON_M = 0.04;
const VISUAL_QA_MIN_SCREEN_AREA_RATIO = 1e-6;
const GROUNDED_PROP_SEMANTIC_CLASSES = new Set([
  "architecture",
  "container",
  "cover",
  "foliage",
  "furniture",
  "landmark",
]);

type RevealPhase = "warming" | "ready" | "revealing" | "active";

type QueuedCombatFeedbackEvent =
  | {
      type: "hit";
      isHeadshot: boolean;
    }
  | {
      type: "damage-number";
      worldPos: { x: number; y: number; z: number };
      damage: number;
      isHeadshot: boolean;
    }
  | {
      type: "kill";
      enemyName: string;
      isHeadshot: boolean;
    };

export type PublicAgentFeedbackEvent =
  | {
      id: number;
      type: "damage-taken";
      amount?: number;
    }
  | {
      id: number;
      type: "enemy-hit";
    }
  | {
      id: number;
      type: "kill";
    }
  | {
      id: number;
      type: "wave-complete";
    }
  | {
      id: number;
      type: "reload-start";
    }
  | {
      id: number;
      type: "reload-end";
    };

type PublicAgentFeedbackEventInput =
  | {
      type: "damage-taken";
      amount?: number;
    }
  | {
      type: "enemy-hit";
    }
  | {
      type: "kill";
    }
  | {
      type: "wave-complete";
    }
  | {
      type: "reload-start";
    }
  | {
      type: "reload-end";
    };

export type PublicAgentFeedback = {
  episodeId?: string | number;
  recentEvents?: PublicAgentFeedbackEvent[];
};

type DebugCombatFeedbackPayload = {
  isHeadshot?: boolean;
  didKill?: boolean;
  damage?: number;
  enemyName?: string;
};

type DebugBuffOrbPayload = {
  count?: number;
};

type DebugBuffVignettePayload = {
  action?: "activate" | "deactivate" | "clear";
  type?: BuffType | "rallying_cry";
  exclusive?: boolean;
};

function shouldReplaceSharedChampion(
  currentChampion: SharedChampion | null,
  nextChampion: SharedChampion | null,
): boolean {
  if (nextChampion === null) {
    return currentChampion === null;
  }
  if (currentChampion === null) {
    return true;
  }
  if (nextChampion.score !== currentChampion.score) {
    return nextChampion.score > currentChampion.score;
  }
  return nextChampion.updatedAt >= currentChampion.updatedAt;
}

function isDebugBuffType(value: string): value is BuffType {
  return (BUFF_TYPES as readonly string[]).includes(value);
}

function collectScenePerfSnapshot(worldScene: { traverse: (cb: (node: unknown) => void) => void }, viewModelScene: { traverse: (cb: (node: unknown) => void) => void } | null): ScenePerfSnapshot {
  const materials = new Set<unknown>();
  let instancedMeshes = 0;
  let instancedInstances = 0;
  let meshes = 0;
  let potentialTriangles = 0;
  const groups: ScenePerfSnapshot["groups"] = {};
  const meshCosts: ScenePerfSnapshot["topMeshes"] = [];

  const walk = (scene: { traverse: (cb: (node: unknown) => void) => void }): void => {
    scene.traverse((node) => {
      const mesh = node as {
        isMesh?: boolean;
        material?: unknown;
        isInstancedMesh?: boolean;
        count?: number;
      };
      if (!mesh.isMesh) return;
      meshes += 1;

      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          if (material) materials.add(material);
        }
      } else if (mesh.material) {
        materials.add(mesh.material);
      }

      if (mesh.isInstancedMesh) {
        instancedMeshes += 1;
        instancedInstances += Math.max(0, mesh.count ?? 0);
      }

      const object = node as Object3D & { geometry?: { index?: { count: number } | null; getAttribute?: (name: string) => { count: number } | undefined }; count?: number };
      const vertexCount = object.geometry?.index?.count
        ?? object.geometry?.getAttribute?.("position")?.count
        ?? 0;
      const instanceCount = mesh.isInstancedMesh ? Math.max(0, mesh.count ?? 0) : 1;
      const triangles = (vertexCount / 3) * instanceCount;
      potentialTriangles += triangles;
      meshCosts.push({ name: object.name || object.type, instances: instanceCount, potentialTriangles: triangles });
      const lineage: string[] = [];
      let root: Object3D | null = object;
      while (root?.parent) {
        if (root.name) lineage.unshift(root.name);
        if (root.parent.type === "Scene") break;
        root = root.parent;
      }
      const groupName = lineage.slice(0, 2).join("/") || root?.type || "unnamed";
      const group = groups[groupName] ?? { meshes: 0, instancedMeshes: 0, instances: 0, potentialTriangles: 0 };
      group.meshes += 1;
      group.instancedMeshes += mesh.isInstancedMesh ? 1 : 0;
      group.instances += instanceCount;
      group.potentialTriangles += triangles;
      groups[groupName] = group;
    });
  };

  walk(worldScene);
  if (viewModelScene) {
    walk(viewModelScene);
  }

  return {
    materials: materials.size,
    instancedMeshes,
    instancedInstances,
    meshes,
    potentialTriangles,
    groups,
    topMeshes: meshCosts.sort((left, right) => right.potentialTriangles - left.potentialTriangles).slice(0, 20),
  };
}

export type RuntimeTextState = {
  apiVersion: number;
  mode: "runtime";
  profile: GameplayProfileIdentity;
  map: {
    loaded: boolean;
    mapId: string;
    seed: number;
    spawn: "A" | "B";
    highVis: boolean;
    colliderCount: number;
    wallDetails: {
      enabled: boolean;
      density: number;
      segmentsDecorated: number;
      instanceCount: number;
    };
    error?: string;
  };
  shot: {
    active: boolean;
    id: string | null;
    cameraZoneId: string | null;
    cameraPose: {
      pos: { x: number; y: number; z: number };
      lookAt: { x: number; y: number; z: number };
      fovDeg: number;
    } | null;
  };
  render: {
    webgl: boolean;
    viewport: {
      width: number;
      height: number;
    };
    warnings: string[];
    visibleSceneTags: string[];
    visibleAssets: RuntimeVisibleAsset[];
    artifactTags: string[];
  };
  boot: {
    revealPhase: RevealPhase;
    warmupTimedOut: boolean;
    performanceSafeFallback: boolean;
    enemyVisualsReady: boolean;
    viewModelPrewarmed: boolean;
    hiddenWarmupRenderDone: boolean;
    precompiled: boolean;
    precompileTimedOut: boolean;
    textureStabilityTimedOut: boolean;
    readyAtMs: number | null;
    readyTextureCount: number | null;
    textureStableAtMs: number | null;
    stableTextureCount: number | null;
    lateTextureGrowth: number;
  };
  view: {
    camera: {
      pos: { x: number; y: number; z: number };
      yawDeg: number;
      pitchDeg: number;
      fovDeg: number;
      aspect: number;
    };
  };
  gameplay: {
    active: boolean;
    alive: boolean;
    health: number;
    pointerLocked: boolean;
    focused: boolean;
    visibility: "visible" | "hidden";
    inputFrozen: boolean;
    grounded: boolean;
    speedMps: number;
  };
  agent: {
    enabled: boolean;
    name: string;
  };
  player: {
    name: string;
    pos: { x: number; y: number; z: number };
    vel: { x: number; y: number; z: number };
    withinPlayableBounds: boolean;
    zoneId: string | null;
    zoneType: string | null;
    zoneLabel: string | null;
    collision: {
      hitX: boolean;
      hitY: boolean;
      hitZ: boolean;
      grounded: boolean;
    };
  };
  bots: {
    waveNumber: number;
    waveElapsedS: number;
    tier: number;
    aliveCount: number;
    graphNodeCount: number;
    searchPhase: "caution" | "probe" | "sweep" | "collapse" | "pinch";
    topSearchZones: Array<{
      zoneId: string;
      score: number;
      reason: string;
      lastClearedAgeS: number | null;
    }>;
    squadTasks: Array<{
      enemyId: string;
      kind: "hold" | "clear" | "contain" | "flank";
      zoneId: string;
      lane: "west" | "main" | "east";
      reason: string;
    }>;
    roleCounts: Record<"anchor" | "rifler" | "flanker" | "roamer", number>;
    preventedFriendlyFireCount: number;
    lastSeenPlayer: {
      x: number;
      y: number;
      z: number;
      timeS: number;
      zoneId: string | null;
      lane: "west" | "main" | "east";
      radiusM: number;
      confidence: number;
      sourceEnemyId?: string;
      source: "gunshot" | "footstep" | "visual" | "radio" | "hunt";
      kind?: "gunshot" | "footstep" | "visual" | "radio" | "hunt";
      precise: boolean;
      shared: boolean;
    } | null;
    lastHeardPlayer: {
      x: number;
      y: number;
      z: number;
      timeS: number;
      zoneId: string | null;
      lane: "west" | "main" | "east";
      radiusM: number;
      confidence: number;
      sourceEnemyId?: string;
      source: "gunshot" | "footstep" | "visual" | "radio" | "hunt";
      kind?: "gunshot" | "footstep" | "visual" | "radio" | "hunt";
      precise: boolean;
      shared: boolean;
    } | null;
    lastSpawn: {
      mode: "authored-fixed" | "adaptive";
      distanceFloorM: number | null;
      minDistanceToPlayerM: number | null;
      visibleCount: number;
      selectedNodeIds: string[];
      playerZoneId: string | null;
      usedAdjacentZoneFallback: boolean;
      usedVisibilityFallback: boolean;
      usedPlayerZoneEmergencyFallback: boolean;
      usedDistanceEmergencyFallback: boolean;
      correctedPlacements: number;
    } | null;
    enemies?: Array<{
      id: string;
      name: string;
      team: "player" | "enemy";
      role: "anchor" | "rifler" | "flanker" | "roamer";
      state: "HOLD" | "OVERWATCH" | "ROTATE" | "INVESTIGATE" | "PEEK" | "PRESSURE" | "FALLBACK" | "RELOAD";
      tier: number;
      health: number;
      reloading: boolean;
      mag: number;
      reserve: number;
      assignedNodeId: string | null;
      targetNodeId: string | null;
      memoryRemainingS: number;
      reactionRemainingS: number;
      burstShotsRemaining: number;
      debugReason: string;
      position: { x: number; y: number; z: number };
      movePoint: { x: number; z: number } | null;
      holdPoint: { x: number; z: number } | null;
      focusPoint: { x: number; y: number; z: number } | null;
      directSight: boolean;
      aimYawErrorDeg: number;
      directiveAgeS: number;
      targetNodeChangeCount: number;
      spawnValidation?: {
        spawnX: number;
        spawnY: number;
        spawnZ: number;
        actualZoneId: string | null;
        expectedZoneId: string | null;
        withinPlayableBounds: boolean;
        insideExpectedZone: boolean;
        blockingColliderIds: string[];
        elevated: boolean;
        valid: boolean;
        correctionKind: "none" | "same-lane-fallback" | "global-fallback";
        fallbackNodeId: string | null;
      } | null;
    }>;
  };
  landmarks: {
    visible: Array<{
      id: string;
      type: string;
      zone: string;
      distanceM: number;
      screenX: number;
      screenY: number;
    }>;
    nearest: {
      id: string;
      type: string;
      zone: string;
      distanceM: number;
    } | null;
  };
  assets: {
    floor: {
      requestedMode: string;
      activeMode: string;
      materialCount: number;
    };
    wall: {
      requestedMode: string;
      activeMode: string;
      materialCount: number;
    };
    props: {
      requestedVisualMode: string;
      activeVisualMode: string;
      modelCount: number;
    };
  };
  score: {
    current: number;
    best: number;
    lastRun?: number;
  };
  sharedChampion: SharedChampion | null;
  gameOver: {
    visible: boolean;
    finalScore: number;
    bestScore: number;
    canPlayAgain: boolean;
  };
  anchorsDebug: {
    markersVisible: boolean;
    labelsVisible: boolean;
    totalAnchors: number;
    filteredAnchors: number;
    shownLabels: number;
    filterTypes: readonly string[];
  };
  props: {
    profile: "subtle" | "medium" | "high";
    jitter: number;
    cluster: number;
    density: number;
    candidatesTotal: number;
    collidersPlaced: number;
    rejections: {
      clearZone: number;
      bounds: number;
      gapRule: number;
    };
    visualOnlyLandmarks: number;
    stallFillersPlaced: number;
  };
  weapon: {
    enabled: boolean;
    visible: boolean;
    loaded: boolean;
    alignDot: number;
    alignAngleDeg: number;
  };
  perf: {
    visible: boolean;
    fps: number;
    msPerFrame: number;
    cpuFrameMedianMs: number;
    cpuFrameSampleCount: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    materials: number;
    instancedMeshes: number;
    instancedInstances: number;
    meshes: number;
    potentialTriangles: number;
    groups: ScenePerfSnapshot["groups"];
    topMeshes: ScenePerfSnapshot["topMeshes"];
    combatFeedbackQueue: number;
    lastCombatFeedbackMs: number;
    lastKillFeedbackMs: number;
    orbCount: number;
    orbCapacity: number;
    orbSpawnMs: number;
    orbUpdateMs: number;
  };
};

export type PublicAgentRunSummary = {
  survivalTimeS: number;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  finalScore: number;
  bestScore: number;
  deathCause?: "enemy-fire" | "unknown";
};

export type PublicAgentObserveState = {
  apiVersion: number;
  contract: "public-agent-v1";
  mode: "loading-screen" | "runtime";
  profile: GameplayProfileIdentity;
  runtimeReady: boolean;
  gameplay: {
    alive: boolean;
    gameOverVisible: boolean;
  };
  health: number | null;
  ammo:
    | {
        mag: number;
        reserve: number;
        reloading: boolean;
      }
    | null;
  score: {
    current: number;
    best: number;
    lastRun: number | null;
    scope: "browser-session";
  };
  sharedChampion: SharedChampion | null;
  lastRunSummary: PublicAgentRunSummary | null;
  feedback?: PublicAgentFeedback | null;
};

export type RuntimeHandle = {
  teardown: () => void;
  getRootElement: () => HTMLDivElement;
  beginReveal: () => void;
  activate: () => void;
};

export type RuntimeBootstrapOptions = {
  controlMode?: RuntimeControlMode;
  playerName?: string;
  warmup?: RuntimeWarmupAssets | null;
};

function getAppRoot(): HTMLElement {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) throw new Error("Missing #app mount root");
  return app;
}

function createRuntimeRoot(appRoot: HTMLElement): HTMLDivElement {
  const existing = appRoot.querySelector<HTMLDivElement>("#runtime-root");
  if (existing) {
    existing.style.position = "absolute";
    existing.style.inset = "0";
    existing.style.background = "#0b0b0b";
    existing.style.overflow = "hidden";
    existing.style.userSelect = "none";
    existing.style.opacity = "0";
    existing.style.pointerEvents = "none";
    existing.style.willChange = "opacity";
    existing.style.transition = "none";
    return existing;
  }

  const runtimeRoot = document.createElement("div");
  runtimeRoot.id = "runtime-root";
  runtimeRoot.style.position = "absolute";
  runtimeRoot.style.inset = "0";
  runtimeRoot.style.background = "#0b0b0b";
  runtimeRoot.style.overflow = "hidden";
  runtimeRoot.style.userSelect = "none";
  runtimeRoot.style.opacity = "0";
  runtimeRoot.style.pointerEvents = "none";
  runtimeRoot.style.willChange = "opacity";
  runtimeRoot.style.transition = "none";
  appRoot.prepend(runtimeRoot);
  return runtimeRoot;
}

function createOverlay(root: HTMLElement, style: Partial<CSSStyleDeclaration>): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.maxWidth = "min(90vw, 640px)";
  el.style.display = "none";
  el.style.whiteSpace = "pre-wrap";
  el.style.zIndex = "20";
  Object.assign(el.style, style);
  root.append(el);
  return el;
}

function createCrosshair(root: HTMLElement): HTMLDivElement {
  const crosshair = document.createElement("div");
  crosshair.style.position = "absolute";
  crosshair.style.left = "50%";
  crosshair.style.top = "50%";
  crosshair.style.width = "18px";
  crosshair.style.height = "18px";
  crosshair.style.transform = "translate(-50%, -50%)";
  crosshair.style.pointerEvents = "none";
  crosshair.style.zIndex = "16";

  const horizontal = document.createElement("div");
  horizontal.style.position = "absolute";
  horizontal.style.left = "0";
  horizontal.style.top = "8px";
  horizontal.style.width = "18px";
  horizontal.style.height = "2px";
  horizontal.style.background = "rgba(13, 23, 38, 0.92)";
  horizontal.style.borderRadius = "1px";
  crosshair.append(horizontal);

  const vertical = document.createElement("div");
  vertical.style.position = "absolute";
  vertical.style.left = "8px";
  vertical.style.top = "0";
  vertical.style.width = "2px";
  vertical.style.height = "18px";
  vertical.style.background = "rgba(13, 23, 38, 0.92)";
  vertical.style.borderRadius = "1px";
  crosshair.append(vertical);

  root.append(crosshair);
  return crosshair;
}

function formatMapLoadError(error: unknown): string {
  if (error instanceof RuntimeMapLoadError) {
    const status = typeof error.status === "number" ? ` (status ${error.status})` : "";
    return `Failed to load map JSON\nURL: ${error.url}${status}\n${error.message}`;
  }
  if (error instanceof Error) {
    return `Failed to load map JSON\n${error.message}`;
  }
  return `Failed to load map JSON\n${String(error)}`;
}

function makeScoreStorageKey(mapId: string, boardKey: string): string {
  return `${SCORE_STORAGE_PREFIX}:${mapId}:${SCORE_RULESET_KEY}:${boardKey}`;
}

function normalizeScoreValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function splitOverlayMessages(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const PLAYER_ZONE_TYPES = new Set(["spawn_plaza", "main_lane_segment", "side_hall", "connector", "cut"]);

function findCurrentZone(
  spec: RuntimeBlockoutSpec | null,
  x: number,
  y: number,
  z: number,
): { id: string; type: string; label: string } | null {
  if (!spec) return null;

  let bestMatch: { id: string; type: string; label: string; area: number; verticalDelta: number } | null = null;
  const surfacesById = new Map((spec.traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  for (const zone of spec.zones) {
    if (!PLAYER_ZONE_TYPES.has(zone.type)) continue;
    const insideX = x >= zone.rect.x && x <= zone.rect.x + zone.rect.w;
    const insideZ = z >= zone.rect.y && z <= zone.rect.y + zone.rect.h;
    if (!insideX || !insideZ) continue;

    const area = zone.rect.w * zone.rect.h;
    const surface = zone.surfaceId ? surfacesById.get(zone.surfaceId) : undefined;
    let surfaceY = spec.defaults.floor_height;
    if (surface?.kind === "flat") {
      surfaceY = surface.elevationM;
    } else if (surface?.kind === "ramp") {
      const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
      const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
      const axisCoord = surface.axis === "x" ? x : z;
      const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, 1e-6)));
      surfaceY = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t;
    }
    const verticalDelta = Math.abs(y - surfaceY);
    if (
      !bestMatch
      || verticalDelta < bestMatch.verticalDelta - 0.05
      || (Math.abs(verticalDelta - bestMatch.verticalDelta) <= 0.05 && area < bestMatch.area)
    ) {
      bestMatch = {
        id: zone.id,
        type: zone.type,
        label: zone.label,
        area,
        verticalDelta,
      };
    }
  }

  if (!bestMatch) return null;
  return {
    id: bestMatch.id,
    type: bestMatch.type,
    label: bestMatch.label,
  };
}

function isLandmarkAnchor(anchor: RuntimeAnchor): boolean {
  const normalized = anchor.type.toLowerCase();
  return normalized === "landmark" || normalized === "hero_landmark";
}

function collectLandmarkState(
  anchors: readonly RuntimeAnchor[] | null,
  visibleAnchorIds: ReadonlySet<string>,
  camera: PerspectiveCamera,
  viewportWidth: number,
  viewportHeight: number,
): RuntimeTextState["landmarks"] {
  if (!anchors || anchors.length === 0) {
    return {
      visible: [],
      nearest: null,
    };
  }

  const scratch = new Vector3();
  const visible: RuntimeTextState["landmarks"]["visible"] = [];
  let nearest: RuntimeTextState["landmarks"]["nearest"] = null;

  for (const anchor of anchors) {
    if (!isLandmarkAnchor(anchor)) continue;
    if (!visibleAnchorIds.has(anchor.id)) continue;

    const world = designToWorldVec3(anchor.pos);
    world.y += Math.max(0.3, (anchor.heightM ?? 1) * 0.5);
    const dx = world.x - camera.position.x;
    const dy = world.y - camera.position.y;
    const dz = world.z - camera.position.z;
    const distanceM = Math.hypot(dx, dy, dz);

    if (!nearest || distanceM < nearest.distanceM) {
      nearest = {
        id: anchor.id,
        type: anchor.type,
        zone: anchor.zone,
        distanceM,
      };
    }

    scratch.set(world.x, world.y, world.z).project(camera);
    const inClipSpace = scratch.z >= -1 && scratch.z <= 1;
    const inViewport = Math.abs(scratch.x) <= 1 && Math.abs(scratch.y) <= 1;
    if (!inClipSpace || !inViewport) continue;

    visible.push({
      id: anchor.id,
      type: anchor.type,
      zone: anchor.zone,
      distanceM,
      screenX: ((scratch.x + 1) * 0.5) * viewportWidth,
      screenY: ((1 - scratch.y) * 0.5) * viewportHeight,
    });
  }

  visible.sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id));

  return {
    visible: visible.slice(0, 6),
    nearest,
  };
}

function collectVisibleAnchorIds(
  anchors: readonly RuntimeAnchor[] | null,
  renderedAnchorIds: readonly string[],
  sceneRoot: Object3D,
  camera: PerspectiveCamera,
): Set<string> {
  const visible = new Set<string>();
  if (!anchors || anchors.length === 0) return visible;
  const rendered = new Set(renderedAnchorIds);
  const target = new Vector3();
  const projected = new Vector3();
  const direction = new Vector3();
  const raycaster = new Raycaster();
  raycaster.camera = camera;
  for (const anchor of anchors) {
    if (!rendered.has(anchor.id)) continue;
    const world = designToWorldVec3(anchor.pos);
    target.set(world.x, world.y + Math.max(0.3, (anchor.heightM ?? 1) * 0.5), world.z);
    projected.copy(target).project(camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue;
    const distanceM = target.distanceTo(camera.position);
    const targetRadiusM = Math.max(0.55, (anchor.widthM ?? 0) * 0.5, (anchor.heightM ?? 0) * 0.5);
    direction.copy(target).sub(camera.position).normalize();
    raycaster.set(camera.position, direction);
    raycaster.near = 0.05;
    raycaster.far = distanceM + targetRadiusM;
    const firstHit = raycaster.intersectObject(sceneRoot, true)[0];
    if (!firstHit || firstHit.distance >= distanceM - targetRadiusM) visible.add(anchor.id);
  }
  return visible;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function serializePickedColor(color: Color | undefined): {
  hex: string;
  linearRgb: { r: number; g: number; b: number };
} | null {
  if (!color) return null;
  return {
    hex: `#${color.getHexString()}`,
    linearRgb: { r: color.r, g: color.g, b: color.b },
  };
}

function serializePickedTexture(value: unknown): {
  present: boolean;
  name: string | null;
  source: string | null;
} {
  if (!isRecordValue(value)) {
    return { present: false, name: null, source: null };
  }
  const rawImage = isRecordValue(value.image)
    ? value.image
    : isRecordValue(value.source) && isRecordValue(value.source.data)
      ? value.source.data
      : null;
  const source = rawImage
    ? typeof rawImage.currentSrc === "string"
      ? rawImage.currentSrc
      : typeof rawImage.src === "string"
        ? rawImage.src
        : null
    : null;
  return {
    present: true,
    name: typeof value.name === "string" && value.name.length > 0 ? value.name : null,
    source,
  };
}

function canonicalArtifactTag(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  return CANONICAL_VISUAL_ARTIFACT_TAGS.has(normalized) ? normalized : null;
}

function collectDeclaredArtifactTags(object: Object3D, target: Set<string>): void {
  const qa = isRecordValue(object.userData.visualQa) ? object.userData.visualQa : null;
  const values = [
    object.userData.visualQaArtifactTags,
    object.userData.artifactTags,
    qa?.artifactTags,
  ];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const candidate of value) {
      const tag = canonicalArtifactTag(candidate);
      if (tag) target.add(tag);
    }
  }
}

function resolveArchitectureShadowMode(mesh: Object3D, raw: unknown): string {
  if (mesh.castShadow && mesh.receiveShadow) return "cast_receive";
  if (mesh.castShadow) return "cast_only";
  if (mesh.receiveShadow) return "receive_only";
  if (raw === "cast") return "cast_only";
  if (raw === "receive") return "receive_only";
  return typeof raw === "string" && raw.length > 0 ? raw : "none";
}

function resolveSurfaceHeightAt(
  spec: RuntimeBlockoutSpec,
  x: number,
  z: number,
): number {
  let highest = Number.NEGATIVE_INFINITY;
  for (const surface of spec.traversalSurfaces ?? []) {
    if (
      x < surface.rect.x
      || x > surface.rect.x + surface.rect.w
      || z < surface.rect.y
      || z > surface.rect.y + surface.rect.h
    ) {
      continue;
    }
    if (surface.kind === "flat") {
      highest = Math.max(highest, surface.elevationM);
      continue;
    }
    const start = surface.axis === "x" ? surface.rect.x : surface.rect.y;
    const length = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const coordinate = surface.axis === "x" ? x : z;
    const t = Math.max(0, Math.min(1, (coordinate - start) / Math.max(length, 1e-6)));
    highest = Math.max(
      highest,
      surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t,
    );
  }
  return Number.isFinite(highest) ? highest : spec.defaults.floor_height;
}

function collectVisualQaPlacementSources(
  game: Game,
  spec: RuntimeBlockoutSpec | null,
): { placements: VisualQaPlacementSource[]; declaredArtifactTags: Set<string> } {
  game.scene.updateMatrixWorld(true);
  const placements: VisualQaPlacementSource[] = [];
  const declaredArtifactTags = new Set<string>();
  const namedPropRoots = new Map<string, Object3D>();
  const instancedPlacementIds = new Set<string>();
  const instanceMatrix = new Matrix4();
  const worldMatrix = new Matrix4();
  const worldPosition = new Vector3();
  const worldScale = new Vector3();
  const worldQuaternion = game.camera.quaternion.clone();

  game.scene.traverse((object) => {
    if (!object.visible) return;
    collectDeclaredArtifactTags(object, declaredArtifactTags);
    if (object.name.startsWith("v3-dressing-")) {
      namedPropRoots.set(object.name.slice("v3-dressing-".length), object);
    }
    const rawInstances = object.userData.visualQaInstances;
    if (!Array.isArray(rawInstances)) return;
    const isInstancedMesh = object instanceof InstancedMesh;
    const batchedObject = object as Object3D & {
      isBatchedMesh?: boolean;
      getMatrixAt?: (index: number, target: Matrix4) => Matrix4;
    };
    const isBatchedMesh = batchedObject.isBatchedMesh === true && typeof batchedObject.getMatrixAt === "function";
    if (!isInstancedMesh && !isBatchedMesh) return;
    const instanceCount = isInstancedMesh ? Math.min(rawInstances.length, object.count) : rawInstances.length;
    for (let index = 0; index < instanceCount; index += 1) {
      const raw = rawInstances[index];
      if (!isRecordValue(raw)) continue;
      const placementId = typeof raw.placementId === "string" ? raw.placementId : "";
      const moduleId = typeof raw.moduleId === "string" ? raw.moduleId : "";
      const anchorId = typeof raw.anchorId === "string" ? raw.anchorId : undefined;
      const assetId = typeof raw.assetId === "string" ? raw.assetId : undefined;
      const semanticClass = typeof raw.semanticClass === "string" ? raw.semanticClass : "";
      const representation = typeof raw.representation === "string" ? raw.representation : "module";
      const materialMode = typeof raw.materialMode === "string" ? raw.materialMode : "debug";
      const backingPlacementId = typeof raw.backingPlacementId === "string" && raw.backingPlacementId.trim().length > 0
        ? raw.backingPlacementId.trim()
        : undefined;
      const structurallyBacked = typeof raw.structurallyBacked === "boolean"
        ? raw.structurallyBacked
        : undefined;
      const dimensions = isRecordValue(raw.dimensions) ? raw.dimensions : null;
      if (!placementId || !moduleId || !semanticClass || !dimensions) {
        declaredArtifactTags.add("invalid-scale");
        continue;
      }
      const width = dimensions.x;
      const height = dimensions.y;
      const depth = dimensions.z;
      if (
        typeof width !== "number"
        || typeof depth !== "number"
        || typeof height !== "number"
      ) {
        declaredArtifactTags.add("invalid-scale");
        continue;
      }

      if (isInstancedMesh) object.getMatrixAt(index, instanceMatrix);
      else batchedObject.getMatrixAt!(index, instanceMatrix);
      worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
      worldMatrix.decompose(worldPosition, worldQuaternion, worldScale);
      const rawGroundingGap = raw.groundingGapM ?? raw.groundedGapM;
      placements.push({
        placementId,
        ...(anchorId ? { anchorId } : {}),
        ...(assetId ? { assetId } : {}),
        moduleId,
        semanticClass,
        representation,
        materialMode,
        groundingGapM: typeof rawGroundingGap === "number" ? rawGroundingGap : 0,
        ...(backingPlacementId ? { backingPlacementId } : {}),
        ...(typeof structurallyBacked === "boolean" ? { structurallyBacked } : {}),
        dimensionsM: { width, depth, height },
        shadowMode: resolveArchitectureShadowMode(object, raw.shadowMode),
        center: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
        orientation: {
          x: worldQuaternion.x,
          y: worldQuaternion.y,
          z: worldQuaternion.z,
          w: worldQuaternion.w,
        },
        sourceObject: object,
        sourceInstanceId: index,
      });
      instancedPlacementIds.add(placementId);
    }
  });

  const renderedPropPlacements = game.getRenderedPropPlacements();
  const supportCandidates: VisualSupportCandidate[] = renderedPropPlacements.flatMap((placement) => {
    const sourceObject = namedPropRoots.get(placement.placementId);
    if (!sourceObject) return [];
    const bounds = new Box3().setFromObject(sourceObject);
    if (bounds.isEmpty()) return [];
    return [{ placementId: placement.placementId, bounds }];
  });

  for (const placement of renderedPropPlacements) {
    if (instancedPlacementIds.has(placement.placementId)) continue;
    const sourceObject = namedPropRoots.get(placement.placementId) ?? null;
    const sourceBounds = sourceObject ? new Box3().setFromObject(sourceObject) : null;
    let groundingGapM = placement.groundingGapM;
    let supportPlacementId: string | undefined;
    if (spec && GROUNDED_PROP_SEMANTIC_CLASSES.has(placement.semanticClass)) {
      const bottomY = sourceBounds && !sourceBounds.isEmpty()
        ? sourceBounds.min.y
        : placement.center.y - placement.dimensionsM.height * 0.5;
      const surfaceY = resolveSurfaceHeightAt(spec, placement.center.x, placement.center.z);
      const signedGapM = bottomY - surfaceY;
      const support = sourceBounds && signedGapM > 0.03
        ? resolveVisualSupport(placement.placementId, sourceBounds, supportCandidates)
        : null;
      if (support) {
        groundingGapM = support.gapM;
        supportPlacementId = support.supportPlacementId;
      } else {
        if (signedGapM < -0.03) declaredArtifactTags.add("interpenetration");
        groundingGapM = Math.max(0, signedGapM);
      }
    }
    const sourceOrientation = sourceObject
      ? sourceObject.getWorldQuaternion(new Quaternion())
      : new Quaternion();
    placements.push({
      placementId: placement.placementId,
      anchorId: placement.anchorId,
      assetId: placement.assetId,
      moduleId: placement.moduleId,
      semanticClass: placement.semanticClass,
      representation: placement.representation,
      materialMode: placement.materialMode,
      groundingGapM,
      ...(supportPlacementId ? { supportPlacementId } : {}),
      dimensionsM: placement.dimensionsM,
      shadowMode: placement.shadowMode,
      center: placement.center,
      orientation: {
        x: sourceOrientation.x,
        y: sourceOrientation.y,
        z: sourceOrientation.z,
        w: sourceOrientation.w,
      },
      sourceObject,
      sourceInstanceId: null,
    });
  }

  return { placements, declaredArtifactTags };
}

function hasValidVisualDimensions(dimensions: VisualQaDimensions): boolean {
  return [dimensions.width, dimensions.depth, dimensions.height].every((value) => (
    Number.isFinite(value) && value > 0
  ));
}

function projectedScreenAreaRatio(
  placement: VisualQaPlacementSource,
  camera: PerspectiveCamera,
): number {
  if (!hasValidVisualDimensions(placement.dimensionsM)) return 0;
  const { width, depth, height } = placement.dimensionsM;
  const halfX = width * 0.5;
  const halfY = height * 0.5;
  const halfZ = depth * 0.5;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let projectedCornerCount = 0;
  const worldCorner = new Vector3();
  const cameraCorner = new Vector3();
  const placementCenter = new Vector3(
    placement.center.x,
    placement.center.y,
    placement.center.z,
  );
  const orientation = new Quaternion(
    placement.orientation.x,
    placement.orientation.y,
    placement.orientation.z,
    placement.orientation.w,
  );

  for (const dx of [-halfX, halfX]) {
    for (const dy of [-halfY, halfY]) {
      for (const dz of [-halfZ, halfZ]) {
        worldCorner
          .set(dx, dy, dz)
          .applyQuaternion(orientation)
          .add(placementCenter);
        cameraCorner.copy(worldCorner).applyMatrix4(camera.matrixWorldInverse);
        if (-cameraCorner.z <= camera.near) continue;
        worldCorner.project(camera);
        if (!Number.isFinite(worldCorner.x) || !Number.isFinite(worldCorner.y)) continue;
        minX = Math.min(minX, worldCorner.x);
        minY = Math.min(minY, worldCorner.y);
        maxX = Math.max(maxX, worldCorner.x);
        maxY = Math.max(maxY, worldCorner.y);
        projectedCornerCount += 1;
      }
    }
  }

  if (projectedCornerCount === 0) return 0;
  const clippedMinX = Math.max(-1, minX);
  const clippedMaxX = Math.min(1, maxX);
  const clippedMinY = Math.max(-1, minY);
  const clippedMaxY = Math.min(1, maxY);
  if (clippedMaxX <= clippedMinX || clippedMaxY <= clippedMinY) return 0;
  return Math.min(1, ((clippedMaxX - clippedMinX) * (clippedMaxY - clippedMinY)) / 4);
}

function placementVisibilitySamples(placement: VisualQaPlacementSource): Vector3[] {
  const { width, depth, height } = placement.dimensionsM;
  const center = new Vector3(placement.center.x, placement.center.y, placement.center.z);
  const orientation = new Quaternion(
    placement.orientation.x,
    placement.orientation.y,
    placement.orientation.z,
    placement.orientation.w,
  );
  const sample = (x: number, y: number, z: number): Vector3 => (
    new Vector3(x, y, z).applyQuaternion(orientation).add(center)
  );
  const samples = [
    center.clone(),
    sample(0, height * 0.35, 0),
    sample(-width * 0.35, 0, 0),
    sample(width * 0.35, 0, 0),
    sample(0, 0, -depth * 0.35),
    sample(0, 0, depth * 0.35),
  ];
  // A long architectural volume can be center-occluded while one of its end
  // faces still cuts a large, obvious silhouette against the sky. Sampling
  // only the center axes made those visible end caps disappear from QA
  // telemetry. Probe the inset corners at mid-height and near the roofline so
  // the reported placement identity follows the pixels a reviewer can see.
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      samples.push(
        sample(width * 0.42 * xSign, 0, depth * 0.42 * zSign),
        sample(width * 0.42 * xSign, height * 0.38, depth * 0.42 * zSign),
      );
    }
  }
  return samples;
}

function rayReachesPlacement(
  placement: VisualQaPlacementSource,
  sceneRoot: Object3D,
  camera: PerspectiveCamera,
  raycaster: Raycaster,
): Object3D[] {
  const direction = new Vector3();
  const reachedObjects = new Set<Object3D>();
  raycaster.camera = camera;
  const firstSceneHit = () => raycaster.intersectObject(sceneRoot, true).find((hit) => (
    (hit.object as Object3D & { isSprite?: boolean }).isSprite !== true
  ));
  for (const target of placementVisibilitySamples(placement)) {
    direction.copy(target).sub(camera.position);
    const distanceM = direction.length();
    if (distanceM <= camera.near) continue;
    direction.multiplyScalar(1 / distanceM);
    raycaster.set(camera.position, direction);
    raycaster.near = camera.near;

    const half = placement.dimensionsM;
    const supportM = (
      Math.abs(direction.x) * half.width
      + Math.abs(direction.y) * half.height
      + Math.abs(direction.z) * half.depth
    ) * 0.5;
    raycaster.far = distanceM + supportM + VISUAL_QA_OCCLUSION_EPSILON_M;

    if (placement.sourceObject) {
      const ownHit = raycaster.intersectObject(placement.sourceObject, true).find((hit) => (
        placement.sourceInstanceId === null
        || hit.instanceId === placement.sourceInstanceId
        || (hit as typeof hit & { batchId?: number }).batchId === placement.sourceInstanceId
      ));
      if (!ownHit) continue;
      const sceneHit = firstSceneHit();
      if (!sceneHit || ownHit.distance <= sceneHit.distance + VISUAL_QA_OCCLUSION_EPSILON_M) {
        reachedObjects.add(ownHit.object);
      }
      continue;
    }

    const nearBoundM = Math.max(camera.near, distanceM - supportM - VISUAL_QA_OCCLUSION_EPSILON_M);
    const farBoundM = distanceM + supportM + VISUAL_QA_OCCLUSION_EPSILON_M;
    const sceneHit = firstSceneHit();
    if (sceneHit && sceneHit.distance >= nearBoundM && sceneHit.distance <= farBoundM) {
      reachedObjects.add(sceneHit.object);
    }
  }
  return [...reachedObjects];
}

function collectRenderableObjects(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): Object3D[] {
  if (!placement.sourceObject) return [...reachedObjects];
  const rendered: Object3D[] = [];
  placement.sourceObject.traverse((object) => {
    if ((object as Object3D & { isMesh?: boolean }).isMesh) rendered.push(object);
  });
  return rendered.length > 0 ? rendered : [...reachedObjects];
}

function actualShadowMode(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): string {
  const rendered = collectRenderableObjects(placement, reachedObjects);
  const casts = rendered.some((object) => object.castShadow);
  const receives = rendered.some((object) => object.receiveShadow);
  if (casts && receives) return "cast_receive";
  if (casts) return "cast_only";
  if (receives) return "receive_only";
  return rendered.length > 0 ? "none" : placement.shadowMode;
}

function actualMaterialMode(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): string {
  if (placement.materialMode === "debug") return "debug";
  let hasPbr = false;
  let hasLitStandard = false;
  let hasUnlit = false;
  const rendered = collectRenderableObjects(placement, reachedObjects);
  for (const object of rendered) {
    const materialValue = (object as Object3D & { material?: unknown }).material;
    const materials = Array.isArray(materialValue) ? materialValue : [materialValue];
    for (const material of materials) {
      if (!isRecordValue(material)) continue;
      if (material.isMeshPhysicalMaterial === true || material.isMeshStandardMaterial === true) {
        hasPbr = true;
      } else if (material.isMeshBasicMaterial === true) {
        hasUnlit = true;
      } else if (
        material.isMeshLambertMaterial === true
        || material.isMeshPhongMaterial === true
        || material.isMeshToonMaterial === true
      ) {
        hasLitStandard = true;
      }
    }
  }
  if (hasPbr) return "pbr";
  if (hasLitStandard) return "standard";
  if (hasUnlit) return "unlit";
  return placement.materialMode === "blockout" ? "standard" : placement.materialMode;
}

function collectVisibleAssetTelemetry(
  game: Game,
  spec: RuntimeBlockoutSpec | null,
  qaTargets: ReadonlySet<string>,
): { visibleAssets: RuntimeVisibleAsset[]; artifactTags: string[] } {
  game.camera.updateMatrixWorld(true);
  game.camera.updateProjectionMatrix();
  const { placements, declaredArtifactTags } = collectVisualQaPlacementSources(game, spec);
  const artifactTags = new Set(declaredArtifactTags);
  const raycaster = new Raycaster();
  const visibleAssets: RuntimeVisibleAsset[] = [];
  const placementCounts = new Map<string, number>();
  for (const placement of placements) {
    placementCounts.set(placement.placementId, (placementCounts.get(placement.placementId) ?? 0) + 1);
  }

  for (const placement of placements) {
    if (!hasValidVisualDimensions(placement.dimensionsM)) {
      artifactTags.add("invalid-scale");
      continue;
    }
    const screenAreaRatio = projectedScreenAreaRatio(placement, game.camera);
    if (screenAreaRatio < VISUAL_QA_MIN_SCREEN_AREA_RATIO) continue;
    const isExplicitTarget = [
      placement.placementId,
      placement.assetId,
      placement.moduleId,
    ].some((value) => typeof value === "string" && qaTargets.has(value));
    const requiresArtifactProbe = (
      placement.representation === "placeholder"
      || placement.representation === "procedural-proxy"
      || placement.structurallyBacked === false
      || (placementCounts.get(placement.placementId) ?? 0) > 1
    );
    // Full-scene raycasts are the expensive part of state serialization. The
    // capture harness sends each shot's required telemetry selectors, while
    // artifact-risk candidates are always probed. Healthy unrelated placements
    // do not need dozens of whole-scene raycasts merely to prove they exist.
    if (!isExplicitTarget && !requiresArtifactProbe) continue;
    const reachedObjects = rayReachesPlacement(placement, game.scene, game.camera, raycaster);
    if (reachedObjects.length === 0) continue;
    visibleAssets.push({
      placementId: placement.placementId,
      ...(placement.anchorId ? { anchorId: placement.anchorId } : {}),
      ...(placement.assetId ? { assetId: placement.assetId } : {}),
      ...(placement.moduleId ? { moduleId: placement.moduleId } : {}),
      semanticClass: placement.semanticClass,
      representation: placement.representation,
      materialMode: actualMaterialMode(placement, reachedObjects),
      groundingGapM: placement.groundingGapM,
      ...(placement.supportPlacementId ? { supportPlacementId: placement.supportPlacementId } : {}),
      ...(placement.backingPlacementId ? { backingPlacementId: placement.backingPlacementId } : {}),
      ...(typeof placement.structurallyBacked === "boolean"
        ? { structurallyBacked: placement.structurallyBacked }
        : {}),
      dimensionsM: placement.dimensionsM,
      shadowMode: actualShadowMode(placement, reachedObjects),
      screenAreaRatio,
      occluded: false,
    });
  }

  visibleAssets.sort((left, right) => (
    left.placementId.localeCompare(right.placementId)
    || (left.assetId ?? "").localeCompare(right.assetId ?? "")
    || (left.moduleId ?? "").localeCompare(right.moduleId ?? "")
    || left.representation.localeCompare(right.representation)
  ));

  const visibleByPlacement = new Map<string, number>();
  for (const asset of visibleAssets) {
    visibleByPlacement.set(asset.placementId, (visibleByPlacement.get(asset.placementId) ?? 0) + 1);
    if (asset.representation === "placeholder") artifactTags.add("placeholder");
    if (asset.representation === "procedural-proxy") artifactTags.add("procedural-proxy");
  }
  if ([...visibleByPlacement.values()].some((count) => count > 1)) {
    artifactTags.add("duplicate-representation");
  }
  const facadeBackingFailures = auditVisibleFacadeBacking(visibleAssets, placements);
  if (facadeBackingFailures.length > 0) {
    artifactTags.add("exposed-shell");
  }

  return {
    visibleAssets,
    artifactTags: [...artifactTags].filter((tag) => CANONICAL_VISUAL_ARTIFACT_TAGS.has(tag)).sort(),
  };
}

function readBestScore(storageKey: string): number {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return normalizeScoreValue(parsed);
  } catch {
    return 0;
  }
}

function writeBestScore(storageKey: string, value: number): void {
  try {
    window.sessionStorage.setItem(storageKey, String(normalizeScoreValue(value)));
  } catch {
    // Ignore storage errors in constrained browser contexts.
  }
}

export async function bootstrapRuntime(options: RuntimeBootstrapOptions = {}): Promise<RuntimeHandle> {
  const appRoot = getAppRoot();
  const runtimeRoot = createRuntimeRoot(appRoot);
  const parsedUrlParams = parseRuntimeUrlParams(window.location.search);
  const qaAssetProfile = resolveQaAssetProfile(window.location.search);
  const deterministicQa = qaAssetProfile !== null;
  const qaTelemetryTargets = new Set(
    (new URLSearchParams(window.location.search).get("qaTargets") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const shadowsEnabled = new URLSearchParams(window.location.search).get("shadows") !== "0";
  const controlMode = options.controlMode ?? parsedUrlParams.controlMode;
  const playerName = options.playerName ?? parsedUrlParams.playerName;
  if (!playerName) {
    throw new Error("Runtime requires a validated player name.");
  }
  const runtimeParams = {
    ...parsedUrlParams,
    controlMode,
    playerName,
  };
  const mobile = isMobileDevice();
  const gameplayProfileResolution = resolveGameplayProfileIdentity({
    controlMode: runtimeParams.controlMode,
    isMobile: mobile,
  });
  if (!gameplayProfileResolution.supported) {
    throw new Error("Agent gameplay is available on desktop only.");
  }
  const gameplayProfileIdentity = gameplayProfileResolution.identity;
  const gameplayTuning = getGameplayTuning(gameplayProfileIdentity.profileId);
  if (mobile && runtimeParams.controlMode === "human" && !gameplayTuning.touch.enabled) {
    throw new Error(`Gameplay profile ${gameplayProfileIdentity.profileId} does not enable touch input.`);
  }
  const isLocalHostRuntime = isLocalhostHostname(window.location.hostname);

  /**
   * Manual-playtest assists: unlimited health and a boosted run speed, for a
   * person poking at a local build by hand.
   *
   * These are OPT-IN (`?god=1`) and never apply otherwise. They used to switch
   * themselves on for any localhost human run, which meant anything driving the
   * game — an agent, an LLM, a Playwright spec, or a person who just forgot —
   * was silently invincible and 50% faster than production. Every judgement
   * made in that state about difficulty, damage, hit registration or movement
   * feel was measuring a build no player will ever run.
   *
   * Also hard-off under automation, so a spec cannot re-enable them by passing
   * the flag, and hard-off anywhere but localhost.
   */
  const isAutomatedRuntime = isAutomatedClient();
  // Local QA advances the simulation clock faster than wall time. Those
  // synthetic runs must not enter the competitive record pipeline: they would
  // fail the server's wall-time anti-cheat bound (and could pollute the dev
  // board). Production agent sessions remain eligible, as do manual localhost
  // playtests.
  const sharedChampionRunSubmissionEnabled = !(isLocalHostRuntime && isAutomatedRuntime);
  const manualPlaytestAssistsEnabled =
    isLocalHostRuntime
    && !isAutomatedRuntime
    && runtimeParams.controlMode === "human"
    && runtimeParams.unlimitedHealthExplicit === true;
  const effectiveUnlimitedHealth = manualPlaytestAssistsEnabled;
  const warmupAssets = options.warmup ?? null;
  const warmupTimedOut = warmupAssets?.timedOut === true;
  const performanceSafeFallback = warmupTimedOut;
  const bootStartedAtMs = performance.now();

  const warningOverlay = createOverlay(runtimeRoot, {
    left: "16px",
    top: "16px",
    borderRadius: "10px",
    padding: "8px 12px",
    border: "1px solid rgba(85, 74, 15, 0.48)",
    background: "rgba(255, 242, 200, 0.92)",
    color: "#4f4300",
    fontSize: "12px",
    lineHeight: "1.35",
  });

  const errorOverlay = createOverlay(runtimeRoot, {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "12px",
    padding: "12px 14px",
    border: "1px solid rgba(138, 12, 12, 0.45)",
    background: "rgba(255, 236, 236, 0.96)",
    color: "#730f0f",
    fontSize: "13px",
    lineHeight: "1.35",
  });
  const crosshair = createCrosshair(runtimeRoot);
  const perfHud = new PerfHud(runtimeRoot, runtimeParams.perf);
  const ammoHud = new AmmoHud(runtimeRoot);
  const healthHud = new HealthHud(runtimeRoot);
  healthHud.setGodModeEnabled(effectiveUnlimitedHealth);
  const hitVignette = new HitVignette(runtimeRoot);
  const deathScreen = new DeathScreen(runtimeRoot, gameplayTuning.flow.deathRestart);
  const hitMarker = new HitMarker(crosshair);
  const scoreHud = mobile
    ? new MobileScoreStrip(runtimeRoot)
    : new ScoreHud(runtimeRoot, runtimeParams.playerName);
  const killFeed = new KillFeed(runtimeRoot, {
    anchorEl: scoreHud.root,
    gapPx: 8,
  });
  const roundEndScreen = new RoundEndScreen(runtimeRoot);
  const timerHud = new TimerHud(runtimeRoot);
  const headshotBanner = new HeadshotBanner(runtimeRoot);
  const damageNumbers = new DamageNumbers(runtimeRoot);
  const pauseMenu = new PauseMenu(runtimeRoot);
  const howToPlayOverlay = new HowToPlayOverlay(runtimeRoot, gameplayTuning);
  const controlsOverlay = new ControlsOverlay(runtimeRoot);
  const fadeOverlay = new FadeOverlay(runtimeRoot);
  killFeed.prewarm(4);
  damageNumbers.prewarm(4);

  let mapLoaded = false;
  let mapErrorMessage: string | null = null;
  let shotActive = false;
  let shotId: string | null = null;
  let inputFrozen = false;
  let respawnInProgress = false;

  let mapAssets: RuntimeMapAssets | null = null;
  try {
    mapAssets = await loadMap(runtimeParams.mapId);
    mapLoaded = true;
  } catch (error) {
    mapErrorMessage = formatMapLoadError(error);
    errorOverlay.textContent = mapErrorMessage;
      errorOverlay.style.display = "block";
  }

  const effectiveFloorQuality = mobile ? "1k" : runtimeParams.floorQuality;
  const qaAssetPlan = qaAssetProfile && mapAssets
    ? createQaAssetPlan(mapAssets, qaAssetProfile, {
        floorPbr: runtimeParams.floorMode === "pbr" && !performanceSafeFallback && !mobile,
        wallPbr: runtimeParams.wallMode === "pbr" && !performanceSafeFallback && !mobile,
        wallDetails: runtimeParams.wallDetails,
        bazaarProps: MAP_PROPS_ENABLED && runtimeParams.propVisuals === "bazaar",
        doorModels: DOOR_MODELS_ENABLED && !mobile,
        textureTier: effectiveFloorQuality === "1k" ? "1k" : "2k",
      })
    : null;
  const qaAssetTracker = qaAssetPlan
    ? new QaAssetReadinessTracker(
        qaAssetPlan,
        resolveQaAssetTimeoutMs(window.location.search),
      )
    : null;
  if (qaAssetTracker) {
    window.__qa_capture_state = () => qaAssetTracker.state();
  }
  const qaDirectTextureResult = qaAssetTracker && qaAssetPlan
    ? preloadQaDirectTextures(qaAssetPlan, qaAssetTracker).then(
        () => null,
        (error: unknown) => error,
      )
    : null;

  const resolvedShot = mapAssets ? resolveShot(mapAssets.shots, runtimeParams.shot) : null;
  const overviewShotAtBoot =
    (resolvedShot?.cameraPose?.pos.y ?? 0) > OVERVIEW_VIEWMODEL_DISABLE_HEIGHT_M;

  setEnemyVisualModelStreamingEnabled(
    !deterministicQa
      && !performanceSafeFallback
      && (warmupAssets?.enemyVisualsReady ?? true),
  );

  const renderer = new Renderer(runtimeRoot, {
    highVis: runtimeParams.highVis,
    lightingPreset: runtimeParams.lightingPreset,
    ao: (performanceSafeFallback || mobile || overviewShotAtBoot) ? false : runtimeParams.ao,
    post: (performanceSafeFallback || mobile || overviewShotAtBoot) ? false : runtimeParams.post,
    maxPixelRatio: mobile ? 1.0 : undefined,
    disableShadows: mobile || overviewShotAtBoot || !shadowsEnabled,
  });
  let disposed = false;
  let qaFrameCounter = 0;
  let qaLastFrameAt: number | null = null;
  let qaLastStateSerializationAt: number | null = null;
  let qaStateSerializationInProgress = false;
  let shadowWarmupFrames = 0;
  const weaponAudio = new WeaponAudio();
  // Keep tooling silent. A person watching an LLM or a spec drive the game
  // should not get gunfire and ambience out of their speakers, and agent mode
  // is by definition nobody sitting at the keyboard. Real players match none of
  // these conditions, so production audio is unaffected. ?audio=1 forces sound
  // back on for an agent run, ?audio=0 forces it off anywhere.
  const audioForced = new URLSearchParams(window.location.search).get("audio");
  const audioSuppressedByDefault =
    isAutomatedClient() || runtimeParams.controlMode === "agent";
  const audioMuted = audioForced === "1"
    ? false
    : audioForced === "0" || audioSuppressedByDefault;
  weaponAudio.setMuted(audioMuted);
  if (audioMuted) {
    console.info("[runtime:audio] muted (automated or agent-driven session)");
  }
  weaponAudio.prewarmCombatFeedback();
  const viewModelEnabled = runtimeParams.vm && !performanceSafeFallback && !deterministicQa;
  let viewModel: ViewModelInstance | null = warmupAssets?.viewModel ?? null;
  let viewModelVisible = false;

  const appendWarning = (message: string): void => {
    if (warningOverlay.textContent && warningOverlay.textContent.length > 0) {
      warningOverlay.textContent = `${warningOverlay.textContent}\n${message}`;
    } else {
      warningOverlay.textContent = message;
    }
    warningOverlay.style.display = "block";
  };

  // Without WebGL the canvas simply never draws. The HUD is DOM, so it still
  // appears over a black void and the player is left with a game that looks
  // broken and says nothing. Tell them what happened instead.
  //
  // Only a human actually trying to play needs this. Headless QA and agent runs
  // routinely have no GPU and assert on a clean console, and their harnesses
  // read runtime state rather than pixels, so warning there is pure noise.
  const webglFailureIsUserFacing =
    runtimeParams.controlMode === "human"
    && !deterministicQa
    && navigator.webdriver !== true;
  if (!renderer.hasWebGL && webglFailureIsUserFacing) {
    appendWarning(
      "This browser or device could not start WebGL, so the game cannot render.\n"
      + "Try enabling hardware acceleration, updating your graphics driver, or using a different browser.",
    );
    console.error("[runtime:boot] WebGL unavailable — rendering is disabled");
  }

  renderer.setContextLossHandlers({
    onLost: () => {
      if (webglFailureIsUserFacing) {
        appendWarning("Lost the graphics context. Attempting to restore…");
      }
    },
    onRestored: () => {
      if (webglFailureIsUserFacing) {
        warningOverlay.textContent = "";
        warningOverlay.style.display = "none";
      }
    },
  });

  if (performanceSafeFallback) {
    appendWarning("Runtime warmup timed out. Using performance-safe fallback before spawn.");
  }
  if (!deterministicQa && warmupAssets && !warmupAssets.enemyVisualsReady && !mobile) {
    appendWarning("Enemy model warmup failed. Using fallback enemy meshes to avoid late asset streaming.");
  }

  let resolvedFloorMode = PBR_FLOORS_ENABLED ? runtimeParams.floorMode : "blockout";
  if (performanceSafeFallback || mobile) {
    resolvedFloorMode = "blockout";
  }
  let floorMaterials: FloorMaterialLibrary | null = null;
  const qaFloorRequestIds = qaAssetPlan?.floorMaterialIds.map(qaFloorMaterialRequestId) ?? [];
  if (PBR_FLOORS_ENABLED && resolvedFloorMode === "pbr") {
    try {
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaFloorRequestIds) qaAssetTracker.start(requestId);
        const floorIds = new Set(qaAssetPlan.floorMaterialIds);
        floorMaterials = await FloorMaterialLibrary.load(FLOOR_MANIFEST_URL, {
          materialIds: floorIds,
          requestObserver: qaAssetTracker.observer,
        });
        const resolutions = await floorMaterials.preloadAllTextures(effectiveFloorQuality, {
          materialIds: floorIds,
          allowUpscale: false,
          requestObserver: qaAssetTracker.observer,
        });
        qaAssetTracker.addResolvedTextures(resolutions.map((resolution) => ({
          kind: "floor",
          materialId: resolution.materialId,
          requestedTier: resolution.requestedQuality,
          resolvedTier: resolution.resolvedQuality,
          urls: resolution.urls,
        })));
        for (const requestId of qaFloorRequestIds) qaAssetTracker.complete(requestId);
      } else {
        floorMaterials = warmupAssets?.floorMaterials ?? await FloorMaterialLibrary.load(FLOOR_MANIFEST_URL);
        await floorMaterials.preloadAllTextures(effectiveFloorQuality);
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaFloorRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("floor-material-pack", error);
        throw new Error(
          `[qa-assets] floor material pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      floorMaterials = null;
      resolvedFloorMode = "blockout";
      appendWarning(
        `Failed to load floor PBR pack. Falling back to blockout floors.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let resolvedWallMode = PBR_WALLS_ENABLED ? runtimeParams.wallMode : "blockout";
  if (performanceSafeFallback || mobile) {
    resolvedWallMode = "blockout";
  }
  let wallMaterials: WallMaterialLibrary | null = null;
  const qaWallRequestIds = qaAssetPlan?.wallMaterialIds.map(qaWallMaterialRequestId) ?? [];
  if (PBR_WALLS_ENABLED && resolvedWallMode === "pbr") {
    try {
      const wallQuality = effectiveFloorQuality === "1k" ? "1k" : "2k";
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaWallRequestIds) qaAssetTracker.start(requestId);
        const wallIds = new Set(qaAssetPlan.wallMaterialIds);
        wallMaterials = await WallMaterialLibrary.load(WALL_MANIFEST_URL, {
          materialIds: wallIds,
          requestObserver: qaAssetTracker.observer,
        });
        const resolutions = await wallMaterials.preloadAllTextures(wallQuality, {
          materialIds: wallIds,
          allowUpscale: false,
          requestObserver: qaAssetTracker.observer,
        });
        qaAssetTracker.addResolvedTextures(resolutions.map((resolution) => ({
          kind: "wall",
          materialId: resolution.materialId,
          requestedTier: resolution.requestedQuality,
          resolvedTier: resolution.resolvedQuality,
          urls: resolution.urls,
        })));
        for (const requestId of qaWallRequestIds) qaAssetTracker.complete(requestId);
      } else {
        wallMaterials = warmupAssets?.wallMaterials ?? await WallMaterialLibrary.load(WALL_MANIFEST_URL);
        await wallMaterials.preloadAllTextures(wallQuality);
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaWallRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("wall-material-pack", error);
        throw new Error(
          `[qa-assets] wall material pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      wallMaterials = null;
      resolvedWallMode = "blockout";
      appendWarning(
        `Failed to load wall PBR pack. Falling back to blockout walls.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const resolvedPropVisuals = MAP_PROPS_ENABLED ? runtimeParams.propVisuals : "blockout";
  let propModels: PropModelLibrary | null = null;
  const qaPropRequestIds = qaAssetPlan?.propModelIds.map(qaPropModelRequestId) ?? [];
  if (resolvedPropVisuals === "bazaar") {
    try {
      const mobileModelIds = requiredMobilePropModelIds(mapAssets);
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaPropRequestIds) qaAssetTracker.start(requestId);
        propModels = await PropModelLibrary.load(PROP_MANIFEST_URL, {
          modelIds: new Set(qaAssetPlan.propModelIds),
          concurrency: 4,
          requestObserver: qaAssetTracker.observer,
        });
        for (const requestId of qaPropRequestIds) qaAssetTracker.complete(requestId);
      } else {
        propModels = mobile && mobileModelIds.size > 0
          ? await loadRegisteredPropModelSubset(PROP_MANIFEST_URL, mobileModelIds)
          : await PropModelLibrary.load(PROP_MANIFEST_URL);
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaPropRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("prop-model-pack", error);
        throw new Error(
          `[qa-assets] prop model pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      appendWarning(
        `Failed to load the CC0 bazaar prop pack. Final-mode map readiness will fail rather than render placeholders.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let doorModels: PropModelLibrary | null = null;
  const qaDoorRequestIds = qaAssetPlan?.doorModelIds.map(qaDoorModelRequestId) ?? [];
  if (DOOR_MODELS_ENABLED && !mobile) {
    try {
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaDoorRequestIds) qaAssetTracker.start(requestId);
        doorModels = await PropModelLibrary.load(DOOR_MANIFEST_URL, {
          modelIds: new Set(qaAssetPlan.doorModelIds),
          concurrency: 4,
          quality: "1k",
          requestObserver: qaAssetTracker.observer,
        });
        for (const requestId of qaDoorRequestIds) qaAssetTracker.complete(requestId);
      } else {
        doorModels = await PropModelLibrary.load(DOOR_MANIFEST_URL);
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaDoorRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("door-model-pack", error);
        throw new Error(
          `[qa-assets] door model pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      appendWarning(
        `Failed to load door model pack. Doors will use flat void panels.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (qaDirectTextureResult) {
    const directTextureError = await qaDirectTextureResult;
    if (directTextureError !== null) {
      throw new Error(
        `[qa-assets] direct texture preload failed; capture is blocked: ${
          directTextureError instanceof Error ? directTextureError.message : String(directTextureError)
        }`,
      );
    }
  }

  if (viewModelEnabled && viewModel) {
    viewModel.setAspect(renderer.getAspect());
  }
  if (viewModelEnabled && !viewModel) {
    try {
      const { Ak47ViewModel } = await import("./weapons/Ak47ViewModel");
      const nextViewModel = new Ak47ViewModel({
        vmDebug: runtimeParams.vmDebug && runtimeParams.debug,
      });
      nextViewModel.setAspect(renderer.getAspect());
      await nextViewModel.load();
      viewModel = nextViewModel;
    } catch (error: unknown) {
      const message = `Failed to load AK47 viewmodel\n${error instanceof Error ? error.message : String(error)}`;
      appendWarning(message);
      viewModel?.dispose();
      viewModel = null;
    }
  }

  const bootTelemetry = {
    revealPhase: "warming" as RevealPhase,
    warmupTimedOut,
    performanceSafeFallback,
    enemyVisualsReady: warmupAssets?.enemyVisualsReady ?? false,
    viewModelPrewarmed: Boolean(warmupAssets?.viewModel),
    hiddenWarmupRenderDone: false,
    precompiled: false,
    precompileTimedOut: false,
    textureStabilityTimedOut: false,
    readyAtMs: null as number | null,
    readyTextureCount: null as number | null,
    textureStableAtMs: null as number | null,
    stableTextureCount: null as number | null,
    lateTextureGrowth: 0,
  };
  let trackedBootTextureCount: number | null = null;
  let lastBootTextureChangeAtMs: number | null = null;

  const markBootReady = (): void => {
    const now = performance.now();
    const perfInfo = renderer.getPerfInfo();
    bootTelemetry.readyAtMs = now - bootStartedAtMs;
    bootTelemetry.readyTextureCount = perfInfo.textures;
    if (bootTelemetry.textureStableAtMs === null) {
      bootTelemetry.textureStableAtMs = bootTelemetry.readyAtMs;
      bootTelemetry.stableTextureCount = perfInfo.textures;
    }
    trackedBootTextureCount = perfInfo.textures;
    lastBootTextureChangeAtMs = now;
  };

  const updateBootTextureTelemetry = (): void => {
    if (bootTelemetry.readyAtMs === null || bootTelemetry.textureStableAtMs !== null) return;

    const now = performance.now();
    const textureCount = renderer.getPerfInfo().textures;
    if (trackedBootTextureCount === null) {
      trackedBootTextureCount = textureCount;
      lastBootTextureChangeAtMs = now;
      return;
    }

    if (textureCount !== trackedBootTextureCount) {
      if (textureCount > trackedBootTextureCount) {
        bootTelemetry.lateTextureGrowth += textureCount - trackedBootTextureCount;
      }
      trackedBootTextureCount = textureCount;
      lastBootTextureChangeAtMs = now;
    }

    if (lastBootTextureChangeAtMs !== null && now - lastBootTextureChangeAtMs >= TEXTURE_STABLE_WINDOW_MS) {
      bootTelemetry.textureStableAtMs = now - bootStartedAtMs;
      bootTelemetry.stableTextureCount = trackedBootTextureCount;
    }
  };

  const waitForHiddenTextureStability = async (): Promise<void> => {
    // Texture uploads may keep the browser main thread busy even when a timer
    // deadline is armed. Sampling once and revealing is the only truly bounded
    // policy; late texture growth continues to be tracked after activation.
    const perfInfo = renderer.getPerfInfo();
    bootTelemetry.textureStabilityTimedOut = true;
    bootTelemetry.textureStableAtMs = performance.now() - bootStartedAtMs;
    bootTelemetry.stableTextureCount = perfInfo.textures;
    console.info(`[runtime:boot] texture-stability wait bypassed; revealing with ${perfInfo.textures} resident textures`);
  };

  shotActive = resolvedShot?.active ?? false;
  shotId = resolvedShot?.id ?? null;
  inputFrozen = resolvedShot?.freezeInput ?? false;
  runtimeRoot.dataset.beautyShot = shotActive ? "true" : "false";

  let bulletHoles: BulletHoleManager | null = null;

  const game = new Game({
    gameplayTuning,
    controlMode: runtimeParams.controlMode,
    mapId: runtimeParams.mapId,
    seedOverride: runtimeParams.seed,
    propChaos: runtimeParams.propChaos,
    floorMode: resolvedFloorMode,
    wallMode: resolvedWallMode,
    wallDetails: runtimeParams.wallDetails,
    wallDetailDensity: runtimeParams.wallDetailDensity,
    floorQuality: effectiveFloorQuality,
    lightingPreset: runtimeParams.lightingPreset,
    environmentLighting: runtimeParams.environmentLighting,
    createEnvironmentMap: (scene, position) => renderer.createPmremEnvironment(scene, position),
    floorMaterials,
    wallMaterials,
    propVisuals: resolvedPropVisuals,
    propModels,
    doorModels,
    freezeInput: inputFrozen,
    spawn: runtimeParams.spawn,
    debug: runtimeParams.debug,
    highVis: runtimeParams.highVis,
    mountEl: runtimeRoot,
    anchorsDebug: {
      showMarkers: runtimeParams.anchors,
      showLabels: runtimeParams.labels,
      anchorTypes: runtimeParams.anchorTypes,
    },
    onWeaponShot: (shot) => {
      viewModel?.triggerShotFx();
      weaponAudio.playAk47Shot();
      game.reportPlayerGunshot();
      waveStats.shotsFired++;
      runStats.shotsFired++;
      sharedChampionRunLifecycle.recordShotFired();

      // Enemy hit detection: re-raycast against enemy AABBs to see if the bullet
      // hit one. This must reuse the bullet's own ray (spread and bloom applied)
      // and must run even when the bullet struck no world geometry — a shot into
      // open sky still passes through anything standing in its path.
      {
        const camPos = game.camera.position;
        const shotDir = camFwdScratch.set(shot.direction.x, shot.direction.y, shot.direction.z);
        const worldHitDist = shot.travelDistance;
        const enemyHit = game.checkEnemyRaycastHit(camPos, shotDir, worldHitDist + 0.1);
        if (enemyHit.hit && enemyHit.distance <= worldHitDist + 0.05) {
          const { damage, isHeadshot } = resolveEnemyHitDamage(enemyHit.hitY, enemyHit.feetY);
          waveStats.shotsHit++;
          runStats.shotsHit++;
          sharedChampionRunLifecycle.recordShotHit();
          pushPublicFeedback({ type: "enemy-hit" });
          game.applyDamageToEnemy(enemyHit.enemyId, damage, isHeadshot);
          enqueueCombatFeedback({ type: "hit", isHeadshot });
          enqueueCombatFeedback({
            type: "damage-number",
            worldPos: { x: enemyHit.hitX, y: enemyHit.hitY, z: enemyHit.hitZ },
            damage,
            isHeadshot,
          });
        } else if (shot.hit && shot.hitPoint && shot.hitNormal) {
          // Bullet hit world surface (wall/floor/prop), not an enemy — spawn decal
          bulletHoles?.spawn(shot.hitPoint, shot.hitNormal);
        }

        // Check if bullet hit a buff orb (pick up by shooting)
        const orbHit = buffManager.checkRaycastHit(
          camPos.x, camPos.y, camPos.z,
          shotDir.x, shotDir.y, shotDir.z,
          worldHitDist + 0.5,
        );
        if (orbHit.hit) {
          buffManager.collectOrbAtIndex(orbHit.orbIndex);
        }
      }
    },
    // Only a hand-driven local playtest gets the boosted traversal speed;
    // everything else runs at the production RUN_SPEED_MPS so movement, enemy
    // lead and time-to-cover all behave the way a real player experiences them.
    ...(manualPlaytestAssistsEnabled ? { playerRunSpeedMps: 9 } : {}),
    unlimitedHealth: effectiveUnlimitedHealth,
    ...(runtimeParams.debug ? { onTogglePerfHud: () => perfHud.toggle() } : {}),
  });
  game.setEnemyNameplatesVisible(!shotActive);
  game.setEnemyVisualsVisible(!shotActive);

  // Bullet hole decals on world surfaces
  bulletHoles = new BulletHoleManager(game.scene, runtimeParams.seed ?? 1);

  // ── Buff system ─────────────────────────────────────────────────────────────
  const buffManager = new BuffManager(game.scene, {
    seed: runtimeParams.seed ?? 1,
    tuning: gameplayTuning.buffs,
  });
  const buffHud = new BuffHud(runtimeRoot);
  const buffTextHud = new BuffTextHud(runtimeRoot, gameplayTuning);
  const buffVignette = new BuffVignette(runtimeRoot);

  const resetAllBuffModifiers = (): void => {
    game.setPlayerSpeedMultiplier(1.0);
    game.setWeaponFireInterval(0.1);
    game.setWeaponReloadSpeed(1.0);
    game.setWeaponUnlimitedAmmo(false);
    game.setOvershield(0);
    buffVignette.clear();
  };

  const clearAllBuffRuntimeState = (): void => {
    buffManager.clearAllBuffs();
    resetAllBuffModifiers();
    buffHud.clear();
    buffTextHud.clear();
  };

  buffManager.setOnBuffActivated((type, context) => {
    switch (type) {
      case "speed_boost":
        game.setPlayerSpeedMultiplier(gameplayTuning.buffs.speedMultiplier);
        break;
      case "rapid_fire":
        game.setWeaponFireInterval(gameplayTuning.buffs.rapidFireIntervalS);
        game.setWeaponReloadSpeed(gameplayTuning.buffs.rapidReloadSpeedMultiplier);
        break;
      case "unlimited_ammo":
        game.setWeaponUnlimitedAmmo(gameplayTuning.buffs.unlimitedAmmo);
        break;
      case "health_boost":
        // Wave-start reapplication restores setter-based modifiers after the
        // weapon reset, but must not refill a shield depleted during combat.
        if (context !== "reapplied") {
          game.setOvershield(gameplayTuning.buffs.shieldHealth);
        }
        break;
    }
    if (context !== "reapplied") {
      buffVignette.activate(type);
    }
  });

  buffManager.setOnBuffExpired((type) => {
    switch (type) {
      case "speed_boost":
        game.setPlayerSpeedMultiplier(1.0);
        break;
      case "rapid_fire":
        game.setWeaponFireInterval(0.1);
        game.setWeaponReloadSpeed(1.0);
        break;
      case "unlimited_ammo":
        game.setWeaponUnlimitedAmmo(false);
        break;
      case "health_boost":
        game.setOvershield(0);
        break;
    }
    buffVignette.deactivate(type);
  });

  buffManager.setOnBuffPickedUp((type, result) => {
    if (result === "refreshed") {
      buffVignette.refresh(type);
    }
  });

  // Wire enemy gunshot audio (quiet distant shots from AI enemies)
  game.setEnemyAudio(weaponAudio);

  // Landing impact: heavy thud + camera bob when player hits the ground
  game.setLandingCallback(() => {
    weaponAudio.playLanding();
  });

  // Weapon audio callbacks: reload sounds + dry-fire click
  game.setWeaponCallbacks({
    onReloadStart: () => {
      weaponAudio.playReloadStart();
      pushPublicFeedback({ type: "reload-start" });
    },
    onReloadEnd: () => {
      weaponAudio.playReloadEnd();
      pushPublicFeedback({ type: "reload-end" });
    },
    onReloadCancel: () => weaponAudio.stopReload(),
    onDryFire: () => weaponAudio.playDryFire(),
  });

  let pointerLock: PointerLockController | null = null;
  const shouldRequestPointerLock = !(isLocalHostRuntime && isAutomatedRuntime);

  // Pause menu: resume by re-requesting pointer lock (desktop) or just unfreezing (mobile).
  // Local automation has no valid browser root for pointer lock and drives the
  // deterministic simulation directly, so it intentionally skips this call.
  pauseMenu.onResume = () => {
    if (runtimeParams.controlMode === "human" && !mobile && shouldRequestPointerLock) {
      pointerLock?.requestLock();
    }
  };
  if (mobile) {
    pauseMenu.setMobileMode(true);
  }
  pauseMenu.onReturnToLobby = () => {
    const lobbyUrl = `${window.location.origin}${window.location.pathname}`;
    window.location.href = lobbyUrl;
  };
  pauseMenu.onShowHowToPlay = () => {
    howToPlayOverlay.show();
  };
  pauseMenu.onShowControls = () => {
    controlsOverlay.show();
  };

  // Wire kill feed
  // Wire kill events → feed + ding + score counter
  const TOTAL_ENEMIES = ENEMIES_PER_WAVE;
  let pendingKillHeal = 0;
  let pendingKillReserveAmmo = 0;
  scoreHud.setTotal(TOTAL_ENEMIES);
  game.setEnemyKillCallback((name, isHeadshot, deathPos, enemyIndex, isWaveClosingKill) => {
    enqueueCombatFeedback({
      type: "kill",
      enemyName: name,
      isHeadshot,
    });
    pushPublicFeedback({ type: "kill" });
    pendingKillHeal += gameplayTuning.player.economy.killHeal;
    pendingKillReserveAmmo += gameplayTuning.player.economy.killReserveAmmo;
    buffManager.recordKill(isHeadshot);
    buffManager.onEnemyDeath(enemyIndex, deathPos, {
      waveClosing: isWaveClosingKill && gameplayTuning.buffs.waveCarry.bankWaveClosingDrop,
    });
  });

  // New wave → keep run score, but reset per-wave breakdowns and timing.
  game.setEnemyNewWaveCallback((_wave) => {
    scoreHud.setTotal(TOTAL_ENEMIES);
    roundEndScreen.hide();
    roundEndShowing = false;
    roundEndElapsedS = 0;
    waveElapsedS = 0;
    timerHud.reset();
    timerHud.start();
    // Reset per-wave stats
    waveStats.kills = 0;
    waveStats.totalEnemies = TOTAL_ENEMIES;
    waveStats.shotsFired = 0;
    waveStats.shotsHit = 0;
    waveStats.headshots = 0;

    // Carry behavior is part of the immutable tuning identity, so future
    // profile revisions do not need mode-specific branches here.
    buffManager.onNewWave();
    const waveCarry = gameplayTuning.buffs.waveCarry;
    if (waveCarry.activeBuffs) {
      buffManager.reapplyActiveBuffEffects();
    } else {
      clearAllBuffRuntimeState();
    }
    if (!waveCarry.droppedOrbs) {
      buffManager.clearOrbs();
    }
    if (waveCarry.bankWaveClosingDrop) {
      buffManager.activateBankedWaveClosingBuff();
    }
    if (buffManager.checkRallyingCry()) {
      // Previous wave was 10/10 headshots — defer activation so player
      // sees the round-end screen disappear before buffs kick in
      pendingRallyingCry = true;
      rallyingCryDelayS = 0.5;
    }
  });

  // Death screen restart handler — fires on both click and auto-countdown.
  // Fade to black → reset the run → fade back in for a smooth transition.
  deathScreen.onRespawn = () => {
    // Restart is a real user gesture; profiles that release pointer lock on
    // death reacquire it before entering asynchronous fade callbacks, where
    // browsers no longer consider the request gesture-authorized.
    if (
      gameplayTuning.flow.deathRestart.releasePointerLock
      && runtimeParams.controlMode === "human"
      && !mobile
      && shouldRequestPointerLock
    ) {
      pointerLock?.requestLock();
    }
    respawnInProgress = true;
    fadeOverlay.fadeOut(0.18, () => {
      // Reset happens while the screen is black so the restart feels atomic.
      pendingAgentActions.length = 0;
      combatFeedbackQueue.length = 0;
      pendingKillHeal = 0;
      pendingKillReserveAmmo = 0;
      lastCombatFeedbackMs = 0;
      lastKillFeedbackMs = 0;
      game.restartRun();
      clearAllBuffRuntimeState();
      // Per-wave headshot progress is run-scoped: without this a 10/10 wave in
      // the previous run grants a free Rallying Cry on the next run's wave 2.
      buffManager.resetWaveProgress();
      roundEndScreen.hide();
      roundEndShowing = false;
      roundEndElapsedS = 0;
      pendingRallyingCry = false;
      rallyingCryDelayS = 0;
      killFeed.clear();
      headshotBanner.clear();
      hitMarker.clear();
      hitVignette.clear();
      damageNumbers.clear();
      bulletHoles?.clear();
      scoreHud.reset();
      sharedChampionFinalizedForCurrentRun = false;
      waveElapsedS = 0;
      timerHud.reset();
      timerHud.start();
      waveStats.kills = 0;
      waveStats.totalEnemies = TOTAL_ENEMIES;
      waveStats.shotsFired = 0;
      waveStats.shotsHit = 0;
      waveStats.headshots = 0;
      runStats.kills = 0;
      runStats.shotsFired = 0;
      runStats.shotsHit = 0;
      runStats.headshots = 0;
      runHeadshotsPerWave = [];
      runActiveTimeS = 0;
      lastDamageCause = null;
      previousHealth = game.getPlayerHealth();
      footstepTimerS = 0;
      wasAlive = true;
      feedbackEpisodeId += 1;
      resetPublicFeedback();
      beginSharedChampionRun();
      game.setFreezeInput(false);
      pauseMenu.hide();
      howToPlayOverlay.hide();
      controlsOverlay.hide();
      respawnInProgress = false;
      // Brief hold at black, then fade back in
      setTimeout(() => {
        fadeOverlay.fadeIn(0.3);
      }, 60);
    });
  };

  // The human boot gate below serves real players in real browsers. It must
  // never run for deterministic QA (own readiness tracker), automation
  // (Playwright specs and smokes boot autostart=human without qa=1 and their
  // wall-clock budgets assume the historical fast boot), authored-shot runs
  // (review cameras, including tens-of-seconds overview frames), or software
  // rasterizers, where whole-scene compiles and renders have monopolized the
  // main thread in the past.
  // ?bootGate=1 opts automation back in. Without it this gate — the one every
  // real player goes through — is unreachable from any test by construction,
  // so nothing would catch it hanging or regressing. It only ever makes boot do
  // more work behind the loading overlay, so it is safe to expose.
  const forceHumanBootGate =
    new URLSearchParams(window.location.search).get("bootGate") === "1";
  const humanBootGateEligible =
    mapAssets !== null
    && !deterministicQa
    && runtimeParams.controlMode === "human"
    && runtimeParams.shot === null
    && (navigator.webdriver !== true || forceHumanBootGate)
    && (!isLikelySoftwareGl(renderer) || forceHumanBootGate);

  if (
    humanBootGateEligible
    && !performanceSafeFallback
    && !(warmupAssets?.enemyVisualsReady ?? false)
  ) {
    // Warmup did not finish the enemy model template (it may have failed
    // outright rather than timed out). Enemies spawn during the map build
    // below, so settle the shared template first — bodies must never morph
    // from capsules to the model mid-combat. Bounded like every boot stage.
    const templateReady = await Promise.race<boolean>([
      preloadEnemyVisualAssets().then(() => true, () => false),
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), ENEMY_TEMPLATE_BOOT_TIMEOUT_MS);
      }),
    ]);
    // The earlier streaming decision at boot saw enemyVisualsReady=false and
    // disabled model streaming; a successful settle here supersedes it —
    // without this, the retry would resolve a template no enemy ever uses.
    setEnemyVisualModelStreamingEnabled(templateReady);
    if (!templateReady && !warmupAssets) {
      // warmupAssets != null already produced the fallback-mesh warning.
      appendWarning("Enemy model unavailable. Using fallback enemy meshes.");
    }
  }

  if (mapAssets) {
    game.setMapSpecs(mapAssets.blockout, mapAssets.anchors);
    shadowWarmupFrames = 0;
  }
  let restoreOverviewRenderLod = (): void => {};
  if (overviewShotAtBoot) {
    // At overview altitude sub-2.5 m meshes are only a few pixels wide, yet the
    // uncullable whole-map draw list makes the deterministic review camera take
    // tens of seconds per frame. Preserve all landmark assemblies and macro
    // architecture while omitting only sub-pixel detail for this debug view.
    restoreOverviewRenderLod = applyOverviewRenderLod(game.scene);
  }
  if (resolvedShot?.cameraPose) {
    game.setCameraPose(resolvedShot.cameraPose);
  }
  if (resolvedShot?.warning) {
    warningOverlay.textContent = resolvedShot.warning;
    warningOverlay.style.display = "block";
  }

  // Let any async map assignments resolve before we draw the first visible gameplay frame.
  await Promise.resolve();
  syncViewportNow();
  renderer.requestShadowUpdate();

  const overviewCameraAtBoot = game.camera.position.y > OVERVIEW_VIEWMODEL_DISABLE_HEIGHT_M;
  viewModelVisible = Boolean(viewModelEnabled && viewModel && !overviewCameraAtBoot);
  crosshair.style.display = overviewCameraAtBoot ? "none" : "block";
  ammoHud.setVisible(!overviewCameraAtBoot);
  healthHud.setVisible(!overviewCameraAtBoot);
  timerHud.setVisible(!overviewCameraAtBoot);

  if (viewModel) {
    viewModel.updateFromMainCamera(game.camera, 0);
    const weaponDebug = viewModel.getAlignmentSnapshot();
    game.setWeaponDebugSnapshot(weaponDebug.loaded, weaponDebug.dot, weaponDebug.angleDeg);
  } else {
    game.setWeaponDebugSnapshot(false, -1, 180);
  }

  // Do not synchronously render the full authored map behind the loading
  // overlay. On software/headless GPUs that call can monopolize the page for
  // longer than the entire boot budget and cannot be interrupted by a timer.
  // The first visible frame is scheduled only after the runtime is marked
  // ready, so readiness and fallback controls remain responsive.
  bootTelemetry.hiddenWarmupRenderDone = false;

  // Pre-warm buff orb materials so shader variants compile during warmup (not on first orb spawn)
  const disposeWarmupOrb = warmupOrbMaterials(game.scene, game.camera);

  // The staged overview frame already visits every map-visible shader. Running
  // compileAsync again from that camera asks Three to traverse the entire bazaar
  // at once and can leave deterministic top-down review shots stuck in warmup.
  // Gameplay cameras keep the explicit precompile so their first reveal remains
  // hitch-free; overview shots proceed to the texture-stability renders below.
  if (!overviewCameraAtBoot && !mapAssets) {
    try {
      if (syncViewportIfChanged()) {
        renderStagedFrame();
      }
      console.info("[runtime:boot] scene precompile started");
      let compileTimeoutId = 0;
      const compileResult = await Promise.race<"compiled" | "timed-out">([
        renderer.compileSceneAsync(
          game.scene,
          game.camera,
          viewModel?.viewModelScene ?? null,
          viewModel?.viewModelCamera ?? null,
          viewModelVisible,
        ).then(() => "compiled" as const),
        new Promise<"timed-out">((resolve) => {
          compileTimeoutId = window.setTimeout(() => resolve("timed-out"), SCENE_COMPILE_TIMEOUT_MS);
        }),
      ]);
      window.clearTimeout(compileTimeoutId);
      bootTelemetry.precompiled = compileResult === "compiled";
      bootTelemetry.precompileTimedOut = compileResult === "timed-out";
      console.info(
        compileResult === "compiled"
          ? "[runtime:boot] scene precompile completed"
          : `[runtime:boot] scene precompile expired after ${SCENE_COMPILE_TIMEOUT_MS}ms; revealing without blocking`,
      );
    } catch (error) {
      appendWarning(
        `Shader precompile failed. Continuing without compile warmup.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else if (mapAssets && humanBootGateEligible) {
    // Live human play in a real browser on hardware GL: pay the whole
    // first-frame cost here, behind the loading overlay, so the reveal frame
    // renders at full speed with no shader-compile freeze and no texture
    // pop-in. QA, automation, shot runs, and software rasterizers are excluded
    // by humanBootGateEligible and keep the historical fast boot below.
    try {
      console.info("[runtime:boot] human map readiness gate started");
      // 1. Let stragglers started through the default loading manager settle
      //    (prop/door GLB textures load fire-and-forget during the map build).
      const assetSettle = await waitForPendingAssetLoads(MAP_ASSET_SETTLE_TIMEOUT_MS);
      // 2. Compile every shader variant the scene needs.
      let compileTimeoutId = 0;
      const compileResult = await Promise.race<"compiled" | "timed-out">([
        renderer.compileSceneAsync(
          game.scene,
          game.camera,
          viewModel?.viewModelScene ?? null,
          viewModel?.viewModelCamera ?? null,
          viewModelVisible,
        ).then(() => "compiled" as const),
        new Promise<"timed-out">((resolve) => {
          compileTimeoutId = window.setTimeout(() => resolve("timed-out"), MAP_SCENE_COMPILE_TIMEOUT_MS);
        }),
      ]);
      window.clearTimeout(compileTimeoutId);
      bootTelemetry.precompiled = compileResult === "compiled";
      bootTelemetry.precompileTimedOut = compileResult === "timed-out";
      // 3. Upload every referenced texture to the GPU in overlay-friendly
      //    batches instead of letting the first visible frames pay for it.
      const webglRenderer = renderer.getWebGLRenderer();
      let uploadedTextures = 0;
      if (webglRenderer) {
        const sceneTextures = collectSceneTextures(game.scene);
        const viewModelTextures = viewModel?.viewModelScene
          ? collectSceneTextures(viewModel.viewModelScene)
          : [];
        uploadedTextures = await uploadTexturesInBatches(webglRenderer, [
          ...sceneTextures,
          ...viewModelTextures,
        ]);
      }
      // 4. One hidden render primes the remaining lazy paths (static shadow
      //    map, sky, sprites) so the reveal frame has nothing left to build.
      renderer.renderWithViewModel(
        game.scene,
        game.camera,
        viewModel?.viewModelScene ?? null,
        viewModel?.viewModelCamera ?? null,
        viewModelVisible,
      );
      bootTelemetry.hiddenWarmupRenderDone = true;
      console.info(
        `[runtime:boot] human map readiness gate done (assets=${assetSettle}, compile=${compileResult}, texturesUploaded=${uploadedTextures})`,
      );
    } catch (error) {
      appendWarning(
        `Map readiness gate failed. Revealing anyway.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else if (mapAssets) {
    // Deterministic QA and agent runs keep the historical behavior: their
    // readiness tracking and boot budgets live in the QA harness, and three's
    // compileAsync has monopolized software GPUs here in the past.
    console.info("[runtime:boot] scene precompile skipped for staged map scene");
  }

  // Clean up warmup orb now that shaders are compiled
  disposeWarmupOrb();

  syncViewportIfChanged();
  await waitForHiddenTextureStability();
  markBootReady();
  bootTelemetry.revealPhase = "ready";
  console.info(`[runtime:boot] runtime marked ready at ${bootTelemetry.readyAtMs?.toFixed(1) ?? "n/a"}ms`);

  let touchInput: TouchInputManager | null = null;
  let mobileTouchHud: MobileTouchHud | null = null;
  let mobileOrientationGuard: MobileOrientationGuard | null = null;
  let mobileFlashUpdate: ((dt: number, health: number, mag: number) => void) | null = null;

  if (
    mobile
    && gameplayTuning.touch.enabled
    && !inputFrozen
    && runtimeParams.controlMode === "human"
  ) {
    // ── Mobile: touch controls instead of pointer lock ──────────────
    game.setMobileActive(true);
    touchInput = new TouchInputManager(runtimeRoot, {
      joystickRadiusPx: gameplayTuning.touch.joystickRadiusPx,
      moveDeadzone: gameplayTuning.touch.moveDeadzone,
      aimAssistEnabled: gameplayTuning.touch.aimAssist.enabled,
    });
    mobileTouchHud = new MobileTouchHud(runtimeRoot, touchInput);
    mobileOrientationGuard = new MobileOrientationGuard(runtimeRoot);
    void mobileOrientationGuard.requestLandscape();

    // Pause button wiring
    mobileTouchHud.onPause = () => {
      if (game.getIsDead() || inputFrozen) return;
      if (pauseMenu.isVisible()) {
        pauseMenu.hide();
        pauseMenu.onResume?.();
      } else {
        pauseMenu.show();
      }
    };

    // Unlock audio on first touch (since there's no pointer lock gesture)
    const unlockAudioOnTouch = (): void => {
      weaponAudio.ensureResumedFromGesture();
      weaponAudio.startAmbient();
      runtimeRoot.removeEventListener("touchstart", unlockAudioOnTouch);
    };
    runtimeRoot.addEventListener("touchstart", unlockAudioOnTouch, { passive: true });

    // ── PUBG-style compact HUD for iPhone landscape ──────────────
    // Effective viewport: ~667x325 (SE) to ~932x380 (Pro Max)
    // Design: strip away panel chrome, use thin bars + floating text
    // Auto-opacity: 0.45 base, flash to 1.0 on state change for 1.5s

    const MOBILE_BASE_OPACITY = "0.6";
    const MOBILE_FLASH_OPACITY = "1";
    const MOBILE_FLASH_DURATION_S = 1.5;
    let mobileHealthFlashTimer = 0;
    let mobileAmmoFlashTimer = 0;
    let mobilePrevHealth = 100;
    let mobilePrevMag = 30;

    // ── Health: thin edge bar + small number, no panel ──────────
    const hRoot = healthHud.root;
    Object.assign(hRoot.style, {
      bottom: `calc(4px + env(safe-area-inset-bottom, 0px))`,
      left: `calc(16px + env(safe-area-inset-left, 0px))`,
      padding: "0",
      background: "transparent",
      border: "none",
      borderRadius: "3px",
      boxShadow: "none",
      backdropFilter: "none",
      transform: "none",
      minWidth: "120px",
      width: "120px",
      opacity: MOBILE_BASE_OPACITY,
      transition: "opacity 0.3s ease",
    });
    // Hide "HP" label (child 1), shrink numeric (child 2), widen bar (child 3)
    const hChildren = Array.from(hRoot.children) as HTMLElement[];
    if (hChildren[1]) hChildren[1].style.display = "none"; // "HP" label
    if (hChildren[2]) {
      Object.assign(hChildren[2].style, {
        fontSize: "18px",
        fontWeight: "700",
        marginBottom: "3px",
        minWidth: "0",
        textShadow: "0 1px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.5)",
      });
    }
    if (hChildren[3]) (hChildren[3] as HTMLElement).style.height = "6px";

    // ── Ammo: floating text, no panel ───────────────────────────
    const aRoot = ammoHud.root;
    Object.assign(aRoot.style, {
      bottom: `calc(4px + env(safe-area-inset-bottom, 0px))`,
      right: `calc(10px + env(safe-area-inset-right, 0px))`,
      padding: "0",
      background: "transparent",
      border: "none",
      borderRadius: "0",
      boxShadow: "none",
      backdropFilter: "none",
      transform: "none",
      textAlign: "right",
      opacity: MOBILE_BASE_OPACITY,
      transition: "opacity 0.3s ease",
    });
    // Shrink ammo font sizes
    const aChildren = Array.from(aRoot.children) as HTMLElement[];
    if (aChildren[0]) {
      // Row containing magEl and reserveWrap
      aChildren[0].style.gap = "2px";
      const magEl = aChildren[0].children[0] as HTMLElement | undefined;
      if (magEl) {
        Object.assign(magEl.style, {
          fontSize: "22px",
          minWidth: "0",
          textShadow: "0 1px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.5)",
        });
      }
      const reserveWrap = aChildren[0].children[1] as HTMLElement | undefined;
      if (reserveWrap) {
        reserveWrap.style.fontSize = "11px";
        const reserveSpan = reserveWrap.querySelector("span");
        if (reserveSpan) (reserveSpan as HTMLElement).style.fontSize = "13px";
      }
    }

    // ── Timer: more aggressive scale ────────────────────────────
    timerHud.setBaseScale(0.45);
    Object.assign(timerHud.root.style, {
      top: `calc(4px + env(safe-area-inset-top, 0px))`,
      padding: "2px 10px 3px",
      minWidth: "80px",
      background: "rgba(8, 16, 28, 0.35)",
      borderRadius: "6px",
      opacity: MOBILE_BASE_OPACITY,
      transition: "opacity 0.3s ease",
    });

    // ── Kill feed: compact width ────────────────────────────────
    killFeed.root.style.width = "220px";
    killFeed.root.style.minWidth = "0";

    // ── Auto-opacity flash helper (called in step loop) ─────────
    mobileFlashUpdate = (dt: number, currentHealth: number, currentMag: number): void => {
      // Health flash
      if (currentHealth !== mobilePrevHealth) {
        hRoot.style.opacity = MOBILE_FLASH_OPACITY;
        mobileHealthFlashTimer = MOBILE_FLASH_DURATION_S;
        mobilePrevHealth = currentHealth;
      }
      if (mobileHealthFlashTimer > 0) {
        mobileHealthFlashTimer -= dt;
        if (mobileHealthFlashTimer <= 0) hRoot.style.opacity = MOBILE_BASE_OPACITY;
      }

      // Ammo flash
      if (currentMag !== mobilePrevMag) {
        aRoot.style.opacity = MOBILE_FLASH_OPACITY;
        mobileAmmoFlashTimer = MOBILE_FLASH_DURATION_S;
        mobilePrevMag = currentMag;
      }
      if (mobileAmmoFlashTimer > 0) {
        mobileAmmoFlashTimer -= dt;
        if (mobileAmmoFlashTimer <= 0) aRoot.style.opacity = MOBILE_BASE_OPACITY;
      }
    };

    // Add touch-action: manipulation to root to prevent 300ms tap delay
    runtimeRoot.style.touchAction = "manipulation";

    // Show one-time fullscreen hint
    const fullscreenHint = new MobileFullscreenHint(runtimeRoot);
    fullscreenHint.show();
  } else if (!inputFrozen && runtimeParams.controlMode === "human") {
    // ── Desktop: pointer lock as before ─────────────────────────────
    pointerLock = new PointerLockController({
      lockEl: renderer.canvas,
      onLockChange: (locked) => {
        game.setPointerLocked(locked);
        if (locked) {
          pointerLockBannerGraceMs = POINTER_LOCK_BANNER_GRACE_MS;
          weaponAudio.ensureResumedFromGesture();
          weaponAudio.startAmbient(); // begin wind loop once audio is unlocked
          // The lock is back: the player is playing again.
          pauseMenu.hide();
        } else {
          pointerLockBannerGraceMs = 0;
          // Losing the lock (Escape, alt-tab, OS focus steal) means the player
          // can no longer aim. Raise the pause menu so the simulation halts
          // instead of leaving them to be shot while they cannot fight back.
          if (runtimeActive && !game.getIsDead() && !inputFrozen && !respawnInProgress) {
            pauseMenu.show();
          }
        }
      },
      onMouseDelta: (deltaX, deltaY) => {
        game.onMouseDelta(deltaX, deltaY);
        swayMouseDeltaX += deltaX;
        swayMouseDeltaY += deltaY;
      },
    });
  }

  let runtimeActive = false;
  let runtimeLoopStarted = false;
  let runtimeBindingsAttached = false;
  let rafId = 0;
  let previousFrameTime = performance.now();
  let previousHealth = 100;
  let footstepTimerS = 0;
  let pointerLockBannerGraceMs = 0;
  // Accumulated mouse delta for weapon sway (reset each frame after feeding to viewmodel)
  let swayMouseDeltaX = 0;
  let swayMouseDeltaY = 0;
  // Round / wave timing
  let waveElapsedS = 0;         // time elapsed since current wave started
  let roundEndShowing = false;  // true while round-end overlay is displayed
  let roundEndElapsedS = 0;     // active, unpaused time spent in intermission
  let pendingRallyingCry = false;  // true when rallying cry should fire after delay
  let rallyingCryDelayS = 0;       // countdown before rallying cry activates
  const isGameplayOverlaySuspended = (): boolean => Boolean(
    pauseMenu.isVisible()
    || howToPlayOverlay.isVisible()
    || controlsOverlay.isVisible()
    || mobileOrientationGuard?.isBlocking()
  );
  roundEndScreen.onContinue = () => {
    const skipAfterS = gameplayTuning.flow.skipAvailableAfterS;
    if (
      isGameplayOverlaySuspended()
      || !roundEndShowing
      || skipAfterS === null
      || roundEndElapsedS < skipAfterS
    ) return;
    if (game.skipWaveCountdown()) {
      game.updateWaveTransition(0);
    }
  };

  // Per-wave stats counters (reset each new wave)
  const waveStats: RoundStats = {
    kills: 0,
    totalEnemies: TOTAL_ENEMIES,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
  };
  const runStats = {
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
  };
  let runHeadshotsPerWave: number[] = [];
  let perfMsPerFrame = 16.67;
  let perfFps = 60;
  const perfCpuFrameSamples: number[] = [];
  const recordCpuFrameSample = (sampleMs: number): void => {
    if (!Number.isFinite(sampleMs) || sampleMs < 0) return;
    perfCpuFrameSamples.push(sampleMs);
    if (perfCpuFrameSamples.length > PERF_CPU_FRAME_SAMPLE_LIMIT) {
      perfCpuFrameSamples.splice(0, perfCpuFrameSamples.length - PERF_CPU_FRAME_SAMPLE_LIMIT);
    }
  };
  const cpuFrameMedianMs = (): number => {
    if (perfCpuFrameSamples.length === 0) return 0;
    const sorted = [...perfCpuFrameSamples].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1]! + sorted[middle]!) * 0.5
      : sorted[middle]!;
  };
  let perfDrawCalls = 0;
  let perfTriangles = 0;
  let perfGeometries = 0;
  let perfTextures = 0;
  let scenePerfSampleElapsed = PERF_SCENE_SAMPLE_INTERVAL_MS;
  let scenePerfSnapshot: ScenePerfSnapshot = {
    materials: 0,
    instancedMeshes: 0,
    instancedInstances: 0,
    meshes: 0,
    potentialTriangles: 0,
    groups: {},
    topMeshes: [],
  };
  const camFwdScratch = new Vector3();
  const scoreStorageKey = makeScoreStorageKey(
    runtimeParams.mapId,
    deriveSharedChampionBoardKey(gameplayProfileIdentity),
  );
  let bestScore = readBestScore(scoreStorageKey);
  scoreHud.setBestScore(bestScore);
  let sharedChampionSnapshot: SharedChampionSnapshot = getSharedChampionSnapshot(gameplayProfileIdentity);
  let sharedChampionFinalizedForCurrentRun = false;
  const applySharedChampionSnapshot = (snapshot: SharedChampionSnapshot): void => {
    const nextChampion = shouldReplaceSharedChampion(sharedChampionSnapshot.champion, snapshot.champion)
      ? snapshot.champion
      : sharedChampionSnapshot.champion;
    sharedChampionSnapshot = {
      status: nextChampion ? "ready" : snapshot.status,
      champion: nextChampion,
    };
    scoreHud.setSharedChampion(sharedChampionSnapshot);
    deathScreen.setSharedChampion(sharedChampionSnapshot);
  };
  applySharedChampionSnapshot(sharedChampionSnapshot);
  void loadSharedChampion({ profileIdentity: gameplayProfileIdentity }).then((snapshot) => {
    if (disposed) return;
    applySharedChampionSnapshot(snapshot);
  });
  const sharedChampionRunLifecycle = new SharedChampionRunLifecycle<SharedChampionRunSession>();
  const beginSharedChampionRun = (): void => {
    sharedChampionRunLifecycle.begin(() => sharedChampionRunSubmissionEnabled
      ? startSharedChampionRunSession({
          playerName: runtimeParams.playerName,
          controlMode: runtimeParams.controlMode,
          mapId: runtimeParams.mapId,
          ...gameplayProfileIdentity,
        })
      : Promise.resolve(null));
  };
  const finalizeSharedChampionForDeath = async (input: {
    sharedChampionRunSummary: SharedChampionRunSummary;
    runCompletion: SharedChampionRunCompletion<SharedChampionRunSession> | null;
  }): Promise<void> => {
    // Every validated completion belongs in the private run history. The
    // server independently decides whether it also replaces the public
    // champion for this immutable profile/revision board.
    const runSession = await (input.runCompletion?.sessionPromise ?? Promise.resolve(null));
    if (disposed || !runSession) {
      return;
    }

    const { snapshot } = await submitSharedChampionRunSession(runSession, input.sharedChampionRunSummary);
    if (disposed) return;
    applySharedChampionSnapshot(snapshot);
  };
  let lastRunScore: number | null = null;
  let lastRunSummary: PublicAgentRunSummary | null = null;
  let runActiveTimeS = 0;
  let lastDamageCause: PublicAgentRunSummary["deathCause"] | null = null;
  let wasAlive = !game.getIsDead();
  let feedbackEpisodeId = 1;
  let feedbackEventId = 0;
  let recentPublicFeedbackEvents: PublicAgentFeedbackEvent[] = [];
  beginSharedChampionRun();
  const pendingAgentActions: AgentAction[] = [];
  const isInternalDebugSurface = import.meta.env.DEV || isLocalHostRuntime;
  const resetPublicFeedback = (): void => {
    feedbackEventId = 0;
    recentPublicFeedbackEvents = [];
  };
  const pushPublicFeedback = (event: PublicAgentFeedbackEventInput): void => {
    feedbackEventId += 1;
    const nextEvent = {
      id: feedbackEventId,
      ...event,
    } as PublicAgentFeedbackEvent;
    recentPublicFeedbackEvents = [...recentPublicFeedbackEvents, nextEvent].slice(-PUBLIC_AGENT_FEEDBACK_MAX_EVENTS);
  };
  const applyQueuedAgentActions = (): void => {
    if (pendingAgentActions.length === 0) return;
    if (runtimeParams.controlMode === "agent") {
      for (const action of pendingAgentActions) {
        game.applyAgentAction(action);
      }
    }
    pendingAgentActions.length = 0;
  };
  const combatFeedbackQueue: QueuedCombatFeedbackEvent[] = [];
  let lastCombatFeedbackMs = 0;
  let lastKillFeedbackMs = 0;
  const debugFeedbackForwardScratch = new Vector3();
  const debugBuffForwardScratch = new Vector3();
  const enqueueCombatFeedback = (event: QueuedCombatFeedbackEvent): void => {
    combatFeedbackQueue.push(event);
  };
  const enqueueDebugCombatFeedback = (payload: DebugCombatFeedbackPayload): void => {
    const isHeadshot = payload.isHeadshot === true;
    const didKill = payload.didKill === true;
    const damage = Math.max(0, payload.damage ?? (isHeadshot ? 100 : 25));
    const enemyName = payload.enemyName?.trim() || "DebugTarget";

    game.camera.getWorldDirection(debugFeedbackForwardScratch);
    const worldPos = {
      x: game.camera.position.x + debugFeedbackForwardScratch.x * 8,
      y: game.camera.position.y + debugFeedbackForwardScratch.y * 8,
      z: game.camera.position.z + debugFeedbackForwardScratch.z * 8,
    };

    enqueueCombatFeedback({ type: "hit", isHeadshot });
    enqueueCombatFeedback({
      type: "damage-number",
      worldPos,
      damage,
      isHeadshot,
    });
    if (didKill) {
      enqueueCombatFeedback({
        type: "kill",
        enemyName,
        isHeadshot,
      });
    }
  };
  const drainCombatFeedback = (): void => {
    if (combatFeedbackQueue.length === 0) {
      lastCombatFeedbackMs = 0;
      lastKillFeedbackMs = 0;
      return;
    }

    const queued = combatFeedbackQueue.splice(0, combatFeedbackQueue.length);
    const feedbackStartedAtMs = performance.now();
    let killFeedbackMs = 0;

    for (const event of queued) {
      switch (event.type) {
        case "hit": {
          if (event.isHeadshot) {
            headshotBanner.trigger();
          }
          hitMarker.trigger(event.isHeadshot);
          weaponAudio.playHitThud();
          break;
        }
        case "damage-number": {
          damageNumbers.spawn(event.worldPos, game.camera, event.damage, event.isHeadshot);
          break;
        }
        case "kill": {
          const killStartedAtMs = performance.now();
          killFeed.addKill(runtimeParams.playerName, event.enemyName, event.isHeadshot);
          weaponAudio.playKillDing();
          const waveIndex = Math.floor(runStats.kills / TOTAL_ENEMIES); // before increment
          scoreHud.recordKill({ isHeadshot: event.isHeadshot });
          waveStats.kills++;
          runStats.kills++;
          sharedChampionRunLifecycle.recordKill(event.isHeadshot);
          if (event.isHeadshot) {
            waveStats.headshots++;
            runStats.headshots++;
            while (runHeadshotsPerWave.length <= waveIndex) {
              runHeadshotsPerWave.push(0);
            }
            runHeadshotsPerWave[waveIndex] = (runHeadshotsPerWave[waveIndex] ?? 0) + 1;
          }
          killFeedbackMs += performance.now() - killStartedAtMs;
          break;
        }
      }
    }

    lastCombatFeedbackMs = performance.now() - feedbackStartedAtMs;
    lastKillFeedbackMs = killFeedbackMs;
  };

  const state = (): RuntimeTextState => {
    const yawPitch = game.getYawPitchDeg();
    const playerPosition = game.getPlayerPosition();
    const playerVelocity = game.getPlayerVelocity();
    const playerCollision = game.getPlayerCollisionState();
    const botDebug = game.getBotDebugSnapshot();
    const currentZone = findCurrentZone(
      mapAssets?.blockout ?? null,
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
    );
    const warningMessages = splitOverlayMessages(warningOverlay.textContent);
    const visibleAnchorIds = collectVisibleAnchorIds(
      mapAssets?.anchors.anchors ?? null,
      game.getRenderedAnchorIds(),
      game.scene,
      game.camera,
    );
    const visualTelemetry = collectVisibleAssetTelemetry(
      game,
      mapAssets?.blockout ?? null,
      qaTelemetryTargets,
    );
    for (const asset of visualTelemetry.visibleAssets) {
      if (asset.anchorId) visibleAnchorIds.add(asset.anchorId);
    }
    const landmarkState = collectLandmarkState(
      mapAssets?.anchors.anchors ?? null,
      visibleAnchorIds,
      game.camera,
      renderer.getWidth(),
      renderer.getHeight(),
    );
    const shotCameraPosition = resolvedShot?.cameraPose?.pos ?? null;
    const shotCameraZone = shotCameraPosition
      ? findCurrentZone(
          mapAssets?.blockout ?? null,
          shotCameraPosition.x,
          shotCameraPosition.y,
          shotCameraPosition.z,
        )
      : null;
    const alive = !game.getIsDead();
    const pointerLocked = game.isPointerLocked();
    const currentScore = scoreHud.getScore();
    const finalScore = lastRunScore ?? currentScore;
    const gameOverVisible = deathScreen.isVisible();
    const visibility = document.visibilityState === "hidden" ? "hidden" : "visible";
    const buffPerf = buffManager.getPerfSnapshot();
    return {
      apiVersion: RUNTIME_TEXT_API_VERSION,
      mode: "runtime",
      profile: gameplayProfileIdentity,
      map: {
        loaded: mapLoaded,
        mapId: runtimeParams.mapId,
        seed: game.getPropsBuildStats().seed,
        spawn: runtimeParams.spawn,
        highVis: runtimeParams.highVis,
        colliderCount: game.getColliderCount(),
        wallDetails: {
          enabled: game.getWallDetailStats().enabled,
          density: game.getWallDetailStats().density,
          segmentsDecorated: game.getWallDetailStats().segmentsDecorated,
          instanceCount: game.getWallDetailStats().instanceCount,
        },
        ...(mapErrorMessage ? { error: mapErrorMessage } : {}),
      },
      shot: {
        active: shotActive,
        id: shotId,
        cameraZoneId: shotCameraZone?.id ?? null,
        cameraPose: resolvedShot?.cameraPose ?? null,
      },
      render: {
        webgl: renderer.hasWebGL,
        viewport: {
          width: renderer.getWidth(),
          height: renderer.getHeight(),
        },
        warnings: warningMessages,
        visibleSceneTags: [...visibleAnchorIds].sort(),
        visibleAssets: visualTelemetry.visibleAssets,
        artifactTags: visualTelemetry.artifactTags,
      },
      boot: {
        ...bootTelemetry,
      },
      // Include explicit camera data so screenshot review gates can assert framing consistency.
      // This prevents top-down/floor-only compare-shot regressions from passing unnoticed.
      view: {
        camera: {
          pos: {
            x: game.camera.position.x,
            y: game.camera.position.y,
            z: game.camera.position.z,
          },
          yawDeg: yawPitch.yaw,
          pitchDeg: yawPitch.pitch,
          fovDeg: game.camera.fov,
          aspect: game.camera.aspect,
        },
      },
      gameplay: {
        active: runtimeActive && mapLoaded,
        alive,
        health: Math.max(0, Math.round(game.getPlayerHealth())),
        pointerLocked,
        focused: document.hasFocus(),
        visibility,
        inputFrozen,
        grounded: game.getGrounded(),
        speedMps: game.getSpeedMps(),
      },
      agent: {
        enabled: runtimeParams.controlMode === "agent",
        name: runtimeParams.controlMode === "agent" ? runtimeParams.playerName : "",
      },
      player: {
        name: runtimeParams.playerName,
        pos: playerPosition,
        vel: playerVelocity,
        withinPlayableBounds: game.isPlayerWithinPlayableBounds(),
        zoneId: currentZone?.id ?? null,
        zoneType: currentZone?.type ?? null,
        zoneLabel: currentZone?.label ?? null,
        collision: playerCollision,
      },
      bots: {
        waveNumber: game.getWaveNumber(),
        waveElapsedS: game.getWaveElapsedS(),
        tier: botDebug?.tier ?? 0,
        aliveCount: botDebug?.aliveCount ?? 0,
        graphNodeCount: botDebug?.graphNodeCount ?? 0,
        searchPhase: botDebug?.searchPhase ?? "caution",
        topSearchZones: botDebug?.topSearchZones ?? [],
        squadTasks: botDebug?.squadTasks ?? [],
        roleCounts: botDebug?.roleCounts ?? {
          anchor: 0,
          rifler: 0,
          flanker: 0,
          roamer: 0,
        },
        preventedFriendlyFireCount: botDebug?.preventedFriendlyFireCount ?? 0,
        lastSeenPlayer: botDebug?.lastSeenPlayer ?? null,
        lastHeardPlayer: botDebug?.lastHeardPlayer ?? null,
        lastSpawn: botDebug?.lastSpawn ?? null,
        ...(runtimeParams.debug && botDebug ? { enemies: botDebug.enemies } : {}),
      },
      landmarks: landmarkState,
      assets: {
        floor: {
          requestedMode: runtimeParams.floorMode,
          activeMode: resolvedFloorMode,
          materialCount: floorMaterials?.getMaterialIds().length ?? 0,
        },
        wall: {
          requestedMode: runtimeParams.wallMode,
          activeMode: resolvedWallMode,
          materialCount: wallMaterials?.getMaterialIds().length ?? 0,
        },
        props: {
          requestedVisualMode: runtimeParams.propVisuals,
          activeVisualMode: resolvedPropVisuals,
          modelCount: propModels?.getModelCount() ?? 0,
        },
      },
      score: {
        current: currentScore,
        best: bestScore,
        ...(lastRunScore !== null ? { lastRun: lastRunScore } : {}),
      },
      sharedChampion: sharedChampionSnapshot.champion,
      gameOver: {
        visible: gameOverVisible,
        finalScore,
        bestScore,
        canPlayAgain: gameOverVisible,
      },
      anchorsDebug: game.getAnchorsDebugState(),
      props: {
        profile: game.getPropsBuildStats().profile,
        jitter: game.getPropsBuildStats().jitter,
        cluster: game.getPropsBuildStats().cluster,
        density: game.getPropsBuildStats().density,
        candidatesTotal: game.getPropsBuildStats().candidatesTotal,
        collidersPlaced: game.getPropsBuildStats().collidersPlaced,
        rejections: {
          clearZone: game.getPropsBuildStats().rejectedClearZone,
          bounds: game.getPropsBuildStats().rejectedBounds,
          gapRule: game.getPropsBuildStats().rejectedGapRule,
        },
        visualOnlyLandmarks: game.getPropsBuildStats().visualOnlyLandmarks,
        stallFillersPlaced: game.getPropsBuildStats().stallFillersPlaced,
      },
      weapon: {
        enabled: viewModelEnabled,
        visible: viewModelVisible,
        loaded: game.getWeaponDebugSnapshot().loaded,
        alignDot: game.getWeaponDebugSnapshot().dot,
        alignAngleDeg: game.getWeaponDebugSnapshot().angleDeg,
      },
      perf: {
        visible: perfHud.isVisible(),
        fps: perfFps,
        msPerFrame: perfMsPerFrame,
        cpuFrameMedianMs: cpuFrameMedianMs(),
        cpuFrameSampleCount: perfCpuFrameSamples.length,
        drawCalls: perfDrawCalls,
        triangles: perfTriangles,
        geometries: perfGeometries,
        textures: perfTextures,
        materials: scenePerfSnapshot.materials,
        instancedMeshes: scenePerfSnapshot.instancedMeshes,
        instancedInstances: scenePerfSnapshot.instancedInstances,
        meshes: scenePerfSnapshot.meshes,
        potentialTriangles: scenePerfSnapshot.potentialTriangles,
        groups: scenePerfSnapshot.groups,
        topMeshes: scenePerfSnapshot.topMeshes,
        combatFeedbackQueue: combatFeedbackQueue.length,
        lastCombatFeedbackMs,
        lastKillFeedbackMs,
        orbCount: buffPerf.orbCount,
        orbCapacity: buffPerf.orbCapacity,
        orbSpawnMs: buffPerf.orbSpawnMs,
        orbUpdateMs: buffPerf.orbUpdateMs,
      },
    };
  };

  const publicObserveState = (): PublicAgentObserveState => {
    const alive = !game.getIsDead();
    const ammoSnapshot = game.getAmmoSnapshot();
    return {
      apiVersion: PUBLIC_AGENT_API_VERSION,
      contract: PUBLIC_AGENT_CONTRACT,
      mode: "runtime",
      profile: gameplayProfileIdentity,
      runtimeReady: runtimeActive && mapLoaded,
      gameplay: {
        alive,
        gameOverVisible: deathScreen.isVisible(),
      },
      health: Math.max(0, Math.round(game.getPlayerHealth())),
      ammo: {
        mag: Math.max(0, Math.floor(ammoSnapshot.mag)),
        reserve: Math.max(0, Math.floor(ammoSnapshot.reserve)),
        reloading: ammoSnapshot.reloading,
      },
      score: {
        current: normalizeScoreValue(scoreHud.getScore()),
        best: normalizeScoreValue(bestScore),
        lastRun: lastRunScore === null ? null : normalizeScoreValue(lastRunScore),
        scope: "browser-session",
      },
      sharedChampion: sharedChampionSnapshot.champion,
      lastRunSummary,
      feedback: {
        episodeId: feedbackEpisodeId,
        recentEvents: recentPublicFeedbackEvents.map((event) => ({ ...event })),
      },
    };
  };

  function syncViewportNow(): void {
    renderer.resize();
    game.setAspect(renderer.getAspect());
    game.setViewportSize(renderer.getWidth(), renderer.getHeight());
    viewModel?.setAspect(renderer.getAspect());
  }

  function syncViewportIfChanged(): boolean {
    const nextWidth = Math.max(1, runtimeRoot.clientWidth || window.innerWidth);
    const nextHeight = Math.max(1, runtimeRoot.clientHeight || window.innerHeight);
    if (renderer.getWidth() === nextWidth && renderer.getHeight() === nextHeight) {
      return false;
    }
    syncViewportNow();
    return true;
  }

  function renderStagedFrame(): void {
    renderer.renderWithViewModel(
      game.scene,
      game.camera,
      viewModel?.viewModelScene ?? null,
      viewModel?.viewModelCamera ?? null,
      viewModelVisible,
    );
  }

  function onResize(): void {
    syncViewportNow();
    mobileOrientationGuard?.check();
    mobileTouchHud?.relayout();
  }

  const step = (deltaMs: number, options: { renderFrame?: boolean } = {}): void => {
    const cpuFrameStartedAtMs = performance.now();
    const clampedMs = Math.min(Math.max(deltaMs, 0), 100);
    const dt = clampedMs / 1000;
    const renderFrame = options.renderFrame ?? true;
    let waveTransitionedThisFrame = false;
    applyQueuedAgentActions();

    // An overlay owning the screen suspends the simulation and hands touch
    // input back to that overlay's own buttons.
    const overlaySuspended = isGameplayOverlaySuspended();
    const intermissionSuspended = roundEndShowing
      && gameplayTuning.flow.freezeSimulationDuringIntermission;
    const simulationSuspended = overlaySuspended || intermissionSuspended || game.getIsDead();

    // Feed mobile touch input before game update
    if (touchInput) {
      touchInput.setCaptureEnabled(!simulationSuspended && !game.getIsDead());
      game.feedMobileInput({
        moveX: touchInput.moveX,
        moveZ: touchInput.moveZ,
        lookDeltaX: touchInput.lookDeltaX,
        lookDeltaY: touchInput.lookDeltaY,
        fire: touchInput.fireHeld,
        jump: touchInput.jumpQueued,
        reload: touchInput.reloadQueued,
        crouch: touchInput.crouchHeld,
      });
      touchInput.consumeFrame();

      // Update button visual feedback
      mobileTouchHud?.updateFireVisual(touchInput.fireHeld);
      mobileTouchHud?.updateCrouchVisual(touchInput.crouchHeld);

      // Hide touch controls during death/pause
      const touchVisible = !game.getIsDead() && !simulationSuspended;
      mobileTouchHud?.setVisible(touchVisible);
    }

    // Freeze game input when pause menu, overlays, or orientation guard are open (death-freeze is managed inside Game.ts)
    if (simulationSuspended) {
      game.setFreezeInput(true);
    } else if (!game.getIsDead() && !inputFrozen) {
      game.setFreezeInput(false);
    }
    // Freezing input alone only stops the *player* acting. Enemies, weapon
    // timers and buff durations run off the simulation clock, so a paused game
    // has to advance that clock by zero or the player is shot dead while the
    // pause menu is up. UI/overlay animation keeps the real dt below.
    const simDt = simulationSuspended ? 0 : dt;
    if (simDt > 0 && !game.getIsDead() && !roundEndShowing) {
      runActiveTimeS += simDt;
      sharedChampionRunLifecycle.beginActiveFrame(simDt);
    } else {
      sharedChampionRunLifecycle.endActiveFrame();
    }
    game.update(simDt);
    // Enemy shots and the player's killing shot can resolve in the same frame.
    // Apply earned sustain after incoming damage so healing is not silently
    // lost against the pre-damage health cap; lethal damage still ends the run.
    if (pendingKillHeal > 0) {
      game.restorePlayerHealth(pendingKillHeal);
      pendingKillHeal = 0;
    }
    if (pendingKillReserveAmmo > 0) {
      game.grantWeaponReserveAmmo(pendingKillReserveAmmo);
      pendingKillReserveAmmo = 0;
    }
    if (intermissionSuspended && !overlaySuspended && !game.getIsDead()) {
      roundEndElapsedS += dt;
      waveTransitionedThisFrame = game.updateWaveTransition(dt);
    } else if (roundEndShowing && !overlaySuspended && !game.getIsDead()) {
      // A future profile may explicitly opt into a live intermission.
      // EnemyManager's normal update owns the countdown in that mode, so only
      // track elapsed time here and avoid advancing the transition twice.
      roundEndElapsedS += dt;
    }
    drainCombatFeedback();
    sharedChampionRunLifecycle.endActiveFrame();

    const aliveNow = !game.getIsDead();
    if (!aliveNow && wasAlive) {
      lastRunScore = normalizeScoreValue(scoreHud.getScore());
      const nextBestScore = Math.max(bestScore, lastRunScore);
      const deathCause = lastDamageCause ?? "unknown";
      const publicRunActiveTimeS = Math.round(Math.max(0, runActiveTimeS) * 10) / 10;
      const sharedChampionRunCompletion = sharedChampionFinalizedForCurrentRun
        ? null
        : sharedChampionRunLifecycle.complete();
      const publicAccuracy = runStats.shotsFired > 0
        ? Math.round(((runStats.shotsHit / runStats.shotsFired) * 100) * 10) / 10
        : 0;
      // Pad headshotsPerWave to expected length (waves with 0 headshots)
      const expectedWaves = runStats.kills > 0 ? Math.ceil(runStats.kills / TOTAL_ENEMIES) : 0;
      while (runHeadshotsPerWave.length < expectedWaves) {
        runHeadshotsPerWave.push(0);
      }
      const sharedChampionRunSummary = createSharedChampionRunSummary(
        sharedChampionRunCompletion,
        deathCause,
      );
      lastRunSummary = {
        survivalTimeS: publicRunActiveTimeS,
        kills: runStats.kills,
        headshots: runStats.headshots,
        shotsFired: runStats.shotsFired,
        shotsHit: runStats.shotsHit,
        accuracy: publicAccuracy,
        finalScore: lastRunScore,
        bestScore: normalizeScoreValue(nextBestScore),
        deathCause,
      };
      if (lastRunScore > bestScore) {
        bestScore = lastRunScore;
        writeBestScore(scoreStorageKey, bestScore);
        scoreHud.setBestScore(bestScore);
      }
      if (!sharedChampionFinalizedForCurrentRun) {
        sharedChampionFinalizedForCurrentRun = true;
        void finalizeSharedChampionForDeath({
          sharedChampionRunSummary,
          runCompletion: sharedChampionRunCompletion,
        });
      }
    }
    wasAlive = aliveNow;
    updateBootTextureTelemetry();

    // ── Health tracking & hit vignette ───────────────────────────────────────
    const currentHealth = game.getPlayerHealth();
    if (currentHealth < previousHealth) {
      hitVignette.triggerHit(previousHealth - currentHealth);
      lastDamageCause = "enemy-fire";
      pushPublicFeedback({
        type: "damage-taken",
        amount: Math.max(1, Math.round(previousHealth - currentHealth)),
      });
    }
    previousHealth = currentHealth;
    hitVignette.setHealth(currentHealth);

    // ── Footstep audio ───────────────────────────────────────────────────────
    const grounded = game.getGrounded();
    const speedMps = game.getSpeedMps();
    const playerCrouched = game.isPlayerCrouched();
    if (simDt > 0) {
      if (grounded && speedMps > 0.5) {
        footstepTimerS -= simDt;
        if (footstepTimerS <= 0) {
          footstepTimerS = speedMps > 4.5 ? 0.45 : 0.65;
          const footstepVolumeMultiplier = playerCrouched
            ? gameplayTuning.enemy.perception.hearing.crouchRangeMultiplier
            : 1;
          weaponAudio.playFootstep(Math.min(1, speedMps / 6.0) * footstepVolumeMultiplier);
          game.reportPlayerFootstep(speedMps, playerCrouched);
        }
      } else {
        footstepTimerS = 0; // reset so first step fires immediately on landing
      }
    }

    // ── Wave timing & round-end screen ───────────────────────────────────────
    if (simDt > 0 && !game.getIsDead() && !roundEndShowing && !waveTransitionedThisFrame) {
      waveElapsedS += simDt;
    }
    const allDead = game.getAllEnemiesDead();
    if (allDead && !roundEndShowing && !game.getIsDead()) {
      // First frame all enemies are dead — show the round-end screen with stats
      roundEndShowing = true;
      roundEndElapsedS = 0;
      pushPublicFeedback({ type: "wave-complete" });
      if (gameplayTuning.flow.showRoundSummary) {
        roundEndScreen.show(waveElapsedS, game.getWaveNumber(), { ...waveStats });
      }
    }
    if (roundEndShowing && gameplayTuning.flow.showRoundSummary) {
      const countdown = game.getWaveCountdownS() ?? 0;
      const skipAfterS = gameplayTuning.flow.skipAvailableAfterS;
      roundEndScreen.update(
        dt,
        countdown,
        skipAfterS !== null && roundEndElapsedS >= skipAfterS,
      );
    }

    // ── Death detection ──────────────────────────────────────────────────────
    if (game.getIsDead() && !deathScreen.isVisible() && !respawnInProgress) {
      if (
        gameplayTuning.flow.deathRestart.releasePointerLock
        && document.pointerLockElement
      ) {
        document.exitPointerLock();
      }
      deathScreen.show({
        playerName: runtimeParams.playerName,
        finalScore: scoreHud.getScore(),
        bestScore,
        waveReached: game.getWaveNumber(),
        wavesCleared: Math.max(0, game.getWaveNumber() - 1),
        kills: lastRunSummary?.kills ?? runStats.kills,
        headshots: lastRunSummary?.headshots ?? runStats.headshots,
        accuracy: lastRunSummary?.accuracy ?? 0,
        activeTimeS: lastRunSummary?.survivalTimeS ?? runActiveTimeS,
      });
    }

    const overviewCamera = game.camera.position.y > OVERVIEW_VIEWMODEL_DISABLE_HEIGHT_M;
    viewModelVisible = Boolean(viewModelEnabled && viewModel && !overviewCamera);
    crosshair.style.display = overviewCamera ? "none" : "block";
    ammoHud.setVisible(!overviewCamera);
    healthHud.setVisible(!overviewCamera);
    timerHud.setVisible(!overviewCamera);
    if (!overviewCamera) {
      const ammoSnap = game.getAmmoSnapshot();
      ammoHud.update(ammoSnap);
      const overshield = game.getOvershield();
      const baseHealthCapacity = gameplayTuning.player.economy.maxHealth;
      healthHud.update({
        health: currentHealth + overshield,
        maxHealth: overshield > 0
          ? baseHealthCapacity + gameplayTuning.buffs.shieldHealth
          : baseHealthCapacity,
      }, dt);
      mobileFlashUpdate?.(dt, currentHealth, ammoSnap.mag);
    }

    // ── Deferred Rallying Cry activation ──────────────────────────────────────
    if (pendingRallyingCry && !roundEndShowing) {
      rallyingCryDelayS -= simDt;
      if (rallyingCryDelayS <= 0) {
        pendingRallyingCry = false;
        buffManager.activateRallyingCry();
      }
    }

    // ── Buff system per-frame update ──────────────────────────────────────────
    // simDt: buff durations are gameplay state and must not burn down while paused.
    buffManager.update(simDt, game.getPlayerPosition(), game.camera);
    const activeBuffs = buffManager.getActiveBuffs();
    const rcActive = buffManager.isRallyingCryActive();
    buffHud.update({ buffs: activeBuffs, rallyingCryActive: rcActive }, dt);
    buffTextHud.update(activeBuffs, rcActive);
    buffVignette.setRallyingCry(rcActive);
    buffVignette.update(dt);

    // Update pause menu and overlays
    pauseMenu.update(dt);
    howToPlayOverlay.update(dt);
    controlsOverlay.update(dt);

    // ── Timer: pause while dead, round-end showing, or the game is paused ────
    if (game.getIsDead() || roundEndShowing || simulationSuspended) {
      timerHud.pause();
    } else {
      timerHud.start();
    }
    pointerLockBannerGraceMs = Math.max(0, pointerLockBannerGraceMs - clampedMs);
    const docWithWebkitFullscreen = document as Document & { webkitFullscreenElement?: Element | null };
    const fullscreenElement = document.fullscreenElement ?? docWithWebkitFullscreen.webkitFullscreenElement ?? null;
    const chromeBannerLikelyVisible = pointerLockBannerGraceMs > 0 || Boolean(fullscreenElement);
    timerHud.setChromeBannerClearance(chromeBannerLikelyVisible);
    timerHud.update(dt);

    // ── Always-on effects ────────────────────────────────────────────────────
    fadeOverlay.update(dt);
    hitVignette.update(dt);
    deathScreen.update(dt);
    scoreHud.update(dt);
    killFeed.update(dt);
    headshotBanner.update(dt);
    hitMarker.update(dt);
    damageNumbers.update(dt);
    bulletHoles?.update(dt);

    if (renderFrame && viewModel) {
      viewModel.setFrameInput(speedMps, grounded, swayMouseDeltaX, swayMouseDeltaY);
      swayMouseDeltaX = 0;
      swayMouseDeltaY = 0;
      viewModel.updateFromMainCamera(game.camera, dt);
      const weaponDebug = viewModel.getAlignmentSnapshot();
      game.setWeaponDebugSnapshot(weaponDebug.loaded, weaponDebug.dot, weaponDebug.angleDeg);
    } else {
      swayMouseDeltaX = 0;
      swayMouseDeltaY = 0;
      game.setWeaponDebugSnapshot(false, -1, 180);
    }

    if (renderFrame && shadowWarmupFrames > 0) {
      renderer.requestShadowUpdate();
      shadowWarmupFrames -= 1;
    }

    if (renderFrame) {
      renderer.renderWithViewModel(
        game.scene,
        game.camera,
        viewModel?.viewModelScene ?? null,
        viewModel?.viewModelCamera ?? null,
        viewModelVisible,
      );
      const perfInfo = renderer.getPerfInfo();
      perfDrawCalls = perfInfo.drawCalls;
      perfTriangles = perfInfo.triangles;
      perfGeometries = perfInfo.geometries;
      perfTextures = perfInfo.textures;
      qaAssetTracker?.recordRenderedFrame(perfInfo.textures);
    }

    if (renderFrame && perfHud.isVisible()) {
      perfMsPerFrame = perfMsPerFrame * 0.9 + clampedMs * 0.1;
      perfFps = 1000 / Math.max(0.01, perfMsPerFrame);
      const buffPerf = buffManager.getPerfSnapshot();

      scenePerfSampleElapsed += clampedMs;
      if (scenePerfSampleElapsed >= PERF_SCENE_SAMPLE_INTERVAL_MS) {
        scenePerfSnapshot = collectScenePerfSnapshot(game.scene, viewModel?.viewModelScene ?? null);
        scenePerfSampleElapsed = 0;
      }

      perfHud.update({
        fps: perfFps,
        msPerFrame: perfMsPerFrame,
        drawCalls: perfDrawCalls,
        triangles: perfTriangles,
        geometries: perfGeometries,
        textures: perfTextures,
        materials: scenePerfSnapshot.materials,
        instancedMeshes: scenePerfSnapshot.instancedMeshes,
        instancedInstances: scenePerfSnapshot.instancedInstances,
        dpr: renderer.getCurrentPixelRatio(),
        dprCap: renderer.getPixelRatioCap(),
        debugEnabled: runtimeParams.debug,
        orbCount: buffPerf.orbCount,
        orbCapacity: buffPerf.orbCapacity,
        orbSpawnMs: buffPerf.orbSpawnMs,
        orbUpdateMs: buffPerf.orbUpdateMs,
      });
    } else if (renderFrame) {
      // Sample immediately when the HUD is re-enabled.
      scenePerfSampleElapsed = PERF_SCENE_SAMPLE_INTERVAL_MS;
    }
    if (renderFrame) {
      recordCpuFrameSample(performance.now() - cpuFrameStartedAtMs);
    }
    qaFrameCounter += 1;
    qaLastFrameAt = Date.now();
  };

  const advanceSimulation = (ms: number, options: { renderFrame?: boolean } = {}): void => {
    const frameMs = 1000 / 60;
    let remaining = Math.max(0, ms);

    if (remaining === 0) {
      step(0, options);
      return;
    }

    while (remaining > 0) {
      const nextStep = Math.min(frameMs, remaining);
      step(nextStep, options);
      remaining -= nextStep;
    }
  };

  let lastAgentRenderTime = 0;
  let consecutiveFrameErrors = 0;
  let hiddenAgentTimerId: number | null = null;
  const isAgentHiddenLowPowerMode = (): boolean =>
    runtimeParams.controlMode === "agent" && document.visibilityState === "hidden";
  const stopHiddenAgentLoop = (): void => {
    if (hiddenAgentTimerId === null) return;
    window.clearTimeout(hiddenAgentTimerId);
    hiddenAgentTimerId = null;
  };
  const scheduleHiddenAgentLoop = (): void => {
    stopHiddenAgentLoop();
    if (!isAgentHiddenLowPowerMode() || disposed) return;

    hiddenAgentTimerId = window.setTimeout(() => {
      hiddenAgentTimerId = null;
      if (disposed || !isAgentHiddenLowPowerMode()) return;
      advanceSimulation(AGENT_BACKGROUND_STEP_INTERVAL_MS, { renderFrame: false });
      scheduleHiddenAgentLoop();
    }, AGENT_BACKGROUND_STEP_INTERVAL_MS);
  };
  const onVisibilityModeChange = (): void => {
    previousFrameTime = performance.now();
    lastAgentRenderTime = 0;
    // Reset mobile touch state — browser drops touch events when app is backgrounded
    touchInput?.resetState();
    if (isAgentHiddenLowPowerMode()) {
      scheduleHiddenAgentLoop();
      return;
    }
    stopHiddenAgentLoop();
  };

  const animate = (time: number): void => {
    if (disposed) return;
    if (isAgentHiddenLowPowerMode()) {
      previousFrameTime = time;
      rafId = window.requestAnimationFrame(animate);
      return;
    }

    const deltaMs = time - previousFrameTime;
    previousFrameTime = time;
    const shouldRender = runtimeParams.controlMode !== "agent"
      || lastAgentRenderTime === 0
      || time - lastAgentRenderTime >= AGENT_VISIBLE_RENDER_INTERVAL_MS;
    // The frame is re-armed in `finally`. Re-arming only after step() returned
    // meant a single uncaught exception anywhere in the simulation permanently
    // killed the loop: the game froze mid-run with no message and no recovery.
    // A repeatedly-throwing frame is surfaced and then given up on rather than
    // spinning silently forever.
    try {
      step(deltaMs, { renderFrame: shouldRender });
      if (shouldRender) {
        lastAgentRenderTime = time;
      }
      consecutiveFrameErrors = 0;
    } catch (error) {
      consecutiveFrameErrors += 1;
      console.error(`[runtime:loop] frame failed (${consecutiveFrameErrors})`, error);
      if (consecutiveFrameErrors === 1) {
        appendWarning(
          `The game hit an unexpected error and may behave oddly. Reload if it does not recover.\n${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      if (consecutiveFrameErrors >= MAX_CONSECUTIVE_FRAME_ERRORS) {
        appendWarning("Stopping the game loop after repeated errors. Please reload the page.");
        console.error("[runtime:loop] giving up after repeated frame failures");
        return;
      }
    } finally {
      if (!disposed && consecutiveFrameErrors < MAX_CONSECUTIVE_FRAME_ERRORS) {
        rafId = window.requestAnimationFrame(animate);
      }
    }
  };

  // Escape key toggles pause menu (when pointer lock is NOT held by the browser)
  const onKeyDownPause = (e: KeyboardEvent): void => {
    if (runtimeParams.controlMode !== "human") return;
    if (e.code !== "Escape") return;
    if (game.getIsDead()) return; // ignore Esc on death screen
    if (inputFrozen) return;
    // If how-to-play or controls overlay is open, close it (pause menu stays visible)
    if (howToPlayOverlay.isVisible()) {
      howToPlayOverlay.hide();
      howToPlayOverlay.onClose?.();
      return;
    }
    if (controlsOverlay.isVisible()) {
      controlsOverlay.hide();
      controlsOverlay.onClose?.();
      return;
    }
    // Resuming: hide and request the lock back, then stop. This used to fall
    // through into a 50ms timer that re-showed the menu whenever the lock had
    // not been granted yet — and Chrome rate-limits re-locking after an Esc
    // exit, so the menu reliably sprang straight back open and the game could
    // not be resumed with Escape at all. Menu state now follows the real
    // pointerlockchange event (see onLockChange) instead of a fixed poll.
    if (pauseMenu.isVisible()) {
      pauseMenu.hide();
      pauseMenu.onResume?.();
      return;
    }
    // Not paused. Escape from a locked session makes the browser exit pointer
    // lock, and onLockChange raises the menu. If the lock is already gone,
    // there is no event coming — raise it here.
    if (!pointerLock?.isLocked()) {
      pauseMenu.show();
    }
  };

  const attachRuntimeBindings = (): void => {
    if (runtimeBindingsAttached) return;
    runtimeBindingsAttached = true;
    if (!mobile) {
      window.addEventListener("keydown", onKeyDownPause);
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityModeChange);
    pointerLock?.init();
    touchInput?.init();
    mobileOrientationGuard?.check();
  };

  const readQaFramingSnapshot = () => {
    const visibleAnchorIds = collectVisibleAnchorIds(
      mapAssets?.anchors.anchors ?? null,
      game.getRenderedAnchorIds(),
      game.scene,
      game.camera,
    );
    return {
      camera: {
        fovDeg: game.camera.fov,
        aspect: game.camera.aspect,
      },
      landmarks: collectLandmarkState(
        mapAssets?.anchors.anchors ?? null,
        visibleAnchorIds,
        game.camera,
        renderer.getWidth(),
        renderer.getHeight(),
      ),
    };
  };
  let qaRevealFramingSnapshot: ReturnType<typeof readQaFramingSnapshot> | null = null;

  const beginReveal = (): void => {
    if (disposed) return;
    if (bootTelemetry.revealPhase === "active") return;
    syncViewportIfChanged();
    bootTelemetry.revealPhase = "revealing";
    if (deterministicQa) qaRevealFramingSnapshot = readQaFramingSnapshot();
    console.info("[runtime:boot] reveal started");
  };

  const activate = (): void => {
    if (disposed || runtimeActive) return;
    syncViewportIfChanged();
    runtimeActive = true;
    runtimeRoot.style.pointerEvents = "auto";
    bootTelemetry.revealPhase = "active";
    console.info("[runtime:boot] runtime active");
    attachRuntimeBindings();
    previousFrameTime = performance.now();
    lastAgentRenderTime = 0;
    onVisibilityModeChange();
    timerHud.start();
    if (!runtimeLoopStarted && !deterministicQa) {
      runtimeLoopStarted = true;
      rafId = window.requestAnimationFrame(animate);
    }
  };

  window.agent_apply_action = (action: AgentAction) => {
    const normalized = normalizeAgentAction(action);
    if (!normalized) return;
    pendingAgentActions.push(normalized);
  };
  window.agent_observe = () => JSON.stringify(publicObserveState());
  window.__runtime_ready_state = () => ({
    mapLoaded: Boolean(mapAssets),
    revealPhase: bootTelemetry.revealPhase,
    shotActive,
    shotId,
    qaCaptureReady: qaAssetTracker?.state().ready ?? true,
    qaAssetPlanHash: qaAssetPlan?.hash ?? null,
  });
  window.__debug_scene_perf = () => collectScenePerfSnapshot(game.scene, viewModel?.viewModelScene ?? null);
  window.__qa_gameplay_authority_state = () => game.getGameplayAuthoritySnapshot();
  window.__debug_render_perf = () => ({
    ...renderer.getPerfInfo(),
    bootReadyMs: bootTelemetry.readyAtMs,
    cpuFrameMedianMs: cpuFrameMedianMs(),
    cpuFrameSampleCount: perfCpuFrameSamples.length,
    scene: collectScenePerfSnapshot(game.scene, viewModel?.viewModelScene ?? null),
  });
  window.__qa_performance_state = () => ({
    perf: {
      ...renderer.getPerfInfo(),
      fps: perfFps,
      msPerFrame: perfMsPerFrame,
      cpuFrameMedianMs: cpuFrameMedianMs(),
      cpuFrameSampleCount: perfCpuFrameSamples.length,
    },
    boot: { readyAtMs: bootTelemetry.readyAtMs },
  });
  window.render_game_to_text = () => {
    qaStateSerializationInProgress = true;
    try {
      return JSON.stringify(isInternalDebugSurface ? state() : publicObserveState());
    } finally {
      qaLastStateSerializationAt = Date.now();
      qaStateSerializationInProgress = false;
    }
  };
  window.advanceTime = async (ms: number) => {
    if (!runtimeActive) return;
    advanceSimulation(ms, {
      renderFrame: !deterministicQa && (runtimeParams.controlMode !== "agent" || document.visibilityState === "visible"),
    });
  };
  window.__qa_render_frame = () => {
    if (!runtimeActive) return;
    advanceSimulation(0, { renderFrame: true });
  };
  window.__qa_route_state = () => {
    const playerPosition = game.getPlayerPosition();
    const currentZone = findCurrentZone(
      mapAssets?.blockout ?? null,
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
    );
    return {
      gameplay: { alive: !game.getIsDead() },
      player: {
        pos: playerPosition,
        withinPlayableBounds: game.isPlayerWithinPlayableBounds(),
        zoneId: currentZone?.id ?? null,
        collision: game.getPlayerCollisionState(),
      },
    };
  };
  if (deterministicQa) {
    window.__qa_framing_state = () => {
      const current = readQaFramingSnapshot();
      return {
        revealPhase: bootTelemetry.revealPhase,
        ...current,
        revealing: qaRevealFramingSnapshot,
      };
    };
    window.__qa_heartbeat = () => {
      const now = Date.now();
      const staleAfterMs = deterministicQa ? 10_000 : 2_500;
      return {
        timestamp: now,
        frameCounter: qaFrameCounter,
        runtimePhase: disposed
          ? "disposed"
          : mapLoaded
            ? bootTelemetry.revealPhase
            : mapErrorMessage
              ? "map-error"
              : "map-loading",
        mainLoopAdvancing: runtimeActive
          && !disposed
          && qaLastFrameAt !== null
          && now - qaLastFrameAt <= staleAfterMs,
        lastFrameAt: qaLastFrameAt,
        lastStateSerializationAt: qaLastStateSerializationAt,
        stateSerializationInProgress: qaStateSerializationInProgress,
        disposed,
        frozen: inputFrozen,
      };
    };
  }
  if (isInternalDebugSurface) {
    window.__debug_emit_combat_feedback = (payload: DebugCombatFeedbackPayload) => {
      enqueueDebugCombatFeedback(payload);
    };
    window.__debug_trigger_hit_vignette = (damage = 25) => {
      hitVignette.triggerHit(damage);
    };
    window.__debug_eliminate_all_bots = () => game.eliminateAllEnemiesForDebug();
    window.__debug_set_buff_orbs = (payload: DebugBuffOrbPayload) => {
      game.camera.getWorldDirection(debugBuffForwardScratch);
      return buffManager.debugSetOrbCount(
        Math.max(0, Math.floor(payload.count ?? 0)),
        game.getPlayerPosition(),
        debugBuffForwardScratch,
      );
    };
    window.__debug_set_buff_vignette = (payload: DebugBuffVignettePayload = {}) => {
      const action = payload.action ?? (payload.type ? "activate" : "clear");
      const exclusive = payload.exclusive !== false;
      const readState = () => {
        buffVignette.setRallyingCry(buffManager.isRallyingCryActive());
        buffVignette.update(0);
        return {
          buffs: buffManager.getActiveBuffs().map((buff) => buff.type),
          rallyingCryActive: buffManager.isRallyingCryActive(),
          visual: buffVignette.getDebugState(),
        };
      };
      const clearDebugState = (): void => {
        pendingRallyingCry = false;
        rallyingCryDelayS = 0;
        clearAllBuffRuntimeState();
      };

      if (action === "clear") {
        clearDebugState();
        return readState();
      }

      const requestedType = payload.type;
      if (requestedType === "rallying_cry") {
        if (action === "deactivate") {
          clearDebugState();
          return readState();
        }
        if (exclusive) {
          clearDebugState();
        }
        buffManager.activateRallyingCry();
        return readState();
      }
      if (!requestedType || !isDebugBuffType(requestedType)) {
        return readState();
      }

      if (action === "deactivate") {
        buffManager.debugDeactivateBuff(requestedType);
        return readState();
      }

      if (exclusive) {
        clearDebugState();
      }
      const result = buffManager.debugActivateBuff(requestedType);
      if (result === "refreshed") {
        buffVignette.refresh(requestedType);
      }
      return readState();
    };
    window.__debug_set_player_pose = (payload: { x: number; y: number; z: number; yawDeg?: number; pitchDeg?: number }) => {
      const yawRad = typeof payload.yawDeg === "number" ? (payload.yawDeg * Math.PI) / 180 : undefined;
      const pitchRad = typeof payload.pitchDeg === "number" ? (payload.pitchDeg * Math.PI) / 180 : undefined;
      game.debugSetPlayerPose({ x: payload.x, y: payload.y, z: payload.z }, yawRad, pitchRad);
    };
    window.__debug_pick_scene = (payload: { xPx: number; yPx: number }) => {
      const viewportWidth = Math.max(1, window.innerWidth);
      const viewportHeight = Math.max(1, window.innerHeight);
      const pointer = new Vector2(
        (payload.xPx / viewportWidth) * 2 - 1,
        -(payload.yPx / viewportHeight) * 2 + 1,
      );
      const picker = new Raycaster();
      picker.setFromCamera(pointer, game.camera);
      return picker.intersectObject(game.scene, true).slice(0, 12).map((hit) => {
        const object = hit.object;
        const batchedId = (hit as typeof hit & { batchId?: number }).batchId;
        const instanceId = typeof hit.instanceId === "number"
          ? hit.instanceId
          : typeof batchedId === "number"
            ? batchedId
            : null;
        const mesh = object as Mesh;
        const rawMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const materialIndex = typeof hit.face?.materialIndex === "number" ? hit.face.materialIndex : 0;
        const pickedMaterial = rawMaterials[materialIndex] ?? rawMaterials[0] ?? null;
        let instanceTint: Color | null = null;
        if (object instanceof InstancedMesh && instanceId !== null && object.instanceColor) {
          instanceTint = new Color();
          object.getColorAt(instanceId, instanceTint);
        }
        const pickedColor = pickedMaterial && "color" in pickedMaterial && pickedMaterial.color instanceof Color
          ? pickedMaterial.color
          : null;
        const effectiveColor = pickedColor
          ? pickedColor.clone().multiply(instanceTint ?? new Color(1, 1, 1))
          : instanceTint?.clone() ?? null;
        const materials = rawMaterials.filter(Boolean).map((material, index) => {
          const record = material as unknown as Record<string, unknown>;
          const color = record.color instanceof Color ? record.color : undefined;
          const emissive = record.emissive instanceof Color ? record.emissive : undefined;
          return {
            selected: material === pickedMaterial || index === materialIndex,
            index,
            type: material.type,
            name: material.name || null,
            color: serializePickedColor(color),
            map: serializePickedTexture(record.map),
            normalMap: serializePickedTexture(record.normalMap),
            roughnessMap: serializePickedTexture(record.roughnessMap),
            metalnessMap: serializePickedTexture(record.metalnessMap),
            aoMap: serializePickedTexture(record.aoMap),
            envMapSource: record.envMap ? "explicit" : game.scene.environment ? "scene" : "none",
            envMapIntensity: typeof record.envMapIntensity === "number" ? record.envMapIntensity : null,
            sceneEnvironmentIntensity: game.scene.environmentIntensity,
            roughness: typeof record.roughness === "number" ? record.roughness : null,
            metalness: typeof record.metalness === "number" ? record.metalness : null,
            emissive: serializePickedColor(emissive),
            emissiveIntensity: typeof record.emissiveIntensity === "number" ? record.emissiveIntensity : null,
            vertexColors: typeof record.vertexColors === "boolean" ? record.vertexColors : null,
            toneMapped: material.toneMapped,
          };
        });
        const rawInstances = object.userData.visualQaInstances;
        const rawQa = instanceId !== null && Array.isArray(rawInstances)
          ? rawInstances[instanceId]
          : object.userData.visualQa;
        const qa = isRecordValue(rawQa) ? rawQa : null;
        const parentNames: string[] = [];
        let parent = object.parent;
        while (parent && parentNames.length < 5) {
          if (parent.name) parentNames.push(parent.name);
          parent = parent.parent;
        }
        return {
          distanceM: hit.distance,
          point: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          objectName: object.name,
          parentNames,
          instanceId,
          placementId: typeof qa?.placementId === "string" ? qa.placementId : null,
          moduleId: typeof qa?.moduleId === "string" ? qa.moduleId : null,
          semanticClass: typeof qa?.semanticClass === "string" ? qa.semanticClass : null,
          dimensions: isRecordValue(qa?.dimensions) ? qa.dimensions : null,
          materialIndex,
          materials,
          tintChain: {
            materialColor: serializePickedColor(pickedColor ?? undefined),
            instanceColor: serializePickedColor(instanceTint ?? undefined),
            effectiveColor: serializePickedColor(effectiveColor ?? undefined),
          },
        };
      });
    };
    window.__debug_reset_bot_knowledge = () => {
      game.resetBotKnowledgeForDebug();
    };
    window.__debug_suppress_bot_intel_ms = (durationMs: number) => {
      game.suppressBotIntelForDebug(durationMs);
    };
  }

  const teardown = (): void => {
    if (disposed) return;
    disposed = true;
    sharedChampionRunLifecycle.cancelCurrent();

    window.cancelAnimationFrame(rafId);
    stopHiddenAgentLoop();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", teardown);
    window.removeEventListener("beforeunload", teardown);
    document.removeEventListener("visibilitychange", onVisibilityModeChange);
    delete window.agent_apply_action;
    delete window.agent_observe;
    delete window.render_game_to_text;
    delete window.__runtime_ready_state;
    delete window.__debug_scene_perf;
    delete window.__qa_gameplay_authority_state;
    delete window.__debug_render_perf;
    delete window.__qa_performance_state;
    delete window.advanceTime;
    delete window.__qa_render_frame;
    delete window.__qa_route_state;
    delete window.__qa_heartbeat;
    delete window.__qa_framing_state;
    delete window.__qa_capture_state;
    delete window.__debug_emit_combat_feedback;
    delete window.__debug_trigger_hit_vignette;
    delete window.__debug_eliminate_all_bots;
    delete window.__debug_set_buff_orbs;
    delete window.__debug_set_buff_vignette;
    delete window.__debug_set_player_pose;
    delete window.__debug_pick_scene;
    delete window.__debug_reset_bot_knowledge;
    delete window.__debug_suppress_bot_intel_ms;

    pointerLock?.dispose();
    touchInput?.dispose();
    mobileTouchHud?.dispose();
    mobileOrientationGuard?.dispose();
    restoreOverviewRenderLod();
    game.teardown();
    weaponAudio.dispose();
    perfHud.dispose();
    ammoHud.dispose();
    healthHud.dispose();
    buffManager.dispose();
    buffHud.dispose();
    buffTextHud.dispose();
    buffVignette.dispose();
    hitVignette.dispose();
    deathScreen.dispose();
    killFeed.dispose();
    headshotBanner.dispose();
    hitMarker.dispose();
    scoreHud.dispose();
    roundEndScreen.dispose();
    timerHud.dispose();
    damageNumbers.dispose();
    pauseMenu.dispose();
    howToPlayOverlay.dispose();
    controlsOverlay.dispose();
    fadeOverlay.dispose();
    if (!mobile) {
      window.removeEventListener("keydown", onKeyDownPause);
    }
    viewModel?.dispose();
    renderer.dispose();
    crosshair.remove();
    warningOverlay.remove();
    errorOverlay.remove();
    runtimeRoot.remove();
  };

  window.addEventListener("pagehide", teardown);
  window.addEventListener("beforeunload", teardown);

  console.info("[runtime:boot] bootstrap handle ready");

  return {
    teardown,
    getRootElement: () => runtimeRoot,
    beginReveal,
    activate,
  };
}

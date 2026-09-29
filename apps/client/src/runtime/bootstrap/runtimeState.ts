import type { Game } from "../game/Game";
import type { RuntimeControlMode } from "../utils/UrlParams";
import type { RuntimeWarmupAssets } from "../warmup";
import type { GameplayProfileIdentity } from "../../../../shared/gameplayProfile";
import type { SharedChampion } from "../../../../shared/highScore";
import type { RuntimeVisibleAsset, ScenePerfSnapshot } from "./sceneTelemetry";

export type RevealPhase = "warming" | "ready" | "revealing" | "active";

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

export type PublicAgentFeedbackEventInput =
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

type PublicAgentFeedback = {
  episodeId?: string | number;
  recentEvents?: PublicAgentFeedbackEvent[];
};

export type RuntimeTextState = {
  apiVersion: number;
  mode: "runtime";
  profile: GameplayProfileIdentity;
  map: {
    loaded: boolean;
    mapId: string;
    seed: number;
    spawn: "A" | "B";
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
  props: {
    candidatesTotal: number;
    collidersPlaced: number;
    rejections: {
      clearZone: number;
      bounds: number;
      gapRule: number;
    };
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
  perception: ReturnType<Game["getPublicPerception"]>;
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

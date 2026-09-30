import { PointLight, Vector3 } from "three";
import { RUNTIME_TEXT_API_VERSION } from "../shared/runtimeTextApi";
import { Game } from "./game/Game";
import { createViewModelLighting } from "./weapons/viewModelLighting";
import { DEFAULT_FIRE_INTERVAL_S } from "./weapons/Ak47FireController";
import { resolveEnemyHitDamage } from "./combat/enemyHitZone";
import { PerfHud } from "./debug/PerfHud";
import { preloadEnemyVisualAssets, setEnemyVisualModelStreamingEnabled } from "./enemies/EnemyVisual";
import { ENEMIES_PER_WAVE } from "./enemies/EnemyManager";
import { PointerLockController } from "./input/PointerLock";
import { loadMap, RuntimeMapLoadError } from "./map/spec/loadMap";
import { resolveShot } from "./map/spec/shots";
import type { RuntimeMapAssets } from "./map/spec/types";
import { Renderer } from "./render/Renderer";
import {
  collectSceneTextures,
  uploadTexturesInBatches,
  waitForPendingAssetLoads,
} from "./render/sceneReadiness";
import {
  QaAssetReadinessTracker,
  createQaAssetPlan,
  preloadQaDirectTextures,
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
import { CountdownHud } from "./ui/CountdownHud";
import { parseRuntimeUrlParams } from "./utils/UrlParams";
import { normalizeAgentAction, type AgentAction } from "./input/AgentAction";
import { isMobileDevice } from "./input/MobileDetect";
import { TouchInputManager } from "./input/TouchInputManager";
import { MobileTouchHud } from "./ui/MobileTouchHud";
import { OrientationGuard } from "../shared/OrientationGuard";
import { MobileFullscreenHint } from "./ui/MobileFullscreenHint";
import { BulletHoleManager } from "./effects/BulletHoleManager";
import { BuffManager } from "./buffs/BuffManager";
import { BUFF_TYPES, type BuffType } from "./buffs/BuffTypes";
import { BuffHud } from "./ui/BuffHud";
import { BuffTextHud } from "./ui/BuffTextHud";
import { BuffVignette } from "./ui/BuffVignette";
import { getGameplayTuning } from "./tuning/gameplayTuning";
import {
  isAutomatedClient,
  isLocalhostHostname,
  isInternalDebugSurface as resolveInternalDebugSurface,
} from "../shared/hostEnvironment";
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
  deriveSharedChampionBoardKey,
  type SharedChampionRunSummary,
  type SharedChampionSnapshot,
} from "../../../shared/highScore";
import { resolveGameplayProfileIdentity } from "../../../shared/gameplayProfile";
import {
  PUBLIC_AGENT_API_VERSION,
  PUBLIC_AGENT_CONTRACT,
} from "../../../shared/publicAgentContract";

import {
  applyOverviewRenderLod,
  collectScenePerfSnapshot,
  collectVisibleAssetTelemetry,
  type ScenePerfSnapshot,
} from "./bootstrap/sceneTelemetry";
import { findCurrentZone, collectLandmarkState, collectVisibleAnchorIds } from "./bootstrap/mapTelemetry";
import { getAppRoot, createRuntimeRoot, createOverlay, createCrosshair, configureMobileHud } from "./bootstrap/hud";
import {
  shouldReplaceSharedChampion,
  makeScoreStorageKey,
  normalizeScoreValue,
  readBestScore,
  writeBestScore,
} from "./bootstrap/scoreStorage";
import { loadRuntimeMaterials } from "./bootstrap/assetLoading";
import type {
  RevealPhase,
  PublicAgentFeedbackEvent,
  PublicAgentFeedbackEventInput,
  RuntimeTextState,
  PublicAgentRunSummary,
  PublicAgentObserveState,
  RuntimeHandle,
  RuntimeBootstrapOptions,
} from "./bootstrap/runtimeState";
export type { RuntimeTextState, RuntimeHandle } from "./bootstrap/runtimeState";

type ViewModelInstance = import("./weapons/Ak47AnimatedViewModel").WeaponViewModel;

const OVERVIEW_VIEWMODEL_DISABLE_HEIGHT_M = 10;
const PERF_SCENE_SAMPLE_INTERVAL_MS = 300;
const PERF_CPU_FRAME_SAMPLE_LIMIT = 120;
const POINTER_LOCK_BANNER_GRACE_MS = 2600;
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
  return !renderer.hasWebGL || renderer.softwareRendering;
}
const PUBLIC_AGENT_FEEDBACK_MAX_EVENTS = 24;

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

function isDebugBuffType(value: string): value is BuffType {
  return (BUFF_TYPES as readonly string[]).includes(value);
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

function splitOverlayMessages(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function bootstrapRuntime(options: RuntimeBootstrapOptions = {}): Promise<RuntimeHandle> {
  const appRoot = getAppRoot();
  const runtimeRoot = createRuntimeRoot(appRoot);
  const parsedUrlParams = parseRuntimeUrlParams(window.location.search);
  const qaAssetProfile = resolveQaAssetProfile(window.location.search);
  const deterministicQa = qaAssetProfile !== null;
  const qaTelemetryTargets = new Set(parsedUrlParams.qaTargets);
  const shadowsEnabled = parsedUrlParams.shadows;
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

  // Damage-free playtests are opt-in on localhost, including headless human
  // and agent runs. Without the explicit flag, normal combat remains active.
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
  const effectiveUnlimitedHealth = isLocalHostRuntime && runtimeParams.unlimitedHealthExplicit === true;
  const warmupAssets = options.warmup ?? null;
  const warmupTimedOut = warmupAssets?.timedOut === true;
  // A prefetch deadline measures network readiness, not desktop GPU capability.
  const performanceSafeFallback = mobile && warmupTimedOut;
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
  const countdownHud = new CountdownHud(runtimeRoot);
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
    mapAssets = warmupAssets?.mapAssets ?? await loadMap(runtimeParams.mapId);
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
    ao: (performanceSafeFallback || mobile || overviewShotAtBoot) ? false : runtimeParams.ao,
    post: !(performanceSafeFallback || mobile || overviewShotAtBoot),
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
  const audioForced = runtimeParams.audioForced;
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
  if (!deterministicQa && warmupAssets && !warmupTimedOut && !warmupAssets.enemyVisualsReady && !mobile) {
    appendWarning("Enemy model warmup failed. Using fallback enemy meshes to avoid late asset streaming.");
  }

  const { resolvedFloorMode, resolvedWallMode, floorMaterials, wallMaterials, propModels, facadeModels } =
    await loadRuntimeMaterials({
      runtimeParams, performanceSafeFallback, mobile, warmupAssets, mapAssets,
      qaAssetPlan, qaAssetTracker, effectiveFloorQuality, appendWarning,
    });

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
      const { createAk47ViewModel } = await import("./weapons/Ak47AnimatedViewModel");
      const nextViewModel = createAk47ViewModel();
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
    floorMode: resolvedFloorMode,
    wallMode: resolvedWallMode,
    floorQuality: effectiveFloorQuality,
    createEnvironmentMap: (scene, position) => renderer.createPmremEnvironment(scene, position),
    floorMaterials,
    wallMaterials,
    propModels,
    facadeModels,
    freezeInput: inputFrozen,
    spawn: runtimeParams.spawn,
    debug: runtimeParams.debug,
    mountEl: runtimeRoot,
    onWeaponShot: (shot) => {
      viewModel?.triggerShotFx(shot);
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
        } else {
          // Bullet hit the world, not an enemy: mark the visible surface it
          // struck (colliders are only boxes around the art, and some floors
          // and overhangs have none).
          bulletHoles?.spawnFromShot(
            camPos,
            shotDir,
            shot.hit && shot.hitPoint && shot.hitNormal
              ? { distance: shot.travelDistance, point: shot.hitPoint, normal: shot.hitNormal }
              : null,
            shot.travelDistance,
          );
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
  // The shot briefly lights nearby walls and floor. It stays in the scene at
  // zero so firing never changes the light count (and recompiles materials).
  const muzzleWorldLight = new PointLight(0xffa04a, 0, 7, 2);
  const muzzleWorldOffset = new Vector3();
  const viewModelLighting = createViewModelLighting();
  game.scene.add(muzzleWorldLight);

  // Bullet hole decals on world surfaces
  bulletHoles = new BulletHoleManager(game.scene, runtimeParams.seed ?? 1, {
    getSurfaceRoots: () => game.getBulletDecalSurfaceRoots(),
  });

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
    game.setWeaponFireInterval(DEFAULT_FIRE_INTERVAL_S);
    game.setWeaponReloadSpeed(1.0);
    game.setWeaponFreeReloads(false);
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
        game.setWeaponFreeReloads(gameplayTuning.buffs.freeReloads);
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
        game.setWeaponFireInterval(DEFAULT_FIRE_INTERVAL_S);
        game.setWeaponReloadSpeed(1.0);
        break;
      case "unlimited_ammo":
        game.setWeaponFreeReloads(false);
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
    onReloadStart: (durationSeconds) => {
      weaponAudio.playReloadStart(durationSeconds);
      pushPublicFeedback({ type: "reload-start" });
    },
    onReloadEnd: (finishedEarly) => {
      // An early finish (fire after the latch) drops the unstarted handguard
      // return foley; the seat already sounding rings out.
      weaponAudio.playReloadEnd(finishedEarly);
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
      viewModel?.reset?.();
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
  // ?bootGate=1 opts hardware-backed automation back in. Without it this gate — the one every
  // real player goes through — is unreachable from any test by construction,
  // so nothing would catch it hanging or regressing. It only ever makes boot do
  // more work behind the loading overlay. Software GL remains excluded because
  // synchronous driver work cannot be interrupted by the timer budgets.
  const forceHumanBootGate = runtimeParams.forceHumanBootGate;
  const humanBootGateEligible =
    mapAssets !== null
    && !deterministicQa
    && runtimeParams.controlMode === "human"
    && runtimeParams.shot === null
    && (navigator.webdriver !== true || forceHumanBootGate)
    && !isLikelySoftwareGl(renderer);

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
    if (!templateReady && (!warmupAssets || warmupTimedOut)) {
      // A completed but failed warmup already produced the fallback-mesh warning.
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
    viewModel.setEnvironment?.(game.scene.environment);
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
  const disposeWarmupOrb = buffManager.warmupOrbRenderer(game.camera);

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
      //    (prop GLB textures load fire-and-forget during the map build).
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
  let mobileOrientationGuard: OrientationGuard | null = null;
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
    mobileOrientationGuard = new OrientationGuard(runtimeRoot, "landscape");
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

    mobileFlashUpdate = configureMobileHud(healthHud, ammoHud, timerHud, killFeed);

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
  let startCountdownS = 0;      // pre-combat countdown after the loading screen; sim and wave timer wait on it
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
  const isInternalDebugSurface = resolveInternalDebugSurface(import.meta.env.DEV, window.location.hostname);
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
          requestedVisualMode: "bazaar",
          activeVisualMode: "bazaar",
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
      props: {
        candidatesTotal: game.getPropsBuildStats().candidatesTotal,
        collidersPlaced: game.getPropsBuildStats().collidersPlaced,
        rejections: {
          clearZone: game.getPropsBuildStats().rejectedClearZone,
          bounds: game.getPropsBuildStats().rejectedBounds,
          gapRule: game.getPropsBuildStats().rejectedGapRule,
        },
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
      perception: runtimeActive && mapLoaded ? game.getPublicPerception() : { visibleTargets: [], movementBlocked: false },
    };
  };

  function syncViewportNow(): void {
    renderer.resize();
    game.setAspect(renderer.getAspect());
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
    if (startCountdownS > 0 && !overlaySuspended) startCountdownS = Math.max(0, startCountdownS - dt);
    countdownHud.update(startCountdownS);
    const simulationSuspended = overlaySuspended || intermissionSuspended || game.getIsDead() || startCountdownS > 0;
    // The weapon's reload timer only advances on simDt, so the scheduled reload
    // foley has to hold and resume with it or it runs ahead of the hand.
    weaponAudio.setReloadPaused(simulationSuspended);

    // Feed mobile touch input before game update
    if (touchInput) {
      touchInput.setCaptureEnabled(!simulationSuspended && !game.getIsDead());
      swayMouseDeltaX += touchInput.lookDeltaX;
      swayMouseDeltaY += touchInput.lookDeltaY;
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
          viewModel?.onFootstep?.(footstepTimerS);
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
      healthHud.update({
        health: currentHealth,
        maxHealth: gameplayTuning.player.economy.maxHealth,
        overshield: game.getOvershield(),
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
    buffManager.update(simDt, game.getPlayerPosition());
    // Iron Skin lasts until broken: once damage empties the shield, end it.
    if (buffManager.isBuffActive("health_boost") && game.getOvershield() <= 0) {
      buffManager.consumeBuff("health_boost");
    }
    const activeBuffs = buffManager.getActiveBuffs();
    const rcActive = buffManager.isRallyingCryActive();
    buffHud.update({
      buffs: activeBuffs,
      rallyingCryActive: rcActive,
      rallyingCryBuffType: buffManager.getRallyingCryBuffType(),
      shield: { remaining: game.getOvershield(), capacity: gameplayTuning.buffs.shieldHealth },
    }, dt);
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

    if (viewModel) {
      viewModel.setFrameInput(speedMps, grounded, swayMouseDeltaX, swayMouseDeltaY);
      viewModel.setAmmoState?.(game.getAmmoSnapshot());
      viewModel.setWorldLighting?.(game.sampleViewModelLighting(viewModelLighting));
      swayMouseDeltaX = 0;
      swayMouseDeltaY = 0;
      viewModel.updateFromMainCamera(game.camera, simDt);
      const flash = viewModel.getMuzzleFlash?.(muzzleWorldOffset) ?? 0;
      muzzleWorldLight.intensity = flash * 10;
      if (flash > 0) muzzleWorldLight.position.copy(game.camera.position).add(muzzleWorldOffset);
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
      // A manual QA render advances no time and provides no frame-cadence sample.
      if (clampedMs > 0) {
        perfMsPerFrame = perfMsPerFrame * 0.9 + clampedMs * 0.1;
        perfFps = 1000 / Math.max(0.01, perfMsPerFrame);
      }
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
      remaining -= nextStep;
      // Keep every simulation/animation step, but present only the final state.
      // advanceTime(500) previously submitted 30 full map renders synchronously.
      step(nextStep, { renderFrame: options.renderFrame !== false && remaining <= 0 });
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
    // Automated and agent runtimes drive the simulation directly and expect it live at activate.
    if (runtimeParams.controlMode === "human" && !deterministicQa) startCountdownS = 5;
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
    // Compatibility hook: this adds simulation time while the normal loop keeps
    // running. Real-time SDK control must not call it.
    if (!runtimeActive) return;
    advanceSimulation(ms, {
      renderFrame: !deterministicQa && (runtimeParams.controlMode !== "agent" || document.visibilityState === "visible"),
    });
  };
  // QA and perf probes for local development, deterministic QA and automated
  // clients (the Playwright harness); real players' browsers do not get them.
  if (isInternalDebugSurface || deterministicQa || isAutomatedRuntime) {
    window.__runtime_ready_state = () => ({
      mapLoaded: Boolean(mapAssets),
      revealPhase: bootTelemetry.revealPhase,
      shotActive,
      shotId,
      qaCaptureReady: qaAssetTracker?.state().ready ?? true,
      qaAssetPlanHash: qaAssetPlan?.hash ?? null,
    });
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
  }
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
    countdownHud.dispose();
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

import path from "node:path";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  captureRuntimeSnapshot,
  DEFAULT_RUNTIME_READY_TIMEOUT_MS,
  ensureDir,
  gotoAgentRuntime,
  launchBrowser,
  parseBaseUrl,
  parseBooleanEnv,
  readRuntimeState,
  runAgentRoute,
  startTracing,
  stopTracing,
  writeJson,
} from "./lib/runtimePlaywright.mjs";

const { getGameplayTuning } = await tsImport(
  "../src/runtime/tuning/gameplayTuning.ts",
  import.meta.url,
);
const GAMEPLAY_TUNING = getGameplayTuning("desktop-agent");

function resolveBaselineTier(waveNumber) {
  const bands = GAMEPLAY_TUNING.waves.tierProgression.waveBands;
  const band = bands.find((candidate) => (
    waveNumber >= candidate.minWave
    && (candidate.maxWaveInclusive === null || waveNumber <= candidate.maxWaveInclusive)
  )) ?? bands.at(-1);
  return band?.tier ?? 0;
}

function checkpointId(seconds) {
  return `t${String(seconds).replace(".", "p")}`;
}

const WAVE_ONE_PRESSURE = GAMEPLAY_TUNING.waves.pressure.waveBands.find((band) => (
  band.minWave <= 1 && (band.maxWaveInclusive === null || band.maxWaveInclusive >= 1)
));
if (!WAVE_ONE_PRESSURE) {
  throw new Error("[bot:smoke] Gameplay tuning has no wave-one pressure band");
}
const SEARCH_START_S = WAVE_ONE_PRESSURE.searchStartS;
const FULL_PRESSURE_S = WAVE_ONE_PRESSURE.fullPressureS;
const PRE_SEARCH_S = Math.min(15, SEARCH_START_S / 2);
const SWEEP_PRESSURE_S = SEARCH_START_S + ((FULL_PRESSURE_S - SEARCH_START_S) * 2 / 3);
const POST_FULL_PRESSURE_S = FULL_PRESSURE_S + 15;
const WAVE_ONE_TIER = resolveBaselineTier(1);
const WAVE_TWO_TIER = resolveBaselineTier(2);
const MIN_HIDDEN_SWEEP_CLOSURE_M = 3.5;

const BASE_URL = parseBaseUrl(process.env.BASE_URL ?? "http://127.0.0.1:5174");
const MAP_ID = (process.env.MAP_ID ?? "bazaar-map").trim() || "bazaar-map";
const HEADLESS = parseBooleanEnv(process.env.HEADLESS, true);
const MAP_MID_Z = 46;
const EXPECTED_BOT_COUNT = GAMEPLAY_TUNING.waves.enemiesPerWave;
const BOT_OVERLAP_DISTANCE_M = 0.59;
const ELEVATED_Y_MIN_M = 1;
const HIDDEN_PLAYER_ZONE_ID = "SERVICE_NORTH";
const TERRACE_ZONE_ID = "TEA_TERRACE";
const HIDDEN_PLAYER_POSE = { x: 6.5, y: 0.0001, z: 65, yawDeg: 180 };
const TERRACE_PLAYER_POSE = { x: 15, y: 1.4001, z: 61, yawDeg: 180 };
const HIDDEN_PLAYER_ROUTE = {
  id: "hide-service-west",
  label: "Move toward west service lane",
  spawn: "A",
  expectedMinDistanceM: 18,
  maxStationaryTicks: 12,
  segments: [
    { durationMs: 1200, action: { moveX: 1 } },
    { durationMs: 1200, action: { moveZ: 1 } },
    { durationMs: 1200, action: { moveX: 1 } },
  ],
};

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function fail(message) {
  throw new Error(`[bot:smoke] ${message}`);
}

function summarizeState(state) {
  return {
    waveNumber: state?.bots?.waveNumber ?? null,
    waveElapsedS: state?.bots?.waveElapsedS ?? null,
    tier: state?.bots?.tier ?? null,
    aliveCount: state?.bots?.aliveCount ?? null,
    roleCounts: state?.bots?.roleCounts ?? null,
    preventedFriendlyFireCount: state?.bots?.preventedFriendlyFireCount ?? null,
    lastSpawn: state?.bots?.lastSpawn ?? null,
    enemyStates: Array.isArray(state?.bots?.enemies)
      ? state.bots.enemies.map((enemy) => ({
          id: enemy.id,
          role: enemy.role,
          state: enemy.state,
          position: enemy.position,
          assignedNodeId: enemy.assignedNodeId,
          directSight: enemy.directSight,
          aimYawErrorDeg: enemy.aimYawErrorDeg,
          directiveAgeS: enemy.directiveAgeS,
          targetNodeChangeCount: enemy.targetNodeChangeCount,
        }))
      : [],
  };
}

function buildEnemyMap(state) {
  const out = new Map();
  for (const enemy of state?.bots?.enemies ?? []) {
    out.set(enemy.id, enemy);
  }
  return out;
}

function countMovedEnemies(fromState, toState, minDistanceM) {
  const fromMap = buildEnemyMap(fromState);
  let count = 0;
  for (const enemy of toState?.bots?.enemies ?? []) {
    const previous = fromMap.get(enemy.id);
    if (!previous) continue;
    const dx = enemy.position.x - previous.position.x;
    const dz = enemy.position.z - previous.position.z;
    if (Math.hypot(dx, dz) >= minDistanceM) {
      count += 1;
    }
  }
  return count;
}

function countSettledEnemies(state) {
  const settledStates = new Set(["HOLD", "OVERWATCH", "INVESTIGATE", "PEEK", "PRESSURE", "FALLBACK", "RELOAD"]);
  return (state?.bots?.enemies ?? []).filter((enemy) => settledStates.has(enemy.state)).length;
}

function countStableAimEnemies(state) {
  return (state?.bots?.enemies ?? []).filter((enemy) => enemy.directiveAgeS >= 0.5 && enemy.aimYawErrorDeg <= 60).length;
}

function averageDistanceToPlayer(state) {
  const player = state?.player?.pos;
  const enemies = state?.bots?.enemies ?? [];
  if (!player || enemies.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const enemy of enemies) {
    total += Math.hypot(enemy.position.x - player.x, enemy.position.z - player.z);
  }
  return total / enemies.length;
}

function minimumDistanceToPlayer(state) {
  const player = state?.player?.pos;
  const enemies = state?.bots?.enemies ?? [];
  if (!player || enemies.length === 0) return Number.POSITIVE_INFINITY;

  let best = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    best = Math.min(best, Math.hypot(enemy.position.x - player.x, enemy.position.z - player.z));
  }
  return best;
}

function collectSpawnValidationIssues(state, { checkLiveElevation = true } = {}) {
  const issues = [];
  for (const enemy of state?.bots?.enemies ?? []) {
    const spawnValidation = enemy.spawnValidation;
    if (!spawnValidation) {
      issues.push(`${enemy.id}:missing-spawn-validation`);
      continue;
    }
    if (!spawnValidation.valid) {
      issues.push(`${enemy.id}:invalid-spawn`);
    }
    if (!spawnValidation.withinPlayableBounds) {
      issues.push(`${enemy.id}:out-of-bounds`);
    }
    if (!spawnValidation.insideExpectedZone) {
      issues.push(`${enemy.id}:outside-zone`);
    }
    if ((spawnValidation.blockingColliderIds ?? []).length > 0) {
      issues.push(`${enemy.id}:blocked-by-${spawnValidation.blockingColliderIds.join("+")}`);
    }
    if (checkLiveElevation && (enemy.position?.y ?? 0) < -0.05) {
      issues.push(`${enemy.id}:below-surface-y=${(enemy.position?.y ?? 0).toFixed(3)}`);
    }
  }
  return issues;
}

function spawnValidationDetail(state) {
  const issues = collectSpawnValidationIssues(state);
  return issues.length > 0 ? issues.join(", ") : "ok";
}

function laneFromX(x) {
  if (x < 20) return "west";
  if (x >= 41) return "east";
  return "main";
}

function countBotsInLane(state, lane) {
  return (state?.bots?.enemies ?? []).filter((enemy) => laneFromX(enemy.position.x) === lane).length;
}

function laneCounts(state) {
  return {
    west: countBotsInLane(state, "west"),
    main: countBotsInLane(state, "main"),
    east: countBotsInLane(state, "east"),
  };
}

function spawnLaneCounts(state, zoneLanes) {
  const counts = { west: 0, main: 0, east: 0 };
  for (const enemy of state?.bots?.enemies ?? []) {
    const zoneId = enemy.spawnValidation?.actualZoneId ?? enemy.spawnValidation?.expectedZoneId ?? null;
    const lane = zoneId ? zoneLanes?.[zoneId] : null;
    if (lane === "west" || lane === "main" || lane === "east") counts[lane] += 1;
    else counts[laneFromX(enemy.position.x)] += 1;
  }
  return counts;
}

function findOverlappingBotPairs(state, minimumDistanceM = BOT_OVERLAP_DISTANCE_M) {
  const enemies = state?.bots?.enemies ?? [];
  const pairs = [];
  for (let i = 0; i < enemies.length - 1; i += 1) {
    const first = enemies[i];
    for (let j = i + 1; j < enemies.length; j += 1) {
      const second = enemies[j];
      const distance = Math.hypot(
        first.position.x - second.position.x,
        first.position.z - second.position.z,
      );
      if (distance < minimumDistanceM) {
        pairs.push({
          firstId: first.id,
          secondId: second.id,
          distance,
        });
      }
    }
  }
  return pairs;
}

function overlappingBotPairDetail(state) {
  const pairs = findOverlappingBotPairs(state);
  return pairs.length > 0
    ? pairs.map((pair) => `${pair.firstId}+${pair.secondId}@${pair.distance.toFixed(3)}`).join(", ")
    : "ok";
}

function botsOnOppositeHalf(state) {
  const playerZ = state?.player?.pos?.z;
  const enemies = state?.bots?.enemies ?? [];
  if (typeof playerZ !== "number" || enemies.length === 0) return false;
  const playerStartsSouth = playerZ < MAP_MID_Z;
  return enemies.every((enemy) => playerStartsSouth ? enemy.position.z > MAP_MID_Z : enemy.position.z < MAP_MID_Z);
}

function countNoSightOverwatch(state) {
  return (state?.bots?.enemies ?? []).filter((enemy) => enemy.state === "OVERWATCH" && enemy.directSight !== true).length;
}

function hasCombatEngagement(state) {
  const player = state?.player?.pos;
  if (!player) return false;
  return (state?.bots?.enemies ?? []).some((enemy) => {
    const dx = enemy.position.x - player.x;
    const dz = enemy.position.z - player.z;
    const distance = Math.hypot(dx, dz);
    return distance >= 4 && enemy.directSight === true && (
      enemy.state === "OVERWATCH"
      || enemy.reactionRemainingS > 0
      || enemy.burstShotsRemaining > 0
    );
  });
}

function countElevatedEnemies(state) {
  return (state?.bots?.enemies ?? []).filter((enemy) => (enemy.position?.y ?? 0) >= ELEVATED_Y_MIN_M).length;
}

function hasElevatedContact(state) {
  return (state?.bots?.enemies ?? []).some((enemy) =>
    (enemy.position?.y ?? 0) >= ELEVATED_Y_MIN_M
    && enemy.directSight === true);
}

function findPersistentlyStuckEnemies(states, minimumWindowS = 25) {
  if (states.length < 2) return [];
  const first = buildEnemyMap(states[0]);
  const last = buildEnemyMap(states.at(-1));
  const elapsedS = (states.at(-1)?.bots?.waveElapsedS ?? 0) - (states[0]?.bots?.waveElapsedS ?? 0);
  if (elapsedS < minimumWindowS) return [];
  const movingStates = new Set(["ROTATE", "INVESTIGATE", "PRESSURE", "FALLBACK"]);
  const stuck = [];
  for (const [id, start] of first) {
    const end = last.get(id);
    if (!end || !movingStates.has(end.state) || !end.assignedNodeId) continue;
    const distance = Math.hypot(end.position.x - start.position.x, end.position.z - start.position.z);
    if (distance < 0.35 && end.targetNodeChangeCount === start.targetNodeChangeCount) stuck.push(id);
  }
  return stuck;
}

async function readAuthoredSpawnAcceptance() {
  const mapPath = path.resolve(process.cwd(), "public/maps", MAP_ID, "map_spec.json");
  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const surfaces = new Map((map.traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  const enemySpawns = (map.authoredSpawns ?? []).filter((spawn) => spawn.kind === "enemy");
  const invalid = enemySpawns.filter((spawn) => {
    const surface = surfaces.get(spawn.surfaceId);
    return !surface || surface.zoneId !== spawn.zoneId;
  });
  const elevated = enemySpawns.filter((spawn) => {
    const surface = surfaces.get(spawn.surfaceId);
    return surface?.elevationM >= ELEVATED_Y_MIN_M || surface?.startElevationM >= ELEVATED_Y_MIN_M;
  });
  return {
    formatVersion: map.formatVersion ?? null,
    enemySpawnCount: enemySpawns.length,
    invalidIds: invalid.map((spawn) => spawn.id),
    elevatedIds: elevated.map((spawn) => spawn.id),
    terraceIds: enemySpawns.filter((spawn) => spawn.zoneId === TERRACE_ZONE_ID).map((spawn) => spawn.id),
    zoneLanes: Object.fromEntries((map.zones ?? []).map((zone) => [zone.id, zone.macroLane])),
  };
}

function renderReview(summary) {
  const lines = [
    "# Bot Intelligence Smoke Review",
    "",
    `- Status: ${summary.passed ? "PASS" : "FAIL"}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Map ID: ${summary.mapId}`,
    `- Output: ${summary.outputDir}`,
    `- Started: ${summary.startedAt}`,
    `- Finished: ${summary.finishedAt}`,
    "",
    "## Checkpoints",
  ];

  for (const checkpoint of summary.checkpoints) {
    lines.push(
      `- ${checkpoint.id}: wave=${checkpoint.snapshot.waveNumber} elapsed=${checkpoint.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} tier=${checkpoint.snapshot.tier} alive=${checkpoint.snapshot.aliveCount} ff=${checkpoint.snapshot.preventedFriendlyFireCount}`,
    );
    lines.push(`  - image: ${checkpoint.imagePath}`);
    lines.push(`  - state: ${checkpoint.statePath}`);
    lines.push(`  - consoleErrors: ${checkpoint.console.errorCount}`);
  }

  lines.push("", "## Bazaar v3 Authored Spawns");
  lines.push(`- format: ${summary.authoredSpawns?.formatVersion ?? "n/a"}`);
  lines.push(`- enemy spawns: ${summary.authoredSpawns?.enemySpawnCount ?? 0}`);
  lines.push(`- elevated: ${(summary.authoredSpawns?.elevatedIds ?? []).join(", ") || "none"}`);
  lines.push(`- Tea Terrace: ${(summary.authoredSpawns?.terraceIds ?? []).join(", ") || "none"}`);

  if (summary.longSightline) {
    lines.push("", "## Long Sightline");
    lines.push(
      `- ${summary.longSightline.id}: wave=${summary.longSightline.snapshot.waveNumber} elapsed=${summary.longSightline.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} tier=${summary.longSightline.snapshot.tier} alive=${summary.longSightline.snapshot.aliveCount} ff=${summary.longSightline.snapshot.preventedFriendlyFireCount}`,
    );
    lines.push(`  - image: ${summary.longSightline.imagePath}`);
    lines.push(`  - state: ${summary.longSightline.statePath}`);
    lines.push(`  - consoleErrors: ${summary.longSightline.console.errorCount}`);
  }

  if (summary.zeroContact) {
    lines.push("", "## Zero Contact");
    for (const checkpoint of summary.zeroContact.checkpoints ?? []) {
      lines.push(
        `- ${checkpoint.id}: wave=${checkpoint.snapshot.waveNumber} elapsed=${checkpoint.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} alive=${checkpoint.state?.gameplay?.alive !== false} avgDist=${averageDistanceToPlayer(checkpoint.state).toFixed(2)}`,
      );
      lines.push(`  - image: ${checkpoint.imagePath}`);
      lines.push(`  - state: ${checkpoint.statePath}`);
      lines.push(`  - consoleErrors: ${checkpoint.console.errorCount}`);
    }
  }

  if (summary.hiddenSearch) {
    lines.push("", "## Hidden Search");
    if (summary.hiddenSearch.route) {
      lines.push(`- route: ${summary.hiddenSearch.route.routeId} distance=${summary.hiddenSearch.route.distanceM?.toFixed?.(2) ?? "n/a"} zones=${(summary.hiddenSearch.route.zonesVisited ?? []).join(",")}`);
    }
    for (const checkpoint of summary.hiddenSearch.checkpoints ?? []) {
      lines.push(
        `- ${checkpoint.id}: wave=${checkpoint.snapshot.waveNumber} elapsed=${checkpoint.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} alive=${checkpoint.state?.gameplay?.alive !== false} avgDist=${averageDistanceToPlayer(checkpoint.state).toFixed(2)}`,
      );
      lines.push(`  - image: ${checkpoint.imagePath}`);
      lines.push(`  - state: ${checkpoint.statePath}`);
      lines.push(`  - consoleErrors: ${checkpoint.console.errorCount}`);
    }
  }

  if (summary.terraceCombat) {
    lines.push("", "## Tea Terrace Combat");
    for (const checkpoint of summary.terraceCombat.checkpoints ?? []) {
      lines.push(
        `- ${checkpoint.id}: elevatedBots=${countElevatedEnemies(checkpoint.state)} elevatedContact=${hasElevatedContact(checkpoint.state)}`,
      );
      lines.push(`  - image: ${checkpoint.imagePath}`);
      lines.push(`  - state: ${checkpoint.statePath}`);
      lines.push(`  - consoleErrors: ${checkpoint.console.errorCount}`);
    }
  }

  if (summary.respawnScenario?.checkpoint) {
    lines.push("", "## Adaptive Respawn");
    if (summary.respawnScenario.route) {
      lines.push(`- route: ${summary.respawnScenario.route.routeId} distance=${summary.respawnScenario.route.distanceM?.toFixed?.(2) ?? "n/a"} zones=${(summary.respawnScenario.route.zonesVisited ?? []).join(",")}`);
    }
    lines.push(
      `- ${summary.respawnScenario.checkpoint.id}: wave=${summary.respawnScenario.checkpoint.snapshot.waveNumber} elapsed=${summary.respawnScenario.checkpoint.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} alive=${summary.respawnScenario.checkpoint.snapshot.aliveCount} minDist=${minimumDistanceToPlayer(summary.respawnScenario.checkpoint.state).toFixed(2)}`,
    );
    lines.push(`  - image: ${summary.respawnScenario.checkpoint.imagePath}`);
    lines.push(`  - state: ${summary.respawnScenario.checkpoint.statePath}`);
    lines.push(`  - consoleErrors: ${summary.respawnScenario.checkpoint.console.errorCount}`);
  }

  lines.push("", "## Assertions");
  for (const assertion of summary.assertions) {
    lines.push(`- ${assertion.passed ? "PASS" : "FAIL"} ${assertion.label}: ${assertion.detail}`);
  }

  return `${lines.join("\n")}\n`;
}

function isIgnorableConsoleEvent(event) {
  const text = event?.text ?? "";
  const url = event?.url ?? event?.location?.url ?? "";
  return (
    url.includes("/api/run/start")
    || text.includes("[shared-champion] failed to start run session")
    || text.includes("[shared-champion] failed to load SyntaxError")
    || text.includes("POST /api/run/start failed: 404")
  );
}

function summarizeConsoleEvents(events) {
  const filtered = events.filter((event) => !isIgnorableConsoleEvent(event));
  const errorCount = filtered.filter((event) => event.type === "error" || event.kind === "pageerror").length;
  const warningCount = filtered.filter((event) => event.type === "warning" || event.type === "warn").length;
  return {
    errorCount,
    warningCount,
    total: filtered.length,
  };
}

async function waitForRuntimeState(page) {
  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") return false;
    try {
      const state = JSON.parse(window.render_game_to_text());
      return state.mode === "runtime"
        && state.map?.loaded === true
        && state.boot?.revealPhase === "active";
    } catch {
      return false;
    }
  }, undefined, { timeout: DEFAULT_RUNTIME_READY_TIMEOUT_MS });
}

async function captureCheckpoint(page, outputDir, consoleRecorder, id) {
  await waitForRuntimeState(page);
  const imagePath = path.join(outputDir, `${id}.png`);
  const statePath = path.join(outputDir, `${id}.state.json`);
  const consolePath = path.join(outputDir, `${id}.console.json`);
  const state = await captureRuntimeSnapshot(page, { imagePath, statePath });
  const consoleEvents = consoleRecorder.snapshot();
  const consoleCounts = summarizeConsoleEvents(consoleEvents);
  await writeJson(consolePath, {
    events: consoleEvents,
    counts: consoleCounts,
  });

  return {
    id,
    imagePath,
    statePath,
    consolePath,
    console: consoleCounts,
    snapshot: summarizeState(state),
    state,
  };
}

async function readRuntimeStateWithRetry(page, { retries = 8, delayMs = 250 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await readRuntimeState(page);
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(delayMs);
    }
  }
  throw lastError;
}

async function advanceToWaveElapsedS(page, targetS, onIntermediateState) {
  let state = await readRuntimeStateWithRetry(page);
  let remainingMs = Math.max(0, Math.round(targetS * 1000 - ((state?.bots?.waveElapsedS ?? 0) * 1000)));

  while (remainingMs > 5_000) {
    await advanceRuntime(page, 5_000);
    remainingMs -= 5_000;
    state = await readRuntimeStateWithRetry(page);
    if (onIntermediateState) {
      await onIntermediateState(state);
    }
  }

  if (remainingMs > 0) {
    await advanceRuntime(page, remainingMs);
    state = await readRuntimeStateWithRetry(page);
    if (onIntermediateState) {
      await onIntermediateState(state);
    }
  }

  return state;
}

async function enforceHiddenPlayerPose(page, options = {}) {
  const suppressIntelMs = options.suppressIntelMs ?? 0;
  await page.evaluate(({ pose, suppressIntel }) => {
    window.__debug_set_player_pose?.(pose);
    if (suppressIntel > 0) {
      window.__debug_suppress_bot_intel_ms?.(suppressIntel);
    }
    window.agent_apply_action?.({
      moveX: 0,
      moveZ: 0,
      lookYawDelta: 0,
      lookPitchDelta: 0,
      fire: false,
      crouch: true,
    });
  }, { pose: HIDDEN_PLAYER_POSE, suppressIntel: suppressIntelMs });
}

const outputDir = path.resolve(process.cwd(), `../../artifacts/playwright/completion-gate/bot-intelligence/${timestampId()}`);
const stableDir = path.resolve(process.cwd(), "../../artifacts/playwright/completion-gate/bot-intelligence");

await ensureDir(outputDir);
await ensureDir(stableDir);

const { browser, context, page: initialPage } = await launchBrowser({ headless: HEADLESS });
let page = initialPage;
let consoleRecorder = attachConsoleRecorder(page);
await startTracing(context);
let tracingActive = true;

async function stopTracingOnce(tracePath) {
  if (!tracingActive) return;
  tracingActive = false;
  await stopTracing(context, tracePath);
}

const summary = {
  baseUrl: BASE_URL,
  mapId: MAP_ID,
  headless: HEADLESS,
  outputDir,
  startedAt: new Date().toISOString(),
  checkpoints: [],
  authoredSpawns: await readAuthoredSpawnAcceptance(),
  longSightline: null,
  zeroContact: {
    checkpoints: [],
  },
  hiddenSearch: {
    route: null,
    checkpoints: [],
  },
  terraceCombat: {
    checkpoints: [],
  },
  respawnScenario: {
    route: null,
    checkpoint: null,
    eliminated: 0,
  },
  assertions: [],
};

try {
  const url = buildRuntimeUrl(BASE_URL, {
    mapId: MAP_ID,
    autostart: "human",
    spawn: "A",
    extraSearchParams: {
      unlimitedHealth: 1,
      debug: 1,
    },
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForRuntimeState(page);

  const checkpointTargets = [0, PRE_SEARCH_S, SEARCH_START_S, SWEEP_PRESSURE_S, FULL_PRESSURE_S];
  const checkpoints = checkpointTargets.map((targetS) => ({
    id: checkpointId(targetS),
    targetS,
  }));

  for (const checkpoint of checkpoints) {
    consoleRecorder.clear();
    if (checkpoint.targetS > 0) {
      // Large single-frame jumps can exceed the QA browser-operation watchdog
      // on detailed maps. The helper preserves the same simulation target in
      // bounded chunks without changing the authored gameplay assertion.
      await advanceToWaveElapsedS(page, checkpoint.targetS);
    }
    summary.checkpoints.push(await captureCheckpoint(page, outputDir, consoleRecorder, checkpoint.id));
  }

  consoleRecorder.clear();
  const longSightUrl = buildRuntimeUrl(BASE_URL, {
    mapId: MAP_ID,
    autostart: "human",
    spawn: "A",
    extraSearchParams: {
      unlimitedHealth: 1,
      debug: 1,
    },
  });
  await page.goto(longSightUrl, { waitUntil: "domcontentloaded" });
  await waitForRuntimeState(page);
  await advanceRuntime(page, 4_000);
  summary.longSightline = await captureCheckpoint(page, outputDir, consoleRecorder, "long-sightline");
  summary.longSightline.id = "spawn-a-long-los";

  // Use a fresh page before the long search scenarios so earlier runtime and
  // WebGL teardown work cannot accumulate across unrelated assertions.
  await page.close();
  page = await context.newPage();
  consoleRecorder = attachConsoleRecorder(page);
  await gotoAgentRuntime(page, {
    baseUrl: BASE_URL,
    mapId: MAP_ID,
    agentName: "ZeroContact",
    spawn: "A",
    extraSearchParams: {
      debug: 1,
    },
  });
  const zeroContactOutputDir = path.join(outputDir, "zero-contact");
  await enforceHiddenPlayerPose(page, { suppressIntelMs: 55_000 });
  summary.zeroContact.checkpoints.push(await captureCheckpoint(page, zeroContactOutputDir, consoleRecorder, "post-teleport"));

  const zeroContactTargetsS = [
    PRE_SEARCH_S,
    SEARCH_START_S,
    SWEEP_PRESSURE_S,
    POST_FULL_PRESSURE_S,
  ];
  let zeroContactDeathAtS = null;
  for (const targetS of zeroContactTargetsS) {
    consoleRecorder.clear();
    await advanceToWaveElapsedS(page, targetS, async (currentState) => {
      if (zeroContactDeathAtS === null && (currentState?.gameplay?.alive === false || currentState?.gameOver?.visible === true)) {
        zeroContactDeathAtS = currentState?.bots?.waveElapsedS ?? null;
      }
      if (zeroContactDeathAtS === null && currentState?.gameplay?.alive !== false && currentState?.player?.zoneId !== HIDDEN_PLAYER_ZONE_ID) {
        await enforceHiddenPlayerPose(page, { suppressIntelMs: 10_000 });
      }
    });
    const checkpoint = await captureCheckpoint(page, zeroContactOutputDir, consoleRecorder, checkpointId(targetS));
    if (zeroContactDeathAtS === null && (checkpoint.state?.gameplay?.alive === false || checkpoint.state?.gameOver?.visible === true)) {
      zeroContactDeathAtS = checkpoint.state?.bots?.waveElapsedS ?? null;
    }
    summary.zeroContact.checkpoints.push(checkpoint);
  }
  summary.zeroContact.deathAtS = zeroContactDeathAtS;

  consoleRecorder.clear();
  await gotoAgentRuntime(page, {
    baseUrl: BASE_URL,
    mapId: MAP_ID,
    agentName: "BotSmoke",
    spawn: "A",
    extraSearchParams: {
      debug: 1,
    },
  });
  const hiddenOutputDir = path.join(outputDir, "hidden-search");
  const hiddenRoute = await runAgentRoute(page, HIDDEN_PLAYER_ROUTE, { tickMs: 100 });
  await enforceHiddenPlayerPose(page);
  summary.hiddenSearch.route = hiddenRoute;
  consoleRecorder.clear();
  summary.hiddenSearch.checkpoints.push(await captureCheckpoint(page, hiddenOutputDir, consoleRecorder, "post-route"));

  const hiddenTargetsS = [SEARCH_START_S, SWEEP_PRESSURE_S, POST_FULL_PRESSURE_S];
  let hiddenDeathAtS = null;
  for (const targetS of hiddenTargetsS) {
    consoleRecorder.clear();
    await advanceToWaveElapsedS(page, targetS, async (currentState) => {
      if (hiddenDeathAtS === null && (currentState?.gameplay?.alive === false || currentState?.gameOver?.visible === true)) {
        hiddenDeathAtS = currentState?.bots?.waveElapsedS ?? null;
      }
      if (hiddenDeathAtS === null && currentState?.gameplay?.alive !== false && currentState?.player?.zoneId !== HIDDEN_PLAYER_ZONE_ID) {
        await enforceHiddenPlayerPose(page);
      }
    });
    const checkpoint = await captureCheckpoint(page, hiddenOutputDir, consoleRecorder, checkpointId(targetS));
    if (hiddenDeathAtS === null && (checkpoint.state?.gameplay?.alive === false || checkpoint.state?.gameOver?.visible === true)) {
      hiddenDeathAtS = checkpoint.state?.bots?.waveElapsedS ?? null;
    }
    summary.hiddenSearch.checkpoints.push(checkpoint);
  }
  summary.hiddenSearch.deathAtS = hiddenDeathAtS;

  consoleRecorder.clear();
  await gotoAgentRuntime(page, {
    baseUrl: BASE_URL,
    mapId: MAP_ID,
    agentName: "TerraceCombat",
    spawn: "A",
    extraSearchParams: {
      unlimitedHealth: 1,
      debug: 1,
    },
  });
  await page.evaluate((pose) => window.__debug_set_player_pose?.(pose), TERRACE_PLAYER_POSE);
  const terraceOutputDir = path.join(outputDir, "terrace-combat");
  summary.terraceCombat.checkpoints.push(await captureCheckpoint(page, terraceOutputDir, consoleRecorder, "terrace-t0"));
  await advanceToWaveElapsedS(page, PRE_SEARCH_S);
  summary.terraceCombat.checkpoints.push(await captureCheckpoint(page, terraceOutputDir, consoleRecorder, `terrace-${checkpointId(PRE_SEARCH_S)}`));
  await advanceToWaveElapsedS(page, SEARCH_START_S);
  summary.terraceCombat.checkpoints.push(await captureCheckpoint(page, terraceOutputDir, consoleRecorder, `terrace-${checkpointId(SEARCH_START_S)}`));

  // The search/terrace scenarios advance several minutes of deterministic
  // simulation. Isolate the final respawn check from their accumulated page
  // state so its lightweight readiness probe measures the new runtime only.
  await page.close();
  page = await context.newPage();
  consoleRecorder = attachConsoleRecorder(page);
  await gotoAgentRuntime(page, {
    baseUrl: BASE_URL,
    mapId: MAP_ID,
    agentName: "RespawnCheck",
    spawn: "A",
    extraSearchParams: {
      unlimitedHealth: 1,
      debug: 1,
    },
  });
  summary.respawnScenario.route = await runAgentRoute(page, HIDDEN_PLAYER_ROUTE, { tickMs: 100 });
  const respawnRouteState = await readRuntimeState(page);
  if (!respawnRouteState?.gameplay?.alive) {
    fail("Adaptive respawn route died before wave clear");
  }
  summary.respawnScenario.eliminated = await page.evaluate(() => window.__debug_eliminate_all_bots?.() ?? 0);
  await advanceRuntime(page, 150);
  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") return false;
    try {
      const state = JSON.parse(window.render_game_to_text());
      return state?.bots?.aliveCount === 0;
    } catch {
      return false;
    }
  }, { timeout: 5_000 });
  await advanceRuntime(page, (GAMEPLAY_TUNING.flow.intermissionDurationS * 1_000) + 250);
  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") return false;
    try {
      const state = JSON.parse(window.render_game_to_text());
      return state?.bots?.waveNumber === 2 && state?.bots?.lastSpawn?.mode === "adaptive";
    } catch {
      return false;
    }
  }, { timeout: 10_000 });
  summary.respawnScenario.checkpoint = await captureCheckpoint(page, outputDir, consoleRecorder, "respawn-wave2");

  const checkpointMap = new Map(summary.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.state]));
  const zeroContactCheckpointMap = new Map(summary.zeroContact.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.state]));
  const hiddenCheckpointMap = new Map(summary.hiddenSearch.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.state]));
  const t0 = checkpointMap.get(checkpointId(0));
  const preSearch = checkpointMap.get(checkpointId(PRE_SEARCH_S));
  const searchStart = checkpointMap.get(checkpointId(SEARCH_START_S));
  const pressureSweep = checkpointMap.get(checkpointId(SWEEP_PRESSURE_S));
  const fullPressure = checkpointMap.get(checkpointId(FULL_PRESSURE_S));
  const zeroContactPostTeleport = zeroContactCheckpointMap.get("post-teleport");
  const zeroContactPreSearch = zeroContactCheckpointMap.get(checkpointId(PRE_SEARCH_S));
  const zeroContactSearchStart = zeroContactCheckpointMap.get(checkpointId(SEARCH_START_S));
  const zeroContactEnd = zeroContactCheckpointMap.get(checkpointId(POST_FULL_PRESSURE_S));
  const hiddenPostRoute = hiddenCheckpointMap.get("post-route");
  const hiddenSearchStart = hiddenCheckpointMap.get(checkpointId(SEARCH_START_S));
  const hiddenSweep = hiddenCheckpointMap.get(checkpointId(SWEEP_PRESSURE_S));
  const hiddenEnd = hiddenCheckpointMap.get(checkpointId(POST_FULL_PRESSURE_S));
  const respawnState = summary.respawnScenario.checkpoint?.state ?? null;
  const respawnTelemetry = respawnState?.bots?.lastSpawn ?? null;
  if (!t0 || !preSearch || !searchStart || !pressureSweep || !fullPressure || !zeroContactPostTeleport || !zeroContactPreSearch || !zeroContactSearchStart || !zeroContactEnd || !hiddenPostRoute || !hiddenSearchStart || !hiddenSweep || !hiddenEnd || !respawnState || !respawnTelemetry) {
    fail("Missing one or more checkpoint states");
  }
  const initialTelemetry = t0.bots.lastSpawn ?? null;
  const initialLaneCounts = spawnLaneCounts(t0, summary.authoredSpawns.zoneLanes);
  const settledAtSweep = countSettledEnemies(pressureSweep);
  const stableAimAtSweep = countStableAimEnemies(pressureSweep);
  const respawnMinDistance = minimumDistanceToPlayer(respawnState);
  const activeStates = [t0, preSearch, searchStart, pressureSweep, fullPressure];
  const persistentStuckIds = findPersistentlyStuckEnemies([preSearch, searchStart, pressureSweep, fullPressure]);
  const terraceStates = summary.terraceCombat.checkpoints.map((checkpoint) => checkpoint.state);

  const assertions = [
    {
      label: "v3 declares the tuned number of valid authored enemy spawns",
      passed:
        summary.authoredSpawns.formatVersion === "3.0"
        && summary.authoredSpawns.enemySpawnCount === EXPECTED_BOT_COUNT
        && summary.authoredSpawns.invalidIds.length === 0,
      detail: `format=${summary.authoredSpawns.formatVersion} count=${summary.authoredSpawns.enemySpawnCount} invalid=${summary.authoredSpawns.invalidIds.join("/") || "none"}`,
    },
    {
      label: "v3 authors an elevated Tea Terrace enemy spawn",
      passed: summary.authoredSpawns.elevatedIds.length >= 1 && summary.authoredSpawns.terraceIds.length >= 1,
      detail: `elevated=${summary.authoredSpawns.elevatedIds.join("/") || "none"} terrace=${summary.authoredSpawns.terraceIds.join("/") || "none"}`,
    },
    {
      label: "starts on wave 1 at the tuned baseline tier",
      passed: t0.bots.waveNumber === 1 && t0.bots.tier === WAVE_ONE_TIER,
      detail: `wave=${t0.bots.waveNumber} tier=${t0.bots.tier} expected=${WAVE_ONE_TIER}`,
    },
    {
      label: "wave 1 uses adaptive initial spawn telemetry",
      passed:
        initialTelemetry !== null
        && initialTelemetry.mode === "adaptive"
        && initialTelemetry.selectedNodeIds.length === EXPECTED_BOT_COUNT,
      detail: `mode=${initialTelemetry?.mode ?? "n/a"} nodes=${initialTelemetry?.selectedNodeIds?.length ?? 0}`,
    },
    {
      label: "wave 1 starts with the tuned live-bot count",
      passed: t0.bots.aliveCount === EXPECTED_BOT_COUNT,
      detail: `alive=${t0.bots.aliveCount}`,
    },
    {
      label: "initial spawn opens with zero visible bots",
      passed: initialTelemetry !== null && initialTelemetry.visibleCount === 0,
      detail: `visible=${initialTelemetry?.visibleCount ?? "n/a"}`,
    },
    {
      label: "initial spawn stays on the opposite half of the map",
      passed: botsOnOppositeHalf(t0),
      detail: `playerZ=${t0.player?.pos?.z ?? "n/a"} enemyZ=${(t0.bots.enemies ?? []).map((enemy) => enemy.position.z.toFixed(1)).join("/")}`,
    },
    {
      label: "initial spawn spreads bots across west main and east lanes",
      passed:
        initialLaneCounts.west >= 2
        && initialLaneCounts.main >= 2
        && initialLaneCounts.east >= 2
        && initialLaneCounts.west <= 4
        && initialLaneCounts.main <= 4
        && initialLaneCounts.east <= 4,
      detail: `lanes=${initialLaneCounts.west}/${initialLaneCounts.main}/${initialLaneCounts.east}`,
    },
    {
      label: "initial spawn keeps the opening comfortably distant",
      passed: Number.isFinite(minimumDistanceToPlayer(t0)) && minimumDistanceToPlayer(t0) >= 24,
      detail: `minDistance=${minimumDistanceToPlayer(t0).toFixed(2)}`,
    },
    {
      label: "initial spawn footprints stay valid",
      passed: collectSpawnValidationIssues(t0).length === 0,
      detail: spawnValidationDetail(t0),
    },
    {
      label: "initial spawn keeps bots physically separated",
      passed: findOverlappingBotPairs(t0).length === 0,
      detail: overlappingBotPairDetail(t0),
    },
    {
      label: "wave 1 never adds an elapsed-time difficulty tier",
      passed: activeStates.every((state) => state.bots.tier === WAVE_ONE_TIER),
      detail: `tiers=${activeStates.map((state) => state.bots.tier).join("/")} expected=${WAVE_ONE_TIER}`,
    },
    {
      label: "friendly fire stays disabled",
      passed: activeStates.every((state) => state.bots.preventedFriendlyFireCount === 0),
      detail: `counts=${activeStates.map((state) => state.bots.preventedFriendlyFireCount).join("/")}`,
    },
    {
      label: "tier-zero bots avoid a premature pre-search collapse",
      passed:
        preSearch.bots.searchPhase === "caution"
        && countMovedEnemies(t0, preSearch, 0.75) <= 4,
      detail: `phase=${preSearch.bots.searchPhase} moved=${countMovedEnemies(t0, preSearch, 0.75)} elapsed=${PRE_SEARCH_S}`,
    },
    {
      label: "active-wave checkpoints avoid bot overlap",
      passed: activeStates.slice(1).every((state) => findOverlappingBotPairs(state).length === 0),
      detail: activeStates.slice(1).map((state) => (
        `${state.bots.waveElapsedS}=${overlappingBotPairDetail(state)}`
      )).join(" | "),
    },
    {
      label: "search pressure begins at the tuned wave-one threshold",
      passed:
        preSearch.bots.searchPhase === "caution"
        && searchStart.bots.searchPhase === "probe",
      detail: `threshold=${SEARCH_START_S} phases=${preSearch.bots.searchPhase}->${searchStart.bots.searchPhase}`,
    },
    {
      label: "pressure progresses to sweep and full pinch on the tuned schedule",
      passed:
        pressureSweep.bots.searchPhase === "sweep"
        && fullPressure.bots.searchPhase === "pinch",
      detail: `sweepAt=${SWEEP_PRESSURE_S}:${pressureSweep.bots.searchPhase} fullAt=${FULL_PRESSURE_S}:${fullPressure.bots.searchPhase}`,
    },
    {
      label: "full pressure closes meaningful distance",
      passed: averageDistanceToPlayer(fullPressure) <= averageDistanceToPlayer(preSearch) - 4,
      detail: `avgDist=${averageDistanceToPlayer(preSearch).toFixed(2)}->${averageDistanceToPlayer(fullPressure).toFixed(2)}`,
    },
    {
      label: "spawn opening remains screened from immediate long-range engagement",
      passed: summary.longSightline !== null && !hasCombatEngagement(summary.longSightline.state),
      detail: `engaged=${summary.longSightline !== null ? hasCombatEngagement(summary.longSightline.state) : false}`,
    },
    {
      label: "bots actively use the elevated traversal surface",
      passed: [...activeStates, ...terraceStates].some((state) => countElevatedEnemies(state) >= 1),
      detail: `elevatedCounts=${[...activeStates, ...terraceStates].map(countElevatedEnemies).join("/")}`,
    },
    {
      label: "terrace scenario supports elevated visual contact",
      passed: terraceStates.some(hasElevatedContact),
      detail: `elevatedContact=${terraceStates.map(hasElevatedContact).join("/")}`,
    },
    {
      label: "active directives do not remain persistently stuck",
      passed: persistentStuckIds.length === 0,
      detail: `stuck=${persistentStuckIds.join("/") || "none"}`,
    },
    {
      label: "flankers stay gated throughout tuned tier zero",
      passed: activeStates.every((state) => (state.bots.roleCounts?.flanker ?? 0) === 0),
      detail: `flankers=${activeStates.map((state) => state.bots.roleCounts?.flanker ?? 0).join("/")}`,
    },
    {
      label: "anti-spazz metrics stay bounded",
      passed: stableAimAtSweep >= Math.max(3, Math.floor(settledAtSweep * 0.4)),
      detail: `stableAim=${stableAimAtSweep} settled=${settledAtSweep}`,
    },
    {
      label: "zero-contact camper starts hidden and silent",
      passed:
        zeroContactPostTeleport.player?.zoneId === HIDDEN_PLAYER_ZONE_ID
        && (zeroContactPostTeleport.bots?.lastSeenPlayer ?? null) === null
        && (zeroContactPostTeleport.bots?.lastHeardPlayer ?? null) === null,
      detail: `zone=${zeroContactPostTeleport.player?.zoneId ?? "n/a"} seen=${zeroContactPostTeleport.bots?.lastSeenPlayer ? "yes" : "no"} heard=${zeroContactPostTeleport.bots?.lastHeardPlayer ? "yes" : "no"}`,
    },
    {
      label: "zero-contact search remains cautious before the tuned threshold",
      passed:
        zeroContactPreSearch.bots?.searchPhase === "caution"
        && (zeroContactPreSearch.bots?.squadTasks?.length ?? 0) === 0,
      detail: `elapsed=${PRE_SEARCH_S} phase=${zeroContactPreSearch.bots?.searchPhase ?? "n/a"} tasks=${zeroContactPreSearch.bots?.squadTasks?.length ?? 0}`,
    },
    {
      label: "zero-contact search fans tasks at the tuned search threshold",
      passed:
        zeroContactSearchStart.bots?.searchPhase === "probe"
        && (zeroContactSearchStart.bots?.squadTasks?.length ?? 0) >= 5
        && new Set((zeroContactSearchStart.bots?.squadTasks ?? []).map((task) => task.zoneId)).size >= 3
        && (zeroContactSearchStart.bots?.squadTasks ?? []).filter((task) => task.lane === "west").length >= 2,
      detail: `elapsed=${SEARCH_START_S} phase=${zeroContactSearchStart.bots?.searchPhase ?? "n/a"} tasks=${zeroContactSearchStart.bots?.squadTasks?.length ?? 0} westTasks=${(zeroContactSearchStart.bots?.squadTasks ?? []).filter((task) => task.lane === "west").length} uniqueZones=${new Set((zeroContactSearchStart.bots?.squadTasks ?? []).map((task) => task.zoneId)).size}`,
    },
    {
      label: "zero-contact hunt converges after full pressure",
      passed:
        (summary.zeroContact.deathAtS !== null && summary.zeroContact.deathAtS <= POST_FULL_PRESSURE_S)
        || (
          averageDistanceToPlayer(zeroContactEnd) <= 30
          && countBotsInLane(zeroContactEnd, "west") + countBotsInLane(zeroContactEnd, "main") >= 6
        ),
      detail: `target=${POST_FULL_PRESSURE_S} deathAt=${summary.zeroContact.deathAtS ?? "n/a"} avgDist=${averageDistanceToPlayer(zeroContactEnd).toFixed(2)} westMain=${countBotsInLane(zeroContactEnd, "west") + countBotsInLane(zeroContactEnd, "main")}`,
    },
    {
      label: "hidden route reaches the west service lane",
      passed:
        summary.hiddenSearch.route !== null
        && hiddenPostRoute.player?.zoneId === HIDDEN_PLAYER_ZONE_ID,
      detail: `zones=${summary.hiddenSearch.route?.zonesVisited?.join("/") ?? "n/a"} finalZone=${hiddenPostRoute.player?.zoneId ?? "n/a"}`,
    },
    {
      label: "hidden-player search begins on the tuned schedule",
      passed:
        (summary.hiddenSearch.deathAtS !== null && summary.hiddenSearch.deathAtS <= SEARCH_START_S)
        || hiddenSearchStart.bots?.searchPhase === "probe",
      detail: `target=${SEARCH_START_S} deathAt=${summary.hiddenSearch.deathAtS ?? "n/a"} phase=${hiddenSearchStart.bots?.searchPhase ?? "n/a"}`,
    },
    {
      label: "hidden-player search commits during the sweep phase",
      passed:
        (summary.hiddenSearch.deathAtS !== null && summary.hiddenSearch.deathAtS <= SWEEP_PRESSURE_S)
        || (
          hiddenSweep.player?.zoneId === HIDDEN_PLAYER_ZONE_ID
          && hiddenSweep.bots?.searchPhase === "sweep"
          && countBotsInLane(hiddenSweep, "west") >= 3
          && averageDistanceToPlayer(hiddenSweep)
            <= averageDistanceToPlayer(hiddenPostRoute) - MIN_HIDDEN_SWEEP_CLOSURE_M
        ),
      detail: `target=${SWEEP_PRESSURE_S} deathAt=${summary.hiddenSearch.deathAtS ?? "n/a"} phase=${hiddenSweep.bots?.searchPhase ?? "n/a"} west=${countBotsInLane(hiddenSweep, "west")} avgDist=${averageDistanceToPlayer(hiddenPostRoute).toFixed(2)}->${averageDistanceToPlayer(hiddenSweep).toFixed(2)} minClosure=${MIN_HIDDEN_SWEEP_CLOSURE_M} zone=${hiddenSweep.player?.zoneId ?? "n/a"}`,
    },
    {
      label: "full hunt kills or hard-pins a hidden idle player after full pressure",
      passed:
        (summary.hiddenSearch.deathAtS !== null && summary.hiddenSearch.deathAtS <= POST_FULL_PRESSURE_S)
        || (
          hiddenEnd.player?.zoneId === HIDDEN_PLAYER_ZONE_ID
          && countBotsInLane(hiddenEnd, "west") + countBotsInLane(hiddenEnd, "main") >= 8
          && averageDistanceToPlayer(hiddenEnd) <= 20
        ),
      detail: `target=${POST_FULL_PRESSURE_S} deathAt=${summary.hiddenSearch.deathAtS ?? "n/a"} alive=${hiddenEnd.gameplay?.alive} avgDist=${averageDistanceToPlayer(hiddenEnd).toFixed(2)} westMain=${countBotsInLane(hiddenEnd, "west") + countBotsInLane(hiddenEnd, "main")}`,
    },
    {
      label: "respawn route leaves the authored opening",
      passed: (summary.respawnScenario.route?.distanceM ?? 0) >= 12,
      detail: `distance=${summary.respawnScenario.route?.distanceM ?? 0}`,
    },
    {
      label: "adaptive respawn clears the tuned bot count before wave 2",
      passed: summary.respawnScenario.eliminated === EXPECTED_BOT_COUNT,
      detail: `eliminated=${summary.respawnScenario.eliminated}`,
    },
    {
      label: "wave 2 uses adaptive respawn mode at its tuned tier",
      passed:
        respawnState.bots.waveNumber === 2
        && respawnState.bots.tier === WAVE_TWO_TIER
        && respawnTelemetry.mode === "adaptive",
      detail: `wave=${respawnState.bots.waveNumber} tier=${respawnState.bots.tier} expectedTier=${WAVE_TWO_TIER} mode=${respawnTelemetry.mode}`,
    },
    {
      label: "adaptive respawn footprints stay valid",
      passed: collectSpawnValidationIssues(respawnState).length === 0,
      detail: spawnValidationDetail(respawnState),
    },
    {
      label: "adaptive respawn keeps bots physically separated",
      passed: findOverlappingBotPairs(respawnState).length === 0,
      detail: overlappingBotPairDetail(respawnState),
    },
    {
      label: "adaptive respawn keeps the far-distance floor",
      passed:
        typeof respawnTelemetry.distanceFloorM === "number"
        && respawnTelemetry.distanceFloorM >= 18
        && typeof respawnTelemetry.minDistanceToPlayerM === "number"
        && respawnTelemetry.minDistanceToPlayerM >= respawnTelemetry.distanceFloorM,
      detail: `floor=${respawnTelemetry.distanceFloorM} min=${respawnTelemetry.minDistanceToPlayerM}`,
    },
    {
      label: "adaptive respawn prefers zero visible bots",
      passed: respawnTelemetry.visibleCount === 0,
      detail: `visible=${respawnTelemetry.visibleCount}`,
    },
    {
      label: "adaptive respawn never exposes more than one bot",
      passed: respawnTelemetry.visibleCount <= 1,
      detail: `visible=${respawnTelemetry.visibleCount}`,
    },
    {
      label: "adaptive respawn never stacks onto the player",
      passed: Number.isFinite(respawnMinDistance) && respawnMinDistance >= 18,
      detail: `minDistance=${respawnMinDistance}`,
    },
    {
      label: "console remains clean",
      passed:
        summary.checkpoints.every((checkpoint) => checkpoint.console.errorCount === 0)
        && (summary.longSightline?.console.errorCount ?? 0) === 0
        && summary.zeroContact.checkpoints.every((checkpoint) => checkpoint.console.errorCount === 0)
        && summary.hiddenSearch.checkpoints.every((checkpoint) => checkpoint.console.errorCount === 0)
        && summary.terraceCombat.checkpoints.every((checkpoint) => checkpoint.console.errorCount === 0)
        && (summary.respawnScenario.checkpoint?.console.errorCount ?? 0) === 0,
      detail: `errors=${summary.checkpoints.map((checkpoint) => checkpoint.console.errorCount).join("/")}/${summary.longSightline?.console.errorCount ?? 0}/${summary.zeroContact.checkpoints.map((checkpoint) => checkpoint.console.errorCount).join("/")}/${summary.hiddenSearch.checkpoints.map((checkpoint) => checkpoint.console.errorCount).join("/")}/${summary.respawnScenario.checkpoint?.console.errorCount ?? 0}`,
    },
  ];

  summary.assertions.push(...assertions);
  summary.passed = assertions.every((assertion) => assertion.passed);
  summary.finishedAt = new Date().toISOString();

  await stopTracingOnce(path.join(outputDir, "trace.zip"));
  await writeJson(path.join(outputDir, "summary.json"), summary);
  const review = renderReview(summary);
  await writeFile(path.join(outputDir, "review.md"), review, "utf8");
  await copyFile(path.join(outputDir, "summary.json"), path.join(stableDir, "latest-summary.json"));
  await copyFile(path.join(outputDir, "review.md"), path.join(stableDir, "latest-review.md"));

  if (!summary.passed) {
    const failed = assertions.filter((assertion) => !assertion.passed).map((assertion) => assertion.label).join(", ");
    fail(`assertions failed: ${failed}`);
  }

  console.log(`[bot:smoke] pass | output=${outputDir}`);
} catch (error) {
  summary.passed = false;
  summary.finishedAt = new Date().toISOString();
  summary.failure = error instanceof Error ? error.message : String(error);
  await stopTracingOnce(path.join(outputDir, "trace.zip"));
  await writeJson(path.join(outputDir, "summary.json"), summary);
  const review = renderReview(summary);
  await writeFile(path.join(outputDir, "review.md"), review, "utf8");
  await copyFile(path.join(outputDir, "summary.json"), path.join(stableDir, "latest-summary.json"));
  await copyFile(path.join(outputDir, "review.md"), path.join(stableDir, "latest-review.md"));
  throw error;
} finally {
  await context.close();
  await browser.close();
}

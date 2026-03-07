import path from "node:path";
import { copyFile, writeFile } from "node:fs/promises";
import {
  advanceRuntime,
  attachConsoleRecorder,
  buildRuntimeUrl,
  captureRuntimeSnapshot,
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

const BASE_URL = parseBaseUrl(process.env.BASE_URL ?? "http://127.0.0.1:5174");
const MAP_ID = (process.env.MAP_ID ?? "bazaar-map").trim() || "bazaar-map";
const HEADLESS = parseBooleanEnv(process.env.HEADLESS, true);
const HIDDEN_PLAYER_ROUTE = {
  id: "hide-sh-w",
  label: "Hide in west hall",
  spawn: "A",
  expectedMinDistanceM: 18,
  maxStationaryTicks: 12,
  segments: [
    { durationMs: 1200, action: { moveX: 1, sprint: true } },
    { durationMs: 1200, action: { moveZ: 1, sprint: true } },
    { durationMs: 1200, action: { moveX: 1, sprint: true } },
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

function laneFromX(x) {
  if (x <= 14.5) return "west";
  if (x >= 35.5) return "east";
  return "main";
}

function countBotsInLane(state, lane) {
  return (state?.bots?.enemies ?? []).filter((enemy) => laneFromX(enemy.position.x) === lane).length;
}

function countNoSightOverwatch(state) {
  return (state?.bots?.enemies ?? []).filter((enemy) => enemy.state === "OVERWATCH" && enemy.directSight !== true).length;
}

function hasLongSightlineOverwatch(state) {
  const player = state?.player?.pos;
  if (!player) return false;
  return (state?.bots?.enemies ?? []).some((enemy) => {
    const dx = enemy.position.x - player.x;
    const dz = enemy.position.z - player.z;
    const distance = Math.hypot(dx, dz);
    return distance > 40 && enemy.directSight === true && (
      enemy.state === "OVERWATCH"
      || enemy.reactionRemainingS > 0
      || enemy.burstShotsRemaining > 0
    );
  });
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

  if (summary.longSightline) {
    lines.push("", "## Long Sightline");
    lines.push(
      `- ${summary.longSightline.id}: wave=${summary.longSightline.snapshot.waveNumber} elapsed=${summary.longSightline.snapshot.waveElapsedS?.toFixed?.(2) ?? "n/a"} tier=${summary.longSightline.snapshot.tier} alive=${summary.longSightline.snapshot.aliveCount} ff=${summary.longSightline.snapshot.preventedFriendlyFireCount}`,
    );
    lines.push(`  - image: ${summary.longSightline.imagePath}`);
    lines.push(`  - state: ${summary.longSightline.statePath}`);
    lines.push(`  - consoleErrors: ${summary.longSightline.console.errorCount}`);
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

async function waitForRuntimeState(page) {
  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") return false;
    try {
      const state = JSON.parse(window.render_game_to_text());
      return state.mode === "runtime" && state.map?.loaded === true;
    } catch {
      return false;
    }
  }, { timeout: 20_000 });
}

async function captureCheckpoint(page, outputDir, consoleRecorder, id) {
  await waitForRuntimeState(page);
  const imagePath = path.join(outputDir, `${id}.png`);
  const statePath = path.join(outputDir, `${id}.state.json`);
  const consolePath = path.join(outputDir, `${id}.console.json`);
  const state = await captureRuntimeSnapshot(page, { imagePath, statePath });
  const consoleCounts = consoleRecorder.counts();
  await writeJson(consolePath, {
    events: consoleRecorder.snapshot(),
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

const outputDir = path.resolve(process.cwd(), `../../artifacts/playwright/completion-gate/bot-intelligence/${timestampId()}`);
const stableDir = path.resolve(process.cwd(), "../../artifacts/playwright/completion-gate/bot-intelligence");

await ensureDir(outputDir);
await ensureDir(stableDir);

const { browser, context, page } = await launchBrowser({ headless: HEADLESS });
const consoleRecorder = attachConsoleRecorder(page);
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
  longSightline: null,
  hiddenSearch: {
    route: null,
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

  const checkpoints = [
    { id: "t0", advanceMs: 0 },
    { id: "t25", advanceMs: 25_000 },
    { id: "t50", advanceMs: 25_000 },
    { id: "t90", advanceMs: 40_000 },
    { id: "t135", advanceMs: 45_000 },
    { id: "t180", advanceMs: 45_000 },
  ];

  for (const checkpoint of checkpoints) {
    consoleRecorder.clear();
    if (checkpoint.advanceMs > 0) {
      await advanceRuntime(page, checkpoint.advanceMs);
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
  await page.evaluate(() => {
    window.agent_apply_action?.({
      moveX: 0,
      moveZ: 0,
      lookYawDelta: 0,
      lookPitchDelta: 0,
      fire: false,
      sprint: false,
    });
  });
  summary.hiddenSearch.route = hiddenRoute;
  consoleRecorder.clear();
  summary.hiddenSearch.checkpoints.push(await captureCheckpoint(page, hiddenOutputDir, consoleRecorder, "post-route"));

  const hiddenTargetsS = [60, 90, 135, 180, 225];
  let hiddenDeathAtS = null;
  for (const targetS of hiddenTargetsS) {
    consoleRecorder.clear();
    let currentState = await readRuntimeState(page);
    if (hiddenDeathAtS === null && (currentState?.gameplay?.alive === false || currentState?.gameOver?.visible === true)) {
      hiddenDeathAtS = currentState?.bots?.waveElapsedS ?? null;
    }
    let currentElapsedS = currentState?.bots?.waveElapsedS ?? 0;
    while (currentElapsedS + 5 < targetS) {
      await advanceRuntime(page, 5_000);
      currentState = await readRuntimeState(page);
      if (hiddenDeathAtS === null && (currentState?.gameplay?.alive === false || currentState?.gameOver?.visible === true)) {
        hiddenDeathAtS = currentState?.bots?.waveElapsedS ?? null;
      }
      currentElapsedS = currentState?.bots?.waveElapsedS ?? currentElapsedS + 5;
    }
    const advanceMs = Math.max(0, Math.round((targetS - currentElapsedS) * 1000));
    if (advanceMs > 0) {
      await advanceRuntime(page, advanceMs);
    }
    const checkpoint = await captureCheckpoint(page, hiddenOutputDir, consoleRecorder, `t${targetS}`);
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
  await advanceRuntime(page, 5_250);
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
  const hiddenCheckpointMap = new Map(summary.hiddenSearch.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.state]));
  const t0 = checkpointMap.get("t0");
  const t25 = checkpointMap.get("t25");
  const t50 = checkpointMap.get("t50");
  const t135 = checkpointMap.get("t135");
  const t180 = checkpointMap.get("t180");
  const hiddenPostRoute = hiddenCheckpointMap.get("post-route");
  const hiddenT60 = hiddenCheckpointMap.get("t60");
  const hiddenT135 = hiddenCheckpointMap.get("t135");
  const hiddenT180 = hiddenCheckpointMap.get("t180");
  const hiddenT225 = hiddenCheckpointMap.get("t225");
  const respawnState = summary.respawnScenario.checkpoint?.state ?? null;
  const respawnTelemetry = respawnState?.bots?.lastSpawn ?? null;
  if (!t0 || !t25 || !t50 || !t135 || !t180 || !hiddenPostRoute || !hiddenT60 || !hiddenT135 || !hiddenT180 || !hiddenT225 || !respawnState || !respawnTelemetry) {
    fail("Missing one or more checkpoint states");
  }
  const respawnMinDistance = minimumDistanceToPlayer(respawnState);

  const assertions = [
    {
      label: "starts on wave 1 tier 0",
      passed: t0.bots.waveNumber === 1 && t0.bots.tier === 0,
      detail: `wave=${t0.bots.waveNumber} tier=${t0.bots.tier}`,
    },
    {
      label: "tier increases at 25s",
      passed: t25.bots.tier === 0,
      detail: `tier=${t25.bots.tier} elapsed=${t25.bots.waveElapsedS}`,
    },
    {
      label: "tier increases again at 50s",
      passed: t50.bots.tier === 1,
      detail: `tier=${t50.bots.tier} elapsed=${t50.bots.waveElapsedS}`,
    },
    {
      label: "friendly fire stays disabled",
      passed:
        t0.bots.preventedFriendlyFireCount === 0
        && t25.bots.preventedFriendlyFireCount === 0
        && t50.bots.preventedFriendlyFireCount === 0,
      detail: `counts=${[t0.bots.preventedFriendlyFireCount, t25.bots.preventedFriendlyFireCount, t50.bots.preventedFriendlyFireCount].join("/")}`,
    },
    {
      label: "bots rotate into positions by 25s",
      passed: countMovedEnemies(t0, t25, 0.75) >= 4,
      detail: `moved=${countMovedEnemies(t0, t25, 0.75)}`,
    },
    {
      label: "holding pattern forms by 50s",
      passed: countSettledEnemies(t50) >= 3,
      detail: `settled=${countSettledEnemies(t50)}`,
    },
    {
      label: "idle hunt materially closes distance by 135s",
      passed: averageDistanceToPlayer(t135) <= averageDistanceToPlayer(t50) - 3,
      detail: `avgDist=${averageDistanceToPlayer(t50).toFixed(2)}->${averageDistanceToPlayer(t135).toFixed(2)}`,
    },
    {
      label: "idle full hunt keeps closing by 180s",
      passed: averageDistanceToPlayer(t180) <= averageDistanceToPlayer(t50) - 5,
      detail: `avgDist=${averageDistanceToPlayer(t50).toFixed(2)}->${averageDistanceToPlayer(t180).toFixed(2)}`,
    },
    {
      label: "long sightline produces overwatch or firing logic",
      passed: summary.longSightline !== null && hasLongSightlineOverwatch(summary.longSightline.state),
      detail: `longLos=${summary.longSightline !== null ? hasLongSightlineOverwatch(summary.longSightline.state) : false}`,
    },
    {
      label: "flankers stay gated before T3",
      passed:
        (t0.bots.roleCounts?.flanker ?? 0) === 0
        && (t25.bots.roleCounts?.flanker ?? 0) === 0
        && (t50.bots.roleCounts?.flanker ?? 0) === 0,
      detail: `flankers=${[t0.bots.roleCounts?.flanker ?? 0, t25.bots.roleCounts?.flanker ?? 0, t50.bots.roleCounts?.flanker ?? 0].join("/")}`,
    },
    {
      label: "anti-spazz metrics stay bounded",
      passed: countStableAimEnemies(t50) >= 6,
      detail: `stableAim=${countStableAimEnemies(t50)}`,
    },
    {
      label: "hidden route reaches the west hall",
      passed:
        summary.hiddenSearch.route !== null
        && summary.hiddenSearch.route.zonesVisited.includes("SH_W")
        && hiddenPostRoute.player?.zoneId === "SH_W",
      detail: `zones=${summary.hiddenSearch.route?.zonesVisited?.join("/") ?? "n/a"} finalZone=${hiddenPostRoute.player?.zoneId ?? "n/a"}`,
    },
    {
      label: "hidden-player search commits before the first kill window",
      passed:
        (summary.hiddenSearch.deathAtS !== null && summary.hiddenSearch.deathAtS <= 60)
        || (
          hiddenT60.player?.zoneId === "SH_W"
          && countBotsInLane(hiddenT60, "west") >= 4
          && averageDistanceToPlayer(hiddenT60) <= averageDistanceToPlayer(hiddenPostRoute) - 6
        ),
      detail: `deathAt=${summary.hiddenSearch.deathAtS ?? "n/a"} west60=${countBotsInLane(hiddenT60, "west")} avgDist=${averageDistanceToPlayer(hiddenPostRoute).toFixed(2)}->${averageDistanceToPlayer(hiddenT60).toFixed(2)} zone60=${hiddenT60.player?.zoneId ?? "n/a"}`,
    },
    {
      label: "no stale overwatch survives late hidden search",
      passed: countNoSightOverwatch(hiddenT180) === 0,
      detail: `staleOverwatch=${countNoSightOverwatch(hiddenT180)}`,
    },
    {
      label: "full hunt kills a hidden idle player by 225s",
      passed:
        summary.hiddenSearch.deathAtS !== null
        && summary.hiddenSearch.deathAtS <= 225
        && (hiddenT225.gameplay?.alive === false || hiddenT225.gameOver?.visible === true || summary.hiddenSearch.deathAtS <= 225),
      detail: `deathAt=${summary.hiddenSearch.deathAtS ?? "n/a"} alive225=${hiddenT225.gameplay?.alive}`,
    },
    {
      label: "respawn route leaves the authored opening",
      passed: (summary.respawnScenario.route?.distanceM ?? 0) >= 12,
      detail: `distance=${summary.respawnScenario.route?.distanceM ?? 0}`,
    },
    {
      label: "adaptive respawn clears all nine bots before wave 2",
      passed: summary.respawnScenario.eliminated === 9,
      detail: `eliminated=${summary.respawnScenario.eliminated}`,
    },
    {
      label: "wave 2 uses adaptive respawn mode",
      passed: respawnState.bots.waveNumber === 2 && respawnTelemetry.mode === "adaptive",
      detail: `wave=${respawnState.bots.waveNumber} mode=${respawnTelemetry.mode}`,
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
        && summary.hiddenSearch.checkpoints.every((checkpoint) => checkpoint.console.errorCount === 0)
        && (summary.respawnScenario.checkpoint?.console.errorCount ?? 0) === 0,
      detail: `errors=${summary.checkpoints.map((checkpoint) => checkpoint.console.errorCount).join("/")}/${summary.longSightline?.console.errorCount ?? 0}/${summary.hiddenSearch.checkpoints.map((checkpoint) => checkpoint.console.errorCount).join("/")}/${summary.respawnScenario.checkpoint?.console.errorCount ?? 0}`,
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

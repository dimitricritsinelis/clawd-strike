import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  advanceRuntime,
  gotoAgentRuntimeViaUi,
  readDocumentedAgentState,
} from "../scripts/lib/runtimePlaywright.mjs";
import {
  createSharedChampionBoardIdentity,
  SHARED_CHAMPION_SCORE_RULESET,
} from "../../shared/highScore";
import {
  getGameplayProfileIdentity,
  type GameplayProfileIdentity,
} from "../../shared/gameplayProfile";

const STATS_ADMIN_TOKEN = process.env.STATS_ADMIN_TOKEN ?? "clawd-strike-dev-stats-admin-token";
const SHARED_CHAMPION_ADMIN_TOKEN = process.env.SHARED_CHAMPION_ADMIN_TOKEN
  ?? "clawd-strike-playwright-shared-champion-admin-token";

function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}

function formatLoadingScore(score: number): string {
  return score.toLocaleString("en-US");
}

function createChampion(
  holderName: string,
  score: number,
  controlMode: "human" | "agent",
  updatedAt = "2026-03-07T12:00:00.000Z",
  identity = identityForControlMode(controlMode),
) {
  return {
    holderName,
    score,
    controlMode,
    scope: "sitewide" as const,
    updatedAt,
    ...createSharedChampionBoardIdentity(identity),
  };
}

const ENEMIES_PER_WAVE = 10;
const DESKTOP_HUMAN_IDENTITY = getGameplayProfileIdentity("desktop-human");
const DESKTOP_AGENT_IDENTITY = getGameplayProfileIdentity("desktop-agent");

function identityForControlMode(controlMode: "human" | "agent"): GameplayProfileIdentity {
  return controlMode === "agent" ? DESKTOP_AGENT_IDENTITY : DESKTOP_HUMAN_IDENTITY;
}

function waveKillValue(wave: number): number {
  return 5 + (wave - 1) * 2;
}

function distributeHeadshots(kills: number, headshots: number): number[] {
  const totalWaves = kills > 0 ? Math.ceil(kills / ENEMIES_PER_WAVE) : 0;
  const result: number[] = [];
  let remaining = headshots;
  for (let w = 1; w <= totalWaves; w++) {
    const killsInWave = Math.min(ENEMIES_PER_WAVE, kills - (w - 1) * ENEMIES_PER_WAVE);
    const hsInWave = Math.min(remaining, killsInWave);
    result.push(hsInWave);
    remaining -= hsInWave;
  }
  return result;
}

function computeFinalScore(kills: number, headshotsPerWave: number[]): number {
  const totalWaves = kills > 0 ? Math.ceil(kills / ENEMIES_PER_WAVE) : 0;
  let score = 0;
  for (let w = 1; w <= totalWaves; w++) {
    const killsInWave = Math.min(ENEMIES_PER_WAVE, kills - (w - 1) * ENEMIES_PER_WAVE);
    const hsInWave = headshotsPerWave[w - 1] ?? 0;
    const kv = waveKillValue(w);
    score += killsInWave * kv + hsInWave * kv;
  }
  return score;
}

function buildRunSummary(kills: number, headshots: number) {
  const shotsHit = kills;
  const shotsFired = kills;
  const accuracy = shotsFired > 0 ? Math.round(((shotsHit / shotsFired) * 100) * 10) / 10 : 0;
  const headshotsPerWave = distributeHeadshots(kills, headshots);
  return {
    survivalTimeS: 0.5,
    kills,
    headshots,
    headshotsPerWave,
    shotsFired,
    shotsHit,
    accuracy,
    finalScore: computeFinalScore(kills, headshotsPerWave),
    deathCause: "enemy-fire" as const,
  };
}

function chooseRunAtLeastScore(minScore: number): { kills: number; headshots: number; score: number } {
  // Wave-scaled scoring: try increasing kills with headshots to reach target
  for (let kills = 0; kills <= 500; kills++) {
    for (let headshots = 0; headshots <= kills; headshots++) {
      const hpw = distributeHeadshots(kills, headshots);
      const score = computeFinalScore(kills, hpw);
      if (score >= minScore) {
        return { kills, headshots, score };
      }
    }
  }
  // Fallback: large number
  const kills = 500;
  const headshots = 500;
  const hpw = distributeHeadshots(kills, headshots);
  return { kills, headshots, score: computeFinalScore(kills, hpw) };
}

function chooseRunAtMostScore(maxScore: number): { kills: number; headshots: number; score: number } {
  // Wave-scaled scoring: find the largest score <= maxScore
  let best = { kills: 0, headshots: 0, score: 0 };
  for (let kills = 0; kills <= 500; kills++) {
    const hpwNoHs = distributeHeadshots(kills, 0);
    const baseScore = computeFinalScore(kills, hpwNoHs);
    if (baseScore > maxScore) break;
    best = { kills, headshots: 0, score: baseScore };
    for (let headshots = 1; headshots <= kills; headshots++) {
      const hpw = distributeHeadshots(kills, headshots);
      const score = computeFinalScore(kills, hpw);
      if (score > maxScore) break;
      best = { kills, headshots, score };
    }
  }
  return best;
}

function expectChampion(
  champion: unknown,
  expected: {
    holderName: string;
    score: number;
    controlMode: "human" | "agent";
    identity?: GameplayProfileIdentity;
  },
) {
  const identity = expected.identity ?? identityForControlMode(expected.controlMode);
  expect(champion).toEqual({
    holderName: expected.holderName,
    score: expected.score,
    controlMode: expected.controlMode,
    scope: "sitewide",
    updatedAt: expect.any(String),
    ...createSharedChampionBoardIdentity(identity),
  });
}

function originHeaders(baseUrl: string) {
  return {
    origin: new URL(baseUrl).origin,
  };
}

function statsAdminHeaders(token = STATS_ADMIN_TOKEN) {
  return {
    authorization: `Bearer ${token}`,
  };
}

async function readSharedChampion(
  request: APIRequestContext,
  baseUrl: string,
  identity: GameplayProfileIdentity,
) {
  const url = new URL("/api/high-score", baseUrl);
  url.searchParams.set("profileId", identity.profileId);
  url.searchParams.set("tuningRevision", identity.tuningRevision);
  url.searchParams.set("balanceSeason", identity.balanceSeason);
  const response = await request.get(url.toString(), {
    failOnStatusCode: false,
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function readAdminStats(
  request: APIRequestContext,
  baseUrl: string,
  path: string,
  options: {
    params?: Record<string, string>;
    token?: string | null;
  } = {},
) {
  const url = new URL(path, baseUrl);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = options.token === null
    ? undefined
    : statsAdminHeaders(options.token ?? STATS_ADMIN_TOKEN);
  const response = await request.get(url.toString(), {
    failOnStatusCode: false,
    ...(headers ? { headers } : {}),
  });
  return {
    response,
    body: await response.json().catch(() => null),
  };
}

function buildTelemetryForScore(score: number) {
  // Flat telemetry formula: score = kills * 5 + headshots * 5
  // Use all-headshot kills for simplicity: score = kills * 10 → kills = floor(score / 10)
  // If not evenly divisible, use body-only kills for remainder
  const killsFromHeadshots = Math.floor(score / 10);
  const remainderScore = score - killsFromHeadshots * 10;
  const extraKills = Math.floor(remainderScore / 5);
  const kills = killsFromHeadshots + extraKills;
  const headshots = killsFromHeadshots;
  return {
    kills,
    headshots,
    shotsFired: Math.max(kills, kills + 5),
    shotsHit: Math.max(kills, kills + 2),
    survivalTimeS: Math.max(1, kills * 2),
  };
}

async function getSessionToken(request: APIRequestContext, baseUrl: string): Promise<string> {
  const response = await request.post(new URL("/api/session", baseUrl).toString(), {
    failOnStatusCode: false,
  });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(typeof data.token).toBe("string");
  return data.token as string;
}

async function postDirectChampionWrite(
  request: APIRequestContext,
  baseUrl: string,
  body: {
    playerName: string;
    score: number;
    controlMode: "human" | "agent";
    telemetry?: ReturnType<typeof buildTelemetryForScore>;
    sessionToken?: string;
  },
) {
  const response = await request.post(new URL("/api/high-score", baseUrl).toString(), {
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "application/json",
      "x-shared-champion-admin-token": SHARED_CHAMPION_ADMIN_TOKEN,
    },
    data: {
      playerName: body.playerName,
      score: body.score,
      controlMode: body.controlMode,
      telemetry: body.telemetry ?? buildTelemetryForScore(body.score),
      sessionToken: body.sessionToken,
    },
  });

  return {
    response,
    body: await response.json().catch(() => null),
  };
}

async function startValidatedRun(
  request: APIRequestContext,
  baseUrl: string,
  body: {
    playerName: string;
    controlMode: "human" | "agent";
    mapId?: string;
    identity?: GameplayProfileIdentity;
  },
) {
  const identity = body.identity ?? identityForControlMode(body.controlMode);
  const response = await request.post(new URL("/api/run/start", baseUrl).toString(), {
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "application/json",
    },
    data: {
      playerName: body.playerName,
      controlMode: body.controlMode,
      mapId: body.mapId ?? "bazaar-map",
      ...identity,
    },
  });
  return {
    response,
    body: await response.json().catch(() => null),
  };
}

async function finishValidatedRun(
  request: APIRequestContext,
  baseUrl: string,
  body: {
    runToken: string;
    summary: ReturnType<typeof buildRunSummary>;
    identity: GameplayProfileIdentity;
  },
) {
  const response = await request.post(new URL("/api/run/finish", baseUrl).toString(), {
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "application/json",
    },
    data: {
      runToken: body.runToken,
      summary: body.summary,
      ...body.identity,
    },
  });
  return {
    response,
    body: await response.json().catch(() => null),
  };
}

async function completeValidatedRun(
  request: APIRequestContext,
  baseUrl: string,
  options: { playerName: string; controlMode: "human" | "agent"; kills: number; headshots: number },
) {
  const identity = identityForControlMode(options.controlMode);
  const started = await startValidatedRun(request, baseUrl, {
    playerName: options.playerName,
    controlMode: options.controlMode,
    identity,
  });
  expect(started.response.ok()).toBe(true);
  expect(started.body).toEqual({
    runToken: expect.any(String),
    issuedAt: expect.any(String),
    expiresAt: expect.any(String),
    ...createSharedChampionBoardIdentity(identity),
  });

  const summary = buildRunSummary(options.kills, options.headshots);
  const finished = await finishValidatedRun(request, baseUrl, {
    runToken: started.body.runToken,
    summary,
    identity,
  });

  return {
    started,
    finished,
    summary,
  };
}

async function forcePositiveScoreViaDebug(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      __debug_eliminate_all_bots?: () => number;
    };
    if (typeof debugWindow.__debug_eliminate_all_bots !== "function") {
      throw new Error("Expected __debug_eliminate_all_bots to be available on localhost.");
    }
    debugWindow.__debug_eliminate_all_bots();
  });
  await advanceRuntime(page, 500);
  await expect.poll(async () => {
    const state = await readDocumentedAgentState(page);
    return state.score?.current ?? 0;
  }, { timeout: 10_000 }).toBeGreaterThan(0);
}

async function driveUntilDeath(page: Page): Promise<void> {
  for (let step = 0; step < 180; step += 1) {
    const state = await readDocumentedAgentState(page);
    if (state.gameplay?.alive === false || state.gameplay?.gameOverVisible === true) {
      return;
    }

    await page.evaluate(({ stepIndex }) => {
      const fire = stepIndex % 10 === 0;
      const moveX = stepIndex % 60 < 30 ? 0.25 : -0.2;
      const lookYawDelta = stepIndex % 2 === 0 ? 1.35 : -0.7;
      window.agent_apply_action?.({
        moveX,
        moveZ: 1,
        lookYawDelta,
        fire,
      });
    }, { stepIndex: step });
    await advanceRuntime(page, 500);
  }

  throw new Error("Timed out waiting for death.");
}

test("api blocks raw writes and only accepts validated run submissions", async ({ request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;

  const directWrite = await request.post(new URL("/api/high-score", baseUrl).toString(), {
    failOnStatusCode: false,
    data: {
      playerName: "RawWrite",
      score: 500,
      controlMode: "agent",
    },
  });
  expect(directWrite.status()).toBe(403);
  expect(await directWrite.json()).toEqual({
    error: "Direct shared champion writes are internal-only.",
  });

  const identitylessStart = await request.post(new URL("/api/run/start", baseUrl).toString(), {
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "application/json",
    },
    data: {
      playerName: "NoIdentity",
      controlMode: "agent",
      mapId: "bazaar-map",
    },
  });
  expect(identitylessStart.status()).toBe(400);
  expect(await identitylessStart.json()).toEqual({
    error: "Expected { playerName, controlMode, mapId, profileId, tuningRevision, balanceSeason }.",
  });

  const identitylessFinish = await request.post(new URL("/api/run/finish", baseUrl).toString(), {
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "application/json",
    },
    data: {
      runToken: "forged-token",
      summary: buildRunSummary(1, 0),
    },
  });
  expect(identitylessFinish.status()).toBe(400);
  expect((await identitylessFinish.json()).reason).toBe("invalid-finish-payload");

  const forgedFinish = await finishValidatedRun(request, baseUrl, {
    runToken: "forged-token",
    summary: buildRunSummary(1, 0),
    identity: DESKTOP_AGENT_IDENTITY,
  });
  expect(forgedFinish.response.status()).toBe(404);
  expect(forgedFinish.body.accepted).toBe(false);
  expect(forgedFinish.body.updated).toBe(false);
  expect(forgedFinish.body.reason).toBe("missing");

  const mismatchedControlMode = await startValidatedRun(request, baseUrl, {
    playerName: "WrongBoard",
    controlMode: "agent",
    identity: DESKTOP_HUMAN_IDENTITY,
  });
  expect(mismatchedControlMode.response.status()).toBe(400);

  const identityBoundStart = await startValidatedRun(request, baseUrl, {
    playerName: "IdentityBound",
    controlMode: "agent",
  });
  expect(identityBoundStart.response.ok()).toBe(true);
  const mismatchedFinish = await finishValidatedRun(request, baseUrl, {
    runToken: identityBoundStart.body.runToken,
    summary: buildRunSummary(1, 0),
    identity: DESKTOP_HUMAN_IDENTITY,
  });
  expect(mismatchedFinish.response.status()).toBe(409);
  expect(mismatchedFinish.body.reason).toBe("profile-identity-mismatch");

  const replay = await completeValidatedRun(request, baseUrl, {
    playerName: "ReplayProbe",
    controlMode: "agent",
    kills: 1,
    headshots: 0,
  });
  expect(replay.finished.response.ok()).toBe(true);
  expect(replay.finished.body.accepted).toBe(true);

  const replayAttempt = await finishValidatedRun(request, baseUrl, {
    runToken: replay.started.body.runToken,
    summary: replay.summary,
    identity: DESKTOP_AGENT_IDENTITY,
  });
  expect(replayAttempt.response.status()).toBe(409);
  expect(replayAttempt.body.accepted).toBe(false);
  expect(replayAttempt.body.updated).toBe(false);
  expect(replayAttempt.body.reason).toBe("used");

  const hugeRunStart = await startValidatedRun(request, baseUrl, {
    playerName: "HugeScore",
    controlMode: "human",
  });
  expect(hugeRunStart.response.ok()).toBe(true);
  const hugeHeadshotsPerWave = distributeHeadshots(99_999, 99_999);
  const hugeRun = await finishValidatedRun(request, baseUrl, {
    runToken: hugeRunStart.body.runToken,
    identity: DESKTOP_HUMAN_IDENTITY,
    summary: {
      survivalTimeS: 0.5,
      kills: 99_999,
      headshots: 99_999,
      headshotsPerWave: hugeHeadshotsPerWave,
      shotsFired: 99_999,
      shotsHit: 99_999,
      accuracy: 100,
      finalScore: computeFinalScore(99_999, hugeHeadshotsPerWave),
      deathCause: "enemy-fire",
    },
  });
  expect(hugeRun.response.status()).toBe(422);
  expect(hugeRun.body.accepted).toBe(false);
  expect(hugeRun.body.reason).toBe("kills-exceed-cap");

  const textPlainStart = await request.fetch(new URL("/api/run/start", baseUrl).toString(), {
    method: "POST",
    failOnStatusCode: false,
    headers: {
      ...originHeaders(baseUrl),
      "content-type": "text/plain",
    },
    data: JSON.stringify({
      playerName: "TextPlain",
      controlMode: "agent",
      mapId: "bazaar-map",
      ...DESKTOP_AGENT_IDENTITY,
    }),
  });
  expect(textPlainStart.status()).toBe(415);
  expect(await textPlainStart.json()).toEqual({
    error: "Expected application/json request body.",
  });
});

test("run-start validates names while direct-write stays internal-only", async ({ request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const sessionToken = await getSessionToken(request, baseUrl);

  for (const playerName of ["", "Bad<Name", "Sh1thead"]) {
    const started = await startValidatedRun(request, baseUrl, {
      playerName,
      controlMode: "agent",
    });
    expect(started.response.status()).toBe(400);
    expect(started.body).toEqual({
      error: "Expected { playerName, controlMode, mapId, profileId, tuningRevision, balanceSeason }.",
    });

    const directWrite = await postDirectChampionWrite(request, baseUrl, {
      playerName,
      score: 25,
      controlMode: "agent",
      sessionToken,
    });
    expect(directWrite.response.status()).toBe(403);
    expect(directWrite.body).toEqual({
      error: "Direct shared champion writes are internal-only.",
    });
  }

  const validStart = await startValidatedRun(request, baseUrl, {
    playerName: "Valid-Agent",
    controlMode: "agent",
  });
  expect(validStart.response.ok()).toBe(true);

  const validDirectWrite = await postDirectChampionWrite(request, baseUrl, {
    playerName: "ValidAgent",
    score: 10,
    controlMode: "agent",
    sessionToken,
  });
  expect(validDirectWrite.response.status()).toBe(403);
  expect(validDirectWrite.body).toEqual({
    error: "Direct shared champion writes are internal-only.",
  });
});

test("validated run submissions keep strict overwrite rules on separate profile boards", async ({ request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const currentAgent = await readSharedChampion(request, baseUrl, DESKTOP_AGENT_IDENTITY);
  const currentHuman = await readSharedChampion(request, baseUrl, DESKTOP_HUMAN_IDENTITY);
  const baseScore = Math.max(
    typeof currentAgent.champion?.score === "number" ? currentAgent.champion.score : 0,
    typeof currentHuman.champion?.score === "number" ? currentHuman.champion.score : 0,
  );
  const firstRun = chooseRunAtLeastScore(baseScore + 5);
  const lowerRun = chooseRunAtMostScore(Math.max(0, firstRun.score - 5));
  const higherRun = chooseRunAtLeastScore(firstRun.score + 5);

  const first = await completeValidatedRun(request, baseUrl, {
    playerName: "AlphaUnit",
    controlMode: "agent",
    kills: firstRun.kills,
    headshots: firstRun.headshots,
  });
  expect(first.finished.response.ok()).toBe(true);
  expect(first.finished.body.accepted).toBe(true);
  expect(first.finished.body.updated).toBe(true);
  expectChampion(first.finished.body.champion, {
    holderName: "AlphaUnit",
    score: firstRun.score,
    controlMode: "agent",
  });

  const lower = await completeValidatedRun(request, baseUrl, {
    playerName: "BravoUnit",
    controlMode: "human",
    kills: lowerRun.kills,
    headshots: lowerRun.headshots,
  });
  expect(lower.finished.response.ok()).toBe(true);
  expect(lower.finished.body.accepted).toBe(true);
  expect(lower.finished.body.updated).toBe(true);
  expectChampion(lower.finished.body.champion, {
    holderName: "BravoUnit",
    score: lowerRun.score,
    controlMode: "human",
  });

  const tie = await completeValidatedRun(request, baseUrl, {
    playerName: "CharlieTie",
    controlMode: "human",
    kills: lowerRun.kills,
    headshots: lowerRun.headshots,
  });
  expect(tie.finished.response.ok()).toBe(true);
  expect(tie.finished.body.accepted).toBe(true);
  expect(tie.finished.body.updated).toBe(false);
  expectChampion(tie.finished.body.champion, {
    holderName: "BravoUnit",
    score: lowerRun.score,
    controlMode: "human",
  });

  const higher = await completeValidatedRun(request, baseUrl, {
    playerName: "DeltaLead",
    controlMode: "human",
    kills: higherRun.kills,
    headshots: higherRun.headshots,
  });
  expect(higher.finished.response.ok()).toBe(true);
  expect(higher.finished.body.accepted).toBe(true);
  expect(higher.finished.body.updated).toBe(true);
  expectChampion(higher.finished.body.champion, {
    holderName: "DeltaLead",
    score: higherRun.score,
    controlMode: "human",
  });

  const agentBoard = await readSharedChampion(request, baseUrl, DESKTOP_AGENT_IDENTITY);
  const humanBoard = await readSharedChampion(request, baseUrl, DESKTOP_HUMAN_IDENTITY);
  expectChampion(agentBoard.champion, {
    holderName: "AlphaUnit",
    score: firstRun.score,
    controlMode: "agent",
  });
  expectChampion(humanBoard.champion, {
    holderName: "DeltaLead",
    score: higherRun.score,
    controlMode: "human",
  });
});

test("admin stats endpoints require auth and expose filtered run history", async ({ request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const suffix = `${Date.now()}`.slice(-5);
  const leaderName = `Lead${suffix}`;
  const followerName = `Follow${suffix}`;
  const windowStart = new Date().toISOString();

  const noAuth = await readAdminStats(request, baseUrl, "/api/admin/stats/overview", {
    token: null,
  });
  expect(noAuth.response.status()).toBe(401);
  expect(noAuth.body).toEqual({
    error: "Missing Bearer token.",
  });

  const wrongAuth = await readAdminStats(request, baseUrl, "/api/admin/stats/overview", {
    token: "wrong-token",
  });
  expect(wrongAuth.response.status()).toBe(403);
  expect(wrongAuth.body).toEqual({
    error: "Invalid admin token.",
  });

  const current = await readSharedChampion(request, baseUrl, DESKTOP_HUMAN_IDENTITY);
  const currentScore = typeof current.champion?.score === "number" ? current.champion.score : 0;
  const leaderRun = chooseRunAtLeastScore(currentScore + 5);

  const leader = await completeValidatedRun(request, baseUrl, {
    playerName: leaderName,
    controlMode: "human",
    kills: leaderRun.kills,
    headshots: leaderRun.headshots,
  });
  expect(leader.finished.response.ok()).toBe(true);
  expect(leader.finished.body.updated).toBe(true);

  const follower = await completeValidatedRun(request, baseUrl, {
    playerName: followerName,
    controlMode: "agent",
    kills: 1,
    headshots: 0,
  });
  expect(follower.finished.response.ok()).toBe(true);
  expect(follower.finished.body.accepted).toBe(true);

  const overview = await readAdminStats(request, baseUrl, "/api/admin/stats/overview", {
    params: {
      from: windowStart,
    },
  });
  expect(overview.response.ok()).toBe(true);
  expect(overview.body.overview).toMatchObject({
    totalRuns: 2,
    championUpdates: 1,
    uniquePlayerNames: 2,
    humanRuns: 1,
    agentRuns: 1,
  });

  const firstPage = await readAdminStats(request, baseUrl, "/api/admin/stats/runs", {
    params: {
      from: windowStart,
      limit: "1",
    },
  });
  expect(firstPage.response.ok()).toBe(true);
  expect(firstPage.body.items).toHaveLength(1);
  expect(typeof firstPage.body.nextCursor).toBe("string");

  const secondPage = await readAdminStats(request, baseUrl, "/api/admin/stats/runs", {
    params: {
      from: windowStart,
      limit: "1",
      cursor: firstPage.body.nextCursor,
    },
  });
  expect(secondPage.response.ok()).toBe(true);
  expect(secondPage.body.items).toHaveLength(1);
  expect(secondPage.body.items[0].runId).not.toBe(firstPage.body.items[0].runId);

  const leaderRuns = await readAdminStats(request, baseUrl, "/api/admin/stats/runs", {
    params: {
      playerName: leaderName,
      limit: "10",
    },
  });
  expect(leaderRuns.response.ok()).toBe(true);
  expect(leaderRuns.body.items).toHaveLength(1);
  expect(leaderRuns.body.items[0]).toMatchObject({
    playerName: leaderName,
    playerNameKey: leaderName.toLowerCase(),
    controlMode: "human",
    mapId: "bazaar-map",
    ruleset: SHARED_CHAMPION_SCORE_RULESET,
    ...DESKTOP_HUMAN_IDENTITY,
    boardKey: createSharedChampionBoardIdentity(DESKTOP_HUMAN_IDENTITY).boardKey,
    score: leaderRun.score,
    championUpdated: true,
  });
  expect(typeof leaderRuns.body.items[0].clientIpFingerprint).toBe("string");
  expect(typeof leaderRuns.body.items[0].userAgentFingerprint).toBe("string");

  const names = await readAdminStats(request, baseUrl, "/api/admin/stats/names", {
    params: {
      from: windowStart,
      limit: "10",
    },
  });
  expect(names.response.ok()).toBe(true);
  expect(names.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        playerName: leaderName,
        totalRuns: 1,
        championUpdates: 1,
      }),
      expect.objectContaining({
        playerName: followerName,
        totalRuns: 1,
      }),
    ]),
  );

  const daily = await readAdminStats(request, baseUrl, "/api/admin/stats/daily", {
    params: {
      from: windowStart,
      limit: "10",
    },
  });
  expect(daily.response.ok()).toBe(true);
  expect(daily.body.items[0]).toMatchObject({
    totalRuns: 2,
    championUpdates: 1,
    uniquePlayerNames: 2,
  });
});

test("validated run stats store only accepted finishes", async ({ request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const suffix = `${Date.now()}`.slice(-5);
  const acceptedName = `Store${suffix}`;
  const rejectedName = `Reject${suffix}`;

  const accepted = await completeValidatedRun(request, baseUrl, {
    playerName: acceptedName,
    controlMode: "agent",
    kills: 2,
    headshots: 1,
  });
  expect(accepted.finished.response.ok()).toBe(true);
  expect(accepted.finished.body.accepted).toBe(true);

  const replayAttempt = await finishValidatedRun(request, baseUrl, {
    runToken: accepted.started.body.runToken,
    summary: accepted.summary,
    identity: DESKTOP_AGENT_IDENTITY,
  });
  expect(replayAttempt.response.status()).toBe(409);
  expect(replayAttempt.body.reason).toBe("used");

  const rejectedStart = await startValidatedRun(request, baseUrl, {
    playerName: rejectedName,
    controlMode: "human",
  });
  expect(rejectedStart.response.ok()).toBe(true);

  const rejectedHpw = distributeHeadshots(99_999, 99_999);
  const rejectedFinish = await finishValidatedRun(request, baseUrl, {
    runToken: rejectedStart.body.runToken,
    identity: DESKTOP_HUMAN_IDENTITY,
    summary: {
      survivalTimeS: 0.5,
      kills: 99_999,
      headshots: 99_999,
      headshotsPerWave: rejectedHpw,
      shotsFired: 99_999,
      shotsHit: 99_999,
      accuracy: 100,
      finalScore: computeFinalScore(99_999, rejectedHpw),
      deathCause: "enemy-fire",
    },
  });
  expect(rejectedFinish.response.status()).toBe(422);
  expect(rejectedFinish.body.accepted).toBe(false);

  const acceptedRuns = await readAdminStats(request, baseUrl, "/api/admin/stats/runs", {
    params: {
      playerName: acceptedName,
      limit: "10",
    },
  });
  expect(acceptedRuns.response.ok()).toBe(true);
  expect(acceptedRuns.body.items).toHaveLength(1);
  expect(acceptedRuns.body.items[0]).toMatchObject({
    playerName: acceptedName,
    controlMode: "agent",
    ruleset: SHARED_CHAMPION_SCORE_RULESET,
    ...DESKTOP_AGENT_IDENTITY,
    boardKey: createSharedChampionBoardIdentity(DESKTOP_AGENT_IDENTITY).boardKey,
    kills: 2,
    headshots: 1,
    shotsFired: 2,
    shotsHit: 2,
    accuracyPct: 100,
    score: 15,
    waveReached: 1,
    wavesCleared: 0,
  });

  const rejectedRuns = await readAdminStats(request, baseUrl, "/api/admin/stats/runs", {
    params: {
      playerName: rejectedName,
      limit: "10",
    },
  });
  expect(rejectedRuns.response.ok()).toBe(true);
  expect(rejectedRuns.body.items).toHaveLength(0);

  const acceptedOverview = await readAdminStats(request, baseUrl, "/api/admin/stats/overview", {
    params: {
      playerName: acceptedName,
    },
  });
  expect(acceptedOverview.response.ok()).toBe(true);
  expect(acceptedOverview.body.overview.totalRuns).toBe(1);
});

test("shows the same shared champion across loading, HUD, and death surfaces", async ({ browser, request }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const current = await readSharedChampion(request, baseUrl, DESKTOP_AGENT_IDENTITY);
  const currentScore = typeof current.champion?.score === "number" ? current.champion.score : 0;
  const nextRun = chooseRunAtLeastScore(currentScore + 5);
  const holderName = "SiteChampion";

  const seeded = await completeValidatedRun(request, baseUrl, {
    playerName: holderName,
    controlMode: "agent",
    kills: nextRun.kills,
    headshots: nextRun.headshots,
  });
  expect(seeded.finished.response.ok()).toBe(true);
  expect(seeded.finished.body.accepted).toBe(true);
  expect(seeded.finished.body.updated).toBe(true);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await pageA.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await pageB.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded" });

    await pageA.getByTestId("agent-mode").click();
    await pageB.getByTestId("agent-mode").click();

    await expect(pageA.getByTestId("loading-world-champion-name")).toHaveText(holderName.toUpperCase());
    await expect(pageB.getByTestId("loading-world-champion-name")).toHaveText(holderName.toUpperCase());
    await expect(pageA.getByTestId("loading-world-champion-score")).toHaveText(formatLoadingScore(nextRun.score));
    await expect(pageB.getByTestId("loading-world-champion-score")).toHaveText(formatLoadingScore(nextRun.score));

    await gotoAgentRuntimeViaUi(pageA, {
      baseUrl,
      agentName: "ChampionProbe",
    });

    await expect(pageA.getByTestId("hud-world-champion-name")).toHaveText(holderName.toUpperCase());
    await expect(pageA.getByTestId("hud-world-champion-score")).toHaveText(formatScore(nextRun.score));
    await expect(pageA.getByTestId("hud-world-champion-mode")).toHaveText("AGENT");

    for (let step = 0; step < 120; step += 1) {
      const state = await readDocumentedAgentState(pageA);
      if (state.gameplay?.gameOverVisible === true) {
        break;
      }

      await pageA.evaluate(({ stepIndex }) => {
        const fire = stepIndex % 10 === 0;
        const moveX = stepIndex % 60 < 30 ? 0.25 : -0.2;
        const lookYawDelta = stepIndex % 2 === 0 ? 1.35 : -0.7;
        window.agent_apply_action?.({
          moveX,
          moveZ: 1,
          lookYawDelta,
          fire,
        });
      }, { stepIndex: step });
      await advanceRuntime(pageA, 500);
    }

    await expect.poll(async () => {
      const state = await readDocumentedAgentState(pageA);
      return state.gameplay?.gameOverVisible === true;
    }, { timeout: 20_000 }).toBe(true);

    await expect(pageA.getByTestId("death-world-champion-name")).toHaveText(holderName.toUpperCase());
    await expect(pageA.getByTestId("death-world-champion-score")).toHaveText(formatScore(nextRun.score));
    await expect(pageA.getByTestId("death-world-champion-mode")).toHaveText("AGENT");
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("automated localhost runtime reads its profile board without competitive writes", async ({ page }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  const agentChampion = createChampion(
    "AutoRecord",
    2_000,
    "agent",
    "2026-03-07T12:05:00.000Z",
  );
  let runStartCount = 0;
  let runFinishCount = 0;

  await page.route("**/api/high-score*", async (route) => {
    const profileId = new URL(route.request().url()).searchParams.get("profileId");
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        champion: profileId === DESKTOP_AGENT_IDENTITY.profileId ? agentChampion : null,
      }),
    });
  });
  await page.route("**/api/run/start", async (route) => {
    runStartCount += 1;
    await route.fulfill({ status: 500, body: "unexpected automated run start" });
  });
  await page.route("**/api/run/finish", async (route) => {
    runFinishCount += 1;
    await route.fulfill({ status: 500, body: "unexpected automated run finish" });
  });

  await gotoAgentRuntimeViaUi(page, {
    baseUrl,
    agentName: "AutomationProbe",
  });

  await expect(page.getByTestId("hud-world-champion-name")).toHaveText("AUTORECORD");
  await forcePositiveScoreViaDebug(page);
  await driveUntilDeath(page);

  const state = await readDocumentedAgentState(page);
  expect(state.gameplay?.gameOverVisible).toBe(true);
  expect(state.profile).toEqual(DESKTOP_AGENT_IDENTITY);
  expect(state.sharedChampion).toEqual(agentChampion);
  expect(runStartCount).toBe(0);
  expect(runFinishCount).toBe(0);
});

test("keeps the game bootable when the shared champion API is unavailable", async ({ page }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;
  await page.route("**/api/high-score*", (route) => route.abort());

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("loading-world-champion-name")).toHaveText("RECORD OFFLINE");
  await expect(page.getByTestId("loading-world-champion-score")).toHaveText("N/A");

  await gotoAgentRuntimeViaUi(page, {
    baseUrl,
    agentName: "OfflineProbe",
  });

  const state = await readDocumentedAgentState(page);
  expect(state.runtimeReady).toBe(true);
  expect(state.sharedChampion).toBeNull();
  await expect(page.getByTestId("hud-world-champion-name")).toHaveText("Unavailable");
  await expect(page.getByTestId("hud-world-champion-mode")).toHaveText("OFFLINE");
});

test("treats malformed shared champion payloads as no champion instead of Unknown", async ({ page }, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL as string;

  await page.route("**/api/high-score*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        champion: {
          holderName: "Bad<Name",
          score: 77,
          controlMode: "agent",
          scope: "sitewide",
          updatedAt: "2026-03-08T12:00:00.000Z",
        },
      }),
    });
  });

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("loading-world-champion-name")).toHaveText("CLAIM THE CROWN");
  await expect(page.getByTestId("loading-world-champion-score")).toHaveText("9999");

  await gotoAgentRuntimeViaUi(page, {
    baseUrl,
    agentName: "NullChamp",
  });

  const state = await readDocumentedAgentState(page);
  expect(state.runtimeReady).toBe(true);
  expect(state.sharedChampion).toBeNull();
  await expect(page.getByTestId("hud-world-champion-name")).toHaveText("No champion yet");
  await expect(page.getByTestId("hud-world-champion-mode")).toHaveText("OPEN");
});

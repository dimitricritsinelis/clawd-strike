import { randomBytes, randomUUID } from "node:crypto";
import {
  SHARED_CHAMPION_RUN_TOKEN_TTL_MS,
  areGameplayProfileIdentitiesEqual,
  createSharedChampionBoardIdentity,
  isSharedChampionControlMode,
  isGameplayProfileCompatibleWithControlMode,
  normalizeSharedChampionRunSummary,
  parseCurrentGameplayProfileIdentity,
  parseStoredGameplayProfileIdentity,
  sanitizeSharedChampionMapId,
  sanitizeSharedChampionName,
  validateSharedChampionRunSummary,
  type SharedChampionRunFinishRequest,
  type SharedChampionRunFinishResponse,
  type SharedChampionRunStartRequest,
  type SharedChampionRunStartResponse,
} from "../apps/shared/highScore.js";
import type { GameplayProfileIdentity } from "../apps/shared/gameplayProfile.js";
import {
  isSharedChampionPublicRunSubmissionEnabled,
  protectJsonWriteRequest,
  sha256Hex,
} from "./highScoreSecurity.js";
import {
  getSharedChampionRunTokenProfileIdentity,
  type SharedChampionAuditEvent,
  type SharedChampionStore,
} from "./highScoreStore.js";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

/**
 * Ceiling on a run request body. Sized so that an implausible-but-parseable
 * submission still reaches the anti-cheat validator and earns its semantic
 * rejection, while a multi-megabyte body is refused before it is ever buffered.
 */
const MAX_RUN_BODY_BYTES = 256 * 1024;

/**
 * Rejections raised before the request cleared the transport gate (wrong
 * content type, cross-origin, rate limited) are unauthenticated and fully
 * attacker-controlled. Writing an audit row for each one turns a request flood
 * into an unbounded write flood against Postgres, so these are logged only.
 */
function logPreAuthRejection(
  eventType: SharedChampionAuditEvent["eventType"],
  status: number,
  reason: string,
  ipFingerprint: string | null,
): void {
  console.warn(
    `[shared-champion] ${eventType} pre-auth rejection status=${status} reason=${reason} `
    + `ip=${(ipFingerprint ?? "unknown").slice(0, 12)}`,
  );
}

/**
 * Rejects an oversized body using the Content-Length header, before request
 * .json() buffers it into memory.
 */
function exceedsRunBodyLimit(request: Request): boolean {
  const declared = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  return Number.isFinite(declared) && declared > MAX_RUN_BODY_BYTES;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

function errorResponse(status: number, error: string): Response {
  return jsonResponse({ error }, { status });
}

function parseRunStartBody(value: unknown): SharedChampionRunStartRequest | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isSharedChampionControlMode(record.controlMode)) return null;
  const profileIdentity = parseCurrentGameplayProfileIdentity(record);
  if (!profileIdentity) return null;
  if (!isGameplayProfileCompatibleWithControlMode(profileIdentity, record.controlMode)) return null;
  const playerName = sanitizeSharedChampionName(record.playerName, record.controlMode);
  if (playerName === null) return null;
  return {
    playerName,
    controlMode: record.controlMode,
    mapId: sanitizeSharedChampionMapId(record.mapId),
    ...profileIdentity,
  };
}

function parseRunFinishBody(value: unknown): SharedChampionRunFinishRequest | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.runToken !== "string" || record.runToken.trim().length === 0) {
    return null;
  }

  const summary = normalizeSharedChampionRunSummary(record.summary);
  if (!summary) {
    return null;
  }
  const profileIdentity = parseStoredGameplayProfileIdentity(record);
  if (!profileIdentity) return null;

  return {
    runToken: record.runToken.trim(),
    summary,
    ...profileIdentity,
  };
}

async function recordAuditEvent(
  store: SharedChampionStore,
  event: SharedChampionAuditEvent,
): Promise<void> {
  try {
    await store.recordAuditEvent(event);
  } catch (error) {
    console.warn("[shared-champion] failed to record audit event", error);
  }
}

function publicRunsDisabledResponse(): Response {
  return errorResponse(
    503,
    "Shared champion submissions are disabled on this deployment.",
  );
}

export async function handleSharedChampionRunStartRequest(
  request: Request,
  store: SharedChampionStore | null,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  if (store === null) {
    return errorResponse(
      503,
      "Shared champion storage is unavailable. Configure Vercel Marketplace Postgres (Neon recommended).",
    );
  }

  if (exceedsRunBodyLimit(request)) {
    logPreAuthRejection("run-start", 413, "payload-too-large", null);
    return errorResponse(413, "Payload too large.");
  }

  const writeCheck = protectJsonWriteRequest(request, {
    rateLimitNamespace: "shared-champion-run-start",
    maxRequests: 120,
    windowMs: 60_000,
    requireSameOrigin: true,
  });
  if (writeCheck.ok === false) {
    logPreAuthRejection("run-start", writeCheck.status, writeCheck.error, writeCheck.clientIpFingerprint);
    return errorResponse(writeCheck.status, writeCheck.error);
  }

  if (!isSharedChampionPublicRunSubmissionEnabled()) {
    await recordAuditEvent(store, {
      eventType: "run-start",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "public-runs-disabled",
    });
    return publicRunsDisabledResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await recordAuditEvent(store, {
      eventType: "run-start",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "invalid-json",
    });
    return errorResponse(400, "Invalid JSON body.");
  }

  const parsedBody = parseRunStartBody(body);
  if (!parsedBody) {
    await recordAuditEvent(store, {
      eventType: "run-start",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "invalid-start-payload",
    });
    return errorResponse(
      400,
      "Expected { playerName, controlMode, mapId, profileId, tuningRevision, balanceSeason }.",
    );
  }

  try {
    const runToken = randomBytes(32).toString("base64url");
    const issued = await store.issueRunToken({
      runId: randomUUID(),
      tokenHash: sha256Hex(runToken),
      playerName: parsedBody.playerName,
      controlMode: parsedBody.controlMode,
      mapId: parsedBody.mapId,
      profileIdentity: {
        profileId: parsedBody.profileId,
        tuningRevision: parsedBody.tuningRevision,
        balanceSeason: parsedBody.balanceSeason,
      },
      expiresAt: new Date(Date.now() + SHARED_CHAMPION_RUN_TOKEN_TTL_MS),
      clientIpFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
    });

    const issuedIdentity = getSharedChampionRunTokenProfileIdentity(issued);
    if (!issuedIdentity || !areGameplayProfileIdentitiesEqual(issuedIdentity, parsedBody)) {
      throw new Error("Issued run token did not preserve its gameplay profile identity.");
    }
    const responseBody: SharedChampionRunStartResponse = {
      runToken,
      issuedAt: issued.issuedAt,
      expiresAt: issued.expiresAt,
      ...createSharedChampionBoardIdentity(issuedIdentity),
    };

    await recordAuditEvent(store, {
      eventType: "run-start",
      outcome: "accepted",
      runId: issued.runId,
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      payload: {
        playerName: issued.playerName,
        controlMode: issued.controlMode,
        mapId: issued.mapId,
        profileId: issuedIdentity.profileId,
        tuningRevision: issuedIdentity.tuningRevision,
        balanceSeason: issuedIdentity.balanceSeason,
        boardKey: issued.boardKey,
        ruleset: issued.ruleset,
        expiresAt: issued.expiresAt,
      },
    });

    return jsonResponse(responseBody);
  } catch (error) {
    console.error("[shared-champion] run-start failed", error);
    return errorResponse(500, "Shared champion run start failed.");
  }
}

async function buildRejectedFinishResponse(
  store: SharedChampionStore,
  status: number,
  reason: string,
  identity: GameplayProfileIdentity | null = null,
): Promise<Response> {
  const champion = await store.getChampion(identity);
  const body: SharedChampionRunFinishResponse = {
    accepted: false,
    updated: false,
    champion,
    reason,
  };
  return jsonResponse(body, { status });
}

export async function handleSharedChampionRunFinishRequest(
  request: Request,
  store: SharedChampionStore | null,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  if (store === null) {
    return errorResponse(
      503,
      "Shared champion storage is unavailable. Configure Vercel Marketplace Postgres (Neon recommended).",
    );
  }

  if (exceedsRunBodyLimit(request)) {
    logPreAuthRejection("run-finish", 413, "payload-too-large", null);
    return errorResponse(413, "Payload too large.");
  }

  const writeCheck = protectJsonWriteRequest(request, {
    rateLimitNamespace: "shared-champion-run-finish",
    maxRequests: 120,
    windowMs: 60_000,
    requireSameOrigin: true,
  });
  if (writeCheck.ok === false) {
    logPreAuthRejection("run-finish", writeCheck.status, writeCheck.error, writeCheck.clientIpFingerprint);
    return buildRejectedFinishResponse(store, writeCheck.status, writeCheck.error);
  }

  if (!isSharedChampionPublicRunSubmissionEnabled()) {
    await recordAuditEvent(store, {
      eventType: "run-finish",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "public-runs-disabled",
    });
    return buildRejectedFinishResponse(store, 503, "public-runs-disabled");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await recordAuditEvent(store, {
      eventType: "run-finish",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "invalid-json",
    });
    return buildRejectedFinishResponse(store, 400, "invalid-json");
  }

  const parsedBody = parseRunFinishBody(body);
  if (!parsedBody) {
    await recordAuditEvent(store, {
      eventType: "run-finish",
      outcome: "rejected",
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      reason: "invalid-finish-payload",
    });
    return buildRejectedFinishResponse(store, 400, "invalid-finish-payload");
  }

  try {
    const consumed = await store.consumeRunToken({
      tokenHash: sha256Hex(parsedBody.runToken),
      clientIpFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
    });

    if (consumed.status !== "consumed" || !consumed.record) {
      const status = consumed.status === "expired"
        ? 410
        : consumed.status === "used"
          ? 409
          : 404;
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: consumed.record?.runId ?? null,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: consumed.status,
      });
      return buildRejectedFinishResponse(store, status, consumed.status, parsedBody);
    }

    const tokenIdentity = getSharedChampionRunTokenProfileIdentity(consumed.record);
    if (!tokenIdentity) {
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: consumed.record.runId,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: "run-token-profile-missing",
      });
      return buildRejectedFinishResponse(store, 409, "run-token-profile-missing", parsedBody);
    }

    if (!areGameplayProfileIdentitiesEqual(tokenIdentity, parsedBody)) {
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: consumed.record.runId,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: "profile-identity-mismatch",
        payload: {
          tokenIdentity,
          requestedIdentity: {
            profileId: parsedBody.profileId,
            tuningRevision: parsedBody.tuningRevision,
            balanceSeason: parsedBody.balanceSeason,
          },
        },
      });
      return buildRejectedFinishResponse(store, 409, "profile-identity-mismatch", tokenIdentity);
    }

    if (!isGameplayProfileCompatibleWithControlMode(tokenIdentity, consumed.record.controlMode)) {
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: consumed.record.runId,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: "profile-control-mode-mismatch",
      });
      return buildRejectedFinishResponse(store, 409, "profile-control-mode-mismatch", tokenIdentity);
    }

    const normalizedTokenPlayerName = sanitizeSharedChampionName(
      consumed.record.playerName,
      consumed.record.controlMode,
    );
    if (normalizedTokenPlayerName === null) {
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: consumed.record.runId,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: "invalid-run-token-player-name",
        payload: {
          mapId: consumed.record.mapId,
          playerName: consumed.record.playerName,
          controlMode: consumed.record.controlMode,
          profileId: tokenIdentity.profileId,
          tuningRevision: tokenIdentity.tuningRevision,
          balanceSeason: tokenIdentity.balanceSeason,
          boardKey: consumed.record.boardKey,
        },
      });
      return buildRejectedFinishResponse(store, 422, "invalid-run-token-player-name", tokenIdentity);
    }

    const tokenRecord = {
      ...consumed.record,
      playerName: normalizedTokenPlayerName,
    };

    const claimedAtMs = tokenRecord.claimedAt
      ? Date.parse(tokenRecord.claimedAt)
      : Date.now();
    const issuedAtMs = Date.parse(tokenRecord.issuedAt);
    const wallElapsedMs = Math.max(0, claimedAtMs - issuedAtMs);
    const validation = validateSharedChampionRunSummary(parsedBody.summary, wallElapsedMs);

    if (validation.ok === false) {
      await recordAuditEvent(store, {
        eventType: "run-finish",
        outcome: "rejected",
        runId: tokenRecord.runId,
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: validation.reason,
        payload: {
          mapId: tokenRecord.mapId,
          playerName: tokenRecord.playerName,
          controlMode: tokenRecord.controlMode,
          profileId: tokenIdentity.profileId,
          tuningRevision: tokenIdentity.tuningRevision,
          balanceSeason: tokenIdentity.balanceSeason,
          boardKey: tokenRecord.boardKey,
          elapsedMs: validation.elapsedMs,
          wallElapsedMs,
          maxKills: validation.maxKills,
          maxShotsFired: validation.maxShotsFired,
          summary: parsedBody.summary,
        },
      });
      return buildRejectedFinishResponse(store, 422, validation.reason, tokenIdentity);
    }

    const result = await store.finalizeValidatedRun({
      tokenRecord,
      summary: parsedBody.summary,
      elapsedMs: validation.elapsedMs,
      score: validation.computedScore,
      clientIpFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
    });

    await recordAuditEvent(store, {
      eventType: "run-finish",
      outcome: "accepted",
      runId: tokenRecord.runId,
      ipFingerprint: writeCheck.clientIpFingerprint,
      userAgentFingerprint: writeCheck.userAgentFingerprint,
      payload: {
        playerName: tokenRecord.playerName,
        controlMode: tokenRecord.controlMode,
        mapId: tokenRecord.mapId,
        profileId: tokenIdentity.profileId,
        tuningRevision: tokenIdentity.tuningRevision,
        balanceSeason: tokenIdentity.balanceSeason,
        boardKey: tokenRecord.boardKey,
        elapsedMs: validation.elapsedMs,
        wallElapsedMs,
        score: validation.computedScore,
        updated: result.updated,
        runId: result.run.runId,
        summary: parsedBody.summary,
      },
    });

    const responseBody: SharedChampionRunFinishResponse = {
      accepted: true,
      updated: result.updated,
      champion: result.champion,
      reason: null,
    };

    return jsonResponse(responseBody);
  } catch (error) {
    console.error("[shared-champion] run-finish failed", error);
    return errorResponse(500, "Shared champion run finish failed.");
  }
}

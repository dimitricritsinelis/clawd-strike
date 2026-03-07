import {
  isSharedChampionControlMode,
  normalizeScoreHalfPoints,
  sanitizeSharedChampionName,
  type SharedChampionPostRequest,
} from "../apps/shared/highScore.js";
import type { SharedChampionStore } from "./highScoreStore.js";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

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

function parseSubmissionBody(value: unknown): SharedChampionPostRequest | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isSharedChampionControlMode(record.controlMode)) return null;

  const parsedScore = Number(record.scoreHalfPoints);
  if (!Number.isFinite(parsedScore) || parsedScore < 0) return null;

  return {
    playerName: sanitizeSharedChampionName(record.playerName, record.controlMode),
    scoreHalfPoints: normalizeScoreHalfPoints(parsedScore),
    controlMode: record.controlMode,
  };
}

export async function handleSharedChampionRequest(
  request: Request,
  store: SharedChampionStore | null,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "allow": "GET, POST, OPTIONS",
        "cache-control": "no-store",
      },
    });
  }

  if (store === null) {
    return errorResponse(
      503,
      "Shared champion storage is unavailable. Configure Vercel Marketplace Postgres (Neon recommended).",
    );
  }

  try {
    if (request.method === "GET") {
      const champion = await store.getChampion();
      return jsonResponse({ champion });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "Invalid JSON body.");
      }

      const parsedBody = parseSubmissionBody(body);
      if (!parsedBody) {
        return errorResponse(400, "Expected { playerName, scoreHalfPoints, controlMode }.");
      }

      const result = await store.submitCandidate(parsedBody);
      return jsonResponse(result);
    }

    return errorResponse(405, "Method not allowed.");
  } catch (error) {
    console.error("[shared-champion] request failed", error);
    return errorResponse(500, "Shared champion request failed.");
  }
}

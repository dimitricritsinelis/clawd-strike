import {
  fingerprintClientIp,
  protectJsonWriteRequest,
} from "./highScoreSecurity.js";
import { errorResponse, jsonResponse } from "./http.js";
import { parseCurrentGameplayProfileIdentity } from "../apps/shared/highScore.js";
import type { GameplayProfileIdentity } from "../apps/shared/gameplayProfile.js";
import type { SharedChampionStore } from "./highScoreStoreImpl.js";

const MAX_POST_BODY_BYTES = 1024;

function parseChampionReadIdentity(request: Request): {
  valid: boolean;
  identity: GameplayProfileIdentity | null;
} {
  const search = new URL(request.url).searchParams;
  const identityFields = {
    profileId: search.get("profileId"),
    tuningRevision: search.get("tuningRevision"),
    balanceSeason: search.get("balanceSeason"),
  };
  const providedCount = Object.values(identityFields).filter((value) => value !== null).length;
  if (providedCount === 0) {
    return { valid: true, identity: null };
  }
  if (providedCount !== 3) {
    return { valid: false, identity: null };
  }
  const identity = parseCurrentGameplayProfileIdentity(identityFields);
  return {
    valid: identity !== null,
    identity,
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
      const parsedIdentity = parseChampionReadIdentity(request);
      if (!parsedIdentity.valid) {
        return errorResponse(
          400,
          "Expected a complete current { profileId, tuningRevision, balanceSeason } identity.",
        );
      }
      const champion = await store.getChampion(parsedIdentity.identity);
      return jsonResponse({ champion });
    }

    if (request.method === "POST") {
      // Direct champion writes are retired. Every score must come through the
      // validated run flow (/api/run/start -> /api/run/finish), which binds the
      // score to a server-issued run token and runs anti-cheat validation. This
      // path used to accept a shared admin token as a bypass; it is closed
      // outright, so the branch only refuses and never touches the database.
      //
      // fingerprintClientIp is a keyed HMAC, so the log tag is stable per
      // client without holding the raw address.
      const clientIpLogTag = fingerprintClientIp(request).slice(0, 12);

      // ── Request size limit ──────────────────────────────────────────────
      const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
      if (contentLength > MAX_POST_BODY_BYTES) {
        console.log(`[champion-submit] ip=${clientIpLogTag} result=rejected reason=payload-too-large size=${contentLength}`);
        return errorResponse(413, "Payload too large.");
      }

      const writeCheck = protectJsonWriteRequest(request, {
        rateLimitNamespace: "shared-champion-admin-write",
        maxRequests: 6,
        windowMs: 60_000,
        requireSameOrigin: false,
      });
      if (writeCheck.ok === false) {
        console.log(`[champion-submit] ip=${clientIpLogTag} result=rejected status=${writeCheck.status} reason=${writeCheck.error}`);
        return errorResponse(writeCheck.status, writeCheck.error);
      }

      console.log(`[champion-submit] ip=${clientIpLogTag} result=rejected reason=direct-write-retired`);
      return errorResponse(403, "Direct shared champion writes are internal-only.");
    }

    return errorResponse(405, "Method not allowed.");
  } catch (error) {
    console.error("[shared-champion] request failed", error);
    return errorResponse(500, "Shared champion request failed.");
  }
}

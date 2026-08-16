import {
  fingerprintClientIp,
  protectJsonWriteRequest,
} from "./highScoreSecurity.js";
import type { SharedChampionAuditEvent, SharedChampionStore } from "./highScoreStore.js";

const MAX_POST_BODY_BYTES = 1024;

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
      // Never hold the raw address: this value is the rate-limit key, is
      // persisted by logSubmission into the column named client_ip_fingerprint,
      // and is echoed into request logs. fingerprintClientIp is a keyed HMAC, so
      // it is stable per client without being reversible.
      const clientIpFingerprint = fingerprintClientIp(request);
      const clientIpLogTag = clientIpFingerprint.slice(0, 12);

      // ── Request size limit ──────────────────────────────────────────────
      const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
      if (contentLength > MAX_POST_BODY_BYTES) {
        console.log(`[champion-submit] ip=${clientIpLogTag} result=rejected reason=payload-too-large size=${contentLength}`);
        return errorResponse(413, "Payload too large.");
      }

      // ── Rate limiting ───────────────────────────────────────────────────
      const rateLimited = await store.isRateLimited(clientIpFingerprint);
      if (rateLimited) {
        console.log(`[champion-submit] ip=${clientIpLogTag} result=rate-limited`);
        return errorResponse(429, "Too many submissions. Try again later.");
      }

      const writeCheck = protectJsonWriteRequest(request, {
        rateLimitNamespace: "shared-champion-admin-write",
        maxRequests: 6,
        windowMs: 60_000,
        requireSameOrigin: false,
      });
      if (writeCheck.ok === false) {
        await recordAuditEvent(store, {
          eventType: "champion-direct-write",
          outcome: "rejected",
          ipFingerprint: writeCheck.clientIpFingerprint,
          userAgentFingerprint: writeCheck.userAgentFingerprint,
          reason: writeCheck.error,
        });
        return errorResponse(writeCheck.status, writeCheck.error);
      }

      // Direct champion writes are retired. Every score must come through the
      // validated run flow (/api/run/start -> /api/run/finish), which binds the
      // score to a server-issued run token and runs anti-cheat validation.
      //
      // This path used to accept a shared admin token as a bypass, so anyone
      // holding that env value could set an arbitrary champion score in one
      // request. Nothing uses the bypass — the game client only GETs this
      // endpoint, and no script or admin tool sends the header — so it is
      // closed outright rather than left as a standing skeleton key.
      await recordAuditEvent(store, {
        eventType: "champion-direct-write",
        outcome: "rejected",
        ipFingerprint: writeCheck.clientIpFingerprint,
        userAgentFingerprint: writeCheck.userAgentFingerprint,
        reason: "Direct shared champion writes are internal-only.",
      });
      console.log(`[champion-submit] ip=${clientIpLogTag} result=rejected reason=direct-write-retired`);
      return errorResponse(403, "Direct shared champion writes are internal-only.");
    }

    return errorResponse(405, "Method not allowed.");
  } catch (error) {
    console.error("[shared-champion] request failed", error);
    return errorResponse(500, "Shared champion request failed.");
  }
}

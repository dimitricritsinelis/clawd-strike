Audience: implementation-agent
Authority: reference; current request handlers and validators own implemented behavior
Read when: security, api, public-contract, deployment
Owns: security architecture, anti-cheat design, environment variable requirements
Do not use for: map design, gameplay approval, or authorization to access production
Last updated: 2026-09-04

# Security Architecture

Clawd Strike is a browser-based survival FPS deployed on Vercel. The browser runs combat and supplies run summaries; the server validates submissions and persists records in Postgres. This document describes the current code, not a fresh deployment security verification.

## Threat model

- Treat client gameplay state and submitted telemetry as untrusted.
- Primary threats are forged scores, reused run tokens, profile/board identity substitution, and abusive API requests.
- Browser protections also address cross-origin writes, script injection, framing, and MIME sniffing.
- Public agent globals are intentional and documented in [the public contract](../apps/client/public/skills.md). Competitive agents must stay within that contract.
- Server state includes champion boards, run-token records, validated run history, and audit events. Competitive boards are separated by ruleset, balance season, gameplay profile, and tuning revision.

## 1. Validated run submission

The current scoring flow is `POST /api/run/start` followed by `POST /api/run/finish`.

1. Start validates the player name, control mode, map identifier, and current `{ profileId, tuningRevision, balanceSeason }` tuple. The profile must match the control mode.
2. The server creates a random 32-byte bearer token and stores its SHA-256 hash with the run identity and a 30-minute expiry. The raw token is returned to the client.
3. Finish submits that token, the same profile identity, and a run summary. Postgres atomically claims only an unclaimed, unexpired token.
4. Finish verifies the token-bound identity and summary. A used token returns `409`, an expired token `410`, and a missing token `404`.
5. A validated run and its champion update are persisted in one transaction. Only a strictly higher score replaces an existing champion on the same board; ties do not replace it.

Token consumption happens before identity and summary validation. A rejected submission or later failure after the claim does not make that token reusable. The token is a bearer credential; recorded IP and user-agent fingerprints are audit context, not a requirement that both requests come from identical values.

`GET /api/high-score` reads a champion. It accepts either no profile tuple for the legacy default board or a complete current tuple for a profile board. Direct `POST /api/high-score` writes are retired: requests that clear its transport checks receive `403`; no admin-token bypass updates a champion through this endpoint.

The older `/api/session` endpoint and HMAC session-token module still exist. They are not the authentication mechanism for the current run submission flow and do not authorize direct score writes. Do not build new scoring integrations around them.

**Owners:** [run API](../server/highScoreRunApi.ts), [champion API](../server/highScoreApi.ts), [store implementation](../server/highScoreStoreImpl.ts), and [shared run lifecycle](../apps/client/src/shared/sharedChampionRunLifecycle.ts).

## 2. Summary and score validation

The finish payload includes `survivalTimeS`, `kills`, `headshots`, `headshotsPerWave`, `shotsFired`, `shotsHit`, `accuracy`, and `finalScore`; `deathCause` is optional. Shared parsing normalizes numeric values before semantic validation.

Validation checks:

- Positive active combat time, no greater than token wall time plus the 5-second startup/request tolerance. Active time and wall time are different clocks.
- The correct number of per-wave headshot entries, each within that wave's kill count, with a sum matching total headshots.
- `headshots <= kills <= shotsHit <= shotsFired`.
- Kill and shot ceilings derived from active time and the fastest registered firing cadence.
- A recomputed wave-scaled score: `killValue(w) = 5 + (w - 1) * 2`, with an equal bonus for each headshot.
- Reported accuracy consistent with shots hit/fired within the configured tolerance.

The flat score helpers remain in shared code for legacy uses; they do not describe the current public run scoring path. Runtime tuning changes must preserve agreement with the server's validation bounds and board identity, as described in [gameplay balancing](gameplay-balancing.md).

**Owner:** [shared score and run validation](../apps/shared/highScore.ts).

## 3. Request gates and rate limits

Run start and finish require `application/json` and an `Origin` header equal to the request URL's origin. Each endpoint has a separate per-IP-fingerprint limit of 120 requests per 60 seconds.

The limiter is in memory per server instance, with a 10,000-bucket ceiling and expiration/eviction. It is not a globally coordinated quota. Header checks constrain browser cross-origin traffic; they do not prove a human played or prevent a non-browser client from supplying matching headers.

The retired direct-write endpoint retains its older Postgres 30-second submission check and a separate six-attempts-per-minute transport limiter. Those checks are not the rate-limit contract for `/api/run/start` or `/api/run/finish`.

**Owners:** [request protection](../server/highScoreSecurity.ts), [run API](../server/highScoreRunApi.ts), and [champion API](../server/highScoreApi.ts).

## 4. Request size and input validation

Run endpoints reject a declared `Content-Length` above 256 KiB before parsing JSON. This is a header-based check, not a streaming byte counter. The per-wave headshot array is additionally limited to 20,000 entries. The retired direct-write endpoint retains a 1 KiB declared-body limit.

Names use the shared 15-character normalization and validation rules, allowed-character checks, and moderation rules. Invalid names are rejected rather than replaced with `Operator` or `Agent`. Control mode and profile identities are validated. Map identifiers are trimmed and bounded; their presence is not proof that the reported gameplay occurred on that map.

**Owners:** [run API](../server/highScoreRunApi.ts), [shared validation](../apps/shared/highScore.ts), and [name validation](../apps/shared/playerName.ts).

## 5. Security headers

[vercel.json](../vercel.json) configures:

- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` to prevent framing.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- CSP defaults and scripts restricted to `'self'`; inline styles are allowed. `img-src` permits `data:` and `blob:`, and `connect-src` permits `blob:` for embedded-texture GLB loading. Objects are disabled; base URLs and form actions are restricted to `'self'`.
- `Cache-Control: no-store` for API routes.

These are deployment header settings; changes require checking the actual deployed response as well as the configuration file.

## 6. Database transport and SQL

The store uses parameterized values for request data and explicit read/write connection selection. For non-local connections, `prefer`, `require`, and `verify-ca` SSL modes are normalized to `verify-full`, and TLS configuration defaults to `rejectUnauthorized: true`. Localhost and an explicit `sslmode=disable` bypass that TLS configuration; do not describe every possible connection setting as verified TLS.

**Owner:** [store implementation](../server/highScoreStoreImpl.ts). [highScoreStore.ts](../server/highScoreStore.ts) re-exports that implementation.

## 7. Privacy, admin access, and audit logging

IP addresses and user-agent strings are converted to namespaced HMAC-SHA256 fingerprints for the run records and request audit context. IP extraction uses the first `x-forwarded-for` value, then `x-real-ip`, then `unknown`; its trust depends on the hosting proxy. Request logs use shortened fingerprint tags rather than treating raw addresses as the stored identity.

Stats administration uses `STATS_ADMIN_TOKEN` Bearer authentication with a timing-safe comparison. Without that token in production, admin stats remain unavailable. This token does not enable direct champion writes.

Run start/finish record accepted and semantic rejection events with run/profile identifiers and relevant validation details. Pre-authentication run rejections are logged without inserting an audit row for each request. Audit logging and retention sweeps are best effort; logs and history do not substitute for server-side gameplay verification.

**Owners:** [security helpers](../server/highScoreSecurity.ts), [run API](../server/highScoreRunApi.ts), and [store implementation](../server/highScoreStoreImpl.ts).

## 8. Public and internal runtime surfaces

The documented `agent_observe`, `agent_apply_action`, `advanceTime`, and `render_game_to_text` surfaces support public agent play. Production observations expose the public payload, not internal coordinates, routes, enemies, seeds, or bounds.

Internal debugging, including combat-feedback injection and bot elimination, is gated by `isInternalDebugSurface = import.meta.env.DEV || isLocalHostRuntime` in [bootstrap.ts](../apps/client/src/runtime/bootstrap.ts). Authorized local implementation QA may use internal measurement tools. That access must not be added to the public competitive contract.

## Known limitations

- Client telemetry can still be forged within the validator's bounds. Tokens prevent replay and bind server-issued identity; they do not attest gameplay or prove a page visit.
- Per-instance limits and IP-based keys can be bypassed across instances or rotating addresses. Origin headers are not authentication for non-browser clients.
- Map data and production assets are publicly served. The public agent fairness rules restrict their competitive use, not their network visibility.
- A valid token is consumed before final validation and persistence; the finish operation is not an idempotent retry API.

## Environment variables

| Variable | Current use |
|---|---|
| `POSTGRES_WRITE_URL` | Preferred write connection. Fallback order: `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `NEON_DATABASE_URL`. A usable write connection is required for submissions. |
| `POSTGRES_READ_URL` | Preferred read connection; otherwise the write connection aliases above are tried in order. |
| `PRIVACY_HASH_SECRET` | At least 32 characters for request fingerprints. Missing/short values fail closed in production or Vercel environments; the committed development fallback is local only. |
| `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS` | Optional submission switch; public runs are enabled by default. Recognized false values disable run start/finish. |
| `STATS_ADMIN_TOKEN` | Required to enable production admin stats; not a champion-write credential. |
| `SESSION_SECRET` | At least 32 characters if the legacy `/api/session` endpoint is used in production. It does not replace run-token storage or `PRIVACY_HASH_SECRET`. |

Read [the store's connection selection](../server/highScoreStoreImpl.ts) and [security helpers](../server/highScoreSecurity.ts) for exact precedence and local-only fallback behavior. This reference does not authorize reading credentials, changing deployment configuration, or accessing production.

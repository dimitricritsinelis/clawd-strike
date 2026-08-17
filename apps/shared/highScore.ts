import {
  PLAYER_NAME_MAX_LENGTH,
  normalizeValidatedPlayerName,
  parseStoredPlayerName,
  sanitizeValidatedPlayerName,
} from "./playerName.js";
import {
  getGameplayProfileIdentity,
  isGameplayProfileId,
  type GameplayProfileIdentity,
  type GameplayProfileId,
} from "./gameplayProfile.js";

export const HIGH_SCORE_PLAYER_NAME_MAX_LENGTH = PLAYER_NAME_MAX_LENGTH;
export const HIGH_SCORE_MAP_ID_MAX_LENGTH = 64;
export const SITEWIDE_CHAMPION_SCOPE = "sitewide";
export const SITEWIDE_CHAMPION_BOARD_KEY = "default";
export const SHARED_CHAMPION_SCORE_RULESET = "wave-score-v4-k5-wi2-hs2x-b10";
export const SHARED_CHAMPION_PROFILE_BOARD_KEY_VERSION = "profile-v1";
export const SHARED_CHAMPION_WAVE_ENEMY_COUNT = 10;
// Fastest legal cadence across every currently registered gameplay profile.
// All three profiles currently share the Desktop Human 0.08 s Rapid Fire
// baseline. A future faster profile must update this validation bound as part
// of the same revisioned balance change.
export const SHARED_CHAMPION_FIRE_INTERVAL_S = 0.08;
export const SHARED_CHAMPION_KILL_SCORE = 5;
export const SHARED_CHAMPION_WAVE_SCORE_INCREMENT = 2;
export const SHARED_CHAMPION_RUN_TOKEN_TTL_MS = 30 * 60 * 1000;
export const SHARED_CHAMPION_SCORE_WRITE_ENDPOINT = "/api/high-score";
export const SHARED_CHAMPION_RUN_START_ENDPOINT = "/api/run/start";
export const SHARED_CHAMPION_RUN_FINISH_ENDPOINT = "/api/run/finish";

const SHARED_CHAMPION_MAX_STARTING_KILLS = SHARED_CHAMPION_WAVE_ENEMY_COUNT;
const SHARED_CHAMPION_MAX_STARTING_SHOTS = 30;
const SHARED_CHAMPION_ACCURACY_TOLERANCE = 0.2;
const SHARED_CHAMPION_ACTIVE_TIME_TOLERANCE_MS = 5_000;

export type SharedChampionControlMode = "human" | "agent";
export type SharedChampionRunDeathCause = "enemy-fire" | "unknown";

export type SharedChampionBoardIdentity = GameplayProfileIdentity & {
  boardKey: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET;
};

export type SharedChampion = {
  holderName: string;
  score: number;
  controlMode: SharedChampionControlMode;
  scope: typeof SITEWIDE_CHAMPION_SCOPE;
  updatedAt: string;
  boardKey: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET | null;
  profileId: GameplayProfileId | null;
  tuningRevision: string | null;
  balanceSeason: string | null;
};

export type SharedChampionSnapshotStatus = "idle" | "loading" | "ready" | "unavailable";

export type SharedChampionSnapshot = {
  status: SharedChampionSnapshotStatus;
  champion: SharedChampion | null;
};

export type SharedChampionGetResponse = {
  champion: SharedChampion | null;
};

export type SharedChampionPostTelemetry = {
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  survivalTimeS: number;
};

export type SharedChampionPostRequest = {
  playerName: string;
  score: number;
  controlMode: SharedChampionControlMode;
  telemetry?: SharedChampionPostTelemetry;
};

export type SharedChampionPostResponse = {
  updated: boolean;
  champion: SharedChampion | null;
};

export type SharedChampionRunStartRequest = GameplayProfileIdentity & {
  playerName: string;
  controlMode: SharedChampionControlMode;
  mapId: string;
};

export type SharedChampionRunStartResponse = SharedChampionBoardIdentity & {
  runToken: string;
  issuedAt: string;
  expiresAt: string;
};

export type SharedChampionRunSummary = {
  survivalTimeS: number;
  kills: number;
  headshots: number;
  headshotsPerWave: number[];
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  finalScore: number;
  deathCause?: SharedChampionRunDeathCause;
};

export type SharedChampionRunFinishRequest = GameplayProfileIdentity & {
  runToken: string;
  summary: SharedChampionRunSummary;
};

export type SharedChampionRunFinishResponse = {
  accepted: boolean;
  updated: boolean;
  champion: SharedChampion | null;
  reason: string | null;
};

export type SharedChampionRunValidation =
  | {
      ok: true;
      computedScore: number;
      elapsedMs: number;
      maxKills: number;
      maxShotsFired: number;
    }
  | {
      ok: false;
      reason: string;
      computedScore: number;
      elapsedMs: number;
      maxKills: number;
      maxShotsFired: number;
    };

export function isSharedChampionControlMode(value: unknown): value is SharedChampionControlMode {
  return value === "human" || value === "agent";
}

export function isSharedChampionRunDeathCause(value: unknown): value is SharedChampionRunDeathCause {
  return value === "enemy-fire" || value === "unknown";
}

function isNonEmptyIdentityPart(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

/**
 * Parses a persisted profile identity without requiring it to still be the
 * registry's current revision. This keeps historical rows readable after a
 * future tuning or season rollover.
 */
export function parseStoredGameplayProfileIdentity(value: unknown): GameplayProfileIdentity | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isGameplayProfileId(record.profileId)) return null;
  if (!isNonEmptyIdentityPart(record.tuningRevision)) return null;
  if (!isNonEmptyIdentityPart(record.balanceSeason)) return null;
  return Object.freeze({
    profileId: record.profileId,
    tuningRevision: record.tuningRevision,
    balanceSeason: record.balanceSeason,
  });
}

export function areGameplayProfileIdentitiesEqual(
  left: GameplayProfileIdentity,
  right: GameplayProfileIdentity,
): boolean {
  return left.profileId === right.profileId
    && left.tuningRevision === right.tuningRevision
    && left.balanceSeason === right.balanceSeason;
}

/** Accept only the current immutable registry tuple for competitive traffic. */
export function parseCurrentGameplayProfileIdentity(value: unknown): GameplayProfileIdentity | null {
  const parsed = parseStoredGameplayProfileIdentity(value);
  if (!parsed) return null;
  const current = getGameplayProfileIdentity(parsed.profileId);
  return areGameplayProfileIdentitiesEqual(parsed, current) ? current : null;
}

export function isGameplayProfileCompatibleWithControlMode(
  identity: GameplayProfileIdentity,
  controlMode: SharedChampionControlMode,
): boolean {
  return identity.profileId === "desktop-agent"
    ? controlMode === "agent"
    : controlMode === "human";
}

export function deriveSharedChampionBoardKey(identity: GameplayProfileIdentity): string {
  return [
    SHARED_CHAMPION_PROFILE_BOARD_KEY_VERSION,
    SHARED_CHAMPION_SCORE_RULESET,
    identity.balanceSeason,
    identity.profileId,
    identity.tuningRevision,
  ].map((part) => encodeURIComponent(part)).join(":");
}

export function createSharedChampionBoardIdentity(
  identity: GameplayProfileIdentity,
): SharedChampionBoardIdentity {
  return {
    ...identity,
    boardKey: deriveSharedChampionBoardKey(identity),
    ruleset: SHARED_CHAMPION_SCORE_RULESET,
  };
}

export function clampSharedChampionName(value: string): string {
  return normalizeValidatedPlayerName(value);
}

export function sanitizeSharedChampionName(
  value: unknown,
  _controlMode?: SharedChampionControlMode,
): string | null {
  return sanitizeValidatedPlayerName(value);
}

export function sanitizeSharedChampionMapId(value: unknown): string {
  if (typeof value !== "string") return "unknown-map";
  const normalized = value.trim().slice(0, HIGH_SCORE_MAP_ID_MAX_LENGTH);
  return normalized.length > 0 ? normalized : "unknown-map";
}

export function normalizeScore(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export function normalizeRunCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function normalizeTenths(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 10) / 10);
}

export function normalizeRunSeconds(value: unknown): number {
  return normalizeTenths(value);
}

export function normalizeAccuracyPercent(value: unknown): number {
  return normalizeTenths(value);
}

export function computeAccuracyPercent(shotsHit: number, shotsFired: number): number {
  if (shotsFired <= 0) return 0;
  return normalizeAccuracyPercent((shotsHit / shotsFired) * 100);
}

/** Base kill value for a 1-indexed wave number. */
export function getWaveKillValue(wave: number): number {
  return SHARED_CHAMPION_KILL_SCORE + (Math.max(1, wave) - 1) * SHARED_CHAMPION_WAVE_SCORE_INCREMENT;
}

/** Headshot bonus for a 1-indexed wave number (2× multiplier: bonus = killValue). */
export function getWaveHeadshotBonus(wave: number): number {
  return getWaveKillValue(wave);
}

/** Flat score formula used only by admin telemetry validation. */
export function calculateFlatScore(kills: number, headshots: number): number {
  const normalizedKills = normalizeRunCount(kills);
  const normalizedHeadshots = normalizeRunCount(headshots);
  return (normalizedKills * SHARED_CHAMPION_KILL_SCORE)
    + (normalizedHeadshots * SHARED_CHAMPION_KILL_SCORE);
}

/** Wave-scaled score from kills + per-wave headshot distribution. */
export function calculateSharedChampionScore(kills: number, headshotsPerWave: number[]): number {
  const normalizedKills = normalizeRunCount(kills);
  const totalWaves = Math.ceil(normalizedKills / SHARED_CHAMPION_WAVE_ENEMY_COUNT);
  let score = 0;
  for (let w = 1; w <= totalWaves; w++) {
    const killsInWave = Math.min(
      SHARED_CHAMPION_WAVE_ENEMY_COUNT,
      normalizedKills - (w - 1) * SHARED_CHAMPION_WAVE_ENEMY_COUNT,
    );
    const hsInWave = normalizeRunCount(headshotsPerWave[w - 1] ?? 0);
    const kv = getWaveKillValue(w);
    score += killsInWave * kv + hsInWave * kv;
  }
  return score;
}

export function createSharedChampion(input: {
  holderName: string;
  score: number;
  controlMode: SharedChampionControlMode;
  updatedAt: Date | string;
  identity?: GameplayProfileIdentity | null;
}): SharedChampion {
  const updatedAt = input.updatedAt instanceof Date
    ? input.updatedAt.toISOString()
    : new Date(input.updatedAt).toISOString();

  return {
    holderName: normalizeValidatedPlayerName(input.holderName),
    score: normalizeScore(input.score),
    controlMode: input.controlMode,
    scope: SITEWIDE_CHAMPION_SCOPE,
    updatedAt,
    boardKey: input.identity
      ? deriveSharedChampionBoardKey(input.identity)
      : SITEWIDE_CHAMPION_BOARD_KEY,
    ruleset: input.identity ? SHARED_CHAMPION_SCORE_RULESET : null,
    profileId: input.identity?.profileId ?? null,
    tuningRevision: input.identity?.tuningRevision ?? null,
    balanceSeason: input.identity?.balanceSeason ?? null,
  };
}

export function parseSharedChampion(value: unknown): SharedChampion | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (!isSharedChampionControlMode(record.controlMode)) return null;
  if (typeof record.holderName !== "string") return null;
  if (typeof record.updatedAt !== "string") return null;
  const holderName = parseStoredPlayerName(record.holderName);
  if (holderName === null) return null;

  const updatedAt = new Date(record.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;

  const hasAnyIdentityMetadata = record.profileId != null
    || record.tuningRevision != null
    || record.balanceSeason != null
    || (record.boardKey != null && record.boardKey !== SITEWIDE_CHAMPION_BOARD_KEY)
    || record.ruleset != null;
  const identity = hasAnyIdentityMetadata
    ? parseStoredGameplayProfileIdentity(record)
    : null;
  if (hasAnyIdentityMetadata && identity === null) return null;
  if (identity) {
    if (record.ruleset !== SHARED_CHAMPION_SCORE_RULESET) return null;
    if (record.boardKey !== deriveSharedChampionBoardKey(identity)) return null;
  } else {
    if (record.boardKey != null && record.boardKey !== SITEWIDE_CHAMPION_BOARD_KEY) return null;
    if (record.ruleset != null) return null;
  }

  return createSharedChampion({
    holderName,
    score: normalizeScore(record.score),
    controlMode: record.controlMode,
    updatedAt,
    identity,
  });
}

export function parseSharedChampionGetResponse(value: unknown): SharedChampionGetResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    champion: record.champion === null ? null : parseSharedChampion(record.champion),
  };
}

export function parseSharedChampionPostResponse(value: unknown): SharedChampionPostResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.updated !== "boolean") return null;
  return {
    updated: record.updated,
    champion: record.champion === null ? null : parseSharedChampion(record.champion),
  };
}

/**
 * Absolute ceiling on per-wave entries. This sits far above any run the score
 * cap can accept — over-cap-but-plausible runs must still reach the semantic
 * validator so they are rejected as `kills-exceed-cap` rather than as a
 * malformed body. It exists only to stop a client posting a multi-megabyte
 * array that would be stored verbatim as JSONB.
 */
export const MAX_HEADSHOTS_PER_WAVE_ENTRIES = 20_000;

function normalizeHeadshotsPerWave(value: unknown): number[] | null {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_HEADSHOTS_PER_WAVE_ENTRIES) return null;
  const result: number[] = [];
  for (const item of value) {
    result.push(normalizeRunCount(item));
  }
  return result;
}

export function normalizeSharedChampionRunSummary(value: unknown): SharedChampionRunSummary | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const rawDeathCause = record.deathCause;
  if (rawDeathCause !== undefined && !isSharedChampionRunDeathCause(rawDeathCause)) {
    return null;
  }
  const deathCause = rawDeathCause as SharedChampionRunDeathCause | undefined;

  const headshotsPerWave = normalizeHeadshotsPerWave(record.headshotsPerWave);
  if (headshotsPerWave === null) return null;

  return {
    survivalTimeS: normalizeRunSeconds(record.survivalTimeS),
    kills: normalizeRunCount(record.kills),
    headshots: normalizeRunCount(record.headshots),
    headshotsPerWave,
    shotsFired: normalizeRunCount(record.shotsFired),
    shotsHit: normalizeRunCount(record.shotsHit),
    accuracy: normalizeAccuracyPercent(record.accuracy),
    finalScore: normalizeScore(record.finalScore),
    ...(deathCause !== undefined ? { deathCause } : {}),
  };
}

export function parseSharedChampionRunStartResponse(value: unknown): SharedChampionRunStartResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.runToken !== "string") return null;
  if (typeof record.issuedAt !== "string") return null;
  if (typeof record.expiresAt !== "string") return null;
  if (record.ruleset !== SHARED_CHAMPION_SCORE_RULESET) return null;
  const identity = parseCurrentGameplayProfileIdentity(record);
  if (!identity) return null;
  const boardKey = deriveSharedChampionBoardKey(identity);
  if (record.boardKey !== boardKey) return null;

  const issuedAt = new Date(record.issuedAt);
  const expiresAt = new Date(record.expiresAt);
  if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  return {
    runToken: record.runToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ruleset: SHARED_CHAMPION_SCORE_RULESET,
    boardKey,
    ...identity,
  };
}

export function parseSharedChampionRunFinishResponse(value: unknown): SharedChampionRunFinishResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.accepted !== "boolean") return null;
  if (typeof record.updated !== "boolean") return null;
  const reason = record.reason;
  if (!(typeof reason === "string" || reason === null)) return null;
  const normalizedReason: string | null = typeof reason === "string" ? reason : null;
  return {
    accepted: record.accepted,
    updated: record.updated,
    champion: record.champion === null ? null : parseSharedChampion(record.champion),
    reason: normalizedReason,
  };
}

export function isBetterSharedChampionCandidate(
  champion: SharedChampion | null,
  score: number,
): boolean {
  const candidate = normalizeScore(score);
  return champion === null || candidate > champion.score;
}

/**
 * Active-combat kill ceiling. Wave intermissions are intentionally excluded
 * from active time, so they cannot be used as a minimum-duration signal. The
 * first wave is available immediately; additional kills are bounded by the
 * fastest legal weapon fire cadence once active simulation time advances.
 */
export function calculateSharedChampionMaxKills(activeElapsedMs: number): number {
  const normalizedActiveElapsedMs = Number.isFinite(activeElapsedMs)
    ? Math.max(0, Math.round(activeElapsedMs))
    : 0;
  const extraKills = Math.ceil(
    normalizedActiveElapsedMs / (SHARED_CHAMPION_FIRE_INTERVAL_S * 1000),
  );
  return SHARED_CHAMPION_MAX_STARTING_KILLS + extraKills;
}

export function calculateSharedChampionMaxShotsFired(activeElapsedMs: number): number {
  const normalizedActiveElapsedMs = Number.isFinite(activeElapsedMs)
    ? Math.max(0, Math.round(activeElapsedMs))
    : 0;
  const extraShots = Math.ceil(
    normalizedActiveElapsedMs / (SHARED_CHAMPION_FIRE_INTERVAL_S * 1000),
  );
  return SHARED_CHAMPION_MAX_STARTING_SHOTS + extraShots;
}

/**
 * Validates a completed run against token wall time without equating the two
 * clocks. `summary.survivalTimeS` is active simulation/combat time and is the
 * returned `elapsedMs`; `wallElapsedMs` is only a one-sided upper bound (plus
 * request/startup tolerance) and the token TTL remains enforced by claiming.
 */
export function validateSharedChampionRunSummary(
  summary: SharedChampionRunSummary,
  wallElapsedMs: number,
): SharedChampionRunValidation {
  const normalizedWallElapsedMs = Number.isFinite(wallElapsedMs)
    ? Math.max(0, Math.round(wallElapsedMs))
    : 0;
  const hasValidActiveTime = Number.isFinite(summary.survivalTimeS)
    && summary.survivalTimeS > 0;
  const activeElapsedMs = hasValidActiveTime
    ? Math.max(1, Math.round(summary.survivalTimeS * 1000))
    : 0;
  const maxKills = calculateSharedChampionMaxKills(activeElapsedMs);
  const maxShotsFired = calculateSharedChampionMaxShotsFired(activeElapsedMs);

  if (!hasValidActiveTime) {
    return {
      ok: false,
      reason: "survival-time-invalid",
      computedScore: 0,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (activeElapsedMs > normalizedWallElapsedMs + SHARED_CHAMPION_ACTIVE_TIME_TOLERANCE_MS) {
    return {
      ok: false,
      reason: "survival-time-out-of-range",
      computedScore: 0,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  // ── Per-wave headshot validation ──────────────────────────────────────────
  const expectedWaveCount = summary.kills > 0
    ? Math.ceil(summary.kills / SHARED_CHAMPION_WAVE_ENEMY_COUNT)
    : 0;

  if (summary.headshotsPerWave.length !== expectedWaveCount) {
    return {
      ok: false,
      reason: "headshots-per-wave-length-mismatch",
      computedScore: 0,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  let headshotsPerWaveSum = 0;
  for (let w = 0; w < summary.headshotsPerWave.length; w++) {
    const hsInWave = summary.headshotsPerWave[w]!;
    const killsInWave = Math.min(
      SHARED_CHAMPION_WAVE_ENEMY_COUNT,
      summary.kills - w * SHARED_CHAMPION_WAVE_ENEMY_COUNT,
    );
    if (hsInWave < 0 || hsInWave > killsInWave) {
      return {
        ok: false,
        reason: "headshots-per-wave-out-of-range",
        computedScore: 0,
        elapsedMs: activeElapsedMs,
        maxKills,
        maxShotsFired,
      };
    }
    headshotsPerWaveSum += hsInWave;
  }

  if (headshotsPerWaveSum !== summary.headshots) {
    return {
      ok: false,
      reason: "headshots-per-wave-sum-mismatch",
      computedScore: 0,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  // ── Score computation using wave-scaled formula ───────────────────────────
  const computedScore = calculateSharedChampionScore(summary.kills, summary.headshotsPerWave);
  const expectedAccuracy = computeAccuracyPercent(summary.shotsHit, summary.shotsFired);
  const reportedScore = normalizeScore(summary.finalScore);

  if (summary.headshots > summary.kills) {
    return {
      ok: false,
      reason: "headshots-exceed-kills",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (summary.shotsHit > summary.shotsFired) {
    return {
      ok: false,
      reason: "shots-hit-exceed-shots-fired",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (summary.kills > summary.shotsHit) {
    return {
      ok: false,
      reason: "kills-exceed-shots-hit",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (summary.kills > maxKills) {
    return {
      ok: false,
      reason: "kills-exceed-cap",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (summary.shotsFired > maxShotsFired) {
    return {
      ok: false,
      reason: "shots-fired-exceed-cap",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (reportedScore !== computedScore) {
    return {
      ok: false,
      reason: "score-does-not-match-stats",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  if (Math.abs(summary.accuracy - expectedAccuracy) > SHARED_CHAMPION_ACCURACY_TOLERANCE) {
    return {
      ok: false,
      reason: "accuracy-does-not-match-stats",
      computedScore,
      elapsedMs: activeElapsedMs,
      maxKills,
      maxShotsFired,
    };
  }

  return {
    ok: true,
    computedScore,
    elapsedMs: activeElapsedMs,
    maxKills,
    maxShotsFired,
  };
}

export function formatSharedChampionScore(value: number): string {
  return normalizeScore(value).toLocaleString("en-US");
}

export function formatSharedChampionMode(mode: SharedChampionControlMode): string {
  return mode === "agent" ? "AGENT" : "HUMAN";
}

// ── Telemetry parsing & validation ──────────────────────────────────────────

const TELEMETRY_SCORE_PER_KILL = 5;
const TELEMETRY_SCORE_PER_HEADSHOT = 5;
const MAX_KILLS_PER_SECOND = 5;

export function parseTelemetry(value: unknown): SharedChampionPostTelemetry | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;

  const kills = Math.round(Number(r.kills));
  const headshots = Math.round(Number(r.headshots));
  const shotsFired = Math.round(Number(r.shotsFired));
  const shotsHit = Math.round(Number(r.shotsHit));
  const survivalTimeS = Number(r.survivalTimeS);

  if (
    !Number.isFinite(kills) || kills < 0
    || !Number.isFinite(headshots) || headshots < 0
    || !Number.isFinite(shotsFired) || shotsFired < 0
    || !Number.isFinite(shotsHit) || shotsHit < 0
    || !Number.isFinite(survivalTimeS) || survivalTimeS <= 0
  ) {
    return null;
  }

  return { kills, headshots, shotsFired, shotsHit, survivalTimeS };
}

export type TelemetryValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateTelemetry(
  score: number,
  telemetry: SharedChampionPostTelemetry,
): TelemetryValidationResult {
  const { kills, headshots, shotsFired, shotsHit, survivalTimeS } = telemetry;

  // Flat score formula (admin-only): score = kills * 5 + headshots * 5
  const expectedScore =
    kills * TELEMETRY_SCORE_PER_KILL + headshots * TELEMETRY_SCORE_PER_HEADSHOT;
  if (score !== expectedScore) {
    return { valid: false, reason: "score-mismatch" };
  }

  if (headshots > kills) {
    return { valid: false, reason: "headshots-exceed-kills" };
  }

  if (kills > 0 && shotsHit < kills) {
    return { valid: false, reason: "hits-below-kills" };
  }

  if (shotsFired < shotsHit) {
    return { valid: false, reason: "fired-below-hits" };
  }

  if (survivalTimeS > 0 && kills / survivalTimeS > MAX_KILLS_PER_SECOND) {
    return { valid: false, reason: "implausible-kill-rate" };
  }

  return { valid: true };
}

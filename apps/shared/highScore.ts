export const HIGH_SCORE_PLAYER_NAME_MAX_LENGTH = 15;
export const SITEWIDE_CHAMPION_SCOPE = "sitewide";
export const SITEWIDE_CHAMPION_BOARD_KEY = "default";

export type SharedChampionControlMode = "human" | "agent";

export type SharedChampion = {
  holderName: string;
  score: number;
  scoreHalfPoints: number;
  controlMode: SharedChampionControlMode;
  scope: typeof SITEWIDE_CHAMPION_SCOPE;
  updatedAt: string;
};

export type SharedChampionSnapshotStatus = "idle" | "loading" | "ready" | "unavailable";

export type SharedChampionSnapshot = {
  status: SharedChampionSnapshotStatus;
  champion: SharedChampion | null;
};

export type SharedChampionGetResponse = {
  champion: SharedChampion | null;
};

export type SharedChampionPostRequest = {
  playerName: string;
  scoreHalfPoints: number;
  controlMode: SharedChampionControlMode;
};

export type SharedChampionPostResponse = {
  updated: boolean;
  champion: SharedChampion | null;
};

export function isSharedChampionControlMode(value: unknown): value is SharedChampionControlMode {
  return value === "human" || value === "agent";
}

export function clampSharedChampionName(value: string): string {
  return value.trim().slice(0, HIGH_SCORE_PLAYER_NAME_MAX_LENGTH);
}

export function sanitizeSharedChampionName(
  value: unknown,
  controlMode: SharedChampionControlMode,
): string {
  const fallback = controlMode === "agent" ? "Agent" : "Operator";
  if (typeof value !== "string") return fallback;
  const normalized = clampSharedChampionName(value);
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeScoreHalfPoints(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export function roundScoreValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 2) / 2);
}

export function scoreHalfPointsToValue(value: unknown): number {
  return roundScoreValue(normalizeScoreHalfPoints(value) / 2);
}

export function scoreValueToHalfPoints(value: number): number {
  return normalizeScoreHalfPoints(roundScoreValue(value) * 2);
}

export function createSharedChampion(input: {
  holderName: string;
  scoreHalfPoints: number;
  controlMode: SharedChampionControlMode;
  updatedAt: Date | string;
}): SharedChampion {
  const updatedAt = input.updatedAt instanceof Date
    ? input.updatedAt.toISOString()
    : new Date(input.updatedAt).toISOString();

  return {
    holderName: clampSharedChampionName(input.holderName),
    scoreHalfPoints: normalizeScoreHalfPoints(input.scoreHalfPoints),
    score: scoreHalfPointsToValue(input.scoreHalfPoints),
    controlMode: input.controlMode,
    scope: SITEWIDE_CHAMPION_SCOPE,
    updatedAt,
  };
}

export function parseSharedChampion(value: unknown): SharedChampion | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (!isSharedChampionControlMode(record.controlMode)) return null;
  if (typeof record.holderName !== "string") return null;
  if (typeof record.updatedAt !== "string") return null;

  const updatedAt = new Date(record.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;

  return createSharedChampion({
    holderName: record.holderName,
    scoreHalfPoints: normalizeScoreHalfPoints(record.scoreHalfPoints),
    controlMode: record.controlMode,
    updatedAt,
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

export function isBetterSharedChampionCandidate(
  champion: SharedChampion | null,
  scoreHalfPoints: number,
): boolean {
  const candidate = normalizeScoreHalfPoints(scoreHalfPoints);
  return champion === null || candidate > champion.scoreHalfPoints;
}

export function formatSharedChampionScore(value: number): string {
  return roundScoreValue(value).toLocaleString("en-US");
}

export function formatSharedChampionMode(mode: SharedChampionControlMode): string {
  return mode === "agent" ? "AGENT" : "HUMAN";
}

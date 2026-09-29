import {
  type ChampionRow,
  type RunTokenRow,
  type SharedChampionRunTokenRecord,
  type RunRow,
  type QueryableClient,
  type OverviewRow,
  type NameRollupRow,
  type DailyRollupRow,
} from "./types.js";
import {
  type SharedChampion,
  SITEWIDE_CHAMPION_BOARD_KEY,
  parseStoredGameplayProfileIdentity,
  SHARED_CHAMPION_SCORE_RULESET,
  deriveSharedChampionBoardKey,
  createSharedChampion,
  type SharedChampionControlMode,
  isGameplayProfileCompatibleWithControlMode,
  sanitizeSharedChampionMapId,
  type SharedChampionRunSummary,
} from "../../apps/shared/highScore.js";
import {
  parseStoredPlayerName,
  sanitizeValidatedPlayerName,
} from "../../apps/shared/playerName.js";
import {
  type SharedChampionRunRecord,
  deriveRunFields,
  resolveBuildId,
  type SharedChampionStatsOverview,
  formatNullableScore,
  type SharedChampionStatsNameRollup,
  type SharedChampionStatsDailyRollup,
} from "../highScoreStats.js";
import {
  type GameplayProfileIdentity,
} from "../../apps/shared/gameplayProfile.js";
import {
  INSERT_RUN_IF_MISSING_SQL,
  INSERT_RUN_SQL,
} from "./sql.js";

const warnedMalformedChampionRows = new Set<string>();

function warnMalformedChampionRow(context: string, holderName: string): void {
  const warningKey = `${context}:${holderName}`;
  if (warnedMalformedChampionRows.has(warningKey)) {
    return;
  }
  warnedMalformedChampionRows.add(warningKey);
  console.warn(`[shared-champion] ignoring malformed champion row from ${context}: ${JSON.stringify(holderName)}`);
}

export function mapRowToChampion(row: ChampionRow, context: string): SharedChampion | null {
  const holderName = parseStoredPlayerName(row.holder_name);
  if (holderName === null) {
    warnMalformedChampionRow(context, row.holder_name);
    return null;
  }

  const hasProfileMetadata = row.board_key !== SITEWIDE_CHAMPION_BOARD_KEY
    || row.ruleset !== null
    || row.balance_season !== null
    || row.profile_id !== null
    || row.tuning_revision !== null;
  const identity = hasProfileMetadata
    ? parseStoredGameplayProfileIdentity({
        profileId: row.profile_id,
        tuningRevision: row.tuning_revision,
        balanceSeason: row.balance_season,
      })
    : null;
  if (hasProfileMetadata && (
    identity === null
    || row.ruleset !== SHARED_CHAMPION_SCORE_RULESET
    || row.board_key !== deriveSharedChampionBoardKey(identity)
  )) {
    return null;
  }

  return createSharedChampion({
    holderName,
    score: row.score,
    controlMode: row.holder_mode,
    updatedAt: row.updated_at,
    identity,
  });
}

export function mapRunTokenRow(row: RunTokenRow): SharedChampionRunTokenRecord {
  const identity = parseStoredGameplayProfileIdentity({
    profileId: row.profile_id,
    tuningRevision: row.tuning_revision,
    balanceSeason: row.balance_season,
  });
  return {
    runId: row.run_id,
    playerName: row.player_name,
    controlMode: row.control_mode,
    mapId: row.map_id,
    ruleset: row.ruleset === SHARED_CHAMPION_SCORE_RULESET ? row.ruleset : null,
    balanceSeason: identity?.balanceSeason ?? null,
    profileId: identity?.profileId ?? null,
    tuningRevision: identity?.tuningRevision ?? null,
    boardKey: row.board_key,
    issuedAt: row.issued_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    claimedAt: row.claimed_at ? row.claimed_at.toISOString() : null,
  };
}

export function mapRunRow(row: RunRow): SharedChampionRunRecord {
  return {
    runId: row.run_id,
    playerName: row.player_name,
    playerNameKey: row.player_name_key,
    controlMode: row.control_mode,
    mapId: row.map_id,
    ruleset: row.ruleset,
    balanceSeason: row.balance_season,
    profileId: row.profile_id,
    tuningRevision: row.tuning_revision,
    boardKey: row.board_key,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at.toISOString(),
    elapsedMs: row.elapsed_ms,
    score: row.score,
    kills: row.kills,
    headshots: row.headshots,
    shotsFired: row.shots_fired,
    shotsHit: row.shots_hit,
    accuracyPct: roundMetric(row.accuracy_pct, 1),
    wavesCleared: row.waves_cleared,
    waveReached: row.wave_reached,
    deathCause: row.death_cause,
    championUpdated: row.champion_updated,
    buildId: row.build_id,
    clientIpFingerprint: row.client_ip_fingerprint,
    userAgentFingerprint: row.user_agent_fingerprint,
    createdAt: row.created_at.toISOString(),
  };
}

export function parseBigIntCount(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMetric(value: number | null, digits = 2): number {
  if (value === null || !Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function requireSharedChampionName(value: unknown): string {
  const normalized = sanitizeValidatedPlayerName(value);
  if (normalized === null) {
    throw new Error("Expected a validated shared champion player name.");
  }
  return normalized;
}

export function normalizeRunTokenInput(input: {
  runId: string;
  tokenHash: string;
  playerName: string;
  controlMode: SharedChampionControlMode;
  mapId: string;
  profileIdentity: GameplayProfileIdentity;
  expiresAt: Date;
  clientIpFingerprint: string | null;
  userAgentFingerprint: string | null;
}) {
  if (!isGameplayProfileCompatibleWithControlMode(input.profileIdentity, input.controlMode)) {
    throw new Error("Gameplay profile identity is incompatible with the run control mode.");
  }
  const boardKey = deriveSharedChampionBoardKey(input.profileIdentity);
  return {
    runId: input.runId,
    tokenHash: input.tokenHash.trim(),
    playerName: requireSharedChampionName(input.playerName),
    controlMode: input.controlMode,
    mapId: sanitizeSharedChampionMapId(input.mapId),
    ruleset: SHARED_CHAMPION_SCORE_RULESET as typeof SHARED_CHAMPION_SCORE_RULESET,
    balanceSeason: input.profileIdentity.balanceSeason,
    profileId: input.profileIdentity.profileId,
    tuningRevision: input.profileIdentity.tuningRevision,
    boardKey,
    expiresAt: input.expiresAt,
    clientIpFingerprint: input.clientIpFingerprint?.trim() || null,
    userAgentFingerprint: input.userAgentFingerprint?.trim() || null,
  };
}

export function getSharedChampionRunTokenProfileIdentity(
  record: SharedChampionRunTokenRecord,
): GameplayProfileIdentity | null {
  const identity = parseStoredGameplayProfileIdentity(record);
  if (!identity) return null;
  if (record.ruleset !== SHARED_CHAMPION_SCORE_RULESET) return null;
  if (record.boardKey !== deriveSharedChampionBoardKey(identity)) return null;
  return identity;
}

export function normalizeRunRecord(input: {
  tokenRecord: SharedChampionRunTokenRecord;
  summary: SharedChampionRunSummary;
  elapsedMs: number;
  score: number;
  championUpdated: boolean;
  clientIpFingerprint: string | null;
  userAgentFingerprint: string | null;
  buildId?: string | null;
  createdAt?: Date;
}): SharedChampionRunRecord {
  const profileIdentity = getSharedChampionRunTokenProfileIdentity(input.tokenRecord);
  const hasAnyProfileMetadata = input.tokenRecord.profileId !== null
    || input.tokenRecord.tuningRevision !== null
    || input.tokenRecord.balanceSeason !== null
    || input.tokenRecord.boardKey !== null
    || input.tokenRecord.ruleset !== null;
  if (hasAnyProfileMetadata && profileIdentity === null) {
    throw new Error("Invalid shared champion run token profile identity.");
  }
  const derived = deriveRunFields({
    playerName: input.tokenRecord.playerName,
    mapId: input.tokenRecord.mapId,
    summary: input.summary,
    score: input.score,
    elapsedMs: input.elapsedMs,
    buildId: input.buildId ?? resolveBuildId(),
    profileIdentity,
  });
  const endedAt = input.tokenRecord.claimedAt
    ? new Date(input.tokenRecord.claimedAt)
    : new Date(Date.parse(input.tokenRecord.issuedAt) + derived.elapsedMs);
  const createdAt = input.createdAt ?? endedAt;
  return {
    runId: input.tokenRecord.runId,
    playerName: derived.playerName,
    playerNameKey: derived.playerNameKey,
    controlMode: input.tokenRecord.controlMode,
    mapId: derived.mapId,
    ruleset: derived.ruleset,
    balanceSeason: derived.balanceSeason,
    profileId: derived.profileId,
    tuningRevision: derived.tuningRevision,
    boardKey: derived.boardKey,
    startedAt: new Date(input.tokenRecord.issuedAt).toISOString(),
    endedAt: endedAt.toISOString(),
    elapsedMs: derived.elapsedMs,
    score: derived.score,
    kills: input.summary.kills,
    headshots: input.summary.headshots,
    shotsFired: input.summary.shotsFired,
    shotsHit: input.summary.shotsHit,
    accuracyPct: derived.accuracyPct,
    wavesCleared: derived.wavesCleared,
    waveReached: derived.waveReached,
    deathCause: derived.deathCause,
    championUpdated: input.championUpdated,
    buildId: derived.buildId,
    clientIpFingerprint: input.clientIpFingerprint?.trim() || null,
    userAgentFingerprint: input.userAgentFingerprint?.trim() || null,
    createdAt: createdAt.toISOString(),
  };
}

function getRunInsertValues(run: SharedChampionRunRecord): unknown[] {
  return [
    run.runId,
    run.playerName,
    run.playerNameKey,
    run.controlMode,
    run.mapId,
    run.ruleset,
    run.balanceSeason,
    run.profileId,
    run.tuningRevision,
    run.boardKey,
    run.startedAt,
    run.endedAt,
    run.elapsedMs,
    run.score,
    run.kills,
    run.headshots,
    run.shotsFired,
    run.shotsHit,
    run.accuracyPct,
    run.wavesCleared,
    run.waveReached,
    run.deathCause,
    run.championUpdated,
    run.buildId,
    run.clientIpFingerprint,
    run.userAgentFingerprint,
    run.createdAt,
  ];
}

export async function insertRunRecord(
  client: QueryableClient,
  run: SharedChampionRunRecord,
  options: { ignoreConflicts?: boolean } = {},
): Promise<SharedChampionRunRecord | null> {
  const result = await client.query<RunRow>(
    options.ignoreConflicts ? INSERT_RUN_IF_MISSING_SQL : INSERT_RUN_SQL,
    getRunInsertValues(run),
  );
  const row = result.rows[0] ?? null;
  return row ? mapRunRow(row) : null;
}

export function mapOverviewRow(row: OverviewRow | undefined): SharedChampionStatsOverview {
  return {
    totalRuns: parseBigIntCount(row?.total_runs),
    championUpdates: parseBigIntCount(row?.champion_updates),
    uniquePlayerNames: parseBigIntCount(row?.unique_player_names),
    humanRuns: parseBigIntCount(row?.human_runs),
    agentRuns: parseBigIntCount(row?.agent_runs),
    bestScore: formatNullableScore(row?.best_score ?? null),
    averageScore: row?.average_score === null || row?.average_score === undefined
      ? null
      : roundMetric(row.average_score, 2),
    averageAccuracyPct: row?.average_accuracy_pct === null || row?.average_accuracy_pct === undefined
      ? null
      : roundMetric(row.average_accuracy_pct, 2),
    latestRunAt: row?.latest_run_at ? row.latest_run_at.toISOString() : null,
    latestChampionAt: row?.latest_champion_at ? row.latest_champion_at.toISOString() : null,
  };
}

export function mapNameRollupRow(row: NameRollupRow): SharedChampionStatsNameRollup {
  return {
    playerNameKey: row.player_name_key,
    playerName: row.player_name,
    totalRuns: parseBigIntCount(row.total_runs),
    championUpdates: parseBigIntCount(row.champion_updates),
    humanRuns: parseBigIntCount(row.human_runs),
    agentRuns: parseBigIntCount(row.agent_runs),
    bestScore: row.best_score,
    averageScore: roundMetric(row.average_score, 2),
    averageAccuracyPct: roundMetric(row.average_accuracy_pct, 2),
    latestRunAt: row.latest_run_at.toISOString(),
  };
}

export function mapDailyRollupRow(row: DailyRollupRow): SharedChampionStatsDailyRollup {
  return {
    day: row.day,
    totalRuns: parseBigIntCount(row.total_runs),
    championUpdates: parseBigIntCount(row.champion_updates),
    uniquePlayerNames: parseBigIntCount(row.unique_player_names),
    humanRuns: parseBigIntCount(row.human_runs),
    agentRuns: parseBigIntCount(row.agent_runs),
    bestScore: row.best_score,
    averageScore: roundMetric(row.average_score, 2),
    averageAccuracyPct: roundMetric(row.average_accuracy_pct, 2),
  };
}

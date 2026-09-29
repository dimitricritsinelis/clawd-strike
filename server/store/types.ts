import {
  type SharedChampionControlMode,
  SHARED_CHAMPION_SCORE_RULESET,
  type SharedChampion,
  type SharedChampionRunSummary,
} from "../../apps/shared/highScore.js";
import {
  type GameplayProfileId,
  type GameplayProfileIdentity,
} from "../../apps/shared/gameplayProfile.js";
import {
  type SharedChampionRunRecord,
  type ResolvedSharedChampionStatsFilters,
  type SharedChampionStatsOverview,
  type ResolvedSharedChampionStatsRunFilters,
  type SharedChampionStatsNameRollup,
  type SharedChampionStatsDailyRollup,
} from "../highScoreStats.js";
import {
  type SharedChampionConnectionEnvKey,
} from "./connection.js";

export type ChampionRow = {
  board_key: string;
  score: number;
  holder_name: string;
  holder_mode: SharedChampionControlMode;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET | null;
  balance_season: string | null;
  profile_id: GameplayProfileId | null;
  tuning_revision: string | null;
  updated_at: Date;
};

export type ChampionMutationRow = ChampionRow & {
  updated: boolean;
};

export type RunTokenRow = {
  run_id: string;
  player_name: string;
  control_mode: SharedChampionControlMode;
  map_id: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET | null;
  balance_season: string | null;
  profile_id: GameplayProfileId | null;
  tuning_revision: string | null;
  board_key: string | null;
  issued_at: Date;
  expires_at: Date;
  claimed_at: Date | null;
};

export type RunRow = {
  run_id: string;
  player_name: string;
  player_name_key: string;
  control_mode: SharedChampionControlMode;
  map_id: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET;
  balance_season: string | null;
  profile_id: GameplayProfileId | null;
  tuning_revision: string | null;
  board_key: string | null;
  started_at: Date;
  ended_at: Date;
  elapsed_ms: number;
  score: number;
  kills: number;
  headshots: number;
  shots_fired: number;
  shots_hit: number;
  accuracy_pct: number;
  waves_cleared: number;
  wave_reached: number;
  death_cause: "enemy-fire" | "unknown" | null;
  champion_updated: boolean;
  build_id: string | null;
  client_ip_fingerprint: string | null;
  user_agent_fingerprint: string | null;
  created_at: Date;
};

export type OverviewRow = {
  total_runs: string;
  champion_updates: string;
  unique_player_names: string;
  human_runs: string;
  agent_runs: string;
  best_score: number | null;
  average_score: number | null;
  average_accuracy_pct: number | null;
  latest_run_at: Date | null;
  latest_champion_at: Date | null;
};

export type NameRollupRow = {
  player_name_key: string;
  player_name: string;
  total_runs: string;
  champion_updates: string;
  human_runs: string;
  agent_runs: string;
  best_score: number;
  average_score: number;
  average_accuracy_pct: number;
  latest_run_at: Date;
};

export type DailyRollupRow = {
  day: string;
  total_runs: string;
  champion_updates: string;
  unique_player_names: string;
  human_runs: string;
  agent_runs: string;
  best_score: number;
  average_score: number;
  average_accuracy_pct: number;
};

export type SharedChampionRunTokenRecord = {
  runId: string;
  playerName: string;
  controlMode: SharedChampionControlMode;
  mapId: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET | null;
  balanceSeason: string | null;
  profileId: GameplayProfileId | null;
  tuningRevision: string | null;
  boardKey: string | null;
  issuedAt: string;
  expiresAt: string;
  claimedAt: string | null;
};

export type SharedChampionAuditEvent = {
  eventType: string;
  outcome: "accepted" | "rejected";
  runId?: string | null;
  ipFingerprint?: string | null;
  userAgentFingerprint?: string | null;
  reason?: string | null;
  payload?: unknown;
};

export type SharedChampionStore = {
  getChampion: (identity?: GameplayProfileIdentity | null) => Promise<SharedChampion | null>;
  /**
   * Shared (database-backed) sliding-window limiter. `key` is a namespaced
   * fingerprint such as `run-start:<ipFingerprint>`. Unlike the per-instance
   * in-memory limiter in highScoreSecurity.ts, this holds across lambdas.
   * Atomically reserves one request and returns true, or returns false at the limit.
   */
  consumeRateLimit: (key: string, limit: RateLimit) => Promise<boolean>;
  issueRunToken: (input: {
    runId: string;
    tokenHash: string;
    playerName: string;
    controlMode: SharedChampionControlMode;
    mapId: string;
    profileIdentity: GameplayProfileIdentity;
    expiresAt: Date;
    clientIpFingerprint: string | null;
    userAgentFingerprint: string | null;
  }) => Promise<SharedChampionRunTokenRecord>;
  consumeRunToken: (input: {
    tokenHash: string;
    clientIpFingerprint: string | null;
    userAgentFingerprint: string | null;
  }) => Promise<{
    status: "consumed" | "missing" | "expired" | "used";
    record: SharedChampionRunTokenRecord | null;
  }>;
  finalizeValidatedRun: (input: {
    tokenRecord: SharedChampionRunTokenRecord;
    summary: SharedChampionRunSummary;
    elapsedMs: number;
    score: number;
    clientIpFingerprint: string | null;
    userAgentFingerprint: string | null;
    buildId?: string | null;
  }) => Promise<{
    updated: boolean;
    champion: SharedChampion | null;
    run: SharedChampionRunRecord;
  }>;
  recordAuditEvent: (event: SharedChampionAuditEvent) => Promise<void>;
  getStatsOverview: (filters: ResolvedSharedChampionStatsFilters) => Promise<SharedChampionStatsOverview>;
  listRuns: (filters: ResolvedSharedChampionStatsRunFilters) => Promise<{
    items: SharedChampionRunRecord[];
    nextCursor: string | null;
  }>;
  listNames: (filters: ResolvedSharedChampionStatsFilters, limit: number) => Promise<SharedChampionStatsNameRollup[]>;
  listDaily: (filters: ResolvedSharedChampionStatsFilters, limit: number) => Promise<SharedChampionStatsDailyRollup[]>;
};

export type RateLimit = { windowMs: number; maxRequests: number };

export type QueryableClient = {
  query: <TRow extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: TRow[] }>;
};

export type BackfillRunTokenRow = RunTokenRow & {
  created_ip_fingerprint: string | null;
  created_user_agent_fingerprint: string | null;
  claim_ip_fingerprint: string | null;
  claim_user_agent_fingerprint: string | null;
};

export type AcceptedFinishAuditRow = {
  id: string;
  run_id: string | null;
  payload: unknown;
  created_at: Date;
};

export type InvalidChampionNameRow = {
  board_key: string;
};

export type InvalidRunTokenNameRow = {
  run_id: string;
};

export type InvalidRunNameRow = {
  run_id: string;
};

export type ChampionSnapshotRow = {
  board_key: string;
  score: number;
  holder_name: string;
  holder_mode: SharedChampionControlMode;
  updated_at: Date;
};

export type BestRunSnapshotRow = {
  run_id: string;
  score: number;
  player_name: string;
  control_mode: SharedChampionControlMode;
  created_at: Date;
};

export type BackfillAcceptedFinishPayload = {
  summary: SharedChampionRunSummary;
  wallElapsedMs: number;
  championUpdated: boolean;
};

export type SharedChampionStorageDriftReport = {
  hasDrift: boolean;
  championScore: number;
  championHolderName: string;
  championHolderMode: SharedChampionControlMode;
  bestRunScore: number;
  bestRunHolderName: string;
  bestRunHolderMode: SharedChampionControlMode;
  bestRunId: string;
};

export type SharedChampionStorageReconcileReport = {
  insertedRuns: number;
  skippedExistingRuns: number;
  orphanedAcceptedFinishes: number;
  malformedAcceptedFinishes: number;
  invalidChampionRows: number;
  invalidRunTokenNames: number;
  invalidRunRows: number;
  insertedRunIds: string[];
  skippedRunIds: string[];
  orphanedRunIds: string[];
  malformedRunIds: string[];
  invalidChampionBoardKeys: string[];
  invalidRunTokenRunIds: string[];
  invalidRunIds: string[];
  championDrift: SharedChampionStorageDriftReport | null;
};

export type SharedChampionConstraintValidationReport = {
  validatedConstraints: string[];
  alreadyPresentConstraints: string[];
  connectionEnvKey: SharedChampionConnectionEnvKey;
  connectionSslModeBefore: string | null;
  connectionSslModeAfter: string | null;
};

import {
  type PoolClient,
} from "pg";
import {
  getPool,
} from "./connection.js";
import {
  type ResolvedSharedChampionStatsFilters,
  resolveBuildId,
  createRunCursor,
} from "../highScoreStats.js";
import {
  type SharedChampionStore,
  type ChampionRow,
  type RunTokenRow,
  type ChampionMutationRow,
  type OverviewRow,
  type RunRow,
  type NameRollupRow,
  type DailyRollupRow,
} from "./types.js";
import {
  ensureSchemaReady,
} from "./maintenance.js";
import {
  deriveSharedChampionBoardKey,
  SITEWIDE_CHAMPION_BOARD_KEY,
  SHARED_CHAMPION_SCORE_RULESET,
  normalizeScore,
} from "../../apps/shared/highScore.js";
import {
  SELECT_CHAMPION_SQL,
  RATE_LIMIT_CHECK_SQL,
  RATE_LIMIT_INSERT_SQL,
  RATE_LIMIT_CLEANUP_SQL,
  INSERT_RUN_TOKEN_SQL,
  RUN_TOKEN_CLEANUP_SQL,
  CLAIM_RUN_TOKEN_SQL,
  SELECT_RUN_TOKEN_SQL,
  UPSERT_CHAMPION_SQL,
  INSERT_AUDIT_EVENT_SQL,
  AUDIT_CLEANUP_SQL,
} from "./sql.js";
import {
  mapRowToChampion,
  parseBigIntCount,
  normalizeRunTokenInput,
  mapRunTokenRow,
  getSharedChampionRunTokenProfileIdentity,
  requireSharedChampionName,
  normalizeRunRecord,
  insertRunRecord,
  mapOverviewRow,
  mapRunRow,
  mapNameRollupRow,
  mapDailyRollupRow,
} from "./records.js";

/**
 * Retention DELETEs used to run inline on every single write, so each request
 * paid for a scan of the whole retention window. They only need to keep up with
 * the insert rate, not run per-insert — sampling keeps the amortised cost
 * negligible while still bounding table growth.
 */
const RETENTION_SWEEP_PROBABILITY = 1 / 500;

function shouldRunRetentionSweep(): boolean {
  return Math.random() < RETENTION_SWEEP_PROBABILITY;
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool("write").connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function applyRunFiltersSql(
  filters: ResolvedSharedChampionStatsFilters,
  values: unknown[],
  alias = "runs",
): string {
  const clauses: string[] = [];
  const push = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.fromDate) {
    clauses.push(`${alias}.ended_at >= ${push(filters.fromDate.toISOString())}`);
  }
  if (filters.toDate) {
    clauses.push(`${alias}.ended_at <= ${push(filters.toDate.toISOString())}`);
  }
  if (filters.controlMode) {
    clauses.push(`${alias}.control_mode = ${push(filters.controlMode)}`);
  }
  if (filters.mapId) {
    clauses.push(`${alias}.map_id = ${push(filters.mapId)}`);
  }
  if (filters.playerNameKey) {
    clauses.push(`${alias}.player_name_key = ${push(filters.playerNameKey)}`);
  }
  if (filters.profileId) {
    clauses.push(`${alias}.profile_id = ${push(filters.profileId)}`);
  }
  if (filters.tuningRevision) {
    clauses.push(`${alias}.tuning_revision = ${push(filters.tuningRevision)}`);
  }
  if (filters.balanceSeason) {
    clauses.push(`${alias}.balance_season = ${push(filters.balanceSeason)}`);
  }

  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

export function createPostgresSharedChampionStore(): SharedChampionStore {
  return {
    async getChampion(identity = null) {
      await ensureSchemaReady();
      const boardKey = identity
        ? deriveSharedChampionBoardKey(identity)
        : SITEWIDE_CHAMPION_BOARD_KEY;
      const result = await getPool("write").query<ChampionRow>(SELECT_CHAMPION_SQL, [boardKey]);
      const row = result.rows[0];
      return row ? mapRowToChampion(row, `shared_champion_scores:${boardKey}`) : null;
    },
    async consumeRateLimit(key, limit) {
      await ensureSchemaReady();
      const accepted = await withTransaction(async (client) => {
        // Serialize only this namespaced fingerprint. The lock, count and
        // reservation share one transaction, including across app instances.
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0));", [key]);
        const result = await client.query<{ recent: string }>(RATE_LIMIT_CHECK_SQL, [key, limit.windowMs]);
        if (parseBigIntCount(result.rows[0]?.recent) >= limit.maxRequests) return false;
        await client.query(RATE_LIMIT_INSERT_SQL, [key]);
        return true;
      });
      if (accepted && shouldRunRetentionSweep()) getPool("write").query(RATE_LIMIT_CLEANUP_SQL).catch(() => {});
      return accepted;
    },
    async issueRunToken(input) {
      await ensureSchemaReady();
      const normalized = normalizeRunTokenInput(input);
      const result = await getPool("write").query<RunTokenRow>(INSERT_RUN_TOKEN_SQL, [
        normalized.runId,
        normalized.tokenHash,
        normalized.playerName,
        normalized.controlMode,
        normalized.mapId,
        normalized.ruleset,
        normalized.balanceSeason,
        normalized.profileId,
        normalized.tuningRevision,
        normalized.boardKey,
        normalized.expiresAt,
        normalized.clientIpFingerprint,
        normalized.userAgentFingerprint,
      ]);
      if (shouldRunRetentionSweep()) getPool("write").query(RUN_TOKEN_CLEANUP_SQL).catch(() => {});
      const row = result.rows[0];
      if (!row) {
        throw new Error("Failed to issue shared champion run token.");
      }
      return mapRunTokenRow(row);
    },
    async consumeRunToken(input) {
      await ensureSchemaReady();
      const normalizedTokenHash = input.tokenHash.trim();
      const result = await getPool("write").query<RunTokenRow>(CLAIM_RUN_TOKEN_SQL, [
        normalizedTokenHash,
        input.clientIpFingerprint?.trim() || null,
        input.userAgentFingerprint?.trim() || null,
      ]);
      const consumed = result.rows[0];
      if (consumed) {
        return {
          status: "consumed" as const,
          record: mapRunTokenRow(consumed),
        };
      }

      const lookup = await getPool("write").query<RunTokenRow>(SELECT_RUN_TOKEN_SQL, [normalizedTokenHash]);
      const row = lookup.rows[0] ?? null;
      if (!row) {
        return {
          status: "missing" as const,
          record: null,
        };
      }

      if (row.claimed_at !== null) {
        return {
          status: "used" as const,
          record: mapRunTokenRow(row),
        };
      }

      if (row.expires_at.getTime() <= Date.now()) {
        return {
          status: "expired" as const,
          record: mapRunTokenRow(row),
        };
      }

      return {
        status: "used" as const,
        record: mapRunTokenRow(row),
      };
    },
    async finalizeValidatedRun(input) {
      await ensureSchemaReady();
      const identity = getSharedChampionRunTokenProfileIdentity(input.tokenRecord);
      if (!identity) {
        throw new Error("Competitive runs require a token-bound gameplay profile identity.");
      }
      const boardKey = deriveSharedChampionBoardKey(identity);
      return withTransaction(async (client) => {
        const championResult = await client.query<ChampionMutationRow>(UPSERT_CHAMPION_SQL, [
          boardKey,
          SHARED_CHAMPION_SCORE_RULESET,
          identity.balanceSeason,
          identity.profileId,
          identity.tuningRevision,
          normalizeScore(input.score),
          requireSharedChampionName(input.tokenRecord.playerName),
          input.tokenRecord.controlMode,
        ]);
        const updated = championResult.rows[0]?.updated === true;
        // A losing concurrent first insert can see no row in its original
        // statement snapshot. A separate SELECT sees the committed winner.
        const championRow = championResult.rows[0]
          ?? (await client.query<ChampionRow>(SELECT_CHAMPION_SQL, [boardKey])).rows[0]
          ?? null;
        const normalizedRun = normalizeRunRecord({
          ...input,
          championUpdated: updated,
          createdAt: input.tokenRecord.claimedAt ? new Date(input.tokenRecord.claimedAt) : new Date(),
          buildId: input.buildId ?? resolveBuildId(),
        });
        const run = await insertRunRecord(client, normalizedRun);
        if (!run) {
          throw new Error("Failed to persist shared champion run.");
        }
        return {
          updated,
          champion: championRow ? mapRowToChampion(championRow, `shared_champion_scores:${boardKey}`) : null,
          run,
        };
      });
    },
    async recordAuditEvent(event) {
      await ensureSchemaReady();
      await getPool("write").query(INSERT_AUDIT_EVENT_SQL, [
        event.eventType,
        event.outcome,
        event.runId ?? null,
        event.ipFingerprint ?? null,
        event.userAgentFingerprint ?? null,
        event.reason ?? null,
        JSON.stringify(event.payload ?? null),
      ]);
      if (shouldRunRetentionSweep()) getPool("write").query(AUDIT_CLEANUP_SQL).catch(() => {});
    },
    async getStatsOverview(filters) {
      await ensureSchemaReady();
      const values: unknown[] = [];
      const where = applyRunFiltersSql(filters, values);
      const query = `
        SELECT
          COUNT(*)::BIGINT AS total_runs,
          COALESCE(SUM(CASE WHEN runs.champion_updated THEN 1 ELSE 0 END), 0)::BIGINT AS champion_updates,
          COUNT(DISTINCT runs.player_name_key)::BIGINT AS unique_player_names,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'human' THEN 1 ELSE 0 END), 0)::BIGINT AS human_runs,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'agent' THEN 1 ELSE 0 END), 0)::BIGINT AS agent_runs,
          MAX(runs.score)::INTEGER AS best_score,
          AVG(runs.score)::DOUBLE PRECISION AS average_score,
          AVG(runs.accuracy_pct)::DOUBLE PRECISION AS average_accuracy_pct,
          MAX(runs.created_at) AS latest_run_at,
          MAX(CASE WHEN runs.champion_updated THEN runs.created_at ELSE NULL END) AS latest_champion_at
        FROM shared_champion_runs runs
        ${where};
      `;
      const result = await getPool("read").query<OverviewRow>(query, values);
      return mapOverviewRow(result.rows[0]);
    },
    async listRuns(filters) {
      await ensureSchemaReady();
      const values: unknown[] = [];
      const push = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
      };
      const whereClauses: string[] = [];
      const baseWhere = applyRunFiltersSql(filters, values);
      if (baseWhere.length > 0) {
        whereClauses.push(baseWhere.replace(/^WHERE /, ""));
      }
      if (filters.championUpdated !== null) {
        whereClauses.push(`runs.champion_updated = ${push(filters.championUpdated)}`);
      }
      if (filters.cursor) {
        const createdAtParam = push(filters.cursor.createdAt);
        const runIdParam = push(filters.cursor.runId);
        whereClauses.push(`(runs.created_at, runs.run_id) < (${createdAtParam}, ${runIdParam})`);
      }
      const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const limitParam = push(filters.limit + 1);
      const query = `
        SELECT
          run_id,
          player_name,
          player_name_key,
          control_mode,
          map_id,
          ruleset,
          balance_season,
          profile_id,
          tuning_revision,
          board_key,
          started_at,
          ended_at,
          elapsed_ms,
          score,
          kills,
          headshots,
          shots_fired,
          shots_hit,
          accuracy_pct,
          waves_cleared,
          wave_reached,
          death_cause,
          champion_updated,
          build_id,
          client_ip_fingerprint,
          user_agent_fingerprint,
          created_at
        FROM shared_champion_runs runs
        ${where}
        ORDER BY runs.created_at DESC, runs.run_id DESC
        LIMIT ${limitParam};
      `;
      const result = await getPool("read").query<RunRow>(query, values);
      const rows = result.rows.map(mapRunRow);
      const items = rows.slice(0, filters.limit);
      const next = rows.length > filters.limit ? items[items.length - 1] ?? null : null;
      return {
        items,
        nextCursor: next ? createRunCursor({ createdAt: next.createdAt, runId: next.runId }) : null,
      };
    },
    async listNames(filters, limit) {
      await ensureSchemaReady();
      const values: unknown[] = [];
      const where = applyRunFiltersSql(filters, values);
      values.push(limit);
      const query = `
        SELECT
          runs.player_name_key,
          MIN(runs.player_name) AS player_name,
          COUNT(*)::BIGINT AS total_runs,
          COALESCE(SUM(CASE WHEN runs.champion_updated THEN 1 ELSE 0 END), 0)::BIGINT AS champion_updates,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'human' THEN 1 ELSE 0 END), 0)::BIGINT AS human_runs,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'agent' THEN 1 ELSE 0 END), 0)::BIGINT AS agent_runs,
          MAX(runs.score)::INTEGER AS best_score,
          AVG(runs.score)::DOUBLE PRECISION AS average_score,
          AVG(runs.accuracy_pct)::DOUBLE PRECISION AS average_accuracy_pct,
          MAX(runs.created_at) AS latest_run_at
        FROM shared_champion_runs runs
        ${where}
        GROUP BY runs.player_name_key
        ORDER BY best_score DESC, latest_run_at DESC, runs.player_name_key ASC
        LIMIT $${values.length};
      `;
      const result = await getPool("read").query<NameRollupRow>(query, values);
      return result.rows.map(mapNameRollupRow);
    },
    async listDaily(filters, limit) {
      await ensureSchemaReady();
      const values: unknown[] = [];
      const where = applyRunFiltersSql(filters, values);
      values.push(limit);
      const query = `
        SELECT
          TO_CHAR(DATE_TRUNC('day', runs.ended_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*)::BIGINT AS total_runs,
          COALESCE(SUM(CASE WHEN runs.champion_updated THEN 1 ELSE 0 END), 0)::BIGINT AS champion_updates,
          COUNT(DISTINCT runs.player_name_key)::BIGINT AS unique_player_names,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'human' THEN 1 ELSE 0 END), 0)::BIGINT AS human_runs,
          COALESCE(SUM(CASE WHEN runs.control_mode = 'agent' THEN 1 ELSE 0 END), 0)::BIGINT AS agent_runs,
          MAX(runs.score)::INTEGER AS best_score,
          AVG(runs.score)::DOUBLE PRECISION AS average_score,
          AVG(runs.accuracy_pct)::DOUBLE PRECISION AS average_accuracy_pct
        FROM shared_champion_runs runs
        ${where}
        GROUP BY 1
        ORDER BY day DESC
        LIMIT $${values.length};
      `;
      const result = await getPool("read").query<DailyRollupRow>(query, values);
      return result.rows.map(mapDailyRollupRow);
    },
  };
}

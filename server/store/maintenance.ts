import {
  PLAYER_NAME_MAX_LENGTH,
} from "../../apps/shared/playerName.js";
import {
  type QueryableClient,
  type BackfillRunTokenRow,
  type SharedChampionRunTokenRecord,
  type BackfillAcceptedFinishPayload,
  type AcceptedFinishAuditRow,
  type SharedChampionStorageReconcileReport,
  type InvalidChampionNameRow,
  type InvalidRunTokenNameRow,
  type InvalidRunNameRow,
  type SharedChampionStorageDriftReport,
  type ChampionSnapshotRow,
  type BestRunSnapshotRow,
  type SharedChampionConstraintValidationReport,
} from "./types.js";
import {
  parseStoredGameplayProfileIdentity,
  SHARED_CHAMPION_SCORE_RULESET,
  normalizeSharedChampionRunSummary,
  validateSharedChampionRunSummary,
  SITEWIDE_CHAMPION_BOARD_KEY,
} from "../../apps/shared/highScore.js";
import {
  type SharedChampionRunRecord,
} from "../highScoreStats.js";
import {
  normalizeRunRecord,
  insertRunRecord,
} from "./records.js";
import {
  CREATE_HIGH_SCORE_TABLE_SQL,
  ALTER_HIGH_SCORE_PROFILE_TABLE_SQL,
  CREATE_HIGH_SCORE_PROFILE_INDEX_SQL,
  CREATE_SUBMISSIONS_LOG_TABLE_SQL,
  ALTER_SUBMISSIONS_LOG_TABLE_SQL,
  DROP_LEGACY_SUBMISSIONS_LOG_SQL,
  CREATE_SUBMISSIONS_LOG_INDEX_SQL,
  CREATE_RUN_TOKEN_TABLE_SQL,
  ALTER_RUN_TOKEN_TABLE_SQL,
  DROP_LEGACY_RUN_TOKEN_COLUMNS_SQL,
  CREATE_RUN_TOKEN_INDEX_SQL,
  CREATE_AUDIT_TABLE_SQL,
  ALTER_AUDIT_TABLE_SQL,
  CREATE_AUDIT_INDEX_SQL,
  DROP_LEGACY_AUDIT_COLUMNS_SQL,
  CREATE_RUNS_TABLE_SQL,
  DROP_ROLLUPS_VIEWS_SQL,
  ALTER_RUNS_PROFILE_TABLE_SQL,
  CREATE_RUNS_INDEX_SQL,
  CREATE_DAILY_ROLLUPS_VIEW_SQL,
  CREATE_NAME_ROLLUPS_VIEW_SQL,
} from "./sql.js";
import {
  resolveSharedChampionReconcileConnectionString,
  resolveSslConfig,
  type SharedChampionConnectionEnvKey,
  resolveSharedChampionReconcileConnectionSelection,
  normalizePgConnectionString,
  getPool,
} from "./connection.js";
import {
  Pool,
} from "pg";

/** Arbitrary fixed key identifying the shared-champion schema maintenance lock. */
const SCHEMA_MAINTENANCE_LOCK_KEY = 8_140_512_003;

const PLAYER_NAME_SQL_PATTERN = "^[A-Za-z0-9 ._''-]{1,15}$";

const PLAYER_NAME_KEY_SQL_PATTERN = "^[a-z0-9 ._''-]{1,15}$";

const SHARED_CHAMPION_SCORES_HOLDER_NAME_CONSTRAINT = "shared_champion_scores_holder_name_contract_v1";

const SHARED_CHAMPION_RUN_TOKENS_PLAYER_NAME_CONSTRAINT = "shared_champion_run_tokens_player_name_contract_v1";

const SHARED_CHAMPION_RUNS_PLAYER_NAME_CONSTRAINT = "shared_champion_runs_player_name_contract_v1";

const SHARED_CHAMPION_RUNS_PLAYER_NAME_KEY_CONSTRAINT = "shared_champion_runs_player_name_key_contract_v1";

function getNameContractExpression(columnName: string, lowercaseOnly = false): string {
  const pattern = lowercaseOnly ? PLAYER_NAME_KEY_SQL_PATTERN : PLAYER_NAME_SQL_PATTERN;
  const alphanumericPattern = lowercaseOnly ? "[a-z0-9]" : "[A-Za-z0-9]";
  return [
    `char_length(${columnName}) BETWEEN 1 AND ${PLAYER_NAME_MAX_LENGTH}`,
    `${columnName} ~ E'${pattern}'`,
    `${columnName} ~ E'${alphanumericPattern}'`,
    `${columnName} = btrim(${columnName})`,
    `position('  ' in ${columnName}) = 0`,
  ].join("\n      AND ");
}

async function ensureTableConstraint(
  client: QueryableClient,
  tableName: string,
  constraintName: string,
  checkExpression: string,
): Promise<void> {
  const exists = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = $1
          AND conrelid = $2::regclass
      ) AS exists;
    `,
    [constraintName, tableName],
  );
  if (exists.rows[0]?.exists === true) {
    return;
  }

  try {
    await client.query(
      `
        ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName}
        CHECK (
          ${checkExpression}
        ) NOT VALID;
      `,
    );
  } catch (error) {
    // 42710 duplicate_object: another instance added the same constraint between
    // our existence check and this ALTER. The desired end state is already true,
    // so treat it as success instead of failing the request that triggered the
    // cold-start schema check.
    if ((error as { code?: string })?.code !== "42710") {
      throw error;
    }
  }
}

async function hasTableConstraint(
  client: QueryableClient,
  tableName: string,
  constraintName: string,
): Promise<boolean> {
  const exists = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = $1
          AND conrelid = $2::regclass
      ) AS exists;
    `,
    [constraintName, tableName],
  );
  return exists.rows[0]?.exists === true;
}

function mapBackfillTokenRow(row: BackfillRunTokenRow): SharedChampionRunTokenRecord {
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

function parseAcceptedFinishAuditPayload(
  payload: unknown,
  tokenRow: BackfillRunTokenRow,
): BackfillAcceptedFinishPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const summary = normalizeSharedChampionRunSummary(record.summary);
  if (!summary) {
    return null;
  }

  const rawWallElapsedValue = record.wallElapsedMs ?? record.elapsedMs;
  const rawWallElapsedMs = typeof rawWallElapsedValue === "number"
    ? rawWallElapsedValue
    : Number(rawWallElapsedValue);
  const wallElapsedMs = Number.isFinite(rawWallElapsedMs) && rawWallElapsedMs >= 0
    ? Math.round(rawWallElapsedMs)
    : tokenRow.claimed_at
      ? Math.max(0, tokenRow.claimed_at.getTime() - tokenRow.issued_at.getTime())
      : null;

  if (wallElapsedMs === null) {
    return null;
  }

  return {
    summary,
    wallElapsedMs,
    championUpdated: record.updated === true,
  };
}

function createBackfilledRunRecord(
  auditRow: AcceptedFinishAuditRow,
  tokenRow: BackfillRunTokenRow,
): SharedChampionRunRecord | null {
  const parsedPayload = parseAcceptedFinishAuditPayload(auditRow.payload, tokenRow);
  if (!parsedPayload) {
    return null;
  }

  const validation = validateSharedChampionRunSummary(
    parsedPayload.summary,
    parsedPayload.wallElapsedMs,
  );
  if (validation.ok === false) {
    return null;
  }

  try {
    return normalizeRunRecord({
      tokenRecord: mapBackfillTokenRow(tokenRow),
      summary: parsedPayload.summary,
      elapsedMs: validation.elapsedMs,
      score: validation.computedScore,
      championUpdated: parsedPayload.championUpdated,
      clientIpFingerprint: tokenRow.claim_ip_fingerprint ?? tokenRow.created_ip_fingerprint,
      userAgentFingerprint: tokenRow.claim_user_agent_fingerprint ?? tokenRow.created_user_agent_fingerprint,
      buildId: null,
      createdAt: tokenRow.claimed_at ?? auditRow.created_at,
    });
  } catch {
    return null;
  }
}

export function planSharedChampionAcceptedRunBackfill(input: {
  acceptedAudits: readonly AcceptedFinishAuditRow[];
  runTokensByRunId: ReadonlyMap<string, BackfillRunTokenRow>;
  existingRunIds: ReadonlySet<string>;
}): SharedChampionStorageReconcileReport & {
  inserts: SharedChampionRunRecord[];
} {
  const inserts: SharedChampionRunRecord[] = [];
  const insertedRunIds: string[] = [];
  const skippedRunIds: string[] = [];
  const orphanedRunIds: string[] = [];
  const malformedRunIds: string[] = [];
  const seenRunIds = new Set(input.existingRunIds);

  for (const auditRow of input.acceptedAudits) {
    const runId = auditRow.run_id?.trim() ?? "";
    if (runId.length === 0) {
      malformedRunIds.push(`audit:${auditRow.id}`);
      continue;
    }

    if (seenRunIds.has(runId)) {
      skippedRunIds.push(runId);
      continue;
    }

    const tokenRow = input.runTokensByRunId.get(runId);
    if (!tokenRow) {
      orphanedRunIds.push(runId);
      continue;
    }

    const runRecord = createBackfilledRunRecord(auditRow, tokenRow);
    if (!runRecord) {
      malformedRunIds.push(runId);
      continue;
    }

    inserts.push(runRecord);
    insertedRunIds.push(runId);
    seenRunIds.add(runId);
  }

  return {
    inserts,
    insertedRuns: insertedRunIds.length,
    skippedExistingRuns: skippedRunIds.length,
    orphanedAcceptedFinishes: orphanedRunIds.length,
    malformedAcceptedFinishes: malformedRunIds.length,
    invalidChampionRows: 0,
    invalidRunTokenNames: 0,
    invalidRunRows: 0,
    insertedRunIds,
    skippedRunIds,
    orphanedRunIds,
    malformedRunIds,
    invalidChampionBoardKeys: [],
    invalidRunTokenRunIds: [],
    invalidRunIds: [],
    championDrift: null,
  };
}

let schemaReadyPromise: Promise<void> | null = null;

async function queryColumnExists(client: QueryableClient, tableName: string, columnName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists;
    `,
    [tableName, columnName],
  );
  return result.rows[0]?.exists === true;
}

async function migrateLegacyHalfPointScoreColumn(
  client: QueryableClient,
  tableName: "shared_champion_scores" | "shared_champion_runs",
): Promise<void> {
  const hasScoreColumn = await queryColumnExists(client, tableName, "score");
  const hasLegacyScoreColumn = await queryColumnExists(client, tableName, "score_half_points");
  if (!hasLegacyScoreColumn) {
    return;
  }

  if (!hasScoreColumn) {
    await client.query(`
      ALTER TABLE ${tableName}
        ADD COLUMN score INTEGER;
    `);
  }

  await client.query(`
    UPDATE ${tableName}
    SET score = GREATEST(0, ROUND(score_half_points / 2.0)::INTEGER)
    WHERE score IS NULL;
  `);

  await client.query(`
    ALTER TABLE ${tableName}
      ALTER COLUMN score SET NOT NULL;
  `);

  await client.query(`
    ALTER TABLE ${tableName}
      DROP COLUMN IF EXISTS score_half_points;
  `);
}

export async function runSharedChampionSchemaMaintenance(client: QueryableClient): Promise<void> {
  await client.query(CREATE_HIGH_SCORE_TABLE_SQL);
  await client.query(ALTER_HIGH_SCORE_PROFILE_TABLE_SQL);
  await client.query(CREATE_HIGH_SCORE_PROFILE_INDEX_SQL);
  await migrateLegacyHalfPointScoreColumn(client, "shared_champion_scores");
  await ensureTableConstraint(
    client,
    "shared_champion_scores",
    SHARED_CHAMPION_SCORES_HOLDER_NAME_CONSTRAINT,
    getNameContractExpression("holder_name"),
  );

  await client.query(CREATE_SUBMISSIONS_LOG_TABLE_SQL);
  await client.query(ALTER_SUBMISSIONS_LOG_TABLE_SQL);
  if (await queryColumnExists(client, "champion_submissions_log", "client_ip")) {
    await client.query("TRUNCATE TABLE champion_submissions_log;");
  }
  await client.query(DROP_LEGACY_SUBMISSIONS_LOG_SQL);
  await client.query(CREATE_SUBMISSIONS_LOG_INDEX_SQL);

  await client.query(CREATE_RUN_TOKEN_TABLE_SQL);
  await client.query(ALTER_RUN_TOKEN_TABLE_SQL);
  await client.query(DROP_LEGACY_RUN_TOKEN_COLUMNS_SQL);
  await client.query(CREATE_RUN_TOKEN_INDEX_SQL);
  await ensureTableConstraint(
    client,
    "shared_champion_run_tokens",
    SHARED_CHAMPION_RUN_TOKENS_PLAYER_NAME_CONSTRAINT,
    getNameContractExpression("player_name"),
  );

  await client.query(CREATE_AUDIT_TABLE_SQL);
  await client.query(ALTER_AUDIT_TABLE_SQL);
  await client.query(CREATE_AUDIT_INDEX_SQL);
  await client.query(DROP_LEGACY_AUDIT_COLUMNS_SQL);

  await client.query(CREATE_RUNS_TABLE_SQL);
  await client.query(DROP_ROLLUPS_VIEWS_SQL);
  await client.query(ALTER_RUNS_PROFILE_TABLE_SQL);
  await migrateLegacyHalfPointScoreColumn(client, "shared_champion_runs");
  await client.query(CREATE_RUNS_INDEX_SQL);
  await ensureTableConstraint(
    client,
    "shared_champion_runs",
    SHARED_CHAMPION_RUNS_PLAYER_NAME_CONSTRAINT,
    getNameContractExpression("player_name"),
  );
  await ensureTableConstraint(
    client,
    "shared_champion_runs",
    SHARED_CHAMPION_RUNS_PLAYER_NAME_KEY_CONSTRAINT,
    `${getNameContractExpression("player_name_key", true)}
      AND player_name_key = lower(player_name)`,
  );

  await client.query(CREATE_DAILY_ROLLUPS_VIEW_SQL);
  await client.query(CREATE_NAME_ROLLUPS_VIEW_SQL);
}

async function backfillAcceptedFinishRuns(
  client: QueryableClient,
): Promise<Omit<SharedChampionStorageReconcileReport, "championDrift">> {
  const acceptedAudits = await client.query<AcceptedFinishAuditRow>(`
    SELECT id, run_id, payload, created_at
    FROM shared_champion_run_audit
    WHERE event_type = 'run-finish'
      AND outcome = 'accepted'
    ORDER BY created_at ASC, id ASC;
  `);
  const runTokens = await client.query<BackfillRunTokenRow>(`
    SELECT
      run_id,
      player_name,
      control_mode,
      map_id,
      ruleset,
      balance_season,
      profile_id,
      tuning_revision,
      board_key,
      issued_at,
      expires_at,
      claimed_at,
      created_ip_fingerprint,
      created_user_agent_fingerprint,
      claim_ip_fingerprint,
      claim_user_agent_fingerprint
    FROM shared_champion_run_tokens;
  `);
  const existingRuns = await client.query<{ run_id: string }>(`
    SELECT run_id
    FROM shared_champion_runs;
  `);

  const plan = planSharedChampionAcceptedRunBackfill({
    acceptedAudits: acceptedAudits.rows,
    runTokensByRunId: new Map(runTokens.rows.map((row) => [row.run_id, row])),
    existingRunIds: new Set(existingRuns.rows.map((row) => row.run_id)),
  });

  const insertedRunIds: string[] = [];
  const skippedRunIds = [...plan.skippedRunIds];
  let skippedExistingRuns = plan.skippedExistingRuns;

  for (const run of plan.inserts) {
    const inserted = await insertRunRecord(client, run, { ignoreConflicts: true });
    if (inserted) {
      insertedRunIds.push(inserted.runId);
      continue;
    }
    skippedExistingRuns += 1;
    skippedRunIds.push(run.runId);
  }

  return {
    insertedRuns: insertedRunIds.length,
    skippedExistingRuns,
    orphanedAcceptedFinishes: plan.orphanedAcceptedFinishes,
    malformedAcceptedFinishes: plan.malformedAcceptedFinishes,
    invalidChampionRows: 0,
    invalidRunTokenNames: 0,
    invalidRunRows: 0,
    insertedRunIds,
    skippedRunIds,
    orphanedRunIds: plan.orphanedRunIds,
    malformedRunIds: plan.malformedRunIds,
    invalidChampionBoardKeys: [],
    invalidRunTokenRunIds: [],
    invalidRunIds: [],
  };
}

async function collectInvalidNameReport(
  client: QueryableClient,
): Promise<Pick<
  SharedChampionStorageReconcileReport,
  | "invalidChampionRows"
  | "invalidRunTokenNames"
  | "invalidRunRows"
  | "invalidChampionBoardKeys"
  | "invalidRunTokenRunIds"
  | "invalidRunIds"
>> {
  const championRows = await client.query<InvalidChampionNameRow>(`
    SELECT board_key
    FROM shared_champion_scores
    WHERE NOT (
      ${getNameContractExpression("holder_name")}
    );
  `);
  const runTokenRows = await client.query<InvalidRunTokenNameRow>(`
    SELECT run_id
    FROM shared_champion_run_tokens
    WHERE NOT (
      ${getNameContractExpression("player_name")}
    );
  `);
  const runRows = await client.query<InvalidRunNameRow>(`
    SELECT run_id
    FROM shared_champion_runs
    WHERE NOT (
      ${getNameContractExpression("player_name")}
    )
      OR NOT (
        ${getNameContractExpression("player_name_key", true)}
      )
      OR player_name_key <> lower(player_name);
  `);

  return {
    invalidChampionRows: championRows.rows.length,
    invalidRunTokenNames: runTokenRows.rows.length,
    invalidRunRows: runRows.rows.length,
    invalidChampionBoardKeys: championRows.rows.map((row) => row.board_key),
    invalidRunTokenRunIds: runTokenRows.rows.map((row) => row.run_id),
    invalidRunIds: runRows.rows.map((row) => row.run_id),
  };
}

async function computeChampionDrift(client: QueryableClient): Promise<SharedChampionStorageDriftReport | null> {
  const championResult = await client.query<ChampionSnapshotRow>(
    `
      SELECT board_key, score, holder_name, holder_mode, updated_at
      FROM shared_champion_scores
      WHERE board_key = $1
      LIMIT 1;
    `,
    [SITEWIDE_CHAMPION_BOARD_KEY],
  );
  const bestRunResult = await client.query<BestRunSnapshotRow>(`
    SELECT run_id, score, player_name, control_mode, created_at
    FROM shared_champion_runs
    WHERE board_key IS NULL OR board_key = 'default'
    ORDER BY score DESC, created_at DESC, run_id ASC
    LIMIT 1;
  `);

  const champion = championResult.rows[0] ?? null;
  const bestRun = bestRunResult.rows[0] ?? null;
  if (!champion || !bestRun) {
    return null;
  }

  return {
    hasDrift: champion.score !== bestRun.score
      || champion.holder_name !== bestRun.player_name
      || champion.holder_mode !== bestRun.control_mode,
    championScore: champion.score,
    championHolderName: champion.holder_name,
    championHolderMode: champion.holder_mode,
    bestRunScore: bestRun.score,
    bestRunHolderName: bestRun.player_name,
    bestRunHolderMode: bestRun.control_mode,
    bestRunId: bestRun.run_id,
  };
}

export async function reconcileSharedChampionStorage(options: {
  env?: NodeJS.ProcessEnv;
  connectionString?: string;
} = {}): Promise<SharedChampionStorageReconcileReport> {
  const env = options.env ?? process.env;
  const connectionString = options.connectionString ?? resolveSharedChampionReconcileConnectionString(env);
  const pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    ssl: resolveSslConfig(connectionString),
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await runSharedChampionSchemaMaintenance(client);
    const backfill = await backfillAcceptedFinishRuns(client);
    const invalidNames = await collectInvalidNameReport(client);
    const championDrift = await computeChampionDrift(client);
    await client.query("COMMIT");
    return {
      ...backfill,
      ...invalidNames,
      championDrift,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function validateSharedChampionConstraints(options: {
  env?: NodeJS.ProcessEnv;
  connectionString?: string;
} = {}): Promise<SharedChampionConstraintValidationReport> {
  const env = options.env ?? process.env;
  const selection = options.connectionString
    ? {
        connectionString: options.connectionString,
        envKey: "POSTGRES_URL_NON_POOLING" as SharedChampionConnectionEnvKey,
      }
    : resolveSharedChampionReconcileConnectionSelection(env);
  const normalizedConnection = normalizePgConnectionString(selection.connectionString);
  const pool = new Pool({
    connectionString: normalizedConnection.connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    ssl: resolveSslConfig(normalizedConnection.connectionString),
  });
  const client = await pool.connect();

  const constraints: Array<{ tableName: string; constraintName: string }> = [
    {
      tableName: "shared_champion_scores",
      constraintName: SHARED_CHAMPION_SCORES_HOLDER_NAME_CONSTRAINT,
    },
    {
      tableName: "shared_champion_run_tokens",
      constraintName: SHARED_CHAMPION_RUN_TOKENS_PLAYER_NAME_CONSTRAINT,
    },
    {
      tableName: "shared_champion_runs",
      constraintName: SHARED_CHAMPION_RUNS_PLAYER_NAME_CONSTRAINT,
    },
    {
      tableName: "shared_champion_runs",
      constraintName: SHARED_CHAMPION_RUNS_PLAYER_NAME_KEY_CONSTRAINT,
    },
  ];

  try {
    await runSharedChampionSchemaMaintenance(client);

    const alreadyPresentConstraints: string[] = [];
    for (const constraint of constraints) {
      if (await hasTableConstraint(client, constraint.tableName, constraint.constraintName)) {
        alreadyPresentConstraints.push(constraint.constraintName);
      }
    }

    const validatedConstraints: string[] = [];
    for (const constraint of constraints) {
      await client.query(
        `ALTER TABLE ${constraint.tableName} VALIDATE CONSTRAINT ${constraint.constraintName};`,
      );
      validatedConstraints.push(constraint.constraintName);
    }

    return {
      validatedConstraints,
      alreadyPresentConstraints,
      connectionEnvKey: selection.envKey,
      connectionSslModeBefore: normalizedConnection.sslModeBefore,
      connectionSslModeAfter: normalizedConnection.sslModeAfter,
    };
  } finally {
    client.release();
    await pool.end();
  }
}

export async function ensureSchemaReady(): Promise<void> {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const client = await getPool("write").connect();
    try {
      // Serialize schema maintenance across instances. Without this, two cold
      // starts race the same CREATE/ALTER statements and one of them surfaces a
      // duplicate-object error as a 500 to whichever player triggered it.
      await client.query("SELECT pg_advisory_lock($1);", [SCHEMA_MAINTENANCE_LOCK_KEY]);
      try {
        await runSharedChampionSchemaMaintenance(client);
      } finally {
        await client.query("SELECT pg_advisory_unlock($1);", [SCHEMA_MAINTENANCE_LOCK_KEY])
          .catch(() => {});
      }
    } finally {
      client.release();
    }
  })().catch((error) => {
    schemaReadyPromise = null;
    throw error;
  });

  return schemaReadyPromise;
}

import {
  HIGH_SCORE_MAP_ID_MAX_LENGTH,
} from "../../apps/shared/highScore.js";

export const CREATE_HIGH_SCORE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS shared_champion_scores (
    board_key TEXT PRIMARY KEY,
    score INTEGER NOT NULL CHECK (score >= 0),
    holder_name VARCHAR(15) NOT NULL,
    holder_mode TEXT NOT NULL CHECK (holder_mode IN ('human', 'agent')),
    ruleset TEXT,
    balance_season TEXT,
    profile_id TEXT,
    tuning_revision TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export const ALTER_HIGH_SCORE_PROFILE_TABLE_SQL = `
  ALTER TABLE shared_champion_scores
    ADD COLUMN IF NOT EXISTS ruleset TEXT,
    ADD COLUMN IF NOT EXISTS balance_season TEXT,
    ADD COLUMN IF NOT EXISTS profile_id TEXT,
    ADD COLUMN IF NOT EXISTS tuning_revision TEXT;
`;

export const CREATE_HIGH_SCORE_PROFILE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_shared_champion_scores_profile_identity
    ON shared_champion_scores (ruleset, balance_season, profile_id, tuning_revision);
`;

export const CREATE_SUBMISSIONS_LOG_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS champion_submissions_log (
    id SERIAL PRIMARY KEY,
    client_ip_fingerprint TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export const ALTER_SUBMISSIONS_LOG_TABLE_SQL = `
  ALTER TABLE champion_submissions_log
    ADD COLUMN IF NOT EXISTS client_ip_fingerprint TEXT;
`;

export const DROP_LEGACY_SUBMISSIONS_LOG_SQL = `
  DROP INDEX IF EXISTS idx_submissions_ip_time;
  ALTER TABLE champion_submissions_log DROP COLUMN IF EXISTS client_ip;
`;

export const CREATE_SUBMISSIONS_LOG_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_submissions_ip_fingerprint_time
  ON champion_submissions_log (client_ip_fingerprint, submitted_at);
`;

export const RATE_LIMIT_CHECK_SQL = `
  SELECT COUNT(*) AS recent
  FROM champion_submissions_log
  WHERE client_ip_fingerprint = $1 AND submitted_at > NOW() - ($2::int * INTERVAL '1 millisecond');
`;

export const RATE_LIMIT_INSERT_SQL = `
  INSERT INTO champion_submissions_log (client_ip_fingerprint) VALUES ($1);
`;

export const RATE_LIMIT_CLEANUP_SQL = `
  DELETE FROM champion_submissions_log
  WHERE submitted_at < NOW() - INTERVAL '24 hours';
`;

export const CREATE_RUN_TOKEN_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS shared_champion_run_tokens (
    run_id UUID PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    player_name VARCHAR(15) NOT NULL,
    control_mode TEXT NOT NULL CHECK (control_mode IN ('human', 'agent')),
    map_id VARCHAR(${HIGH_SCORE_MAP_ID_MAX_LENGTH}) NOT NULL,
    ruleset TEXT,
    balance_season TEXT,
    profile_id TEXT,
    tuning_revision TEXT,
    board_key TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_ip_fingerprint TEXT,
    created_user_agent_fingerprint TEXT,
    claim_ip_fingerprint TEXT,
    claim_user_agent_fingerprint TEXT
  );
`;

export const ALTER_RUN_TOKEN_TABLE_SQL = `
  ALTER TABLE shared_champion_run_tokens
    ADD COLUMN IF NOT EXISTS created_ip_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS created_user_agent_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS claim_ip_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS claim_user_agent_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS ruleset TEXT,
    ADD COLUMN IF NOT EXISTS balance_season TEXT,
    ADD COLUMN IF NOT EXISTS profile_id TEXT,
    ADD COLUMN IF NOT EXISTS tuning_revision TEXT,
    ADD COLUMN IF NOT EXISTS board_key TEXT;
`;

export const DROP_LEGACY_RUN_TOKEN_COLUMNS_SQL = `
  ALTER TABLE shared_champion_run_tokens DROP COLUMN IF EXISTS created_ip_hash;
  ALTER TABLE shared_champion_run_tokens DROP COLUMN IF EXISTS created_user_agent;
  ALTER TABLE shared_champion_run_tokens DROP COLUMN IF EXISTS claim_ip_hash;
  ALTER TABLE shared_champion_run_tokens DROP COLUMN IF EXISTS claim_user_agent;
`;

export const CREATE_RUN_TOKEN_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_shared_champion_run_tokens_expires_at
    ON shared_champion_run_tokens (expires_at);
  CREATE INDEX IF NOT EXISTS idx_shared_champion_run_tokens_profile_board
    ON shared_champion_run_tokens (board_key, issued_at DESC);
`;

export const RUN_TOKEN_CLEANUP_SQL = `
  DELETE FROM shared_champion_run_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
`;

export const CREATE_AUDIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS shared_champion_run_audit (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    outcome TEXT NOT NULL,
    run_id UUID,
    ip_fingerprint TEXT,
    user_agent_fingerprint TEXT,
    reason TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export const ALTER_AUDIT_TABLE_SQL = `
  ALTER TABLE shared_champion_run_audit
    ADD COLUMN IF NOT EXISTS ip_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS user_agent_fingerprint TEXT;
`;

export const DROP_LEGACY_AUDIT_COLUMNS_SQL = `
  ALTER TABLE shared_champion_run_audit DROP COLUMN IF EXISTS ip_hash;
  ALTER TABLE shared_champion_run_audit DROP COLUMN IF EXISTS user_agent;
`;

export const CREATE_AUDIT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_shared_champion_run_audit_created_at
    ON shared_champion_run_audit (created_at);
`;

export const AUDIT_CLEANUP_SQL = `
  DELETE FROM shared_champion_run_audit
  WHERE created_at < NOW() - INTERVAL '30 days';
`;

export const CREATE_RUNS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS shared_champion_runs (
    run_id UUID PRIMARY KEY,
    player_name VARCHAR(15) NOT NULL,
    player_name_key VARCHAR(15) NOT NULL,
    control_mode TEXT NOT NULL CHECK (control_mode IN ('human', 'agent')),
    map_id VARCHAR(${HIGH_SCORE_MAP_ID_MAX_LENGTH}) NOT NULL,
    ruleset TEXT NOT NULL,
    balance_season TEXT,
    profile_id TEXT,
    tuning_revision TEXT,
    board_key TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
    score INTEGER NOT NULL CHECK (score >= 0),
    kills INTEGER NOT NULL CHECK (kills >= 0),
    headshots INTEGER NOT NULL CHECK (headshots >= 0),
    shots_fired INTEGER NOT NULL CHECK (shots_fired >= 0),
    shots_hit INTEGER NOT NULL CHECK (shots_hit >= 0),
    accuracy_pct DOUBLE PRECISION NOT NULL CHECK (accuracy_pct >= 0),
    waves_cleared INTEGER NOT NULL CHECK (waves_cleared >= 0),
    wave_reached INTEGER NOT NULL CHECK (wave_reached >= 1),
    death_cause TEXT CHECK (death_cause IN ('enemy-fire', 'unknown')),
    champion_updated BOOLEAN NOT NULL,
    build_id VARCHAR(128),
    client_ip_fingerprint TEXT,
    user_agent_fingerprint TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export const ALTER_RUNS_PROFILE_TABLE_SQL = `
  ALTER TABLE shared_champion_runs
    ADD COLUMN IF NOT EXISTS balance_season TEXT,
    ADD COLUMN IF NOT EXISTS profile_id TEXT,
    ADD COLUMN IF NOT EXISTS tuning_revision TEXT,
    ADD COLUMN IF NOT EXISTS board_key TEXT;
`;

export const CREATE_RUNS_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_shared_champion_runs_created_at
    ON shared_champion_runs (created_at DESC, run_id DESC);
  CREATE INDEX IF NOT EXISTS idx_shared_champion_runs_player_name_key
    ON shared_champion_runs (player_name_key, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_shared_champion_runs_map_id
    ON shared_champion_runs (map_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_shared_champion_runs_champion_updated
    ON shared_champion_runs (champion_updated, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_shared_champion_runs_profile_board
    ON shared_champion_runs (board_key, created_at DESC, run_id DESC);
`;

export const CREATE_DAILY_ROLLUPS_VIEW_SQL = `
  CREATE OR REPLACE VIEW shared_champion_daily_rollups_v1 AS
  SELECT
    TO_CHAR(DATE_TRUNC('day', ended_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
    COUNT(*)::BIGINT AS total_runs,
    SUM(CASE WHEN champion_updated THEN 1 ELSE 0 END)::BIGINT AS champion_updates,
    COUNT(DISTINCT player_name_key)::BIGINT AS unique_player_names,
    SUM(CASE WHEN control_mode = 'human' THEN 1 ELSE 0 END)::BIGINT AS human_runs,
    SUM(CASE WHEN control_mode = 'agent' THEN 1 ELSE 0 END)::BIGINT AS agent_runs,
    MAX(score)::INTEGER AS best_score,
    AVG(score)::DOUBLE PRECISION AS average_score,
    AVG(accuracy_pct)::DOUBLE PRECISION AS average_accuracy_pct
  FROM shared_champion_runs
  GROUP BY 1;
`;

export const CREATE_NAME_ROLLUPS_VIEW_SQL = `
  CREATE OR REPLACE VIEW shared_champion_name_rollups_v1 AS
  SELECT
    player_name_key,
    MIN(player_name) AS player_name,
    COUNT(*)::BIGINT AS total_runs,
    SUM(CASE WHEN champion_updated THEN 1 ELSE 0 END)::BIGINT AS champion_updates,
    SUM(CASE WHEN control_mode = 'human' THEN 1 ELSE 0 END)::BIGINT AS human_runs,
    SUM(CASE WHEN control_mode = 'agent' THEN 1 ELSE 0 END)::BIGINT AS agent_runs,
    MAX(score)::INTEGER AS best_score,
    AVG(score)::DOUBLE PRECISION AS average_score,
    AVG(accuracy_pct)::DOUBLE PRECISION AS average_accuracy_pct,
    MAX(created_at) AS latest_run_at
  FROM shared_champion_runs
  GROUP BY player_name_key;
`;

export const DROP_ROLLUPS_VIEWS_SQL = `
  DROP VIEW IF EXISTS shared_champion_daily_rollups_v1;
  DROP VIEW IF EXISTS shared_champion_name_rollups_v1;
`;

export const SELECT_CHAMPION_SQL = `
  SELECT board_key, score, holder_name, holder_mode, ruleset, balance_season, profile_id, tuning_revision, updated_at
  FROM shared_champion_scores
  WHERE board_key = $1
  LIMIT 1;
`;

export const UPSERT_CHAMPION_SQL = `
  INSERT INTO shared_champion_scores AS scores (
    board_key,
    ruleset,
    balance_season,
    profile_id,
    tuning_revision,
    score,
    holder_name,
    holder_mode
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (board_key) DO UPDATE
  SET
    score = EXCLUDED.score,
    holder_name = EXCLUDED.holder_name,
    holder_mode = EXCLUDED.holder_mode,
    ruleset = EXCLUDED.ruleset,
    balance_season = EXCLUDED.balance_season,
    profile_id = EXCLUDED.profile_id,
    tuning_revision = EXCLUDED.tuning_revision,
    updated_at = NOW()
  WHERE EXCLUDED.score > scores.score
  RETURNING board_key, score, holder_name, holder_mode, ruleset, balance_season, profile_id, tuning_revision, updated_at, TRUE AS updated;
`;

export const INSERT_RUN_TOKEN_SQL = `
  INSERT INTO shared_champion_run_tokens (
    run_id,
    token_hash,
    player_name,
    control_mode,
    map_id,
    ruleset,
    balance_season,
    profile_id,
    tuning_revision,
    board_key,
    expires_at,
    created_ip_fingerprint,
    created_user_agent_fingerprint
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING run_id, player_name, control_mode, map_id, ruleset, balance_season, profile_id, tuning_revision, board_key, issued_at, expires_at, claimed_at;
`;

export const CLAIM_RUN_TOKEN_SQL = `
  UPDATE shared_champion_run_tokens
  SET
    claimed_at = NOW(),
    claim_ip_fingerprint = $2,
    claim_user_agent_fingerprint = $3
  WHERE token_hash = $1
    AND claimed_at IS NULL
    AND expires_at > NOW()
  RETURNING run_id, player_name, control_mode, map_id, ruleset, balance_season, profile_id, tuning_revision, board_key, issued_at, expires_at, claimed_at;
`;

export const SELECT_RUN_TOKEN_SQL = `
  SELECT run_id, player_name, control_mode, map_id, ruleset, balance_season, profile_id, tuning_revision, board_key, issued_at, expires_at, claimed_at
  FROM shared_champion_run_tokens
  WHERE token_hash = $1
  LIMIT 1;
`;

export const INSERT_AUDIT_EVENT_SQL = `
  INSERT INTO shared_champion_run_audit (
    event_type,
    outcome,
    run_id,
    ip_fingerprint,
    user_agent_fingerprint,
    reason,
    payload
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb);
`;

export const INSERT_RUN_SQL = `
  INSERT INTO shared_champion_runs (
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
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
  )
  RETURNING
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
    created_at;
`;

export const INSERT_RUN_IF_MISSING_SQL = `
  INSERT INTO shared_champion_runs (
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
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
  )
  ON CONFLICT (run_id) DO NOTHING
  RETURNING
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
    created_at;
`;

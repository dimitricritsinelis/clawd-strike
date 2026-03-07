CREATE TABLE IF NOT EXISTS shared_champion_scores (
  board_key TEXT PRIMARY KEY,
  score_half_points INTEGER NOT NULL CHECK (score_half_points >= 0),
  holder_name VARCHAR(15) NOT NULL,
  holder_mode TEXT NOT NULL CHECK (holder_mode IN ('human', 'agent')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

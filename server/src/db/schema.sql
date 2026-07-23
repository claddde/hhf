-- ============================================================
-- HoodLust Survivor — PostgreSQL schema (normalized).
-- Idempotent: safe to run repeatedly (CREATE ... IF NOT EXISTS).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Players & wallets ----------
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login    TIMESTAMPTZ,
  banned        BOOLEAN NOT NULL DEFAULT false,
  ban_reason    TEXT,
  ban_until     TIMESTAMPTZ,          -- NULL + banned=true => permanent
  is_admin      BOOLEAN NOT NULL DEFAULT false
);

-- One player may link multiple wallets (multi-wallet support).
CREATE TABLE IF NOT EXISTS wallets (
  address       TEXT PRIMARY KEY,     -- lower-case 0x…
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  linked_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallets_player ON wallets(player_id);

-- ---------- NFT verification cache ----------
CREATE TABLE IF NOT EXISTS nft_verifications (
  address       TEXT PRIMARY KEY REFERENCES wallets(address) ON DELETE CASCADE,
  nft_count     INTEGER NOT NULL DEFAULT 0,
  is_holder     BOOLEAN NOT NULL DEFAULT false,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Auth nonces (sign-in challenge) ----------
CREATE TABLE IF NOT EXISTS auth_nonces (
  address       TEXT PRIMARY KEY,
  nonce         TEXT NOT NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Cloud saves (authoritative player progress) ----------
CREATE TABLE IF NOT EXISTS cloud_saves (
  player_id     UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  coins         BIGINT NOT NULL DEFAULT 0,
  xp            BIGINT NOT NULL DEFAULT 0,
  highest_level INTEGER NOT NULL DEFAULT 1,
  data          JSONB NOT NULL DEFAULT '{}',  -- full serialized progress
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Weapons catalogue + player inventory ----------
CREATE TABLE IF NOT EXISTS weapons (
  id            TEXT PRIMARY KEY,     -- matches client WEAPONS ids
  name          TEXT NOT NULL,
  rarity        TEXT NOT NULL DEFAULT 'common',
  exclusive     BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS player_weapons (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  weapon_id     TEXT NOT NULL REFERENCES weapons(id),
  level         INTEGER NOT NULL DEFAULT 1,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, weapon_id)
);

-- ---------- Achievements ----------
CREATE TABLE IF NOT EXISTS achievements (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_achievements (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, achievement_id)
);

-- ---------- Scores (raw submissions) & leaderboard views ----------
-- Every validated run is a row; leaderboards are aggregates over time windows.
CREATE TABLE IF NOT EXISTS scores (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wallet        TEXT NOT NULL,
  score         INTEGER NOT NULL CHECK (score >= 0),
  character     TEXT,
  kills         INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  bosses        INTEGER NOT NULL DEFAULT 0,
  duration      INTEGER NOT NULL DEFAULT 0,   -- seconds
  week_key      TEXT NOT NULL,
  month_key     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scores_week  ON scores(week_key, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_month ON scores(month_key, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_all   ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);

-- Best score per player per window (fast leaderboard reads).
CREATE OR REPLACE VIEW leaderboard_week AS
  SELECT DISTINCT ON (player_id) player_id, wallet, character, score, week_key, created_at
  FROM scores ORDER BY player_id, score DESC;

-- ---------- Weekly reward runs + grants ----------
CREATE TABLE IF NOT EXISTS reward_periods (
  week_key      TEXT PRIMARY KEY,
  frozen_at     TIMESTAMPTZ,
  processed     BOOLEAN NOT NULL DEFAULT false,
  processed_at  TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS rewards (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wallet        TEXT NOT NULL,
  week_key      TEXT NOT NULL,
  rank          INTEGER NOT NULL,
  type          TEXT NOT NULL,          -- weapon | skin | title | effect
  item_id       TEXT,
  rarity        TEXT,
  title         TEXT,
  notified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, week_key, rank)    -- dedupe: one reward per rank/week
);

-- Admin-editable reward rules (rank range -> reward), single active row set.
CREATE TABLE IF NOT EXISTS reward_rules (
  id            SERIAL PRIMARY KEY,
  min_rank      INTEGER NOT NULL,
  max_rank      INTEGER NOT NULL,
  type          TEXT NOT NULL,
  item_id       TEXT,
  rarity        TEXT,
  title         TEXT
);

-- ---------- Game statistics / analytics ----------
CREATE TABLE IF NOT EXISTS game_stats (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  kind          TEXT NOT NULL,          -- 'session' | 'weapon_use' | 'boss_kill' | 'map_play'
  key           TEXT,                   -- weapon id / map id / boss id
  value         DOUBLE PRECISION,       -- duration, count, etc
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stats_kind ON game_stats(kind, created_at);

-- ---------- Live events ----------
CREATE TABLE IF NOT EXISTS live_events (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,          -- double_xp | double_coins | boss_rush | special_map | holiday
  config        JSONB NOT NULL DEFAULT '{}',
  enabled       BOOLEAN NOT NULL DEFAULT false,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ
);

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID REFERENCES players(id) ON DELETE CASCADE,  -- NULL => global
  kind          TEXT NOT NULL,          -- announcement | reward | rank | event | maintenance
  title         TEXT NOT NULL,
  body          TEXT,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_player ON notifications(player_id, read);

-- ---------- Cheat violations ----------
CREATE TABLE IF NOT EXISTS violations (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID REFERENCES players(id) ON DELETE CASCADE,
  wallet        TEXT,
  reason        TEXT NOT NULL,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_violations_player ON violations(player_id, created_at);

-- ---------- Logs ----------
CREATE TABLE IF NOT EXISTS admin_logs (
  id            BIGSERIAL PRIMARY KEY,
  category      TEXT NOT NULL,          -- login | verify | leaderboard | reward | event | admin | cheat
  wallet        TEXT,
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS error_logs (
  id            BIGSERIAL PRIMARY KEY,
  message       TEXT NOT NULL,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Server settings (runtime toggles: maintenance, etc.) ----------
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL
);
INSERT INTO settings(key, value) VALUES ('maintenance', 'false')
  ON CONFLICT (key) DO NOTHING;

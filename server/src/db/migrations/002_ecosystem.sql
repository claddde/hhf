-- ============================================================
-- Phase 7 migration — Web3 live ecosystem. Idempotent (IF NOT EXISTS).
-- Extends the Phase-6 schema; does not alter existing tables.
-- ============================================================

-- ---------- Seasons ----------
CREATE TABLE IF NOT EXISTS seasons (
  id            TEXT PRIMARY KEY,          -- e.g. 'S1'
  name          TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  tiers         INTEGER NOT NULL DEFAULT 40,
  archived      BOOLEAN NOT NULL DEFAULT false,
  config        JSONB NOT NULL DEFAULT '{}'
);
-- Per-player season progress + ranking.
CREATE TABLE IF NOT EXISTS season_progress (
  season_id     TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  bp_xp         INTEGER NOT NULL DEFAULT 0,
  premium       BOOLEAN NOT NULL DEFAULT false,
  claimed       JSONB NOT NULL DEFAULT '{"free":[],"premium":[]}',
  season_score  INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_season_rank ON season_progress(season_id, season_score DESC);
-- Archived season standings.
CREATE TABLE IF NOT EXISTS season_history (
  season_id     TEXT NOT NULL,
  player_id     UUID NOT NULL,
  rank          INTEGER NOT NULL,
  season_score  INTEGER NOT NULL,
  archived_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, player_id)
);

-- ---------- Missions (assignment + progress) ----------
CREATE TABLE IF NOT EXISTS player_missions (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  scope         TEXT NOT NULL,             -- 'daily' | 'weekly'
  period_key    TEXT NOT NULL,            -- date (daily) / week key (weekly)
  mission_id    TEXT NOT NULL,
  progress      INTEGER NOT NULL DEFAULT 0,
  goal          INTEGER NOT NULL,
  done          BOOLEAN NOT NULL DEFAULT false,
  claimed       BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (player_id, scope, period_key, mission_id)
);

-- ---------- Cosmetics (cosmetic only — never pay-to-win) ----------
CREATE TABLE IF NOT EXISTS cosmetics (
  id            TEXT PRIMARY KEY,          -- 'frame:gold', 'pet:ghost', …
  kind          TEXT NOT NULL,            -- frame | banner | aura | pet | spawnfx | victoryfx | skin
  name          TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'battlepass'  -- battlepass | mission | nft | event | tournament
);
CREATE TABLE IF NOT EXISTS player_cosmetics (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  cosmetic_id   TEXT NOT NULL REFERENCES cosmetics(id),
  equipped      BOOLEAN NOT NULL DEFAULT false,
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, cosmetic_id)
);

-- ---------- Clans ----------
CREATE TABLE IF NOT EXISTS clans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  tag           TEXT NOT NULL,
  logo          TEXT,
  owner_id      UUID NOT NULL REFERENCES players(id),
  clan_score    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clan_members (
  clan_id       UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member',   -- owner | officer | member
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, player_id)
);
CREATE TABLE IF NOT EXISTS clan_chat (
  id            BIGSERIAL PRIMARY KEY,
  clan_id       UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clanchat ON clan_chat(clan_id, created_at DESC);

-- ---------- Friends ----------
CREATE TABLE IF NOT EXISTS friendships (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  friend_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | accepted | blocked
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, friend_id)
);

-- ---------- Co-op rooms / matchmaking ----------
CREATE TABLE IF NOT EXISTS coop_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,      -- invite code
  host_id       UUID NOT NULL REFERENCES players(id),
  map           TEXT,
  private       BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'open',      -- open | playing | closed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coop_members (
  room_id       UUID NOT NULL REFERENCES coop_rooms(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, player_id)
);

-- ---------- PvP arena ----------
CREATE TABLE IF NOT EXISTS pvp_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode          TEXT NOT NULL DEFAULT 'ranked',    -- ranked | casual
  season_id     TEXT,
  player_a      UUID REFERENCES players(id),
  player_b      UUID REFERENCES players(id),
  winner        UUID,
  replay        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pvp_ratings (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id     TEXT NOT NULL,
  rating        INTEGER NOT NULL DEFAULT 1000,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, season_id)
);

-- ---------- Tournaments ----------
CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | finished
  bracket       JSONB NOT NULL DEFAULT '[]',
  champion_id   UUID,
  config        JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS tournament_entrants (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed          INTEGER,
  PRIMARY KEY (tournament_id, player_id)
);

-- ---------- Global chat & private messages ----------
CREATE TABLE IF NOT EXISTS chat_global (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_global ON chat_global(created_at DESC);
CREATE TABLE IF NOT EXISTS private_messages (
  id            BIGSERIAL PRIMARY KEY,
  from_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm ON private_messages(to_id, read);

-- ---------- Feature flags / remote config (live ops) ----------
CREATE TABLE IF NOT EXISTS feature_flags (
  key           TEXT PRIMARY KEY,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  value         JSONB NOT NULL DEFAULT '{}'
);

-- Seed the launch season + a few cosmetics + default flags.
INSERT INTO seasons(id,name,starts_at,ends_at,tiers) VALUES
  ('S1','Season 1 — Neon Gothic', now(), now() + interval '60 days', 40)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO cosmetics(id,kind,name,source) VALUES
  ('frame:gold','frame','Gold Frame','battlepass'),
  ('frame:mythic','frame','Mythic Frame','battlepass'),
  ('frame:holder','frame','Holder Frame','nft'),
  ('aura:gold','aura','Golden Aura','nft'),
  ('pet:ghost','pet','Ghost Pet','battlepass'),
  ('pet:shadow','pet','Shadow Pet','nft'),
  ('banner:hoodlust','banner','HoodLust Banner','nft'),
  ('spawnfx:portal','spawnfx','Portal Spawn','nft'),
  ('victoryfx:confetti','victoryfx','Confetti Victory','battlepass')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_flags(key,enabled,value) VALUES
  ('coop', false, '{}'), ('pvp', false, '{}'), ('tournaments', false, '{}'),
  ('global_chat', true, '{}'), ('clans', true, '{}')
  ON CONFLICT (key) DO NOTHING;

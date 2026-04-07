-- ============================================================
-- rank-it: Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy string matching
CREATE EXTENSION IF NOT EXISTS postgis;        -- geo queries (optional, for boards_near_location)

-- ============================================================
-- BOARDS
-- ============================================================
CREATE TABLE boards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(255) UNIQUE NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100),                    -- "food", "travel", "nightlife", "shopping" etc
  location    VARCHAR(100),                    -- city/area label e.g. "Bangalore"
  gps_lat     DECIMAL(9,6),                    -- optional: creator's lat for geo feed
  gps_lng     DECIMAL(9,6),
  created_by  UUID,                            -- auth.uid() of creator (nullable = anonymous)
  view_count  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geo index for location-based board feed (v2)
CREATE INDEX idx_boards_location ON boards (location);
CREATE INDEX idx_boards_category ON boards (category);
CREATE INDEX idx_boards_created_at ON boards (created_at DESC);

-- ============================================================
-- ITEMS
-- Each row is a unique entry on a board.
-- vote_count is incremented each time a different user submits the same name.
-- ============================================================
CREATE TABLE items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id         UUID        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  name_normalized  VARCHAR(255) NOT NULL,      -- lower(trim(name)) for exact dedup
  description      TEXT,
  vote_count       INTEGER     NOT NULL DEFAULT 1,  -- creator counts as first vote
  created_by       UUID,                            -- auth.uid() of first submitter
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (board_id, name_normalized)
);

CREATE INDEX idx_items_board_id  ON items (board_id);
CREATE INDEX idx_items_vote_count ON items (board_id, vote_count DESC);
-- GIN trigram index for fuzzy match RPC
CREATE INDEX idx_items_name_trgm ON items USING GIN (name gin_trgm_ops);

-- ============================================================
-- SUBMISSIONS
-- One row per (user, item) pair — prevents double-voting.
-- Also stores device fingerprint signals for abuse detection.
-- ============================================================
CREATE TABLE submissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_id      UUID        NOT NULL REFERENCES items(id)  ON DELETE CASCADE,

  -- Identity (at least one must be non-null)
  user_id      UUID,                           -- Supabase auth uid (phone-verified)
  phone_hash   VARCHAR(64),                    -- SHA-256(phone + PHONE_HASH_SALT)
  ip_hash      VARCHAR(64),                    -- SHA-256(ip   + IP_HASH_SALT)

  -- Device fingerprint (collected for abuse detection, never used to block alone)
  gps_lat      DECIMAL(9,6),
  gps_lng      DECIMAL(9,6),
  screen_res   VARCHAR(20),                    -- "1920x1080"
  timezone     VARCHAR(60),                    -- "Asia/Kolkata"
  ua_hash      VARCHAR(64),                    -- SHA-256(userAgent)
  language     VARCHAR(10),                    -- "en-IN"

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One submission per authenticated user per item
  -- One submission per ip_hash per item (for anonymous fallback)
  -- NULLS NOT DISTINCT: (item_id, NULL, ip_hash) is still unique
  UNIQUE NULLS NOT DISTINCT (item_id, user_id),
  UNIQUE NULLS NOT DISTINCT (item_id, ip_hash)
);

CREATE INDEX idx_submissions_item_id  ON submissions (item_id);
CREATE INDEX idx_submissions_board_id ON submissions (board_id);
CREATE INDEX idx_submissions_user_id  ON submissions (user_id);
-- For location clustering abuse detection (v2)
CREATE INDEX idx_submissions_gps ON submissions (gps_lat, gps_lng) WHERE gps_lat IS NOT NULL;

-- ============================================================
-- UPDATED_AT trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUZZY MATCH RPC
-- Used by AddItemForm to suggest existing items when no exact match found.
-- ============================================================
CREATE OR REPLACE FUNCTION find_similar_items(
  p_board_id  UUID,
  p_name      TEXT,
  p_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  vote_count INT,
  sim        FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    i.id,
    i.name,
    i.vote_count,
    similarity(i.name, p_name) AS sim
  FROM items i
  WHERE i.board_id = p_board_id
    AND similarity(i.name, p_name) > p_threshold
  ORDER BY sim DESC
  LIMIT 5;
$$;

-- ============================================================
-- ATOMIC VOTE INCREMENT
-- Called by API route after inserting a submission row.
-- Uses UPDATE ... SET vote_count = vote_count + 1 which is atomic in Postgres.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_vote(p_item_id UUID)
RETURNS items
LANGUAGE sql AS $$
  UPDATE items
  SET vote_count = vote_count + 1
  WHERE id = p_item_id
  RETURNING *;
$$;

-- ============================================================
-- GEO BOARDS RPC (v2 — personalized feed)
-- Returns boards within radius_km of user, ordered by distance.
-- Requires postgis. Falls back gracefully if coords not provided.
-- ============================================================
CREATE OR REPLACE FUNCTION boards_near_location(
  user_lat   FLOAT,
  user_lng   FLOAT,
  radius_km  FLOAT DEFAULT 25
)
RETURNS SETOF boards
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM boards
  WHERE gps_lat IS NOT NULL
    AND gps_lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(gps_lat)) *
        cos(radians(gps_lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(gps_lat))
      )
    ) <= radius_km
  ORDER BY (
    6371 * acos(
      cos(radians(user_lat)) * cos(radians(gps_lat)) *
      cos(radians(gps_lng) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(gps_lat))
    )
  ) ASC;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- All writes go through Next.js API route using service_role key.
-- Clients (anon / authenticated) can only SELECT.
-- ============================================================
ALTER TABLE boards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public read on boards and items
CREATE POLICY "boards_public_read"      ON boards      FOR SELECT USING (true);
CREATE POLICY "items_public_read"       ON items       FOR SELECT USING (true);

-- Submissions: only the API (service_role) writes; no client reads of others' data
-- Service role bypasses RLS entirely, so no INSERT policy needed for it.
-- Authenticated users can read their own submissions (for "already voted" UI state).
CREATE POLICY "submissions_own_read"    ON submissions FOR SELECT
  USING (user_id = auth.uid());

-- Gather sync — D1 schema. Apply: wrangler d1 execute gather --file schema.sql  (add --local for dev)

-- Auth tokens. role: 'device' (app) | 'admin' (operator, may PUT indexes). campaign_id NULL = any campaign.
CREATE TABLE IF NOT EXISTS tokens (
  token       TEXT PRIMARY KEY,
  role        TEXT NOT NULL DEFAULT 'device',
  campaign_id TEXT
);

-- Cross-volunteer dedup ledger: first VALID per (campaign, voter) wins; later ones are duplicates.
CREATE TABLE IF NOT EXISTS dedup (
  campaign_id TEXT NOT NULL,
  voter_id    TEXT NOT NULL,
  PRIMARY KEY (campaign_id, voter_id)
);

-- Moat B: validity-by-location, additive counts.
CREATE TABLE IF NOT EXISTS yield (
  campaign_id TEXT NOT NULL,
  zip         TEXT NOT NULL,
  valid       INTEGER NOT NULL DEFAULT 0,
  total       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, zip)
);

-- The live movement rollup (single row).
CREATE TABLE IF NOT EXISTS movement (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  circulators     INTEGER NOT NULL,
  valid_this_week INTEGER NOT NULL,
  states          INTEGER NOT NULL
);
INSERT OR IGNORE INTO movement (id, circulators, valid_this_week, states) VALUES (1, 1240, 38902, 7);

-- Current index version per campaign (artifacts themselves live in R2: indexes/<campaign>/<version>.json).
CREATE TABLE IF NOT EXISTS index_meta (
  campaign_id  TEXT PRIMARY KEY,
  version      TEXT NOT NULL,
  voter_count  INTEGER,
  built_at     TEXT,
  jurisdiction TEXT
);

-- DEV/PLACEHOLDER tokens — replace before any real deployment:
--   wrangler d1 execute gather --command "DELETE FROM tokens; INSERT INTO tokens VALUES ('<gen>','device',NULL),('<gen>','admin',NULL)"
INSERT OR IGNORE INTO tokens (token, role, campaign_id) VALUES
  ('dev-device-token', 'device', NULL),
  ('dev-admin-token',  'admin',  NULL);

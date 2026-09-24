-- listings.source is either submitted (owner proved control via POST /submit) or
-- cdp-mirror (bootstrapped from Coinbase Bazaar discovery API). submitted always
-- wins: the mirror importer never overwrites a listing whose owner has claimed it.
CREATE TABLE IF NOT EXISTS listings (
  host TEXT PRIMARY KEY,
  source_manifest_url TEXT NOT NULL,
  manifest_name TEXT,
  submitted_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'submitted'
);

-- resources.calls_30d/unique_payers_30d/last_called_at are usage/trust signals,
-- populated from the CDP Bazaar for mirrored listings; null until this deployment
-- does its own call analytics for directly-submitted ones.
--
-- resources.slug is an optional human-readable permalink segment (/resources/{slug});
-- when null the numeric id is used instead, so every resource always has a stable URL.
--
-- resources.metadata is a JSON blob for agent-first fields that do not warrant their own
-- column (capabilities, useWhen, doNotUseWhen, sideEffects, permissions, license,
-- repository, documentation, examples). Only populated where a provider actually
-- supplied it; never fabricated for mirrored resources.
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_host TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  x402_version INTEGER,
  output_schema TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  last_updated TEXT NOT NULL,
  calls_30d INTEGER,
  unique_payers_30d INTEGER,
  last_called_at TEXT,
  slug TEXT,
  resource_type TEXT,
  metadata TEXT,
  -- Liveness: is_live is NULL until first checked, then 1/0. Only owner-submitted
  -- (source = 'submitted') resources are probed — see scripts/check-liveness.mjs;
  -- mirrored resources are Coinbase's to keep live, not ours to probe at scale.
  is_live INTEGER,
  last_checked_at TEXT,
  -- Paid placement (functions/feature.js): resource is "featured" while
  -- featured_until is in the future. Never touches the underlying resource's own
  -- x402 payment — this is a separate x402 purchase paid to Agent Bazaar itself.
  featured_until TEXT,
  -- Rolling reliability, precomputed by scripts/check-liveness.mjs from the last
  -- (up to) 10 rows in liveness_checks for this resource. NULL until first checked.
  reliability_checks INTEGER,
  reliability_live INTEGER,
  FOREIGN KEY (listing_host) REFERENCES listings(host)
);

-- Liveness check history — one row per probe, so reliability can be a real rolling
-- window instead of only the latest is_live boolean. Only owner-submitted resources
-- are probed (see resources.is_live comment above), so this only ever grows for those.
CREATE TABLE IF NOT EXISTS liveness_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  is_live INTEGER NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE TABLE IF NOT EXISTS resource_accepts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  scheme TEXT NOT NULL,
  network TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  asset TEXT,
  amount TEXT,
  amount_usd REAL,
  max_timeout_seconds INTEGER,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE INDEX IF NOT EXISTS idx_resources_listing_host ON resources(listing_host);
CREATE INDEX IF NOT EXISTS idx_accepts_resource_id ON resource_accepts(resource_id);
CREATE INDEX IF NOT EXISTS idx_accepts_pay_to ON resource_accepts(pay_to);
CREATE INDEX IF NOT EXISTS idx_accepts_network ON resource_accepts(network);
CREATE INDEX IF NOT EXISTS idx_accepts_asset ON resource_accepts(asset);
CREATE INDEX IF NOT EXISTS idx_resources_calls_30d ON resources(calls_30d);
-- Serves `ORDER BY calls_30d DESC NULLS LAST, id` without a temp sort (see migrations/0009).
CREATE INDEX IF NOT EXISTS idx_resources_calls_id ON resources(calls_30d DESC, id ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug) WHERE slug IS NOT NULL;
-- COLLATE NOCASE matches the `WHERE resource_type = ? COLLATE NOCASE` queries in
-- resourcesByCategory() — without it on the index too, SQLite can't use the index
-- for a case-insensitive comparison and silently falls back to a full table scan.
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_liveness_checks_resource_id ON liveness_checks(resource_id, checked_at);

-- Rate limiting for POST /submit: one row per accepted submission, keyed by the
-- client IP. Old rows are pruned lazily (see submit.js) rather than by a cron.
CREATE TABLE IF NOT EXISTS submission_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ip TEXT NOT NULL,
  host TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_log_ip_time ON submission_log(client_ip, submitted_at);

-- External-content FTS5 index: kept in sync with resources by the triggers below
-- rather than duplicating the text, since resources are replaced (not updated) on resubmission.
CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
  resource_url, description, tags, content='resources', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS resources_ai AFTER INSERT ON resources BEGIN
  INSERT INTO resources_fts(rowid, resource_url, description, tags)
  VALUES (new.id, new.resource_url, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS resources_ad AFTER DELETE ON resources BEGIN
  INSERT INTO resources_fts(resources_fts, rowid, resource_url, description, tags)
  VALUES ('delete', old.id, old.resource_url, old.description, old.tags);
END;

-- A2A agent registry: directory of *other* agents' cards (as opposed to
-- /.well-known/agent-card.json, which describes Agent Bazaar's own discovery
-- surface). One row per host; re-submitting the same agentCardUrl refreshes it.
-- Agents don't have an x402 accepts[]-style payment model in the A2A spec, so
-- this is a separate table rather than shoehorned into resources/resource_accepts.
CREATE TABLE IF NOT EXISTS agent_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE,
  card_url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  provider_org TEXT,
  provider_url TEXT,
  version TEXT,
  protocol_version TEXT,
  documentation_url TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  capabilities TEXT,
  input_modes TEXT,
  output_modes TEXT,
  raw_card TEXT NOT NULL,
  is_live INTEGER,
  last_checked_at TEXT,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_cards_host ON agent_cards(host);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_cards_slug ON agent_cards(slug) WHERE slug IS NOT NULL;

CREATE VIRTUAL TABLE IF NOT EXISTS agent_cards_fts USING fts5(
  name, description, skills, content='agent_cards', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS agent_cards_ai AFTER INSERT ON agent_cards BEGIN
  INSERT INTO agent_cards_fts(rowid, name, description, skills)
  VALUES (new.id, new.name, new.description, new.skills);
END;

CREATE TRIGGER IF NOT EXISTS agent_cards_ad AFTER DELETE ON agent_cards BEGIN
  INSERT INTO agent_cards_fts(agent_cards_fts, rowid, name, description, skills)
  VALUES ('delete', old.id, old.name, old.description, old.skills);
END;

CREATE INDEX IF NOT EXISTS idx_resources_featured_until ON resources(featured_until);

-- One row per successful "feature this resource" x402 purchase. tx_signature is
-- UNIQUE so the same on-chain payment can never be replayed to re-extend or
-- feature a second resource.
CREATE TABLE IF NOT EXISTS feature_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  tx_signature TEXT UNIQUE NOT NULL,
  amount_usd REAL NOT NULL,
  days INTEGER NOT NULL,
  featured_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Precomputed catalog totals (single row). getStats()/listResources() read this
-- instead of running live COUNT(*)/SUM() over resources & resource_accepts on every
-- request — those aggregates cost tens of thousands of D1 "rows read" each time (a
-- 15k+ row table, scanned fresh per call) and were firing on every homepage view.
-- Recomputed on writes (submit/delete/import), which are rare compared to page
-- views, not on reads. Staleness window: at most until the next write.
CREATE TABLE IF NOT EXISTS catalog_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  listings INTEGER NOT NULL DEFAULT 0,
  resources INTEGER NOT NULL DEFAULT 0,
  accepts INTEGER NOT NULL DEFAULT 0,
  merchants INTEGER NOT NULL DEFAULT 0,
  networks INTEGER NOT NULL DEFAULT 0,
  calls_30d INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO catalog_stats (id, listings, resources, accepts, merchants, networks, calls_30d, updated_at)
VALUES (1, 0, 0, 0, 0, 0, 0, '1970-01-01T00:00:00.000Z');

-- Precomputed per-network resource counts — listNetworks() used to be an unfiltered
-- `GROUP BY network` over resource_accepts (~44k rows scanned every time /networks
-- was visited). Same fix as catalog_stats: recomputed on writes, read on requests.
CREATE TABLE IF NOT EXISTS network_stats (
  network TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);

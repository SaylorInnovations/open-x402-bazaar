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
  FOREIGN KEY (listing_host) REFERENCES listings(host)
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug) WHERE slug IS NOT NULL;

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

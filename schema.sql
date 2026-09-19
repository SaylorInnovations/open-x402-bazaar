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

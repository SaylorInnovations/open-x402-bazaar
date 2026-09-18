CREATE TABLE IF NOT EXISTS listings (
  host TEXT PRIMARY KEY,
  source_manifest_url TEXT NOT NULL,
  manifest_name TEXT,
  submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_host TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  x402_version INTEGER,
  output_schema TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  last_updated TEXT NOT NULL,
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

-- External-content FTS5 index: kept in sync with `resources` by the triggers below
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

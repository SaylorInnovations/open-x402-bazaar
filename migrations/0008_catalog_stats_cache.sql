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

-- One-time real computation to seed the cache immediately (this migration itself
-- costs the full scan once, on purpose — every request after it is then cheap).
UPDATE catalog_stats SET
  listings = (SELECT COUNT(*) FROM listings),
  resources = (SELECT COUNT(*) FROM resources),
  accepts = (SELECT COUNT(*) FROM resource_accepts),
  merchants = (SELECT COUNT(DISTINCT pay_to) FROM resource_accepts),
  networks = (SELECT COUNT(DISTINCT network) FROM resource_accepts),
  calls_30d = (SELECT COALESCE(SUM(calls_30d), 0) FROM resources),
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Same fix, for listNetworks()'s unfiltered GROUP BY (~44k rows/call).
CREATE TABLE IF NOT EXISTS network_stats (
  network TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
DELETE FROM network_stats;
INSERT INTO network_stats (network, count)
  SELECT network, COUNT(DISTINCT resource_id) FROM resource_accepts GROUP BY network;

-- resourcesByCategory() filters `WHERE resource_type = ? COLLATE NOCASE` — the
-- existing index has no collation, so SQLite couldn't use it and fell back to a
-- full table scan on every /categories/{type} view (measured: 15,710 rows/call,
-- same as an unfiltered scan). Recreating it with the matching collation is what
-- actually makes it usable.
DROP INDEX IF EXISTS idx_resources_resource_type;
CREATE INDEX idx_resources_resource_type ON resources(resource_type COLLATE NOCASE);

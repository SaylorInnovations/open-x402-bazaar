ALTER TABLE resources ADD COLUMN featured_until TEXT;
CREATE INDEX IF NOT EXISTS idx_resources_featured_until ON resources(featured_until);

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

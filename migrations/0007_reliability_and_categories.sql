ALTER TABLE resources ADD COLUMN reliability_checks INTEGER;
ALTER TABLE resources ADD COLUMN reliability_live INTEGER;
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type);

CREATE TABLE IF NOT EXISTS liveness_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  is_live INTEGER NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
CREATE INDEX IF NOT EXISTS idx_liveness_checks_resource_id ON liveness_checks(resource_id, checked_at);

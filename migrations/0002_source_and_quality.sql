-- Additive migration for databases that already had the original (pre-mirror) schema
-- applied. Safe to run once; schema.sql already includes these for fresh installs.
ALTER TABLE listings ADD COLUMN source TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE resources ADD COLUMN calls_30d INTEGER;
ALTER TABLE resources ADD COLUMN unique_payers_30d INTEGER;
ALTER TABLE resources ADD COLUMN last_called_at TEXT;

CREATE INDEX IF NOT EXISTS idx_resources_calls_30d ON resources(calls_30d);

CREATE TABLE IF NOT EXISTS submission_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ip TEXT NOT NULL,
  host TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_log_ip_time ON submission_log(client_ip, submitted_at);

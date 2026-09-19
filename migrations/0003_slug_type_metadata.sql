-- Additive migration: adds resource detail-page support (slug permalinks, a coarse
-- resourceType for filtering, and a metadata JSON blob for agent-first fields).
ALTER TABLE resources ADD COLUMN slug TEXT;
ALTER TABLE resources ADD COLUMN resource_type TEXT;
ALTER TABLE resources ADD COLUMN metadata TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug) WHERE slug IS NOT NULL;

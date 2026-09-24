-- Query-cost fix. Every "most used" list (homepage, /discovery/resources, category and
-- network pages, filter-only search) orders by `calls_30d DESC NULLS LAST, id`. The old
-- single-column index on calls_30d can't serve that two-key order, so SQLite scanned all
-- ~15.7k resources and sorted them in a temp b-tree on every call. With this index the
-- planner streams rows in order and stops at LIMIT. Verified with EXPLAIN QUERY PLAN.
CREATE INDEX IF NOT EXISTS idx_resources_calls_id ON resources(calls_30d DESC, id ASC);

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

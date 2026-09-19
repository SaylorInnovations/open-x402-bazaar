// A2A agent registry — a directory of *other* agents' cards. Complements
// /.well-known/agent-card.json (which describes Agent Bazaar's own discovery
// surface) rather than replacing it. Kept in its own module/table since an A2A
// agent card has a different shape than an x402 resource (skills[] instead of
// accepts[], no inherent payment model) and mixing them into resources/
// resource_accepts would force one of the two shapes to be dishonest.

function clampLimit(limit, fallback = 20) {
  const n = Number(limit) || fallback;
  return Math.min(Math.max(n, 1), 100);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function rowToAgent(r) {
  return {
    id: r.id,
    slug: r.slug || String(r.id),
    name: r.name,
    description: r.description,
    host: r.host,
    cardUrl: r.card_url,
    provider: { organization: r.provider_org || undefined, url: r.provider_url || undefined },
    version: r.version || undefined,
    protocolVersion: r.protocol_version || undefined,
    documentationUrl: r.documentation_url || undefined,
    skills: JSON.parse(r.skills || '[]'),
    capabilities: r.capabilities ? JSON.parse(r.capabilities) : undefined,
    inputModes: r.input_modes ? JSON.parse(r.input_modes) : undefined,
    outputModes: r.output_modes ? JSON.parse(r.output_modes) : undefined,
    liveness: {
      isLive: r.is_live === null || r.is_live === undefined ? undefined : Boolean(r.is_live),
      lastCheckedAt: r.last_checked_at ?? undefined,
    },
    submittedAt: r.submitted_at,
  };
}

async function upsertAgent(env, card) {
  const existing = await env.DB.prepare('SELECT slug FROM agent_cards WHERE host = ?').bind(card.host).first();
  const slug = existing?.slug || (await uniqueSlug(env, card.name));

  await env.DB
    .prepare(
      `INSERT INTO agent_cards (host, slug, card_url, name, description, provider_org, provider_url, version, protocol_version, documentation_url, skills, capabilities, input_modes, output_modes, raw_card, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(host) DO UPDATE SET
         card_url = excluded.card_url, name = excluded.name, description = excluded.description,
         provider_org = excluded.provider_org, provider_url = excluded.provider_url, version = excluded.version,
         protocol_version = excluded.protocol_version, documentation_url = excluded.documentation_url,
         skills = excluded.skills, capabilities = excluded.capabilities, input_modes = excluded.input_modes,
         output_modes = excluded.output_modes, raw_card = excluded.raw_card, submitted_at = excluded.submitted_at`
    )
    .bind(
      card.host,
      slug,
      card.cardUrl,
      card.name,
      card.description || '',
      card.providerOrg || null,
      card.providerUrl || null,
      card.version || null,
      card.protocolVersion || null,
      card.documentationUrl || null,
      JSON.stringify(card.skills || []),
      card.capabilities ? JSON.stringify(card.capabilities) : null,
      card.inputModes ? JSON.stringify(card.inputModes) : null,
      card.outputModes ? JSON.stringify(card.outputModes) : null,
      JSON.stringify(card.rawCard),
      new Date().toISOString()
    )
    .run();
  return slug;
}

async function uniqueSlug(env, name) {
  const base = slugify(name) || 'agent';
  let slug = base;
  let n = 2;
  while (await env.DB.prepare('SELECT 1 FROM agent_cards WHERE slug = ?').bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

async function searchAgents(env, { query, limit }) {
  const lim = clampLimit(limit);
  if (query) {
    const { results } = await env.DB
      .prepare(
        `SELECT a.* FROM agent_cards_fts f JOIN agent_cards a ON a.id = f.rowid
         WHERE agent_cards_fts MATCH ? ORDER BY bm25(agent_cards_fts) LIMIT ?`
      )
      .bind(
        query.trim().split(/\s+/).filter(Boolean).map((t) => `"${t.replace(/"/g, '""')}"`).join(' '),
        lim
      )
      .all();
    return results.map(rowToAgent);
  }
  const { results } = await env.DB.prepare('SELECT * FROM agent_cards ORDER BY id DESC LIMIT ?').bind(lim).all();
  return results.map(rowToAgent);
}

async function listAgents(env, { limit, offset }) {
  const lim = clampLimit(limit);
  const off = Math.max(Number(offset) || 0, 0);
  const { results } = await env.DB
    .prepare('SELECT * FROM agent_cards ORDER BY id DESC LIMIT ? OFFSET ?')
    .bind(lim, off)
    .all();
  const { total } = await env.DB.prepare('SELECT COUNT(*) as total FROM agent_cards').first();
  return { agents: results.map(rowToAgent), total, limit: lim, offset: off };
}

async function getAgentBySlugOrId(env, key) {
  const isNumeric = /^\d+$/.test(key);
  const row = await env.DB
    .prepare(`SELECT * FROM agent_cards WHERE slug = ? ${isNumeric ? 'OR id = ?' : ''} LIMIT 1`)
    .bind(key, ...(isNumeric ? [Number(key)] : []))
    .first();
  return row ? rowToAgent(row) : null;
}

export { upsertAgent, searchAgents, listAgents, getAgentBySlugOrId };

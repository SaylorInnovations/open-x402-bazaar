function clampLimit(limit, fallback = 20) {
  const n = Number(limit) || fallback;
  return Math.min(Math.max(n, 1), 100);
}

// FTS5 gives special meaning to quotes, *, -, NEAR, AND/OR/NOT etc. Wrapping every
// token in its own quoted phrase (space-joined, implicit AND) makes arbitrary user
// input safe to MATCH against without it ever being parsed as an FTS5 operator.
function toFtsQuery(query) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => `"${tok.replace(/"/g, '""')}"`)
    .join(' ');
}

async function attachAccepts(env, rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results: acceptsRows } = await env.DB
    .prepare(`SELECT * FROM resource_accepts WHERE resource_id IN (${placeholders})`)
    .bind(...ids)
    .all();

  const byResource = {};
  for (const a of acceptsRows) {
    (byResource[a.resource_id] ||= []).push({
      scheme: a.scheme,
      network: a.network,
      payTo: a.pay_to,
      asset: a.asset || undefined,
      amount: a.amount || undefined,
      amountUsd: a.amount_usd ?? undefined,
      maxTimeoutSeconds: a.max_timeout_seconds ?? undefined,
    });
  }

  return rows.map((r) => ({
    resource: r.resource_url,
    description: r.description,
    type: 'http',
    x402Version: r.x402_version,
    accepts: byResource[r.id] || [],
    outputSchema: r.output_schema ? JSON.parse(r.output_schema) : undefined,
    tags: JSON.parse(r.tags || '[]'),
    sourceHost: r.listing_host,
    lastUpdated: r.last_updated,
  }));
}

async function deleteListing(env, host) {
  const { results } = await env.DB.prepare('SELECT id FROM resources WHERE listing_host = ?').bind(host).all();
  const ids = results.map((r) => r.id);

  const stmts = [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    stmts.push(env.DB.prepare(`DELETE FROM resource_accepts WHERE resource_id IN (${placeholders})`).bind(...ids));
  }
  stmts.push(env.DB.prepare('DELETE FROM resources WHERE listing_host = ?').bind(host));
  stmts.push(env.DB.prepare('DELETE FROM listings WHERE host = ?').bind(host));
  await env.DB.batch(stmts);
}

// Every insert is batched (one D1 round-trip per batch, not per row) — a manifest with
// dozens of resources/accepts previously meant dozens of sequential round-trips, which
// took 20-30s against local D1 and would add real latency/cost against the network too.
async function upsertListing(env, { host, sourceManifestUrl, manifestName, submittedAt, resources }) {
  await deleteListing(env, host);
  await env.DB
    .prepare('INSERT INTO listings (host, source_manifest_url, manifest_name, submitted_at) VALUES (?, ?, ?, ?)')
    .bind(host, sourceManifestUrl, manifestName || host, submittedAt)
    .run();

  if (resources.length === 0) return;

  const resourceStmts = resources.map((r) =>
    env.DB
      .prepare(
        `INSERT INTO resources (listing_host, resource_url, description, x402_version, output_schema, tags, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        host,
        r.resource,
        r.description || '',
        r.x402Version ?? null,
        r.outputSchema ? JSON.stringify(r.outputSchema) : null,
        JSON.stringify(r.tags || []),
        r.lastUpdated
      )
  );
  const resourceResults = await env.DB.batch(resourceStmts);
  const resourceIds = resourceResults.map((res) => res.meta.last_row_id);

  const acceptStmts = [];
  resources.forEach((r, i) => {
    for (const a of r.accepts) {
      acceptStmts.push(
        env.DB
          .prepare(
            `INSERT INTO resource_accepts (resource_id, scheme, network, pay_to, asset, amount, amount_usd, max_timeout_seconds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(resourceIds[i], a.scheme, a.network, a.payTo, a.asset || null, a.amount || null, a.amountUsd ?? null, a.maxTimeoutSeconds ?? null)
      );
    }
  });
  if (acceptStmts.length) await env.DB.batch(acceptStmts);
}

async function searchResources(env, { query, network, asset, scheme, payTo, maxUsdPrice, urlSubstring, limit }) {
  const lim = clampLimit(limit);
  const conditions = [];
  const params = [];
  let from = 'resources r';

  if (query) {
    from = 'resources_fts f JOIN resources r ON r.id = f.rowid';
    conditions.push('resources_fts MATCH ?');
    params.push(toFtsQuery(query));
  }

  let sql = `SELECT DISTINCT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host
             FROM ${from} JOIN resource_accepts a ON a.resource_id = r.id`;

  if (network) { conditions.push('a.network = ?'); params.push(network); }
  if (asset) { conditions.push('a.asset = ?'); params.push(asset); }
  if (scheme) { conditions.push('a.scheme = ?'); params.push(scheme); }
  if (payTo) { conditions.push('a.pay_to = ?'); params.push(payTo); }
  if (maxUsdPrice !== undefined) { conditions.push('(a.amount_usd IS NULL OR a.amount_usd <= ?)'); params.push(Number(maxUsdPrice)); }
  if (urlSubstring) {
    conditions.push("r.resource_url LIKE ? ESCAPE '\\'");
    params.push(`%${urlSubstring.replace(/[%_\\]/g, '\\$&')}%`);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' LIMIT ?';
  params.push(lim);

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return attachAccepts(env, results);
}

async function listResources(env, { limit, offset }) {
  const lim = clampLimit(limit);
  const off = Math.max(Number(offset) || 0, 0);

  const { results } = await env.DB
    .prepare('SELECT id, resource_url, description, x402_version, output_schema, tags, last_updated, listing_host FROM resources ORDER BY id LIMIT ? OFFSET ?')
    .bind(lim, off)
    .all();
  const { total } = await env.DB.prepare('SELECT COUNT(*) as total FROM resources').first();

  return { resources: await attachAccepts(env, results), total, limit: lim, offset: off };
}

async function merchantResources(env, payTo) {
  const { results } = await env.DB
    .prepare(
      `SELECT DISTINCT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host
       FROM resources r JOIN resource_accepts a ON a.resource_id = r.id WHERE a.pay_to = ?`
    )
    .bind(payTo)
    .all();
  return attachAccepts(env, results);
}

export { upsertListing, deleteListing, searchResources, listResources, merchantResources, toFtsQuery };

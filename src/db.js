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
    id: r.id,
    slug: r.slug || String(r.id),
    resource: r.resource_url,
    description: r.description,
    type: 'http',
    resourceType: r.resource_type || undefined,
    x402Version: r.x402_version,
    accepts: byResource[r.id] || [],
    outputSchema: r.output_schema ? JSON.parse(r.output_schema) : undefined,
    tags: JSON.parse(r.tags || '[]'),
    sourceHost: r.listing_host,
    lastUpdated: r.last_updated,
    // Extra fields beyond CDP's wire shape — additive, so existing clients that only
    // read the standard fields are unaffected. Trust/popularity signal for agents
    // choosing between many permissionless (unverified) listings.
    quality: {
      calls30d: r.calls_30d ?? undefined,
      uniquePayers30d: r.unique_payers_30d ?? undefined,
      lastCalledAt: r.last_called_at ?? undefined,
    },
    // Agent-first fields (capabilities/useWhen/doNotUseWhen/sideEffects/permissions/
    // license/repository/documentation/examples), only present when a provider
    // actually supplied them — never fabricated for mirrored resources.
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    // Liveness: null/undefined = never checked (not the same as "down"). Only
    // owner-submitted resources are probed — see scripts/check-liveness.mjs.
    liveness: {
      isLive: r.is_live === null || r.is_live === undefined ? undefined : Boolean(r.is_live),
      lastCheckedAt: r.last_checked_at ?? undefined,
    },
    // true only when the provider proved control via POST /submit — never inferred
    // from hostname or any other heuristic.
    verified: r.listing_source === 'submitted',
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
async function upsertListing(env, { host, sourceManifestUrl, manifestName, submittedAt, resources, source = 'submitted' }) {
  await deleteListing(env, host);
  await env.DB
    .prepare('INSERT INTO listings (host, source_manifest_url, manifest_name, submitted_at, source) VALUES (?, ?, ?, ?, ?)')
    .bind(host, sourceManifestUrl, manifestName || host, submittedAt, source)
    .run();

  if (resources.length === 0) return;

  const resourceStmts = resources.map((r) =>
    env.DB
      .prepare(
        `INSERT INTO resources (listing_host, resource_url, description, x402_version, output_schema, tags, last_updated, slug, resource_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        host,
        r.resource,
        r.description || '',
        r.x402Version ?? null,
        r.outputSchema ? JSON.stringify(r.outputSchema) : null,
        JSON.stringify(r.tags || []),
        r.lastUpdated,
        r.slug || null,
        r.resourceType || null,
        r.metadata ? JSON.stringify(r.metadata) : null
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

  let sql = `SELECT DISTINCT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host, r.calls_30d, r.unique_payers_30d, r.last_called_at, r.slug, r.resource_type, r.metadata, r.is_live, r.last_checked_at, l.source AS listing_source
             FROM ${from} JOIN resource_accepts a ON a.resource_id = r.id JOIN listings l ON l.host = r.listing_host`;

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
  // Text queries rank by FTS5 match quality (bm25) first; filter-only queries rank
  // by 30-day call volume, so the busiest (most likely still-live, least-likely-spam)
  // resources surface first among otherwise-equal matches.
  sql += query ? ' ORDER BY bm25(resources_fts)' : ' ORDER BY r.calls_30d DESC NULLS LAST, r.id';
  sql += ' LIMIT ?';
  params.push(lim);

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return attachAccepts(env, results);
}

async function listResources(env, { limit, offset, sort }) {
  const lim = clampLimit(limit);
  const off = Math.max(Number(offset) || 0, 0);
  // 'recent' is genuinely recency (insertion order), not a fabricated trending score —
  // used for the homepage's "Recently Added" section when there isn't enough usage
  // data yet to justify a "Trending" claim.
  const orderBy = sort === 'recent' ? 'r.id DESC' : 'r.calls_30d DESC NULLS LAST, r.id';

  const { results } = await env.DB
    .prepare(`SELECT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host, r.calls_30d, r.unique_payers_30d, r.last_called_at, r.slug, r.resource_type, r.metadata, r.is_live, r.last_checked_at, l.source AS listing_source FROM resources r JOIN listings l ON l.host = r.listing_host ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(lim, off)
    .all();
  const { total } = await env.DB.prepare('SELECT COUNT(*) as total FROM resources').first();

  return { resources: await attachAccepts(env, results), total, limit: lim, offset: off };
}

async function merchantResources(env, payTo) {
  const { results } = await env.DB
    .prepare(
      `SELECT DISTINCT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host, r.calls_30d, r.unique_payers_30d, r.last_called_at, r.slug, r.resource_type, r.metadata, r.is_live, r.last_checked_at, l.source AS listing_source
       FROM resources r JOIN resource_accepts a ON a.resource_id = r.id JOIN listings l ON l.host = r.listing_host WHERE a.pay_to = ?
       ORDER BY r.calls_30d DESC NULLS LAST, r.id`
    )
    .bind(payTo)
    .all();
  return attachAccepts(env, results);
}

async function getResourceBySlugOrId(env, key) {
  const isNumeric = /^\d+$/.test(key);
  const row = await env.DB
    .prepare(
      `SELECT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host, r.calls_30d, r.unique_payers_30d, r.last_called_at, r.slug, r.resource_type, r.metadata, r.is_live, r.last_checked_at, l.source AS listing_source
       FROM resources r JOIN listings l ON l.host = r.listing_host WHERE r.slug = ? ${isNumeric ? 'OR r.id = ?' : ''} LIMIT 1`
    )
    .bind(key, ...(isNumeric ? [Number(key)] : []))
    .first();
  if (!row) return null;
  const [resource] = await attachAccepts(env, [row]);
  const listing = await env.DB.prepare('SELECT host, manifest_name, source, source_manifest_url, submitted_at FROM listings WHERE host = ?').bind(row.listing_host).first();
  return { ...resource, provider: listing };
}

async function getProvider(env, host) {
  const listing = await env.DB.prepare('SELECT host, manifest_name, source, source_manifest_url, submitted_at FROM listings WHERE host = ?').bind(host).first();
  if (!listing) return null;
  const { results } = await env.DB
    .prepare(
      `SELECT r.id, r.resource_url, r.description, r.x402_version, r.output_schema, r.tags, r.last_updated, r.listing_host, r.calls_30d, r.unique_payers_30d, r.last_called_at, r.slug, r.resource_type, r.metadata, r.is_live, r.last_checked_at, l.source AS listing_source
       FROM resources r JOIN listings l ON l.host = r.listing_host WHERE r.listing_host = ? ORDER BY r.calls_30d DESC NULLS LAST, r.id`
    )
    .bind(host)
    .all();
  return { provider: listing, resources: await attachAccepts(env, results) };
}

async function getStats(env) {
  const [totals, byNetwork, bySource] = await Promise.all([
    env.DB
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM listings) AS listings,
           (SELECT COUNT(*) FROM resources) AS resources,
           (SELECT COUNT(*) FROM resource_accepts) AS accepts,
           (SELECT COUNT(DISTINCT pay_to) FROM resource_accepts) AS merchants,
           (SELECT SUM(calls_30d) FROM resources) AS calls30d`
      )
      .first(),
    env.DB.prepare('SELECT network, COUNT(*) AS count FROM resource_accepts GROUP BY network ORDER BY count DESC').all(),
    env.DB.prepare('SELECT source, COUNT(*) AS count FROM listings GROUP BY source').all(),
  ]);

  return {
    listings: totals.listings,
    resources: totals.resources,
    accepts: totals.accepts,
    merchants: totals.merchants,
    calls30d: totals.calls30d || 0,
    byNetwork: Object.fromEntries(byNetwork.results.map((r) => [r.network, r.count])),
    bySource: Object.fromEntries(bySource.results.map((r) => [r.source, r.count])),
  };
}

async function isRateLimited(env, { clientIp, maxPerHour = 20, maxPerDay = 60 }) {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const { count: hourCount } = await env.DB
    .prepare('SELECT COUNT(*) AS count FROM submission_log WHERE client_ip = ? AND submitted_at >= ?')
    .bind(clientIp, hourAgo)
    .first();
  if (hourCount >= maxPerHour) return true;

  const { count: dayCount } = await env.DB
    .prepare('SELECT COUNT(*) AS count FROM submission_log WHERE client_ip = ? AND submitted_at >= ?')
    .bind(clientIp, dayAgo)
    .first();
  return dayCount >= maxPerDay;
}

async function logSubmission(env, { clientIp, host }) {
  await env.DB
    .prepare('INSERT INTO submission_log (client_ip, host, submitted_at) VALUES (?, ?, ?)')
    .bind(clientIp, host, new Date().toISOString())
    .run();
}

export {
  upsertListing,
  deleteListing,
  searchResources,
  listResources,
  merchantResources,
  getResourceBySlugOrId,
  getProvider,
  getStats,
  isRateLimited,
  logSubmission,
  toFtsQuery,
};

// Deliberately NOT one entry per mirrored resource (15k+) — that would be exactly the
// "thousands of near-identical spam pages" this architecture is supposed to avoid.
// Indexed: static pages, every provider, and resources from verified (owner-submitted)
// providers. The full catalog remains crawlable by agents via /discovery/resources.
import { guideSummaries } from '../src/guides.js';

const STATIC_PATHS = ['/', '/agents', '/publish', '/docs', '/guides', '/mcp', '/categories', '/networks', '/protocols', '/protocols/x402', '/protocols/mcp', '/protocols/a2a'];

export async function onRequestGet({ env }) {
  const base = 'https://bazaar.saylorinnovations.com';
  const urls = [...STATIC_PATHS, ...guideSummaries().map((g) => `/guides/${g.slug}`)];

  const { results: providers } = await env.DB.prepare("SELECT host FROM listings ORDER BY host").all();
  for (const p of providers) urls.push(`/providers/${p.host}`);

  const { results: categories } = await env.DB
    .prepare("SELECT DISTINCT resource_type FROM resources WHERE resource_type IS NOT NULL AND resource_type != ''")
    .all();
  for (const c of categories) urls.push(`/categories/${encodeURIComponent(c.resource_type)}`);

  const { results: networks } = await env.DB.prepare('SELECT DISTINCT network FROM resource_accepts').all();
  for (const n of networks) urls.push(`/networks/${encodeURIComponent(n.network)}`);

  const { results: verified } = await env.DB
    .prepare(
      `SELECT r.slug, r.id FROM resources r JOIN listings l ON l.host = r.listing_host WHERE l.source = 'submitted' ORDER BY r.id`
    )
    .all();
  for (const r of verified) urls.push(`/resources/${r.slug || r.id}`);

  const { results: agents } = await env.DB.prepare('SELECT slug, id FROM agent_cards ORDER BY id').all();
  for (const a of agents) urls.push(`/agents/${a.slug || a.id}`);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'content-type': 'application/xml' } });
}

// Deliberately NOT one entry per mirrored resource (15k+) — that would be exactly the
// "thousands of near-identical spam pages" this architecture is supposed to avoid.
// Indexed: static pages, every provider, and resources from verified (owner-submitted)
// providers. The full catalog remains crawlable by agents via /discovery/resources.
import { guideSummaries } from '../src/guides.js';
import { fallbackSaylorOfficial } from '../src/saylor-fallback.js';

const STATIC_PATHS = ['/', '/agents', '/publish', '/docs', '/guides', '/mcp', '/categories', '/networks', '/protocols', '/protocols/x402', '/protocols/mcp', '/protocols/a2a'];

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function urlEntry(base, path, { priority = '0.7', changefreq = 'weekly' } = {}) {
  return `  <url><loc>${xmlEscape(base + path)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export async function onRequestGet({ env }) {
  const base = 'https://bazaar.saylorinnovations.com';
  const urls = new Map();
  for (const p of STATIC_PATHS) urls.set(p, { priority: p === '/' ? '1.0' : '0.8', changefreq: 'weekly' });
  for (const g of guideSummaries()) urls.set(`/guides/${g.slug}`, { priority: '0.7', changefreq: 'monthly' });
  urls.set('/discovery/saylor', { priority: '0.9', changefreq: 'daily' });

  try {
    const { results: providers } = await env.DB.prepare("SELECT host FROM listings ORDER BY host").all();
    for (const p of providers) urls.set(`/providers/${p.host}`, { priority: '0.6', changefreq: 'weekly' });

    const { results: categories } = await env.DB
      .prepare("SELECT DISTINCT resource_type FROM resources WHERE resource_type IS NOT NULL AND resource_type != ''")
      .all();
    for (const c of categories) urls.set(`/categories/${encodeURIComponent(c.resource_type)}`, { priority: '0.5', changefreq: 'weekly' });

    const { results: networks } = await env.DB.prepare('SELECT DISTINCT network FROM resource_accepts').all();
    for (const n of networks) urls.set(`/networks/${encodeURIComponent(n.network)}`, { priority: '0.5', changefreq: 'weekly' });

    const { results: verified } = await env.DB
      .prepare(
        `SELECT r.slug, r.id FROM resources r JOIN listings l ON l.host = r.listing_host WHERE l.source = 'submitted' ORDER BY r.id`
      )
      .all();
    for (const r of verified) urls.set(`/resources/${r.slug || r.id}`, { priority: '0.8', changefreq: 'weekly' });

    const { results: agents } = await env.DB.prepare('SELECT slug, id FROM agent_cards ORDER BY id').all();
    for (const a of agents) urls.set(`/agents/${a.slug || a.id}`, { priority: '0.6', changefreq: 'weekly' });
  } catch {
    const official = await fallbackSaylorOfficial({ limit: 100 });
    urls.set('/providers/saylorinnovations.com', { priority: '0.8', changefreq: 'daily' });
    for (const r of official.resources) urls.set(`/resources/${r.slug}`, { priority: '0.8', changefreq: 'daily' });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls.entries()].map(([u, opts]) => urlEntry(base, u, opts)).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'content-type': 'application/xml' } });
}

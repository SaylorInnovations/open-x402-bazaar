import { listCategories } from '../../src/db.js';
import { pageShell, escapeHtml, crumbs, empty, fmtNum, SITE } from '../../src/layout.js';
import { withEdgeCache } from '../../src/edgeCache.js';

const CORS = { 'access-control-allow-origin': '*' };

async function render(env) {
  let categories;
  try {
    categories = await listCategories(env);
  } catch {
    return { response: new Response('Catalog temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } }), cacheable: false };
  }

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Categories', '/categories']])}
  <h1>Browse by category</h1>
  <p class="lede">Resource types are set by providers at listing time, so coverage grows as more of the catalog is explicitly typed — the Coinbase-mirrored bulk of the catalog isn't yet. Every category shown here has at least one real, currently-listed resource.</p>
</div>
<div class="wrap">
  ${categories.length
    ? `<div class="tiles">${categories.map((c) => `<a class="tile" href="/categories/${encodeURIComponent(c.resource_type)}"><b>${escapeHtml(c.resource_type)}</b><span>${fmtNum(c.count)} listing${c.count === 1 ? '' : 's'}</span></a>`).join('')}</div>`
    : empty('No typed categories yet', 'Providers set a type when they list a resource.')}
</div>`;

  const html = pageShell({
    title: 'Categories — Agent Bazaar',
    description: 'Browse the Agent Bazaar marketplace by resource category — APIs, blockchain data, and more.',
    canonical: `${SITE}/categories`,
    bodyHtml: body,
    path: '/categories',
  });
  return { response: new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } }), cacheable: true };
}

export async function onRequestGet(context) {
  return withEdgeCache(context, 900, () => render(context.env));
}

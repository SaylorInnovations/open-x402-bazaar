import { resourcesByCategory } from '../../src/db.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

function card(r) {
  const price = r.accepts?.[0]?.amountUsd ? `$${r.accepts[0].amountUsd}` : r.accepts?.[0]?.amount || '—';
  return `
<div class="card">
  <h3><a href="/resources/${escapeHtml(r.slug)}">${escapeHtml((r.description || r.resource).split('.')[0].slice(0, 70))}</a></h3>
  <p class="desc">${escapeHtml(r.description || r.resource)}</p>
  <div class="meta-row">
    ${r.verified ? '<span class="badge badge-verified">verified</span>' : ''}
    <span class="badge badge-protocol">x402</span>
  </div>
  <div class="price">${escapeHtml(price)} / request</div>
</div>`;
}

export async function onRequestGet({ params, env, request }) {
  const raw = decodeURIComponent(params.category);
  const isJson = raw.endsWith('.json');
  const category = isJson ? raw.slice(0, -5) : raw;
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get('offset')) || 0;
  // JSON callers get a much higher default limit — the whole point is letting an
  // agent fetch an entire small collection (e.g. a 26-guide library) in one request
  // instead of walking cards one at a time. HTML keeps the smaller paginated default.
  const limitParam = isJson ? url.searchParams.get('limit') || 100 : 24;
  const { resources, total, limit } = await resourcesByCategory(env, category, { limit: limitParam, offset });

  if (total === 0) {
    return new Response(isJson ? JSON.stringify({ error: 'no resources in this category' }) : '<h1>404 — no resources in this category</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': isJson ? 'application/json' : 'text/html' },
    });
  }

  if (isJson) {
    return new Response(JSON.stringify({ x402Version: 2, category, total, limit, offset, resources }, null, 2), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const nextOffset = offset + limit;
  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/categories">Categories</a> / ${escapeHtml(category)}</nav>
  <h1>${escapeHtml(category)}</h1>
  <p style="color:var(--silver);">${total} resource${total === 1 ? '' : 's'} in this category. Machine-readable: <a href="/categories/${encodeURIComponent(category)}.json?limit=100"><code>/categories/${escapeHtml(category)}.json</code></a> returns the whole collection as one JSON array.</p>
  <div class="grid-cards" style="margin-top:22px;">${resources.map(card).join('')}</div>
  ${nextOffset < total ? `<p style="margin-top:24px;"><a class="btn btn-ghost btn-sm" href="/categories/${encodeURIComponent(category)}?offset=${nextOffset}">Next page</a></p>` : ''}
</main>`;

  const html = pageShell({
    title: `${category} APIs and resources — Agent Bazaar`,
    description: `${total} ${category} resource${total === 1 ? '' : 's'} agents can discover and pay for on Agent Bazaar.`,
    canonical: `https://bazaar.saylorinnovations.com/categories/${encodeURIComponent(category)}`,
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

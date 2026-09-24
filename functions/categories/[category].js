import { resourcesByCategory } from '../../src/db.js';
import { pageShell, escapeHtml, card, crumbs, fmtNum, SITE } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

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
  const base = `/categories/${encodeURIComponent(category)}`;
  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Categories', '/categories'], [category, base]])}
  <h1>${escapeHtml(category)}</h1>
  <p class="lede">${fmtNum(total)} resource${total === 1 ? '' : 's'} in this category.</p>
  <p class="small mono muted"><a href="${base}.json?limit=100">JSON</a> — the whole collection as one array.</p>
</div>
<div class="wrap">
  <div class="grid g3">${resources.map(card).join('')}</div>
  ${offset > 0 || nextOffset < total ? `<nav class="pager" aria-label="Pagination">${offset > 0 ? `<a href="${base}?offset=${Math.max(offset - limit, 0)}" rel="prev">← Prev</a>` : ''}<span aria-current="page">${Math.floor(offset / limit) + 1}</span>${nextOffset < total ? `<a href="${base}?offset=${nextOffset}" rel="next">Next →</a>` : ''}</nav>` : ''}
</div>`;

  const html = pageShell({
    title: `${category} APIs and resources — Agent Bazaar`,
    description: `${total} ${category} resource${total === 1 ? '' : 's'} agents can discover and pay for on Agent Bazaar.`,
    canonical: `${SITE}${base}`,
    bodyHtml: body,
    path: '/categories',
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

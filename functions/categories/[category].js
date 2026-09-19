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
  const category = decodeURIComponent(params.category);
  const offset = Number(new URL(request.url).searchParams.get('offset')) || 0;
  const { resources, total, limit } = await resourcesByCategory(env, category, { limit: 24, offset });

  if (total === 0) {
    return new Response('<h1>404 — no resources in this category</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': 'text/html' },
    });
  }

  const nextOffset = offset + limit;
  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/categories">Categories</a> / ${escapeHtml(category)}</nav>
  <h1>${escapeHtml(category)}</h1>
  <p style="color:var(--silver);">${total} resource${total === 1 ? '' : 's'} in this category.</p>
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

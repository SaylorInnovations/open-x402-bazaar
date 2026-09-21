import { resourcesByNetwork } from '../../src/db.js';
import { pageShell, escapeHtml, priceOf } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

function card(r) {
  const price = priceOf(r.accepts);
  return `
<div class="card">
  <h3><a href="/resources/${escapeHtml(r.slug)}">${escapeHtml((r.description || r.resource).split('.')[0].slice(0, 70))}</a></h3>
  <p class="desc">${escapeHtml(r.description || r.resource)}</p>
  <div class="meta-row">
    ${r.verified ? '<span class="badge badge-verified">verified</span>' : ''}
    ${r.resourceType ? `<span class="badge">${escapeHtml(r.resourceType)}</span>` : ''}
  </div>
  <div class="price">${escapeHtml(price)} / request</div>
</div>`;
}

export async function onRequestGet({ params, env, request }) {
  const network = decodeURIComponent(params.network);
  const offset = Number(new URL(request.url).searchParams.get('offset')) || 0;
  const { resources, total, limit } = await resourcesByNetwork(env, network, { limit: 24, offset });

  if (total === 0) {
    return new Response('<h1>404 — no resources on this network</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': 'text/html' },
    });
  }

  const nextOffset = offset + limit;
  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/networks">Networks</a> / ${escapeHtml(network)}</nav>
  <h1><code>${escapeHtml(network)}</code></h1>
  <p style="color:var(--silver);">${total} resource${total === 1 ? '' : 's'} accept payment on this network.</p>
  <div class="grid-cards" style="margin-top:22px;">${resources.map(card).join('')}</div>
  ${nextOffset < total ? `<p style="margin-top:24px;"><a class="btn btn-ghost btn-sm" href="/networks/${encodeURIComponent(network)}?offset=${nextOffset}">Next page</a></p>` : ''}
</main>`;

  const html = pageShell({
    title: `${network} — machine-payable resources on Agent Bazaar`,
    description: `${total} x402 resource${total === 1 ? '' : 's'} accepting payment on ${network}.`,
    canonical: `https://bazaar.saylorinnovations.com/networks/${encodeURIComponent(network)}`,
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

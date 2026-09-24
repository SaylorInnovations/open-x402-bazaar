import { resourcesByNetwork } from '../../src/db.js';
import { pageShell, escapeHtml, card, crumbs, networkLabel, fmtNum, SITE } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ params, env, request }) {
  const network = decodeURIComponent(params.network);
  const offset = Number(new URL(request.url).searchParams.get('offset')) || 0;
  const { resources, total, limit } = await resourcesByNetwork(env, network, { limit: 24, offset });

  if (total === 0) {
    return new Response('<h1>404 — no resources on this network</h1>', { status: 404, headers: { ...CORS, 'content-type': 'text/html' } });
  }

  const name = networkLabel(network);
  const nextOffset = offset + limit;
  const base = `/networks/${encodeURIComponent(network)}`;
  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Networks', '/networks'], [name, base]])}
  <h1>${escapeHtml(name)}</h1>
  <p class="lede">${fmtNum(total)} resource${total === 1 ? '' : 's'} accept payment on this network. <span class="mono small">${escapeHtml(network)}</span></p>
</div>
<div class="wrap">
  <div class="grid g3">${resources.map(card).join('')}</div>
  ${offset > 0 || nextOffset < total ? `<nav class="pager" aria-label="Pagination">${offset > 0 ? `<a href="${base}?offset=${Math.max(offset - limit, 0)}" rel="prev">← Prev</a>` : ''}<span aria-current="page">${Math.floor(offset / limit) + 1}</span>${nextOffset < total ? `<a href="${base}?offset=${nextOffset}" rel="next">Next →</a>` : ''}</nav>` : ''}
</div>`;

  const html = pageShell({
    title: `${name} — machine-payable resources on Agent Bazaar`,
    description: `${total} x402 resource${total === 1 ? '' : 's'} accepting payment on ${name}.`,
    canonical: `${SITE}${base}`,
    bodyHtml: body,
    path: '/networks',
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

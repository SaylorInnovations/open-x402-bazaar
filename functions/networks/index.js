import { listNetworks } from '../../src/db.js';
import { pageShell, escapeHtml, crumbs, networkLabel, fmtNum, SITE } from '../../src/layout.js';
import { withEdgeCache } from '../../src/edgeCache.js';

const CORS = { 'access-control-allow-origin': '*' };

async function render(env) {
  let networks;
  try {
    networks = await listNetworks(env);
  } catch {
    return { response: new Response('Catalog temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } }), cacheable: false };
  }

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Networks', '/networks']])}
  <h1>Browse by network</h1>
  <p class="lede">Every network a listed resource accepts payment on, identified by its CAIP-2 chain id (for example <code>eip155:8453</code> is Base and <code>solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp</code> is Solana mainnet).</p>
</div>
<div class="wrap">
  <div class="tiles">${networks
    .map((n) => {
      const name = networkLabel(n.network);
      return `<a class="tile" href="/networks/${encodeURIComponent(n.network)}"><b>${escapeHtml(name)}</b><span>${fmtNum(n.count)} resource${n.count === 1 ? '' : 's'}${name !== n.network ? ` · <code>${escapeHtml(n.network.slice(0, 26))}</code>` : ''}</span></a>`;
    })
    .join('')}</div>
</div>`;

  const html = pageShell({
    title: 'Networks — Agent Bazaar',
    description: 'Every blockchain network with x402-payable resources listed on Agent Bazaar.',
    canonical: `${SITE}/networks`,
    bodyHtml: body,
    path: '/networks',
  });
  return { response: new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } }), cacheable: true };
}

export async function onRequestGet(context) {
  return withEdgeCache(context, 900, () => render(context.env));
}

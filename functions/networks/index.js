import { listNetworks } from '../../src/db.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ env }) {
  const networks = await listNetworks(env);

  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / Networks</nav>
  <h1>Browse by Network</h1>
  <p style="color:var(--silver);max-width:680px;">Every network a listed resource accepts payment on, identified by its CAIP-2 chain id (e.g. <code>eip155:8453</code> is Base, <code>solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp</code> is Solana mainnet).</p>
  <div class="grid-cards" style="margin-top:26px;">
    ${networks
      .map(
        (n) => `<div class="card"><h3><a href="/networks/${encodeURIComponent(n.network)}"><code>${escapeHtml(n.network)}</code></a></h3><p class="desc">${n.count} resource${n.count === 1 ? '' : 's'}</p></div>`
      )
      .join('')}
  </div>
</main>`;

  const html = pageShell({
    title: 'Networks — Agent Bazaar',
    description: 'Every blockchain network with x402-payable resources listed on Agent Bazaar.',
    canonical: 'https://bazaar.saylorinnovations.com/networks',
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

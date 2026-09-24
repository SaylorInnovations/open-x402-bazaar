import { fetchInsights } from '../../src/insights.js';
import { pageShell, escapeHtml, crumbs, empty, fmtNum, SITE } from '../../src/layout.js';
import { withEdgeCache } from '../../src/edgeCache.js';

const CORS = { 'access-control-allow-origin': '*' };
const usd = (v) => (v === null || v === undefined ? '—' : '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(v < 1 ? 3 : 2)));

async function render() {
  let d;
  try {
    d = await fetchInsights();
  } catch {
    return { response: new Response('Insights temporarily unavailable', { status: 503, headers: { 'retry-after': '120' } }), cacheable: false };
  }
  const t = d.totals || {};
  const best = (d.bestsellers || []).map((r) => `<li><div><a href="${escapeHtml(r.resource)}" rel="nofollow noopener">${escapeHtml(r.resource.replace(/^https?:\/\//, '').slice(0, 70))}</a><span class="sub">${escapeHtml(r.category)} · ${fmtNum(r.payers_30d)} paying agents</span></div><span class="p">${escapeHtml(usd(r.price_usd))}</span></li>`).join('');
  const cats = (d.categories || []).map((c) => `<li><div><b>${escapeHtml(c.category)}</b><span class="sub">${fmtNum(c.resources_with_real_demand)} resources with real demand · ${fmtNum(c.sellers_with_real_demand)} sellers</span></div><span class="p">${fmtNum(c.payers_30d)}</span></li>`).join('');

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Insights', '/insights']])}
  <h1>What agents actually pay for</h1>
  <p class="lede">Live demand across the x402 economy, from Coinbase's own 30-day usage counts for every listed resource. "Real demand" means 20 or more unique paying agents — most listings have one or two, usually the seller testing. Updated ${escapeHtml(new Date(d.generated_at).toUTCString())}.</p>
</div>
<section class="section-tight">
  <div class="wrap">
    <div class="stats" role="list" aria-label="x402 market totals">
      <div class="stat" role="listitem"><b>${fmtNum(t.resources)}</b><span>Resources listed</span></div>
      <div class="stat" role="listitem"><b>${fmtNum(t.with_real_demand)}</b><span>With real demand</span></div>
      <div class="stat" role="listitem"><b>${fmtNum(t.calls_30d)}</b><span>Paid calls / 30d</span></div>
      <div class="stat" role="listitem" title="Calls x lowest USD-stablecoin price per resource"><b>${escapeHtml(usd(t.est_revenue_30d_usd))}</b><span>Est. revenue / 30d</span></div>
    </div>
  </div>
</section>
<section class="section-tight">
  <div class="wrap">
    <div class="grid g2">
      <div>
        <div class="spread"><h2>Bestsellers</h2><a class="link-arrow" href="/discovery/insights">JSON</a></div>
        <p class="small muted">Ranked by unique paying agents in the last 30 days.</p>
        <div class="shelf">${best ? `<ul class="rows">${best}</ul>` : empty('No data yet', 'Check back shortly.')}</div>
      </div>
      <div>
        <div class="spread"><h2>Demand by category</h2></div>
        <p class="small muted">Paying agents per category, and how many sellers actually have buyers. Few sellers with many buyers is where to build.</p>
        <div class="shelf">${cats ? `<ul class="rows">${cats}</ul>` : ''}</div>
      </div>
    </div>
    <p class="small muted" style="margin-top:24px">${escapeHtml(d.note || '')} Full lists, filters, demand-vs-supply scores and revenue estimates for agents: <a href="https://saylorinnovations.com/api/market/categories">saylorinnovations.com/api/market</a> (x402, $0.005).</p>
  </div>
</section>`;

  const html = pageShell({
    title: 'x402 Market Insights — Agent Bazaar',
    description: 'What AI agents actually pay for across the x402 economy: bestsellers, demand by category, and where supply is thin. Free and open.',
    canonical: `${SITE}/insights`,
    bodyHtml: body,
    path: '/insights',
  });
  return { response: new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } }), cacheable: true };
}

export async function onRequestGet(context) {
  return withEdgeCache(context, 3600, render);
}

import { getProvider } from '../../src/db.js';
import { pageShell, escapeHtml, card, crumbs, fmtNum, fmtDate, SITE } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ params, env }) {
  const host = params.host;
  const data = await getProvider(env, host);
  if (!data) {
    return new Response('<h1>404 — provider not found</h1>', { status: 404, headers: { ...CORS, 'content-type': 'text/html' } });
  }

  const { provider, resources } = data;
  const verified = provider.source === 'submitted';
  const name = provider.manifest_name || host;
  const payTo = resources[0]?.accepts?.[0]?.payTo || '';

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Providers', '/#explore'], [name, `/providers/${host}`]])}
  <div class="row small mono muted">${verified ? '<span class="v"><span class="vdot passed"></span>verified provider</span>' : '<span class="v"><span class="vdot not-checked"></span>mirrored, unclaimed</span>'}</div>
  <h1>${escapeHtml(name)}</h1>
  <p class="lede">${fmtNum(resources.length)} resource${resources.length === 1 ? '' : 's'} listed under <code>${escapeHtml(host)}</code>.</p>
  <p class="small muted">Source: <a href="${escapeHtml(provider.source_manifest_url)}">${escapeHtml(provider.source_manifest_url)}</a> · last updated ${escapeHtml(fmtDate(provider.submitted_at))}</p>
</div>
<div class="wrap">
  ${!verified ? `
  <div class="panel">
    <h3>Do you run ${escapeHtml(host)}?</h3>
    <p class="small">These ${fmtNum(resources.length)} resource${resources.length === 1 ? ' was' : 's were'} mirrored from Coinbase's public Bazaar. Claim them all at once by submitting your own manifest — no account required, and it always overrides the mirrored copy.</p>
    <a href="/publish" class="btn btn-primary btn-sm">Claim this provider</a>
  </div><br>` : ''}
  <div class="grid g3">${resources.map(card).join('')}</div>
  <br>
  <div class="panel">
    <h3>Machine-readable</h3>
    <p class="small">All resources from this provider: ${payTo ? `<a href="/discovery/merchant?payTo=${escapeHtml(payTo)}"><code>/discovery/merchant</code></a> (by payment address) or ` : ''}filter <a href="/discovery/resources"><code>/discovery/resources</code></a>.</p>
  </div>
</div>`;

  const html = pageShell({
    title: `${name} — Agent Bazaar`,
    description: `${resources.length} x402 resources listed by ${name} on Agent Bazaar.`,
    canonical: `${SITE}/providers/${host}`,
    bodyHtml: body,
    jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name, url: `https://${host}` },
  });

  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

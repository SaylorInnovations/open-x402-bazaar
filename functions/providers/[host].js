import { getProvider } from '../../src/db.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

function card(r) {
  const price = r.accepts?.[0]?.amountUsd ? `$${r.accepts[0].amountUsd}` : r.accepts?.[0]?.amount || '—';
  return `
<div class="card">
  <h3><a href="/resources/${escapeHtml(r.slug)}">${escapeHtml((r.description || r.resource).split('.')[0].slice(0, 70))}</a></h3>
  <p class="desc">${escapeHtml(r.description || r.resource)}</p>
  <div class="meta-row">
    ${r.featured ? '<span class="badge badge-featured">featured</span>' : ''}
    ${r.liveness?.isLive === false ? '<span class="badge badge-down">not responding</span>' : ''}
    ${r.liveness?.reliability ? `<span class="badge badge-reliability">${r.liveness.reliability.live}/${r.liveness.reliability.checks} uptime</span>` : ''}
    ${r.resourceType ? `<span class="badge">${escapeHtml(r.resourceType)}</span>` : ''}
    <span class="badge badge-protocol">x402</span>
  </div>
  <div class="price">${escapeHtml(price)} / request</div>
</div>`;
}

export async function onRequestGet({ params, env }) {
  const host = params.host;
  const data = await getProvider(env, host);
  if (!data) {
    return new Response('<h1>404 — provider not found</h1>', { status: 404, headers: { ...CORS, 'content-type': 'text/html' } });
  }

  const { provider, resources } = data;
  const verified = provider.source === 'submitted';

  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/#explore">Providers</a></nav>
  <div class="meta-row" style="margin-bottom:10px;">
    ${verified ? '<span class="badge badge-verified">verified owner</span>' : '<span class="badge badge-mirror">mirrored, unclaimed</span>'}
  </div>
  <h1>${escapeHtml(provider.manifest_name || host)}</h1>
  <p style="color:var(--silver);">${resources.length} resource${resources.length === 1 ? '' : 's'} listed under <code>${escapeHtml(host)}</code>.</p>
  <p style="color:var(--silver-soft);font-size:0.88rem;">Source: <a href="${escapeHtml(provider.source_manifest_url)}">${escapeHtml(provider.source_manifest_url)}</a> &middot; last updated ${escapeHtml((provider.submitted_at || '').slice(0, 10))}</p>

  ${!verified ? `
  <div class="claim-banner">
    <p>Do you run <strong>${escapeHtml(host)}</strong>? These ${resources.length} resource${resources.length === 1 ? '' : 's'} were mirrored from Coinbase's public Bazaar.
      <span>Claim them all at once by submitting your own manifest — no account required, and it always overrides the mirrored copy.</span>
    </p>
    <a href="/publish" class="btn btn-primary btn-sm">Claim this provider</a>
  </div>` : ''}

  <section class="block">
    <h2>Resources</h2>
    <div class="grid-cards">
      ${resources.map(card).join('')}
    </div>
  </section>

  <section class="block">
    <h2>Machine-readable</h2>
    <p>All resources from this provider: <a href="/discovery/merchant?payTo=${escapeHtml(resources[0]?.accepts?.[0]?.payTo || '')}"><code>/discovery/merchant</code></a> (by payment address) or filter <a href="/discovery/resources"><code>/discovery/resources</code></a>.</p>
  </section>
</main>`;

  const html = pageShell({
    title: `${provider.manifest_name || host} — Agent Bazaar`,
    description: `${resources.length} x402 resources listed by ${provider.manifest_name || host} on Agent Bazaar.`,
    canonical: `https://bazaar.saylorinnovations.com/providers/${host}`,
    bodyHtml: body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: provider.manifest_name || host,
      url: `https://${host}`,
    },
  });

  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

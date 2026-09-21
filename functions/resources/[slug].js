import { getResourceBySlugOrId } from '../../src/db.js';
import { pageShell, escapeHtml, priceOf } from '../../src/layout.js';
import { exampleFromSchema } from '../../src/schemaExample.js';

const CORS = { 'access-control-allow-origin': '*' };

function curlExample(r) {
  return `curl "${r.resource}"\n# -> 402 Payment Required, accepts[] lists how to pay\n# retry with a PAYMENT-SIGNATURE (or PAYMENT header) once paid`;
}

function jsExample(r) {
  return `const res = await fetch("${r.resource}");
if (res.status === 402) {
  const { accepts } = await res.json();
  // pay one of accepts[] via an x402 client, then retry with the payment header
}`;
}

function pyExample(r) {
  return `import httpx
res = httpx.get("${r.resource}")
if res.status_code == 402:
    accepts = res.json()["accepts"]
    # pay one of accepts[] via an x402 client, then retry with the payment header`;
}

function renderHtml(r) {
  const price = priceOf(r.accepts);
  const networks = [...new Set((r.accepts || []).map((a) => a.network))];
  const verified = r.provider?.source === 'submitted';
  const meta = r.metadata || {};
  const isDown = r.liveness?.isLive === false;
  const reliability = r.liveness?.reliability;

  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/#explore">Resources</a> / ${escapeHtml(r.resourceType || 'Resource')}</nav>
  <div class="meta-row" style="margin-bottom:14px;">
    ${r.featured ? '<span class="badge badge-featured">featured</span>' : ''}
    ${verified ? '<span class="badge badge-verified">verified owner</span>' : '<span class="badge badge-mirror">mirrored listing</span>'}
    ${isDown ? '<span class="badge badge-down">not responding</span>' : ''}
    ${reliability ? `<span class="badge badge-reliability">${reliability.live}/${reliability.checks} uptime</span>` : ''}
    ${r.resourceType ? `<span class="badge">${escapeHtml(r.resourceType)}</span>` : ''}
    <span class="badge badge-protocol">x402</span>
    ${networks.map((n) => `<span class="badge badge-network">${escapeHtml(n)}</span>`).join('')}
  </div>
  ${isDown ? `<p style="color:var(--red);font-size:0.86rem;">This endpoint did not respond on its last liveness check (${escapeHtml((r.liveness.lastCheckedAt || '').slice(0, 10))}). It may be temporarily down.</p>` : ''}
  <h1>${escapeHtml(r.description ? r.description.split('.')[0].slice(0, 90) : r.resource)}</h1>
  <p style="color:var(--silver);max-width:680px;">${escapeHtml(r.description || 'No description provided.')}</p>

  ${!verified ? `
  <div class="claim-banner">
    <p>Do you run <strong>${escapeHtml(r.sourceHost)}</strong>? This listing was mirrored from Coinbase's public Bazaar.
      <span>Claim it in 30 seconds — no account required — and it becomes verified, permanently overriding the mirrored copy.</span>
    </p>
    <a href="/publish" class="btn btn-primary btn-sm">Claim this listing</a>
  </div>` : ''}

  <div class="stats-strip" style="margin:28px 0;">
    <div class="stat"><div class="n">${escapeHtml(price)}</div><div class="l">price</div></div>
    <div class="stat"><div class="n">${r.quality?.calls30d ?? '—'}</div><div class="l">calls / 30d</div></div>
    <div class="stat"><div class="n">${r.quality?.uniquePayers30d ?? '—'}</div><div class="l">unique payers</div></div>
    <div class="stat"><div class="n">${escapeHtml((r.lastUpdated || '').slice(0, 10) || '—')}</div><div class="l">updated</div></div>
  </div>

  ${!r.featured ? `
  <div class="claim-banner">
    <p>Want this in the homepage's <strong>Featured Resources</strong> row?
      <span>Paid placement, from $2 / 7 days — paid directly to Agent Bazaar via x402, never a cut of this resource's own accepts[].</span>
    </p>
    <a href="/publish#feature" class="btn btn-ghost btn-sm">Feature this listing</a>
  </div>` : ''}

  <section class="block" style="border-top:none;padding-top:0;">
    <h2>Provider</h2>
    <p><a href="/providers/${escapeHtml(r.sourceHost)}">${escapeHtml(r.provider?.manifest_name || r.sourceHost)}</a> ${verified ? '&middot; verified' : '&middot; discovered, not yet claimed by its owner'}</p>
  </section>

  ${meta.capabilities || meta.useWhen || meta.doNotUseWhen ? `
  <section class="block">
    <h2>For agents</h2>
    <dl class="kv">
      ${meta.capabilities ? `<dt>Capabilities</dt><dd>${escapeHtml(Array.isArray(meta.capabilities) ? meta.capabilities.join(', ') : meta.capabilities)}</dd>` : ''}
      ${meta.useWhen ? `<dt>Use when</dt><dd>${escapeHtml(meta.useWhen)}</dd>` : ''}
      ${meta.doNotUseWhen ? `<dt>Do not use when</dt><dd>${escapeHtml(meta.doNotUseWhen)}</dd>` : ''}
      ${meta.sideEffects ? `<dt>Side effects</dt><dd>${escapeHtml(meta.sideEffects)}</dd>` : ''}
      ${meta.license ? `<dt>License</dt><dd>${escapeHtml(meta.license)}</dd>` : ''}
      ${meta.repository ? `<dt>Repository</dt><dd><a href="${escapeHtml(meta.repository)}">${escapeHtml(meta.repository)}</a></dd>` : ''}
    </dl>
  </section>` : ''}

  <section class="block">
    <h2>Payment (x402 accepts[])</h2>
    <div class="codeblock"><pre>${escapeHtml(JSON.stringify(r.accepts, null, 2))}</pre></div>
  </section>

  ${r.outputSchema ? `
  <section class="block">
    <h2>Output schema</h2>
    <div class="codeblock"><pre>${escapeHtml(JSON.stringify(r.outputSchema, null, 2))}</pre></div>
    <h3 style="font-size:0.9rem;color:var(--silver-soft);margin-top:18px;">Example shape (generated from the schema above — not a captured live response)</h3>
    <div class="codeblock"><pre>${escapeHtml(JSON.stringify(exampleFromSchema(r.outputSchema), null, 2))}</pre></div>
  </section>` : ''}

  <section class="block">
    <h2>Use it</h2>
    <h3 style="font-size:0.9rem;color:var(--silver-soft);">curl</h3>
    <div class="codeblock"><pre>${escapeHtml(curlExample(r))}</pre></div>
    <h3 style="font-size:0.9rem;color:var(--silver-soft);margin-top:18px;">JavaScript</h3>
    <div class="codeblock"><pre>${escapeHtml(jsExample(r))}</pre></div>
    <h3 style="font-size:0.9rem;color:var(--silver-soft);margin-top:18px;">Python</h3>
    <div class="codeblock"><pre>${escapeHtml(pyExample(r))}</pre></div>
  </section>

  <section class="block">
    <h2>Machine-readable</h2>
    <p>Everything on this page is also available as clean JSON at <a href="/resources/${escapeHtml(r.slug)}.json"><code>/resources/${escapeHtml(r.slug)}.json</code></a>, and this resource appears in <a href="/discovery/resources"><code>/discovery/resources</code></a> and <a href="/discovery/search"><code>/discovery/search</code></a>.</p>
  </section>
</main>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: r.description ? r.description.split('.')[0].slice(0, 90) : r.resource,
    description: r.description || undefined,
    provider: { '@type': 'Organization', name: r.provider?.manifest_name || r.sourceHost },
    offers: (r.accepts || []).map((a) => ({
      '@type': 'Offer',
      price: a.amountUsd ?? undefined,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })),
  };

  return pageShell({
    title: `${r.description ? r.description.split('.')[0].slice(0, 60) : r.resource} — Agent Bazaar`,
    description: (r.description || r.resource).slice(0, 155),
    canonical: `https://bazaar.saylorinnovations.com/resources/${r.slug}`,
    bodyHtml: body,
    jsonLd,
  });
}

export async function onRequestGet({ params, env }) {
  const raw = params.slug;
  const isJson = raw.endsWith('.json');
  const key = isJson ? raw.slice(0, -5) : raw;

  const resource = await getResourceBySlugOrId(env, key);
  if (!resource) {
    return new Response(isJson ? JSON.stringify({ error: 'not found' }) : '<h1>404 — resource not found</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': isJson ? 'application/json' : 'text/html' },
    });
  }

  if (isJson) {
    const exampleResponse = resource.outputSchema ? exampleFromSchema(resource.outputSchema) : undefined;
    return new Response(JSON.stringify({ x402Version: 2, ...resource, exampleResponse }, null, 2), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  return new Response(renderHtml(resource), { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

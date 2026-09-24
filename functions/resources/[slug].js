import { getResourceBySlugOrId } from '../../src/db.js';
import { pageShell, escapeHtml, priceParts, crumbs, resName, resSummary, typeLabel, uniqueNetworks, assetSymbols, networkLabel, fmtNum, fmtDate, SITE } from '../../src/layout.js';
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

function codeBox(id, label, body) {
  return `<div class="codebox"><div class="codebox-head"><span>${escapeHtml(label)}</span><button class="copy" type="button" data-copy-target="${id}">Copy</button></div><pre id="${id}"><code>${escapeHtml(body)}</code></pre></div>`;
}

function renderHtml(r) {
  const price = priceParts(r.accepts);
  const nets = uniqueNetworks(r.accepts);
  const syms = assetSymbols(r.accepts);
  const verified = r.provider?.source === 'submitted';
  const meta = r.metadata || {};
  const isDown = r.liveness?.isLive === false;
  const reliability = r.liveness?.reliability;
  const name = resName(r);
  const providerName = r.provider?.manifest_name || r.sourceHost;
  const slug = escapeHtml(r.slug);

  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const checks = (items) => `<ul class="list-check">${items.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
  const rowsHtml = (r.accepts || [])
    .map((a) => `<tr><td>${escapeHtml(a.scheme || '—')}</td><td>${escapeHtml(networkLabel(a.network))}<br><span class="mono xs muted">${escapeHtml(a.network)}</span></td><td>${escapeHtml(assetSymbols([a])[0] || a.asset || '—')}</td><td>${escapeHtml(a.amountUsd != null ? `$${a.amountUsd}` : a.amount || '—')}</td><td class="mono xs">${escapeHtml(a.payTo)}</td><td>${escapeHtml(a.maxTimeoutSeconds ? a.maxTimeoutSeconds + 's' : '—')}</td></tr>`)
    .join('');

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Explore', '/search'], [name, `/resources/${r.slug}`]])}
  <div class="row small mono muted">${escapeHtml(typeLabel(r))} · <span class="badge b-x402">x402</span> ${r.featured ? '· featured' : ''}</div>
  <h1>${escapeHtml(name)}</h1>
  <p class="lede">${escapeHtml(resSummary(r, 260))}</p>
  <p class="small">by <a href="/providers/${escapeHtml(r.sourceHost)}">${escapeHtml(providerName)}</a>${verified ? ' · <span class="mono xs">verified provider</span>' : ' · <span class="mono xs">discovered, not yet claimed by its owner</span>'} · updated ${escapeHtml(fmtDate(r.lastUpdated))}</p>
</div>

<div class="wrap detail">
  <div>
    ${isDown ? `<div class="warnbox" role="alert"><b>Not responding.</b> This endpoint did not answer its last liveness check (${escapeHtml(fmtDate(r.liveness.lastCheckedAt))}). It may be temporarily down.</div>` : ''}
    ${!verified ? `<p class="note">Mirrored from Coinbase's public x402 Bazaar. The description is the provider's own text and has not been reviewed here; the payment requirements are copied as published.</p>` : ''}

    <nav class="anchors" aria-label="On this page">
      <a href="#overview">Overview</a><a href="#use">Use with an agent</a><a href="#pricing">Pricing &amp; payment</a>${r.outputSchema ? '<a href="#schemas">Schemas</a>' : ''}<a href="#examples">Examples</a><a href="#details">Details</a>
    </nav>

    <section class="block" id="overview">
      <h2>What it does</h2>
      <p>${escapeHtml(r.description || 'No description provided.')}</p>
      ${list(meta.capabilities).length ? `<h3>Capabilities</h3>${checks(list(meta.capabilities))}` : ''}
      ${meta.useWhen || meta.doNotUseWhen ? `<div class="grid g2">
        ${meta.useWhen ? `<div><h3>Use it when</h3><ul class="list-check yes">${list(meta.useWhen).map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>` : ''}
        ${meta.doNotUseWhen ? `<div><h3>Don't use it when</h3><ul class="list-check no">${list(meta.doNotUseWhen).map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>` : ''}
      </div>` : ''}
      ${(r.tags || []).length ? `<p class="small muted mono">Tags: ${escapeHtml(r.tags.join(' · '))}</p>` : ''}
    </section>

    <section class="block" id="use">
      <h2>Use with an agent</h2>
      <ol class="list-check">
        <li><b>Discover.</b> Agents find this listing with <code>GET ${SITE}/discovery/search?query=…</code>, the MCP tool <code>search_resources</code>, or <code>/discovery/resources</code>.</li>
        <li><b>Inspect.</b> Fetch <a href="/resources/${slug}.json"><code>/resources/${slug}.json</code></a> for the price and payment options.</li>
        <li><b>Pay.</b> Call <code>GET ${escapeHtml(r.resource)}</code>. The provider answers <code>402</code> with its payment requirements. An x402 client signs one of the options below and retries with <code>PAYMENT-SIGNATURE</code>.</li>
        <li><b>Execute.</b> The provider returns <code>200</code> with the data. Agent Bazaar is not in the request path and never sees your payment.</li>
      </ol>
      <h3>For humans</h3>
      <p class="small">You don't need an account or an API key; you need a wallet holding a small amount of ${escapeHtml(syms.join(' or ') || 'the listed asset')} on ${escapeHtml(nets.join(', ') || 'a listed network')}, and an x402-capable client (see the examples below). Call the endpoint unpaid first to see exactly what it asks for.</p>
    </section>

    <section class="block" id="pricing">
      <h2>Pricing &amp; payment</h2>
      <dl class="kv">
        <dt>Price</dt><dd>${escapeHtml(price.main)}${price.unit ? ' ' + escapeHtml(price.unit) : ''}</dd>
        <dt>Protocol</dt><dd>x402 v${escapeHtml(r.x402Version || 2)}</dd>
        <dt>Auth</dt><dd>No account or API key. Pay per request.</dd>
        <dt>Networks</dt><dd>${escapeHtml(nets.join(', ') || '—')}</dd>
        ${reliability ? `<dt>Uptime</dt><dd>${reliability.live} of the last ${reliability.checks} checks answered</dd>` : ''}
        ${r.quality?.calls30d ? `<dt>Calls (30d)</dt><dd>${fmtNum(r.quality.calls30d)} · ${fmtNum(r.quality.uniquePayers30d)} unique payers <span class="muted xs">(third-party data from the public x402 Bazaar)</span></dd>` : ''}
      </dl>
      <h3>x402 payment requirements</h3>
      <div class="tscroll"><table><thead><tr><th>Scheme</th><th>Network</th><th>Asset</th><th>Amount</th><th>Pay to</th><th>Timeout</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
      <details class="schema"><summary>accepts[] (raw JSON)</summary><pre><code>${escapeHtml(JSON.stringify(r.accepts, null, 2))}</code></pre></details>
    </section>

    ${r.outputSchema ? `
    <section class="block" id="schemas">
      <h2>Schemas</h2>
      <details class="schema" open><summary>Output schema (JSON Schema)</summary><pre><code>${escapeHtml(JSON.stringify(r.outputSchema, null, 2))}</code></pre></details>
      <details class="schema"><summary>Example shape — generated from the schema, not a captured live response</summary><pre><code>${escapeHtml(JSON.stringify(exampleFromSchema(r.outputSchema), null, 2))}</code></pre></details>
    </section>` : ''}

    <section class="block" id="examples">
      <h2>Examples</h2>
      ${codeBox('ex-curl', 'curl', curlExample(r))}
      ${codeBox('ex-js', 'JavaScript', jsExample(r))}
      ${codeBox('ex-py', 'Python', pyExample(r))}
    </section>

    <section class="block" id="details">
      <h2>Details</h2>
      <dl class="kv">
        <dt>Provider</dt><dd><a href="/providers/${escapeHtml(r.sourceHost)}">${escapeHtml(providerName)}</a></dd>
        <dt>Endpoint</dt><dd class="mono xs">${escapeHtml(r.resource)}</dd>
        ${meta.sideEffects ? `<dt>Side effects</dt><dd>${escapeHtml(meta.sideEffects)}</dd>` : ''}
        ${meta.license ? `<dt>License</dt><dd>${escapeHtml(meta.license)}</dd>` : ''}
        ${meta.repository ? `<dt>Repository</dt><dd><a href="${escapeHtml(meta.repository)}" rel="noopener">${escapeHtml(meta.repository)}</a></dd>` : ''}
        ${meta.documentation ? `<dt>Documentation</dt><dd><a href="${escapeHtml(meta.documentation)}" rel="noopener">${escapeHtml(meta.documentation)}</a></dd>` : ''}
        <dt>Machine-readable</dt><dd><a href="/resources/${slug}.json"><code>/resources/${slug}.json</code></a></dd>
      </dl>
    </section>
  </div>

  <aside class="buybox" aria-label="Pricing summary">
    <div class="st">per request</div>
    <div class="price${price.free ? ' free' : ''}">${escapeHtml(price.main)}</div>
    <div class="row small">${nets.map((n) => `<span class="badge b-net">${escapeHtml(n)}</span>`).join(' ')}</div>
    ${!r.featured ? `<p class="small"><a href="/publish#feature">Feature this listing</a> — paid placement from $2 / 7 days, paid to Agent Bazaar directly, never a cut of this resource's own payments.</p>` : ''}
    ${!verified ? `<p class="small">Run <b>${escapeHtml(r.sourceHost)}</b>? <a href="/publish">Claim this listing</a> — no account, and it becomes verified.</p>` : ''}
  </aside>
</div>`;

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
    title: `${resName(r).slice(0, 60)} — Agent Bazaar`,
    description: (r.description || r.resource).slice(0, 155),
    canonical: `${SITE}/resources/${r.slug}`,
    bodyHtml: body,
    path: '/search',
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

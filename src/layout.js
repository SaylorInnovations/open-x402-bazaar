// Shared HTML shell + card helpers for server-rendered pages. The design system
// (public/assets/bazaar.css) is the Agent Bazaar / Saylor Innovations look: navy
// and gold, Sora + Manrope + JetBrains Mono. Static pages (agents, publish, docs,
// protocols, 404) hand-author the same header/footer markup directly since
// there is no build step to share components through — keep them in sync with
// header()/footer() below if you change either.

const SITE = 'https://bazaar.saylorinnovations.com';
const REPO = 'https://github.com/SaylorInnovations/open-x402-bazaar';
const PARENT = 'https://saylorinnovations.com';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Prefers the first accepts[] entry that actually has a USD price (not just
// whichever happens to be first — most resources list several networks and only
// some assets get a computed amountUsd, see computedAmountUsd() in src/db.js).
// Falls back to a comma-formatted raw amount, never a bare unformatted integer.
function priceOf(accepts) {
  const list = accepts || [];
  if (!list.length) return 'see accepts[]';
  const priced = list.find((a) => a.amountUsd);
  if (priced) return `$${priced.amountUsd}`;
  const a = list[0];
  return a.amount ? `${Number(a.amount).toLocaleString()} raw units` : 'free';
}

const NETWORK_NAMES = {
  'eip155:8453': 'Base',
  'eip155:84532': 'Base Sepolia',
  'eip155:137': 'Polygon',
  'eip155:42161': 'Arbitrum One',
  'eip155:10': 'Optimism',
  'eip155:1': 'Ethereum',
  'eip155:43114': 'Avalanche',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'Solana',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'Solana Devnet',
  solana: 'Solana',
  base: 'Base',
  'base-sepolia': 'Base Sepolia',
  polygon: 'Polygon',
  'solana-devnet': 'Solana Devnet',
};

// Stablecoin contracts / mints the catalog sees most. Anything else shows an
// em dash rather than a raw address.
const ASSET_SYMBOLS = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'USDC',
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e': 'USDC',
  epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v: 'USDC',
  es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb: 'USDT',
  so11111111111111111111111111111111111111112: 'SOL',
};

function networkLabel(n) {
  return NETWORK_NAMES[n] || NETWORK_NAMES[String(n).toLowerCase()] || String(n);
}

function uniqueNetworks(accepts) {
  return [...new Set((accepts || []).map((a) => networkLabel(a.network)).filter(Boolean))];
}

function assetSymbols(accepts) {
  const out = new Set();
  for (const a of accepts || []) {
    const s = ASSET_SYMBOLS[String(a.asset || '').toLowerCase()];
    if (s) out.add(s);
  }
  return [...out];
}

// Listings here carry a description, not a title, so the name is derived: the
// provider's own name when the metadata has one, otherwise the description's
// first sentence, otherwise the URL.
function resName(r) {
  const m = r.metadata || {};
  if (m.name) return String(m.name).slice(0, 90);
  const d = (r.description || '').trim();
  if (d) {
    const first = d.split(/(?<=[.!?])\s|\n/)[0].replace(/[.!?]+$/, '');
    return (first.length > 90 ? first.slice(0, 87).trimEnd() + '…' : first) || r.resource;
  }
  try {
    const u = new URL(r.resource);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return r.resource || 'Untitled resource';
  }
}

function resSummary(r, max = 170) {
  const d = (r.description || '').replace(/\s+/g, ' ').trim();
  if (!d) return 'No description provided.';
  return d.length > max ? d.slice(0, max - 1).trimEnd() + '…' : d;
}

function typeLabel(r) {
  const raw = String(r.resourceType || 'api');
  // Known protocol-style types get a label; provider-set categories keep their own casing.
  return { http: 'API', api: 'API', mcp: 'MCP tool', 'mcp-server': 'MCP server', a2a: 'A2A agent', dataset: 'Dataset' }[raw.toLowerCase()] || raw;
}

function priceParts(accepts) {
  const list = accepts || [];
  const priced = list.find((a) => a.amountUsd);
  if (priced) return { main: `$${priced.amountUsd}`, unit: '/ request', free: false };
  if (!list.length) return { main: 'Free', unit: '', free: true };
  return { main: 'see accepts', unit: '', free: false };
}

function vstate(r) {
  if (r.liveness?.isLive === false) return '<span class="v"><span class="vdot failed"></span>not responding</span>';
  if (r.verified) return '<span class="v" title="The provider proved control of this host"><span class="vdot passed"></span>verified</span>';
  if (r.liveness?.isLive === true) return '<span class="v"><span class="vdot passed"></span>reachable</span>';
  return '<span class="v" title="Mirrored from the public x402 Bazaar; not checked here"><span class="vdot not-checked"></span>mirrored</span>';
}

function fmtNum(n) {
  return n == null ? '—' : Number(n).toLocaleString('en-US');
}

function fmtDate(iso) {
  return iso ? String(iso).slice(0, 10) : '—';
}

// Same card markup as the design's Jinja macro. Fields the catalog does not have
// (p50 latency, availability samples) are simply not shown rather than faked.
function card(r) {
  const price = priceParts(r.accepts);
  const nets = uniqueNetworks(r.accepts);
  const syms = assetSymbols(r.accepts);
  const rel = r.liveness?.reliability;
  const slug = escapeHtml(r.slug);
  return `
<article class="card">
  <div class="card-top"><span>${escapeHtml(typeLabel(r))}${r.featured ? ' · featured' : ''}</span>${vstate(r)}</div>
  <h3><a href="/resources/${slug}">${escapeHtml(resName(r))}</a></h3>
  <p class="sum">${escapeHtml(resSummary(r))}</p>
  <div class="prov">by <b>${escapeHtml(r.provider?.manifest_name || r.sourceHost || 'unknown')}</b>${r.verified ? ' · verified provider' : ''}</div>
  <div class="pricing">
    <span class="price${price.free ? ' free' : ''}">${escapeHtml(price.main)}${price.unit ? `<small>${escapeHtml(price.unit)}</small>` : ''}</span>
    <div class="badges"><span class="badge b-x402">x402</span><span class="badge">json</span></div>
  </div>
  <div class="meta">
    <span>Networks<b>${nets.length ? escapeHtml(nets.slice(0, 3).join(', ')) : '—'}</b></span>
    <span>Asset<b>${syms.length ? escapeHtml(syms.join(', ')) : '—'}</b></span>
    <span>Uptime<b>${rel ? `${Math.round((rel.live / rel.checks) * 100)}% <span class="xs">(${rel.checks})</span>` : '—'}</b></span>
    <span>${r.quality?.calls30d ? `Calls 30d<b>${fmtNum(r.quality.calls30d)}</b>` : `Updated<b>${escapeHtml(fmtDate(r.lastUpdated))}</b>`}</span>
  </div>
  <div class="actions">
    <a href="/resources/${slug}">View</a>
    <a href="/resources/${slug}.json" type="application/json">Agent schema</a>
  </div>
</article>`;
}

function rows(items) {
  if (!items || !items.length) return '<ul class="rows"><li><span class="muted small">Nothing listed yet.</span></li></ul>';
  return `<ul class="rows">${items
    .map((r) => {
      const p = priceParts(r.accepts);
      const nets = uniqueNetworks(r.accepts).slice(0, 2).join(', ');
      return `<li><div><a href="/resources/${escapeHtml(r.slug)}">${escapeHtml(resName(r))}</a><span class="sub">${escapeHtml(r.sourceHost || '')}${nets ? ' · ' + escapeHtml(nets) : ''}</span></div><span class="p${p.free ? ' free' : ''}">${escapeHtml(p.main)}</span></li>`;
    })
    .join('')}</ul>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map(([name, url], i) => (i < items.length - 1 ? `<li><a href="${escapeHtml(url)}">${escapeHtml(name)}</a></li>` : `<li><span aria-current="page">${escapeHtml(name)}</span></li>`))
    .join('')}</ol></nav>`;
}

function empty(title, text) {
  return `<div class="empty"><b>${escapeHtml(title)}</b>${escapeHtml(text)}</div>`;
}

const NAV = [
  ['/#explore', 'Explore'],
  ['/mcp', 'MCP'],
  ['/protocols/x402', 'x402'],
  ['/publish', 'Publish'],
  ['/guides', 'Guides'],
  ['/docs', 'Docs'],
];

function header(path = '') {
  const item = ([href, label]) => {
    const base = href.replace(/#.*/, '');
    const current = base !== '/' && !href.includes('#') && path.startsWith(base);
    return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  };
  return `
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Agent Bazaar home">
      <img src="/assets/saylor-logo.jpg" alt="" width="30" height="30">
      <span><span class="brand-name">Agent Bazaar</span><span class="brand-sub">by Saylor Innovations</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      ${NAV.map(item).join('')}
      <a href="${REPO}" rel="noopener">GitHub</a>
      <a class="btn btn-primary btn-sm" href="/agents">Connect an Agent</a>
    </nav>
    <details class="menu">
      <summary aria-label="Menu">Menu</summary>
      <div class="menu-panel">
        ${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
        <a href="/agents">Connect an Agent</a>
        <a href="${REPO}" rel="noopener">GitHub</a>
      </div>
    </details>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="foot">
      <div>
        <a class="brand" href="/"><img src="/assets/saylor-logo.jpg" alt="Saylor Innovations logo" width="30" height="30" loading="lazy"><span><span class="brand-name">Agent Bazaar</span><span class="brand-sub">by Saylor Innovations</span></span></a>
        <p class="tag">Open infrastructure for the agent economy.</p>
        <p class="small muted">Built by <a href="${PARENT}">Saylor Innovations</a>. Open source under the MIT license. Agent Bazaar never holds funds: agents pay providers directly.</p>
      </div>
      <div><h2>Marketplace</h2><ul>
        <li><a href="/#explore">Explore</a></li><li><a href="/categories">Categories</a></li><li><a href="/networks">Networks</a></li>
        <li><a href="/publish">Publish</a></li><li><a href="/discovery/stats">Network stats</a></li></ul></div>
      <div><h2>Agents</h2><ul>
        <li><a href="/agents">Connect an Agent</a></li><li><a href="/protocols/mcp">MCP</a></li><li><a href="/protocols/x402">x402</a></li>
        <li><a href="/protocols/a2a">A2A</a></li><li><a href="/openapi.json">API (OpenAPI)</a></li><li><a href="/llms.txt">llms.txt</a></li></ul></div>
      <div><h2>Learn</h2><ul>
        <li><a href="/docs">Documentation</a></li><li><a href="/guides">Guides</a></li>
        <li><a href="${PARENT}/guides/">Saylor technical guides</a></li></ul></div>
      <div><h2>Saylor Innovations</h2><ul>
        <li><a href="${PARENT}">saylorinnovations.com</a></li><li><a href="https://x402.saylorinnovations.com">Saylor x402 APIs</a></li>
        <li><a href="https://propz.saylorinnovations.com">Propz — agent-payable tip jars</a></li><li><a href="https://github.com/SaylorInnovations/solana-x402">solana-x402 (OSS)</a></li>
        <li><a href="${REPO}" rel="noopener">Source (GitHub)</a></li></ul></div>
    </div>
    <div class="foot-base"><span>© ${new Date().getUTCFullYear()} Saylor Innovations Digital Solutions · Kentucky, USA</span><span>Open source, MIT licensed. No account or KYC required to list or discover.</span></div>
  </div>
</footer>`;
}

function pageShell({ title, description, canonical, bodyHtml, jsonLd, extraHead = '', path = '' }) {
  const jsonLdBlock = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
<meta name="theme-color" content="#050F1A">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Agent Bazaar by Saylor Innovations">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : ''}
<meta property="og:image" content="${SITE}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SITE}/assets/og.png">
<link rel="icon" type="image/jpeg" href="/assets/saylor-logo.jpg">
<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<link rel="service-desc" type="application/json" href="/openapi.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/bazaar.css">
<link rel="stylesheet" href="/assets/legacy.css">
<noscript><link rel="stylesheet" href="/assets/nojs.css"></noscript>
${jsonLdBlock}
${extraHead}
</head>
<body>
${header(path)}
<main id="main">
${bodyHtml}
</main>
${footer()}
<script src="/assets/bazaar.js" defer></script>
</body>
</html>`;
}

export {
  pageShell, header, footer, escapeHtml, priceOf, priceParts, card, rows, crumbs, empty,
  resName, resSummary, typeLabel, networkLabel, uniqueNetworks, assetSymbols, vstate, fmtNum, fmtDate,
  SITE, REPO, PARENT,
};

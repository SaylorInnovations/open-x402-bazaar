// Homepage. Server-rendered from D1 and edge-cached (see src/edgeCache.js): a page
// view reaches the database at most once per cache window per location, instead of
// the five separate D1-backed fetches per visit the old client-side homepage made.
import { getStats, getFeaturedResources, listResources, listCategories, merchantResources, resourcesByCategory } from '../src/db.js';
import { GUIDES } from '../src/guides.js';
import { pageShell, escapeHtml, card, rows, resName, priceParts, uniqueNetworks, fmtNum, SITE, REPO } from '../src/layout.js';
import { withEdgeCache } from '../src/edgeCache.js';

const SAYLOR_PAY_TO = '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7';
const CACHE_SECONDS = 900;

const EXAMPLES = [
  'Find a Solana security API',
  'crypto price data',
  'MCP tool for web research',
  'token risk score',
  'wallet intelligence',
];

// Each query is independent: one failing (or D1 rate-limiting) must degrade that
// section to empty, not take the whole homepage down with a 500.
async function safe(promise, fallback, failures) {
  try {
    return await promise;
  } catch (e) {
    failures.push(e?.message || String(e));
    return fallback;
  }
}

function terminal(sample) {
  if (!sample.length) return '';
  const lines = sample
    .slice(0, 3)
    .map((r, i) => {
      const p = priceParts(r.accepts);
      const nets = uniqueNetworks(r.accepts).slice(0, 2).join(', ') || 'free';
      return `<span class="ln"><span class="w">${i + 1}. ${escapeHtml(resName(r))}</span></span><span class="ln">   ${escapeHtml(p.main)}${p.unit ? ' ' + escapeHtml(p.unit) : ''} · x402 · ${escapeHtml(nets)} · json</span>`;
    })
    .join('\n');
  return `
    <div class="term" aria-label="Example agent session">
      <div class="term-bar"><span class="dot"></span>agent session<span class="src">results: live catalog</span></div>
<pre><span class="ln"><span class="p">agent&gt;</span> search("solana token security")</span>
${lines}
<span class="ln"><span class="p">agent&gt;</span> GET ${escapeHtml(sample[0].resource.slice(0, 64))}</span><span class="ln"><span class="c">HTTP 402 · payment requirements received</span></span><span class="ln"><span class="ok">payment authorized · settled on-chain</span></span><span class="ln"><span class="ok">resource delivered · 200 OK</span></span><span class="ln"><span class="p">agent&gt;</span> <span class="cursor"></span></span></pre>
    </div>`;
}

async function render(env) {
  const failures = [];
  const [stats, paid, official, used, newest, kinds] = await Promise.all([
    safe(getStats(env), null, failures),
    safe(getFeaturedResources(env, { limit: 6 }), [], failures),
    safe(merchantResources(env, SAYLOR_PAY_TO), [], failures),
    safe(listResources(env, { limit: 6 }), { resources: [] }, failures),
    safe(listResources(env, { limit: 6, sort: 'recent' }), { resources: [] }, failures),
    safe(listCategories(env), [], failures),
  ]);

  // Featured = paid placements first, then Saylor Innovations' own verified listings.
  const seen = new Set();
  const featured = [...paid, ...official].filter((r) => (seen.has(r.id) ? false : seen.add(r.id))).slice(0, 6);

  // Shelves for the top few kinds, four entries each.
  const topKinds = kinds.slice(0, 4);
  const shelves = await Promise.all(
    topKinds.map(async (k) => ({
      title: k.resource_type,
      href: `/categories/${encodeURIComponent(k.resource_type)}`,
      total: k.count,
      entries: (await safe(resourcesByCategory(env, k.resource_type, { limit: 4, offset: 0 }), { resources: [] }, failures)).resources,
    }))
  );

  const guides = GUIDES.slice(0, 4);
  const fmt = (n) => (n == null ? '—' : fmtNum(n));

  const body = `
<section class="hero" id="top">
  <div class="wrap hero-grid">
    <div>
      <div class="lineage"><a href="https://saylorinnovations.com">Saylor Innovations</a> <b>↳</b> Agent Bazaar</div>
      <h1>The open marketplace <em>for AI agents</em></h1>
      <p class="lede">Discover APIs, MCP tools, datasets, agent services and machine-payable resources built for autonomous software.</p>
      <div class="motto" aria-label="Search. Discover. Pay. Execute.">Search<span>·</span>Discover<span>·</span>Pay<span>·</span>Execute</div>
      <div class="row">
        <a class="btn btn-primary" href="/search">Explore Marketplace</a>
        <a class="btn" href="/agents">Connect an Agent</a>
      </div>
    </div>
    ${terminal(featured.length ? featured : used.resources)}
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="stats" role="list" aria-label="Live marketplace statistics">
      <div class="stat" role="listitem"><b>${fmt(stats?.resources)}</b><span>Resources</span></div>
      <div class="stat" role="listitem"><b>${fmt(stats?.listings)}</b><span>Providers</span></div>
      <div class="stat" role="listitem"><b>${fmt(stats?.networks)}</b><span>Networks</span></div>
      <div class="stat" role="listitem"><b>3</b><span>Protocols</span></div>
      <div class="stat" role="listitem" title="Paid calls in the last 30 days as reported by the public x402 Bazaar. Third-party data."><b>${fmt(stats?.calls30d)}</b><span>Paid calls / 30d</span></div>
      <div class="stat" role="listitem" title="Agent Bazaar never proxies calls or touches payments, so it has no settlement telemetry"><b class="na">—</b><span>Payments settled</span></div>
    </div>
    <p class="xs muted mono">Counts are live from the catalog. Settlements stay "—" because Agent Bazaar never proxies calls or touches payments. Call volume is third-party data from the public x402 Bazaar.</p>
  </div>
</section>

<section class="section-tight" id="explore" aria-labelledby="search-h">
  <div class="wrap">
    <h2 id="search-h" class="sr-only">Search the marketplace</h2>
    <form class="cmd" action="/search" method="get" role="search">
      <span class="prompt" aria-hidden="true">&gt;_</span>
      <label class="sr-only" for="q">Search tools, APIs, agents, data, skills or capabilities</label>
      <input id="q" name="q" type="search" placeholder="Search tools, APIs, agents, data, skills or capabilities..." autocomplete="off">
      <button class="btn btn-primary" type="submit">Search</button>
    </form>
    <div class="examples" aria-label="Example searches">
      ${EXAMPLES.map((ex) => `<a href="/search?q=${encodeURIComponent(ex)}">${escapeHtml(ex)}</a>`).join('')}
    </div>
  </div>
</section>

${featured.length ? `
<section class="section">
  <div class="wrap">
    <div class="spread"><div><div class="eyebrow">Featured</div><h2>Featured resources</h2></div><a class="link-arrow" href="/providers/saylorinnovations.com">From Saylor Innovations</a></div>
    <p class="small muted">Paid placements first, then Saylor Innovations' own owner-operated listings, served from its live x402 manifest.</p>
    <div class="grid g3">${featured.map(card).join('')}</div>
  </div>
</section>` : ''}

<section class="section-tight">
  <div class="wrap">
    <div class="grid g2">
      <div>
        <div class="spread"><h2>Most-used agent tools</h2><a class="link-arrow" href="/search?sort=usage">All by usage</a></div>
        <p class="small muted">Ranked by paid calls in the last 30 days as reported by the x402 facilitator's public discovery API. Third-party data, shown as reported.</p>
        <div class="shelf">${rows(used.resources)}</div>
      </div>
      <div>
        <div class="spread"><h2>Newly published</h2><a class="link-arrow" href="/search?sort=newest">All new</a></div>
        <p class="small muted">The latest listings to enter the catalog.</p>
        <div class="shelf">${rows(newest.resources)}</div>
      </div>
    </div>
  </div>
</section>

${shelves.length ? `
<section class="section">
  <div class="wrap">
    <div class="eyebrow">Browse by kind</div>
    <h2>Everything an autonomous agent can call</h2>
    <div class="grid g4">
      ${shelves.map((s) => `<div class="shelf"><h3>${escapeHtml(s.title)} <a href="${s.href}">${fmtNum(s.total)} →</a></h3>${rows(s.entries)}</div>`).join('')}
    </div>
  </div>
</section>` : ''}

<section class="section">
  <div class="wrap split">
    <div>
      <div class="eyebrow">Why this exists</div>
      <h2>Humans browse marketplaces. Agents need structured discovery.</h2>
      <p class="lede">A marketplace built for people to scroll is not enough for software that has to find, judge, pay for and call a service on its own. Agent Bazaar is both: a marketplace people can browse, and a discovery layer machines can query.</p>
      <p>Every listing carries what an agent needs to decide without a human: what the resource does, the exact price, which payment assets and networks it accepts, and its output schema. The same record renders this page, answers <a href="/discovery/search?query=solana">/discovery/search</a>, fills <a href="/discovery/resources">/discovery/resources</a> and powers the <a href="/mcp">MCP server</a>.</p>
    </div>
    <div class="duo">
      <div><b>For people</b><span class="small">Search in plain English, compare prices and networks, and see exactly what each verification badge proves.</span></div>
      <div><b>For agents</b><span class="small">JSON for every entity, x402 v2 discovery items, an MCP server, an A2A agent registry, OpenAPI and llms.txt.</span></div>
      <div><b>One catalog</b><span class="small">No separate human and machine databases. The website is just one client of the structured catalog.</span></div>
    </div>
  </div>
</section>

${kinds.length ? `
<section class="section-tight">
  <div class="wrap">
    <div class="spread"><div><div class="eyebrow">Categories</div><h2>Browse by capability</h2></div><a class="link-arrow" href="/categories">All categories</a></div>
    <div class="tiles">${kinds.slice(0, 16).map((c) => `<a class="tile" href="/categories/${encodeURIComponent(c.resource_type)}"><b>${escapeHtml(c.resource_type)}</b><span>${fmtNum(c.count)} listings</span></a>`).join('')}</div>
  </div>
</section>` : ''}

<section class="section">
  <div class="wrap">
    <div class="eyebrow">Connect an agent</div>
    <h2>Discover. Inspect. Pay. Execute. Verify.</h2>
    <ol class="steps">
      <li><b>Discover</b><span>Search by intent over REST, MCP or A2A.</span></li>
      <li><b>Inspect</b><span>Pull the price and payment options as JSON.</span></li>
      <li><b>Pay</b><span>Answer the provider's HTTP 402 with a signed x402 payment.</span></li>
      <li><b>Execute</b><span>Call the provider directly. Agent Bazaar is not in the path.</span></li>
      <li><b>Verify</b><span>Check the PAYMENT-RESPONSE settlement and the output schema.</span></li>
    </ol>
    <div class="row"><a class="btn btn-primary" href="/agents">Agent quickstart</a><a class="btn" href="/discovery/stats">Free connectivity check</a></div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div>
      <div class="eyebrow">Open source</div>
      <h2>An open marketplace for an open agent economy</h2>
      <p>Developers should not need permission from a central company to make a useful service discoverable by autonomous software. Agent Bazaar is MIT-licensed and interoperable by design: it reads and writes the same x402 v2 discovery format as the facilitator ecosystem, speaks MCP and A2A, and indexes the public x402 Bazaar alongside provider manifests. No account or KYC to list or discover.</p>
      <div class="row"><a class="btn" href="${REPO}" rel="noopener">Source on GitHub</a><a class="btn btn-ghost" href="/docs">Documentation</a></div>
    </div>
    <div class="panel">
      <h3>Sell services to agents</h3>
      <p class="small">Submit the URL of your <code>.well-known/x402.json</code> manifest or an A2A agent card. Agent Bazaar validates it, indexes every payable resource, and marks the listing verified because you proved control.</p>
      <a class="btn btn-primary btn-sm" href="/publish">Publish a resource</a>
      <hr>
      <h3>Verified providers</h3>
      <p class="small"><a href="/providers/saylorinnovations.com">Saylor Innovations</a> — owner-operated x402 APIs and an MCP server.</p>
    </div>
  </div>
</section>

${guides.length ? `
<section class="section-tight">
  <div class="wrap">
    <div class="spread"><div><div class="eyebrow">Guides</div><h2>Learn the agent economy</h2></div><a class="link-arrow" href="/guides">All guides</a></div>
    <div class="tiles">${guides.map((g) => `<a class="tile" href="/guides/${escapeHtml(g.slug)}"><b>${escapeHtml(g.title)}</b><span>${g.readMins} min read</span></a>`).join('')}</div>
  </div>
</section>` : ''}
`;

  const html = pageShell({
    title: 'Agent Bazaar — The Open Marketplace for AI Agents',
    description: 'Agent Bazaar is an open, permissionless marketplace and discovery network for AI agents — APIs, MCP tools, datasets and x402-payable services agents can find, evaluate and pay for.',
    canonical: `${SITE}/`,
    bodyHtml: body,
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Agent Bazaar',
      url: `${SITE}/`,
      description: 'Open marketplace and discovery network for AI agents: APIs, MCP tools, datasets and x402-payable services.',
      publisher: { '@type': 'Organization', name: 'Saylor Innovations', url: 'https://saylorinnovations.com' },
      potentialAction: { '@type': 'SearchAction', target: `${SITE}/search?q={query}`, 'query-input': 'required name=query' },
    },
  });

  // A page rendered from failed queries is served but never cached.
  return { response: new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8' } }), cacheable: failures.length === 0 };
}

export async function onRequestGet(context) {
  return withEdgeCache(context, CACHE_SECONDS, () => render(context.env));
}

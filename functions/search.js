// Explore / search page. Text queries use FTS5 (bm25 ranking); with no query it is a
// paginated browse ordered by usage or recency. Edge-cached per URL for a few minutes
// so repeated searches and crawler traffic don't each cost D1 row reads.
import { searchResources, listResources, getStats } from '../src/db.js';
import { pageShell, escapeHtml, card, empty, crumbs, fmtNum, SITE } from '../src/layout.js';
import { withEdgeCache } from '../src/edgeCache.js';

const PAGE = 24;
const NETWORKS = [
  ['', 'All networks'],
  ['eip155:8453', 'Base'],
  ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'Solana'],
  ['eip155:137', 'Polygon'],
  ['eip155:42161', 'Arbitrum One'],
];

function pager(base, offset, total) {
  const prev = offset > 0 ? `<a href="${base}${base.includes('?') ? '&' : '?'}offset=${Math.max(offset - PAGE, 0)}" rel="prev">← Prev</a>` : '';
  const next = offset + PAGE < total ? `<a href="${base}${base.includes('?') ? '&' : '?'}offset=${offset + PAGE}" rel="next">Next →</a>` : '';
  return prev || next ? `<nav class="pager" aria-label="Pagination">${prev}<span aria-current="page">${Math.floor(offset / PAGE) + 1}</span>${next}</nav>` : '';
}

async function render(env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
  const network = url.searchParams.get('network') || '';
  const sort = url.searchParams.get('sort') === 'newest' ? 'recent' : 'usage';
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  let resources = [];
  let total = 0;
  try {
    if (q || network) {
      resources = await searchResources(env, { query: q || undefined, network: network || undefined, limit: 50 });
      total = resources.length;
    } else {
      const r = await listResources(env, { limit: PAGE, offset, sort: sort === 'recent' ? 'recent' : undefined });
      resources = r.resources;
      total = r.total;
    }
  } catch (e) {
    const html = pageShell({
      title: 'Search — Agent Bazaar',
      description: 'Search the Agent Bazaar catalog.',
      canonical: `${SITE}/search`,
      path: '/search',
      bodyHtml: `<div class="wrap page-head"><h1>Search</h1></div><div class="wrap">${empty('The catalog is briefly unavailable', 'Please try again in a minute. Everything on this site is also available as JSON at /discovery/search.')}</div>`,
    });
    return { response: new Response(html, { status: 503, headers: { 'content-type': 'text/html;charset=utf-8', 'retry-after': '60' } }), cacheable: false };
  }

  const base = `/search?${new URLSearchParams({ ...(q && { q }), ...(network && { network }), ...(sort === 'recent' && { sort: 'newest' }) }).toString()}`;
  const heading = q ? `Results for “${q}”` : network ? 'Filtered resources' : sort === 'recent' ? 'Newly published' : 'Explore the marketplace';
  const paged = !(q || network);

  const body = `
<div class="wrap page-head">
  ${crumbs([['Agent Bazaar', '/'], ['Explore', '/search']])}
  <h1>${escapeHtml(heading)}</h1>
  <p class="lede">${paged ? `${fmtNum(total)} listings` : `${fmtNum(total)} result${total === 1 ? '' : 's'}`}. Search understands plain English, and every result is also available as JSON at <a href="/discovery/search${q ? `?query=${encodeURIComponent(q)}` : ''}"><code>/discovery/search</code></a>.</p>
  <form class="cmd" action="/search" method="get" role="search">
    <span class="prompt" aria-hidden="true">&gt;_</span>
    <label class="sr-only" for="q">Search</label>
    <input id="q" name="q" type="search" value="${escapeHtml(q)}" placeholder="Search tools, APIs, agents, data, skills or capabilities..." autocomplete="off">
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
  <div class="examples" aria-label="Filter by network">
    ${NETWORKS.map(([id, label]) => `<a href="/search?${new URLSearchParams({ ...(q && { q }), ...(id && { network: id }) })}"${id === network ? ' aria-current="true"' : ''}>${escapeHtml(label)}</a>`).join('')}
    <a href="/search?sort=usage"${sort === 'usage' && paged ? ' aria-current="true"' : ''}>Most used</a>
    <a href="/search?sort=newest"${sort === 'recent' && paged ? ' aria-current="true"' : ''}>Newest</a>
  </div>
</div>
<div class="wrap">
  ${resources.length ? `<div class="grid g3">${resources.map(card).join('')}</div>${paged ? pager(base, offset, total) : ''}` : `${empty('No matches', 'Try a broader term, or list the resource if it should exist.')}<p class="center"><a class="btn btn-sm" href="/publish">Publish a resource</a></p>`}
</div>`;

  const html = pageShell({
    title: `${heading} — Agent Bazaar`,
    description: 'Search APIs, MCP tools, datasets and x402-payable services that AI agents can discover and pay for.',
    canonical: `${SITE}/search`,
    bodyHtml: body,
    path: '/search',
    // Query-string variants are not separate indexable pages.
    extraHead: q || network || offset ? '<meta name="robots" content="noindex,follow">' : '',
  });
  return { response: new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8' } }), cacheable: true };
}

export async function onRequestGet(context) {
  return withEdgeCache(context, 300, () => render(context.env, new URL(context.request.url)));
}

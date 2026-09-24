import { guideSummaries } from '../../src/guides.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet() {
  const guides = guideSummaries();
  const byCategory = {};
  for (const g of guides) (byCategory[g.category] ||= []).push(g);

  const body = `
<div class="wrap" style="padding:32px 0 60px;max-width:900px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / Guides</nav>
  <span class="eyebrow">GUIDES</span>
  <h1>Guides</h1>
  <p class="lede" style="max-width:none;">In-depth, code-backed explainers on x402, MCP, A2A and agentic commerce — the full treatment, not the FAQ-length version on <a href="/docs">/docs</a>.</p>

  ${Object.entries(byCategory)
    .map(
      ([cat, items]) => `
  <section class="block" style="border-top:none;">
    <h2>${escapeHtml(cat)}</h2>
    <div class="grid-cards">
      ${items
        .map(
          (g) => `<div class="card"><h3><a href="/guides/${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></h3><p class="desc">${escapeHtml(g.description)}</p><div class="meta-row"><span class="badge">${g.readMins} min read</span></div></div>`
        )
        .join('')}
    </div>
  </section>`
    )
    .join('')}
</div>`;

  const html = pageShell({
    title: 'Guides — Agent Bazaar',
    description: 'In-depth guides on x402, MCP, A2A and agentic commerce for AI agent builders and API providers.',
    canonical: 'https://bazaar.saylorinnovations.com/guides',
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

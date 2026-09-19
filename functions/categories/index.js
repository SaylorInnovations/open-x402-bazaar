import { listCategories } from '../../src/db.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ env }) {
  const categories = await listCategories(env);

  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / Categories</nav>
  <h1>Browse by Category</h1>
  <p style="color:var(--silver);max-width:680px;">Resource types are set by providers at listing time, so coverage grows as more of the catalog is explicitly typed — the Coinbase-mirrored bulk of the catalog isn't yet. Every category shown here has at least one real, currently-listed resource.</p>
  ${categories.length ? `
  <div class="grid-cards" style="margin-top:26px;">
    ${categories
      .map(
        (c) => `<div class="card"><h3><a href="/categories/${encodeURIComponent(c.resource_type)}">${escapeHtml(c.resource_type)}</a></h3><p class="desc">${c.count} resource${c.count === 1 ? '' : 's'}</p></div>`
      )
      .join('')}
  </div>` : `<p style="color:var(--silver-soft);">No typed categories yet.</p>`}
</main>`;

  const html = pageShell({
    title: 'Categories — Agent Bazaar',
    description: 'Browse the Agent Bazaar marketplace by resource category — APIs, blockchain data, and more.',
    canonical: 'https://bazaar.saylorinnovations.com/categories',
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

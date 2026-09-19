import { guideBySlug, guideSummaries } from '../../src/guides.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

function renderHtml(guide) {
  const all = guideSummaries();
  const related = (guide.related || [])
    .map((slug) => all.find((g) => g.slug === slug))
    .filter(Boolean);

  const body = `
<main class="wrap" style="padding:32px 0 60px;max-width:820px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/guides">Guides</a> / ${escapeHtml(guide.category)}</nav>
  <span class="eyebrow">${escapeHtml(guide.category.toUpperCase())} &middot; ${guide.readMins} MIN READ</span>
  <h1>${escapeHtml(guide.title)}</h1>
  <p class="lede" style="max-width:none;">${escapeHtml(guide.description)}</p>

  <article style="color:var(--paper);line-height:1.75;">
    <style>
      article h2 { font-size:1.35rem; margin-top:2em; }
      article h3 { font-size:1.05rem; margin-top:1.6em; color:var(--paper); }
      article p { color:var(--silver); margin:0.9em 0; }
      article ul, article ol { color:var(--silver); padding-left:1.4em; }
      article li { margin:0.4em 0; }
      article strong { color:var(--paper); }
      article a { color:var(--cyan); }
    </style>
    ${guide.body}
  </article>

  ${related.length ? `
  <section class="block">
    <h2>Related guides</h2>
    <div class="grid-cards">
      ${related.map((g) => `<div class="card"><h3><a href="/guides/${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></h3><p class="desc">${escapeHtml(g.description)}</p></div>`).join('')}
    </div>
  </section>` : ''}

  <section class="block">
    <h2>Machine-readable</h2>
    <p style="color:var(--silver);">Plain-text version for agents: <a href="/guides/${escapeHtml(guide.slug)}.json"><code>/guides/${escapeHtml(guide.slug)}.json</code></a>.</p>
  </section>
</main>`;

  const html = pageShell({
    title: `${guide.title} — Agent Bazaar`,
    description: guide.description,
    canonical: `https://bazaar.saylorinnovations.com/guides/${guide.slug}`,
    bodyHtml: body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: guide.title,
      description: guide.description,
      author: { '@type': 'Organization', name: 'Saylor Innovations' },
      publisher: { '@type': 'Organization', name: 'Agent Bazaar' },
    },
  });
  return html;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function onRequestGet({ params }) {
  const raw = params.slug;
  const isJson = raw.endsWith('.json');
  const slug = isJson ? raw.slice(0, -5) : raw;

  const guide = guideBySlug(slug);
  if (!guide) {
    return new Response(isJson ? JSON.stringify({ error: 'not found' }) : '<h1>404 — guide not found</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': isJson ? 'application/json' : 'text/html' },
    });
  }

  if (isJson) {
    return new Response(
      JSON.stringify(
        {
          slug: guide.slug,
          title: guide.title,
          description: guide.description,
          category: guide.category,
          readMins: guide.readMins,
          text: stripHtml(guide.body),
          related: guide.related || [],
        },
        null,
        2
      ),
      { headers: { ...CORS, 'content-type': 'application/json' } }
    );
  }

  return new Response(renderHtml(guide), { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

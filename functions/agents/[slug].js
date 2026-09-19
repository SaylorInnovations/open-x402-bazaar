import { getAgentBySlugOrId } from '../../src/agentRegistry.js';
import { pageShell, escapeHtml } from '../../src/layout.js';

const CORS = { 'access-control-allow-origin': '*' };

function renderHtml(a) {
  const skillRows = (a.skills || [])
    .map((s) => `<tr><td><code>${escapeHtml(s.id || s.name || '')}</code></td><td>${escapeHtml(s.description || '')}</td></tr>`)
    .join('');

  const body = `
<main class="wrap" style="padding:32px 0 60px;">
  <nav class="breadcrumbs"><a href="/">Agent Bazaar</a> / <a href="/agents">Agents</a></nav>
  <div class="meta-row" style="margin-bottom:14px;">
    <span class="badge badge-protocol">A2A</span>
    ${a.protocolVersion ? `<span class="badge">protocol ${escapeHtml(a.protocolVersion)}</span>` : ''}
    ${a.liveness?.isLive === false ? '<span class="badge badge-down">not responding</span>' : ''}
  </div>
  <h1>${escapeHtml(a.name)}</h1>
  <p style="color:var(--silver);max-width:680px;">${escapeHtml(a.description || 'No description provided.')}</p>

  <section class="block" style="border-top:none;padding-top:0;">
    <h2>Provider</h2>
    <p>${escapeHtml(a.provider?.organization || a.host)} ${a.provider?.url ? `&middot; <a href="${escapeHtml(a.provider.url)}">${escapeHtml(a.provider.url)}</a>` : ''}</p>
  </section>

  ${skillRows ? `
  <section class="block">
    <h2>Skills</h2>
    <table><tr><th>Skill</th><th>Description</th></tr>${skillRows}</table>
  </section>` : ''}

  <section class="block">
    <h2>Connect</h2>
    <div class="codeblock"><pre>${escapeHtml(a.cardUrl)}</pre></div>
    ${a.documentationUrl ? `<p style="color:var(--silver);">Docs: <a href="${escapeHtml(a.documentationUrl)}">${escapeHtml(a.documentationUrl)}</a></p>` : ''}
  </section>

  <section class="block">
    <h2>Machine-readable</h2>
    <p>Full agent card as submitted: <a href="/agents/${escapeHtml(a.slug)}.json"><code>/agents/${escapeHtml(a.slug)}.json</code></a>. Original source: <a href="${escapeHtml(a.cardUrl)}"><code>${escapeHtml(a.cardUrl)}</code></a>.</p>
  </section>
</main>`;

  return pageShell({
    title: `${a.name} — Agent Bazaar`,
    description: (a.description || `${a.name}, an A2A agent listed on Agent Bazaar`).slice(0, 155),
    canonical: `https://bazaar.saylorinnovations.com/agents/${a.slug}`,
    bodyHtml: body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: a.name,
      description: a.description || undefined,
      applicationCategory: 'AI Agent',
      provider: a.provider?.organization ? { '@type': 'Organization', name: a.provider.organization } : undefined,
    },
  });
}

export async function onRequestGet({ params, env }) {
  const raw = params.slug;
  const isJson = raw.endsWith('.json');
  const key = isJson ? raw.slice(0, -5) : raw;

  const agent = await getAgentBySlugOrId(env, key);
  if (!agent) {
    return new Response(isJson ? JSON.stringify({ error: 'not found' }) : '<h1>404 — agent not found</h1>', {
      status: 404,
      headers: { ...CORS, 'content-type': isJson ? 'application/json' : 'text/html' },
    });
  }

  if (isJson) {
    return new Response(JSON.stringify(agent, null, 2), { headers: { ...CORS, 'content-type': 'application/json' } });
  }
  return new Response(renderHtml(agent), { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

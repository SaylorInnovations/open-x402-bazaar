import { pageShell } from '../src/layout.js';
import { TOOLS, handleRpc } from '../src/mcp.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet() {
  const toolRows = TOOLS.map((t) => `<tr><td><code>${t.name}</code></td><td>${t.description}</td></tr>`).join('');
  const body = `
<main class="wrap" style="padding:40px 0 60px;max-width:760px;">
  <span class="eyebrow">MCP &middot; MODEL CONTEXT PROTOCOL &middot; LIVE</span>
  <h1>MCP on Agent Bazaar</h1>
  <p class="lede" style="max-width:none;">This endpoint is a real MCP server over the marketplace catalog — the same data <code>/discovery</code> serves, over MCP's Streamable HTTP transport.</p>

  <section class="block" style="border-top:none;">
    <h2>Connect</h2>
    <div class="codeblock"><pre>{
  "mcpServers": {
    "agent-bazaar": {
      "url": "https://bazaar.saylorinnovations.com/mcp"
    }
  }
}</pre></div>
    <p style="color:var(--silver);">Stateless Streamable HTTP: POST a JSON-RPC 2.0 request, get a JSON-RPC 2.0 response — no session handshake required for these read-only tools.</p>
  </section>

  <section class="block">
    <h2>Tools</h2>
    <table>
      <tr><th>Tool</th><th>Description</th></tr>
      ${toolRows}
    </table>
  </section>

  <section class="block">
    <h2>Try it</h2>
    <div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/mcp \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_resources","arguments":{"query":"solana security","limit":3}}}'</pre></div>
  </section>

  <section class="block">
    <h2>Scope</h2>
    <p style="color:var(--silver);">This server exposes read-only discovery tools over Agent Bazaar's own catalog. It does not (yet) proxy third-party MCP servers, execute x402 payments on an agent's behalf, or expose write tools — publishing still goes through <a href="/publish">/publish</a> / <code>POST /submit</code>.</p>
  </section>
</main>`;

  const html = pageShell({
    title: 'MCP — Agent Bazaar',
    description: 'A real MCP server over Agent Bazaar\'s marketplace catalog: search_resources, get_resource, get_pricing, discover_provider, list_resources, get_stats.',
    canonical: 'https://bazaar.saylorinnovations.com/mcp',
    bodyHtml: body,
  });
  return new Response(html, { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON' } }, 400);
  }

  const isBatch = Array.isArray(body);
  const requests = isBatch ? body : [body];
  const results = [];
  for (const req of requests) {
    const res = await handleRpc(env, req);
    if (res) results.push(res);
  }

  if (results.length === 0) return new Response(null, { status: 204, headers: CORS });
  return json(isBatch ? results : results[0], 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

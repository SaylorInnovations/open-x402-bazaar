// A real MCP server over the same catalog the HTTP discovery API serves — the
// catalog is the marketplace, this is just another client of it (see README).
// Implements MCP's Streamable HTTP transport in stateless mode: one JSON-RPC
// request in, one JSON-RPC response out, no session/SSE needed for what these
// tools do (Cloudflare Pages Functions are stateless per-request anyway).
import { searchResources, listResources, merchantResources, getResourceBySlugOrId, getProvider, getStats } from './db.js';

const PROTOCOL_VERSION_FALLBACK = '2024-11-05';
const SERVER_INFO = { name: 'agent-bazaar', version: '0.3.0' };

const TOOLS = [
  {
    name: 'search_resources',
    description: 'Search the marketplace by keyword and/or filters (network, asset, scheme, payTo, maxUsdPrice). Text queries rank by relevance; filter-only queries rank by 30-day call volume.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text keyword search' },
        network: { type: 'string', description: 'e.g. eip155:8453, solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
        asset: { type: 'string' },
        scheme: { type: 'string' },
        payTo: { type: 'string' },
        maxUsdPrice: { type: 'number' },
        limit: { type: 'integer', default: 20, maximum: 100 },
      },
    },
  },
  {
    name: 'get_resource',
    description: "Fetch one resource's full record by slug or numeric id: description, accepts[], output schema, quality signal, and agent-first metadata where the provider supplied it.",
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'get_pricing',
    description: 'Get just the price/accepts[] for a resource, without the full record — cheaper for an agent that only needs to decide whether it can afford something.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'discover_provider',
    description: 'List every resource published by a given provider host.',
    inputSchema: { type: 'object', properties: { host: { type: 'string' } }, required: ['host'] },
  },
  {
    name: 'list_resources',
    description: 'Paginated listing of every indexed resource, ranked by 30-day call volume (or recency with sort="recent").',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 20, maximum: 100 },
        offset: { type: 'integer', default: 0 },
        sort: { type: 'string', enum: ['popular', 'recent'] },
      },
    },
  },
  {
    name: 'get_stats',
    description: 'Catalog-wide totals: listings, resources, accepts, merchants, 30-day call volume, network/source breakdown.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}
function errorResult(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function callTool(env, name, args = {}) {
  switch (name) {
    case 'search_resources':
      return textResult(await searchResources(env, args));
    case 'get_resource': {
      if (!args.slug) return errorResult('slug is required');
      const r = await getResourceBySlugOrId(env, String(args.slug));
      return r ? textResult(r) : errorResult(`no resource found for slug "${args.slug}"`);
    }
    case 'get_pricing': {
      if (!args.slug) return errorResult('slug is required');
      const r = await getResourceBySlugOrId(env, String(args.slug));
      return r ? textResult({ resource: r.resource, accepts: r.accepts }) : errorResult(`no resource found for slug "${args.slug}"`);
    }
    case 'discover_provider': {
      if (!args.host) return errorResult('host is required');
      const p = await getProvider(env, args.host);
      return p ? textResult(p) : errorResult(`no provider found for host "${args.host}"`);
    }
    case 'list_resources':
      return textResult(await listResources(env, args));
    case 'get_stats':
      return textResult(await getStats(env));
    default:
      return errorResult(`unknown tool "${name}"`);
  }
}

async function handleRpc(env, req) {
  const { id, method, params } = req;
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const replyError = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  try {
    if (method === 'initialize') {
      return reply({
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION_FALLBACK,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: 'Agent Bazaar: search and inspect x402-payable resources. Payment itself happens directly against the resource, not through this MCP server.',
      });
    }
    if (method === 'notifications/initialized') {
      return null; // no response for notifications
    }
    if (method === 'tools/list') {
      return reply({ tools: TOOLS });
    }
    if (method === 'tools/call') {
      const result = await callTool(env, params?.name, params?.arguments);
      return reply(result);
    }
    if (method === 'ping') {
      return reply({});
    }
    return replyError(-32601, `method not found: ${method}`);
  } catch (e) {
    return replyError(-32603, String(e?.message || e));
  }
}

export { TOOLS, callTool, handleRpc, SERVER_INFO };

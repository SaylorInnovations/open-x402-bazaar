import { searchAgents, listAgents } from '../../src/agentRegistry.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);

  if (q.query) {
    const agents = await searchAgents(env, { query: q.query, limit: q.limit });
    return new Response(JSON.stringify({ query: q.query, count: agents.length, agents }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const { agents, total, limit, offset } = await listAgents(env, { limit: q.limit, offset: q.offset });
  return new Response(JSON.stringify({ agents, total, limit, offset }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

import { listResources } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  try {
    const { resources, total, limit, offset } = await listResources(env, { limit: q.limit, offset: q.offset, sort: q.sort });

    return new Response(
      JSON.stringify({ x402Version: 2, resources, total, limit, offset }),
      { headers: { ...CORS, 'content-type': 'application/json' } }
    );
  } catch {
    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const offset = Math.max(Number(q.offset) || 0, 0);
    return new Response(
      JSON.stringify({ x402Version: 2, resources: [], total: 0, limit, offset, partialResults: true, warning: 'catalog temporarily unavailable' }),
      { status: 200, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}

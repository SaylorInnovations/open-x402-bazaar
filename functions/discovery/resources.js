import { listResources } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const { resources, total, limit, offset } = await listResources(env, { limit: q.limit, offset: q.offset, sort: q.sort });

  return new Response(
    JSON.stringify({ x402Version: 2, resources, total, limit, offset }),
    { headers: { ...CORS, 'content-type': 'application/json' } }
  );
}

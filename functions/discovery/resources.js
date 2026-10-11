import { listResources } from '../../src/db.js';
import { fallbackHeaders, fallbackListResources } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  try {
    const { resources, total, limit, offset } = await listResources(env, { limit: q.limit, offset: q.offset, sort: q.sort });

    return new Response(
      JSON.stringify({ x402Version: 2, resources, items: resources, total, limit, offset, pagination: { total, limit, offset } }),
      { headers: { ...CORS, 'content-type': 'application/json' } }
    );
  } catch (error) {
    const { resources, total, limit, offset, fallback } = await fallbackListResources(q);
    return new Response(
      JSON.stringify({ x402Version: 2, resources, items: resources, total, limit, offset, pagination: { total, limit, offset }, fallback, warning: 'Primary catalog database is temporarily unavailable; serving verified Saylor Innovations manifest listings.' }),
      { headers: fallbackHeaders() }
    );
  }
}

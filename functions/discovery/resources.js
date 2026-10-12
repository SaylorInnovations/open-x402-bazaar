import { listResources } from '../../src/db.js';
import { fallbackListResources } from '../../src/saylor-fallback.js';

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
    const fallback = await fallbackListResources({ limit: q.limit, offset: q.offset, sort: q.sort });
    return new Response(
      JSON.stringify({
        x402Version: 2,
        resources: fallback.resources,
        total: fallback.total,
        limit: fallback.limit,
        offset: fallback.offset,
        partialResults: true,
        fallback: fallback.fallback,
        warning: 'catalog database temporarily unavailable; returning live Saylor official listings only',
      }),
      { status: 200, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}

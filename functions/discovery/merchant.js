import { merchantResources } from '../../src/db.js';
import { fallbackHeaders, fallbackSearchResources } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  if (!q.payTo) {
    return new Response(JSON.stringify({ error: 'payTo query parameter is required' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  try {
    const resources = await merchantResources(env, q.payTo);
    return new Response(JSON.stringify({ x402Version: 2, payTo: q.payTo, resources, items: resources, pagination: { total: resources.length, limit: resources.length, offset: 0 } }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch {
    const { resources, items, total, limit, offset, pagination, fallback } = await fallbackSearchResources({ payTo: q.payTo, limit: q.limit || 100, offset: q.offset });
    return new Response(JSON.stringify({ x402Version: 2, payTo: q.payTo, resources, items, total, limit, offset, pagination, fallback }), {
      headers: fallbackHeaders(),
    });
  }
}

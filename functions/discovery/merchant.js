import { merchantResources } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  if (!q.payTo) {
    return new Response(JSON.stringify({ error: 'payTo query parameter is required' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const resources = await merchantResources(env, q.payTo);
  return new Response(JSON.stringify({ x402Version: 2, payTo: q.payTo, resources }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

import { getFeaturedResources } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const limit = new URL(request.url).searchParams.get('limit');
  const resources = await getFeaturedResources(env, { limit });
  return new Response(JSON.stringify({ resources }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

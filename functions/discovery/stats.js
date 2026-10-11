import { getStats } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const full = new URL(request.url).searchParams.get('full') === '1';
  const stats = await getStats(env, { full });
  return new Response(JSON.stringify(stats), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

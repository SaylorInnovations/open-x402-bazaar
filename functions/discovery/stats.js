import { getStats } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ env }) {
  const stats = await getStats(env);
  return new Response(JSON.stringify(stats), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

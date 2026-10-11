import { getStats } from '../../src/db.js';
import { fallbackHeaders, fallbackListResources } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const full = new URL(request.url).searchParams.get('full') === '1';
  try {
    const stats = await getStats(env, { full });
    return new Response(JSON.stringify(stats), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch {
    const { total } = await fallbackListResources({ limit: 1 });
    return new Response(
      JSON.stringify({
        listings: 1,
        resources: total,
        accepts: null,
        merchants: null,
        networks: null,
        fallback: 'saylor-manifest',
        warning: 'Primary catalog database is temporarily unavailable; counts cover verified Saylor Innovations manifest listings only.',
      }),
      { headers: fallbackHeaders() }
    );
  }
}

import { fetchInsights } from '../../src/insights.js';
import { withEdgeCache } from '../../src/edgeCache.js';

const CORS = { 'access-control-allow-origin': '*' };

// GET /discovery/insights — what agents pay for across x402 (free, JSON).
export async function onRequestGet(context) {
  return withEdgeCache(context, 3600, async () => {
    try {
      const data = await fetchInsights();
      return { response: new Response(JSON.stringify(data), { headers: { ...CORS, 'content-type': 'application/json' } }), cacheable: true };
    } catch (e) {
      return { response: new Response(JSON.stringify({ error: 'insights temporarily unavailable' }), { status: 503, headers: { ...CORS, 'content-type': 'application/json', 'retry-after': '120' } }), cacheable: false };
    }
  });
}

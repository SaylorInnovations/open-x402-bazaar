import { searchResources } from '../../src/db.js';
import { fallbackSearchResources } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);

  try {
    const resources = await searchResources(env, {
      query: q.query,
      network: q.network,
      asset: q.asset,
      scheme: q.scheme,
      payTo: q.payTo,
      maxUsdPrice: q.maxUsdPrice,
      urlSubstring: q.urlSubstring,
      limit: q.limit,
    });

    return new Response(
      JSON.stringify({
        x402Version: 2,
        resources,
        partialResults: false,
        searchMethod: q.query ? 'text' : 'filter',
      }),
      { headers: { ...CORS, 'content-type': 'application/json' } }
    );
  } catch {
    const fallback = await fallbackSearchResources({
      query: q.query,
      network: q.network,
      asset: q.asset,
      scheme: q.scheme,
      payTo: q.payTo,
      maxUsdPrice: q.maxUsdPrice,
      urlSubstring: q.urlSubstring,
      limit: q.limit,
    });
    return new Response(
      JSON.stringify({
        x402Version: 2,
        resources: fallback.resources,
        partialResults: true,
        searchMethod: q.query ? 'text' : 'filter',
        fallback: fallback.fallback,
        warning: 'catalog database temporarily unavailable; returning live Saylor official listings only',
      }),
      { status: 200, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}

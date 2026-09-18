import { searchResources } from '../../src/db.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);

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
}

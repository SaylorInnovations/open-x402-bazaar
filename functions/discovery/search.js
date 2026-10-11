import { searchResources } from '../../src/db.js';
import { fallbackHeaders, fallbackSearchResources } from '../../src/saylor-fallback.js';

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
        items: resources,
        pagination: { total: resources.length, limit: resources.length, offset: 0 },
        partialResults: false,
        searchMethod: q.query ? 'text' : 'filter',
      }),
      { headers: { ...CORS, 'content-type': 'application/json' } }
    );
  } catch (error) {
    const { resources, items, pagination, fallback } = await fallbackSearchResources(q);
    return new Response(
      JSON.stringify({
        x402Version: 2,
        resources,
        items,
        total: pagination.total,
        limit: pagination.limit,
        offset: pagination.offset,
        pagination,
        partialResults: true,
        searchMethod: q.query ? 'text' : 'filter',
        fallback,
        warning: 'Primary catalog database is temporarily unavailable; searching verified Saylor Innovations manifest listings.',
      }),
      { headers: fallbackHeaders() }
    );
  }
}

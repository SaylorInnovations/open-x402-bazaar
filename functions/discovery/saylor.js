import { fallbackSaylorOfficial } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ request }) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const page = await fallbackSaylorOfficial({
    query: q.query,
    family: q.family,
    resourceType: q.resourceType,
    tag: q.tag,
    network: q.network,
    asset: q.asset,
    scheme: q.scheme,
    payTo: q.payTo,
    maxUsdPrice: q.maxUsdPrice,
    limit: q.limit,
    offset: q.offset,
    sort: q.sort,
  });

  return new Response(
    JSON.stringify({
      x402Version: 2,
      provider: {
        host: 'saylorinnovations.com',
        name: 'Saylor Innovations',
        verified: true,
        manifestUrl: 'https://saylorinnovations.com/.well-known/x402.json',
      },
      resources: page.resources,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      source: page.fallback,
      filters: {
        query: q.query,
        family: q.family,
        resourceType: q.resourceType,
        tag: q.tag,
        network: q.network,
        asset: q.asset,
        scheme: q.scheme,
        payTo: q.payTo,
        maxUsdPrice: q.maxUsdPrice,
      },
    }),
    {
      headers: {
        ...CORS,
        'content-type': 'application/json',
        'cache-control': 'public, max-age=60',
      },
    }
  );
}

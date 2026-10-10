import { listDiscoveryFacets } from '../../src/db.js';
import { fallbackHeaders, fallbackListResources } from '../../src/saylor-fallback.js';

const CORS = { 'access-control-allow-origin': '*' };

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function top(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function fallbackFacets(resources, limit) {
  const networks = new Map();
  const assets = new Map();
  const schemes = new Map();
  const resourceTypes = new Map();
  const providers = new Map();
  let unknown = 0;

  for (const resource of resources) {
    increment(resourceTypes, resource.resourceType || 'api');
    increment(providers, resource.sourceHost);
    for (const accept of resource.accepts || []) {
      increment(networks, accept.network);
      increment(assets, accept.asset);
      increment(schemes, accept.scheme);
      if (accept.amountUsd === undefined && accept.amount === undefined) unknown += 1;
    }
  }

  return {
    networks: top(networks, limit),
    assets: top(assets, limit),
    schemes: top(schemes, limit),
    resourceTypes: top(resourceTypes, limit),
    providers: top(providers, limit),
    priceBands: { free: 0, micro: 0, subCent: 0, cents: 0, underDollar: 0, overDollar: 0, unknown },
    liveness: { live: 0, down: 0, unchecked: resources.length },
    trust: { verified: resources.length, mirrored: 0, featured: 0 },
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 100);

  try {
    const facets = await listDiscoveryFacets(env, { limit });
    return new Response(
      JSON.stringify({
        x402Version: 2,
        limit,
        facets,
        note: 'Facet counts are discovery hints for planning search filters. Fetch the live unpaid 402 from a resource before paying.',
      }),
      { headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } }
    );
  } catch {
    const { resources, total } = await fallbackListResources({ limit: 100 });
    return new Response(
      JSON.stringify({
        x402Version: 2,
        limit,
        facets: fallbackFacets(resources, limit),
        totalResourcesConsidered: total,
        fallback: 'saylor-manifest',
        warning: 'Primary catalog database is temporarily unavailable; facets cover verified Saylor Innovations manifest listings only.',
      }),
      { headers: fallbackHeaders() }
    );
  }
}

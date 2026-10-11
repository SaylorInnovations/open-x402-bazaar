const SAYLOR_MANIFEST = 'https://saylorinnovations.com/.well-known/x402.json';
const SAYLOR_HOST = 'saylorinnovations.com';

function clampLimit(limit, fallback = 20) {
  const n = Number(limit) || fallback;
  return Math.min(Math.max(n, 1), 1000);
}

function normalizeTags(endpoint) {
  const tags = endpoint.tags || [];
  const family = (() => {
    try {
      return new URL(endpoint.url).pathname.split('/').filter(Boolean)[1];
    } catch {
      return null;
    }
  })();
  return [...new Set([family, ...tags].filter(Boolean).map((t) => String(t).toLowerCase()))];
}

function callableUrl(url) {
  return String(url || '').replace(/\{([^}]+)\}/g, ':$1');
}

function paramsFromUrl(url) {
  const params = {};
  for (const name of String(url).matchAll(/\{([^}]+)\}/g)) {
    params[name[1]] = `Required ${name[1]} parameter.`;
  }
  for (const name of String(url).matchAll(/[?&]([^=&#]+)=\{([^}]+)\}/g)) {
    params[name[1]] = `Required ${name[1]} query parameter.`;
  }
  return params;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function endpointName(endpoint) {
  if (endpoint.serviceName) return endpoint.serviceName;
  try {
    const path = decodeURIComponent(new URL(endpoint.url).pathname).replace(/^\/api\//, '').replace(/[{}]/g, '');
    return `Saylor ${path.split('/').filter(Boolean).join(' ')}`;
  } catch {
    return 'Saylor x402 API';
  }
}

function discoveryExtensions(endpoint, resourceUrl) {
  const method = String(endpoint.method || 'GET').toUpperCase();
  const parameters = paramsFromUrl(endpoint.url);
  const info = {
    input: {
      type: 'http',
      method,
      discoverable: true,
      ...(Object.keys(parameters).length ? { parameters } : {}),
    },
    output: {
      type: 'json',
    },
  };
  if (endpoint.exampleUrl || endpoint.freeSample) info.input.exampleUrl = endpoint.exampleUrl || endpoint.freeSample;
  if (endpoint.outputExample) info.output.example = endpoint.outputExample;

  const schema = endpoint.outputSchema
    ? {
        type: 'object',
        properties: {
          output: endpoint.outputSchema,
        },
      }
    : undefined;

  return {
    bazaar: {
      info,
      ...(schema ? { schema } : {}),
      canonicalResource: endpoint.url,
      callableResource: resourceUrl,
    },
  };
}

function toDiscoveryResource(endpoint, index) {
  const accepts = Array.isArray(endpoint.accepts) ? endpoint.accepts : [];
  const url = callableUrl(endpoint.url);
  const name = endpointName(endpoint);
  return {
    id: `saylor-fallback-${index + 1}`,
    slug: slugify(name || url) || `saylor-${index + 1}`,
    resource: url,
    serviceName: name,
    description: endpoint.description || name,
    type: 'http',
    resourceType: 'api',
    x402Version: 2,
    accepts,
    outputSchema: endpoint.outputSchema,
    tags: normalizeTags(endpoint),
    sourceHost: SAYLOR_HOST,
    lastUpdated: endpoint.updated || new Date().toISOString(),
    extensions: discoveryExtensions(endpoint, url),
    metadata: {
      name,
      provider: 'Saylor Innovations',
      useWhen: endpoint.useWhen || 'Use when an agent needs fresh external data that should be fetched from the source instead of guessed by a language model.',
      sideEffects: 'none',
      permissions: ['Read-only endpoint. No account or API key; send an x402 payment proof for paid calls.'],
      exampleUrl: endpoint.exampleUrl || endpoint.freeSample || null,
      canonicalResource: endpoint.url,
      callableResource: url,
      fallback: true,
      sourceManifest: SAYLOR_MANIFEST,
    },
    verified: true,
  };
}

async function fetchSaylorResources() {
  const res = await fetch(SAYLOR_MANIFEST, {
    headers: { accept: 'application/json', 'user-agent': 'AgentBazaarFallback/1.0' },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`Saylor manifest fallback failed: ${res.status}`);
  const manifest = await res.json();
  const endpoints = [...(manifest.liveDataEndpoints || []), ...(manifest.utilityEndpoints || [])].filter(
    (endpoint) => endpoint?.url && Array.isArray(endpoint.accepts) && endpoint.accepts.length > 0
  );
  return endpoints.map(toDiscoveryResource);
}

function matches(resource, filters) {
  if (filters.urlSubstring && !resource.resource.includes(filters.urlSubstring) && !resource.metadata?.canonicalResource?.includes(filters.urlSubstring)) return false;
  if (filters.query) {
    const haystack = [
      resource.resource,
      resource.metadata?.canonicalResource,
      resource.serviceName,
      resource.description,
      resource.metadata?.name,
      ...(resource.tags || []),
    ].join(' ').toLowerCase();
    for (const token of String(filters.query).toLowerCase().split(/\s+/).filter(Boolean)) {
      if (!haystack.includes(token)) return false;
    }
  }
  const acceptFilters = ['network', 'asset', 'scheme', 'payTo'];
  if (acceptFilters.some((key) => filters[key]) || filters.maxUsdPrice !== undefined) {
    return (resource.accepts || []).some((accept) => {
      if (filters.network && accept.network !== filters.network) return false;
      if (filters.asset && accept.asset !== filters.asset) return false;
      if (filters.scheme && accept.scheme !== filters.scheme) return false;
      if (filters.payTo && accept.payTo !== filters.payTo && accept.recipient !== filters.payTo) return false;
      if (filters.maxUsdPrice !== undefined) {
        const usd = accept.amountUsd ?? (Number(accept.amount) / 1e6);
        if (Number.isFinite(usd) && usd > Number(filters.maxUsdPrice)) return false;
      }
      return true;
    });
  }
  return true;
}

async function fallbackListResources({ limit, offset } = {}) {
  const lim = clampLimit(limit);
  const off = Math.max(Number(offset) || 0, 0);
  const all = await fetchSaylorResources();
  const resources = all.slice(off, off + lim);
  const pagination = { total: all.length, limit: lim, offset: off };
  return {
    resources,
    items: resources,
    total: all.length,
    limit: lim,
    offset: off,
    pagination,
    fallback: 'saylor-manifest',
  };
}

async function fallbackSearchResources(filters = {}) {
  const lim = clampLimit(filters.limit);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const resources = await fetchSaylorResources();
  const matched = resources.filter((resource) => matches(resource, filters));
  const page = matched.slice(offset, offset + lim);
  return {
    resources: page,
    items: page,
    total: matched.length,
    limit: lim,
    offset,
    pagination: { total: matched.length, limit: lim, offset },
    fallback: 'saylor-manifest',
  };
}

function fallbackHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
    'cache-control': 'public, max-age=300',
    'x-agent-bazaar-fallback': 'saylor-manifest',
    ...extra,
  };
}

export { fallbackListResources, fallbackSearchResources, fallbackHeaders, SAYLOR_MANIFEST };

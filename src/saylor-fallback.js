const SAYLOR_MANIFEST = 'https://saylorinnovations.com/.well-known/x402.json';
const SAYLOR_HOST = 'saylorinnovations.com';
const MIN_USD_BASE_UNITS = 10000;
const MIN_USD_AMOUNT = 0.01;

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
  const pathTags = (() => {
    try {
      return new URL(endpoint.url).pathname.split('/').filter(Boolean).slice(1);
    } catch {
      return [];
    }
  })();
  return [
    ...new Set(
      [family, ...pathTags, ...tags, 'x402', 'paid-api', 'pay-per-request', 'agent-ready']
        .filter(Boolean)
        .map((t) => String(t).toLowerCase().replace(/[{}:]/g, '').replace(/[_\s]+/g, '-').trim())
        .filter(Boolean)
    ),
  ];
}

function callableUrl(url) {
  return String(url || '').replace(/\{([^}]+)\}/g, ':$1');
}

function normalizeAccept(accept) {
  const out = { ...accept };
  const amount = Number(out.amount ?? out.maxAmountRequired);
  if (Number.isFinite(amount) && amount > 0 && amount < MIN_USD_BASE_UNITS) {
    out.amount = String(MIN_USD_BASE_UNITS);
    if (out.maxAmountRequired !== undefined) out.maxAmountRequired = String(MIN_USD_BASE_UNITS);
  }
  const usd = Number(out.amountUsd);
  if (Number.isFinite(usd) && usd > 0 && usd < MIN_USD_AMOUNT) out.amountUsd = MIN_USD_AMOUNT;
  if (Number.isFinite(amount) && amount > 0 && amount < MIN_USD_BASE_UNITS && out.amountUsd === undefined) out.amountUsd = MIN_USD_AMOUNT;
  return out;
}

const PARAM_HINTS = {
  address: 'Blockchain wallet or account address.',
  base: 'Base currency or asset code, for example USD.',
  chain: 'Blockchain network name or chain identifier.',
  country: 'Country name or ISO country code.',
  cve: 'CVE identifier, for example CVE-2021-44228.',
  doi: 'Digital Object Identifier.',
  mint: 'Solana SPL token mint address.',
  name: 'Package, project, or entity name.',
  number: 'Block number or the literal latest when supported.',
  package: 'Package name.',
  q: 'Search query.',
  query: 'Search query.',
  slug: 'Resource or content slug.',
  symbol: 'Ticker or asset symbol.',
};

function paramHint(name, required, kind) {
  const base = PARAM_HINTS[name] || `${kind === 'query' ? 'Query' : 'Path'} parameter.`;
  return `${required ? 'Required' : 'Optional'} ${name}: ${base}`;
}

function paramsFromUrl(url, exampleUrl) {
  const params = {};
  for (const name of String(url).matchAll(/\{([^}]+)\}/g)) {
    params[name[1]] = paramHint(name[1], true, 'path');
  }
  for (const name of String(url).matchAll(/[?&]([^=&#]+)=\{([^}]+)\}/g)) {
    params[name[1]] = paramHint(name[1], true, 'query');
  }
  if (exampleUrl) {
    try {
      for (const [key] of new URL(exampleUrl).searchParams) {
        if (!params[key]) params[key] = paramHint(key, false, 'query');
      }
    } catch {}
  }
  return params;
}

function inferredOutputSchema(endpoint) {
  if (endpoint.outputSchema) return endpoint.outputSchema;
  return {
    type: 'object',
    additionalProperties: true,
    properties: {
      ok: { type: 'boolean' },
      data: { description: 'Primary JSON payload for this endpoint.' },
      source: { type: 'string' },
      updatedAt: { type: 'string' },
      error: { type: 'string' },
    },
  };
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

function discoveryExtensions(endpoint, resourceUrl, outputSchema) {
  const method = String(endpoint.method || 'GET').toUpperCase();
  const exampleUrl = endpoint.exampleUrl || endpoint.freeSample || (!String(endpoint.url || '').includes('{') ? endpoint.url : undefined);
  const parameters = paramsFromUrl(endpoint.url, exampleUrl);
  const info = {
    input: {
      type: 'http',
      method,
      discoverable: true,
      ...(Object.keys(parameters).length ? { parameters } : {}),
    },
    output: {
      type: 'json',
      schema: outputSchema,
    },
  };
  if (exampleUrl) info.input.exampleUrl = exampleUrl;
  if (endpoint.outputExample) info.output.example = endpoint.outputExample;

  return {
    bazaar: {
      info,
      schema: {
        type: 'object',
        properties: {
          output: outputSchema,
        },
      },
      canonicalResource: endpoint.url,
      callableResource: resourceUrl,
    },
  };
}

function toDiscoveryResource(endpoint, index) {
  const accepts = Array.isArray(endpoint.accepts) ? endpoint.accepts.map(normalizeAccept) : [];
  const url = callableUrl(endpoint.url);
  const name = endpointName(endpoint);
  const outputSchema = inferredOutputSchema(endpoint);
  const exampleUrl = endpoint.exampleUrl || endpoint.freeSample || (!String(endpoint.url || '').includes('{') ? endpoint.url : null);
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
    outputSchema,
    tags: normalizeTags(endpoint),
    sourceHost: SAYLOR_HOST,
    lastUpdated: endpoint.updated || new Date().toISOString(),
    extensions: discoveryExtensions(endpoint, url, outputSchema),
    metadata: {
      name,
      provider: 'Saylor Innovations',
      capabilities: [endpoint.description || name],
      useWhen: endpoint.useWhen || 'Use when an agent needs fresh external data that should be fetched from the source instead of guessed by a language model.',
      doNotUseWhen: endpoint.doNotUseWhen || 'Do not use as sole authority for regulated professional advice, safety-critical action, trade execution, or irreversible decisions without independent verification.',
      sideEffects: 'none',
      permissions: ['Read-only endpoint. No account or API key; send an x402 payment proof for paid calls.'],
      exampleUrl,
      documentation: 'https://x402.saylorinnovations.com',
      license: endpoint.license || 'Commercial - pay-per-request via x402',
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

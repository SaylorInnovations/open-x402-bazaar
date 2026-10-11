#!/usr/bin/env node
// Rebuilds Agent Bazaar's own /.well-known/x402.json from the live Saylor
// Innovations manifest so crawler-facing resources stay broad, current and
// Coinbase Bazaar-friendly.

import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/.well-known/x402.json';
const SAYLOR_MANIFEST = 'https://saylorinnovations.com/.well-known/x402.json';
const MAX_RESOURCES = Number(process.env.MAX_RESOURCES || 0);
const MAX_ACCEPTS = Number(process.env.MAX_ACCEPTS || 3);
const MIN_USD_BASE_UNITS = 10000;
const MIN_USD_AMOUNT = 0.01;
const POPULARITY_HINTS = new Map([
  ['/api/token-price/solana/', 2700],
  ['/api/stocks/quote/', 2000],
  ['/api/python/report', 800],
  ['/api/kb/cuda-driver-ollama', 640],
  ['/api/data/country', 630],
  ['/api/data/economy', 620],
  ['/api/data/exchange-rates', 610],
  ['/api/docs/pypi/', 600],
  ['/api/evm/ethereum/block/', 590],
  ['/api/package/report', 580],
  ['/api/package/search', 570],
  ['/api/research/doi', 560],
  ['/api/research/search', 550],
  ['/api/security/cve', 540],
  ['/api/games/deals', 530],
  ['/api/aircraft/military', 520],
  ['/api/market/bestsellers', 510],
  ['/api/security/{mint}', 500],
]);

function callableUrl(url) {
  return String(url || '').replace(/\{([^}]+)\}/g, ':$1');
}

function cleanTag(tag) {
  let value = String(tag || '');
  try {
    value = decodeURIComponent(value);
  } catch {}
  return value
    .toLowerCase()
    .replace(/[{}:]/g, '')
    .replace(/[_\s]+/g, '-')
    .trim();
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

function acceptRank(accept) {
  const network = String(accept.network || '');
  const asset = String(accept.asset || '');
  if (network === 'eip155:8453') return 0;
  if (network.startsWith('solana:') && asset === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') return 1;
  if (network.startsWith('solana:')) return 2;
  if (network === 'eip155:137') return 3;
  if (network === 'eip155:42161') return 4;
  return 5;
}

function shapeAccepts(accepts) {
  return accepts
    .map(normalizeAccept)
    .sort((a, b) => acceptRank(a) - acceptRank(b))
    .slice(0, MAX_ACCEPTS);
}

function dedupe(items) {
  return Array.from(new Set(items.map(cleanTag).filter(Boolean)));
}

function familyOf(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[1] || parts[0] || 'api';
  } catch {
    return 'api';
  }
}

function titleFromUrl(url) {
  try {
    const path = decodeURIComponent(new URL(url).pathname)
      .replace(/^\/api\//, '')
      .replace(/[{}]/g, '')
      .replace(/[:?=&]/g, ' ');
    return `Saylor ${path.split('/').filter(Boolean).join(' ') || 'x402 API'}`;
  } catch {
    return 'Saylor x402 API';
  }
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

function splitParams(url, exampleUrl) {
  const pathParams = {};
  const queryParams = {};
  for (const name of String(url).matchAll(/\{([^}]+)\}/g)) {
    pathParams[name[1]] = sampleForParam(name[1]);
  }
  for (const name of String(url).matchAll(/[?&]([^=&#]+)=\{([^}]+)\}/g)) {
    queryParams[name[1]] = sampleForParam(name[1]);
  }
  if (exampleUrl) {
    try {
      for (const [key, value] of new URL(exampleUrl).searchParams) {
        if (!queryParams[key]) queryParams[key] = value || sampleForParam(key);
      }
    } catch {}
  }
  return { pathParams, queryParams };
}

function sampleForParam(name) {
  const samples = {
    address: '0x0000000000000000000000000000000000000000',
    base: 'USD',
    chain: 'ethereum',
    country: 'US',
    cve: 'CVE-2021-44228',
    doi: '10.1038/nphys1170',
    mint: 'So11111111111111111111111111111111111111112',
    name: 'typescript',
    number: 'latest',
    package: 'fastapi',
    q: 'machine learning',
    query: 'machine learning',
    slug: 'example',
    symbol: 'AAPL',
  };
  return samples[name] || `example_${name}`;
}

function schemaForParam(name) {
  return {
    type: 'string',
    description: PARAM_HINTS[name] || 'Request parameter.',
  };
}

function objectSchemaForParams(params) {
  const keys = Object.keys(params);
  return {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(keys.map((key) => [key, schemaForParam(key)])),
    required: keys,
  };
}

function resourceType(endpoint) {
  if (endpoint.__source === 'guide') return 'Guide';
  const tags = (endpoint.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => ['solana', 'evm', 'onchain', 'token-data', 'defi'].includes(t))) return 'Blockchain Data';
  if (tags.some((t) => ['docs', 'documentation', 'npm', 'pypi', 'github', 'coding'].includes(t))) return 'Developer Tool';
  if (tags.some((t) => ['research', 'papers', 'doi', 'citations'].includes(t))) return 'Research Data';
  if (tags.some((t) => ['security', 'cve', 'vulnerabilities', 'sanctions'].includes(t))) return 'Security Data';
  return 'API';
}

function inferredOutputSchema(endpoint, type) {
  if (endpoint.outputSchema) return endpoint.outputSchema;
  if (type === 'Guide') {
    return {
      type: 'object',
      additionalProperties: true,
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        content: { type: 'string' },
        sections: { type: 'array', items: { type: 'object' } },
        updatedAt: { type: 'string' },
      },
    };
  }
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

function exampleFromSchema(schema) {
  const props = schema?.properties || {};
  const out = {};
  for (const [key, value] of Object.entries(props).slice(0, 5)) {
    if (value?.type === 'boolean') out[key] = true;
    else if (value?.type === 'number' || value?.type === 'integer') out[key] = 1;
    else if (value?.type === 'array') out[key] = [];
    else if (value?.type === 'object') out[key] = {};
    else out[key] = key === 'error' ? null : `example_${key}`;
  }
  return out;
}

function shapeResource(endpoint) {
  const canonical = endpoint.url;
  const url = callableUrl(canonical);
  const serviceName = endpoint.serviceName || endpoint.title || endpoint.name || titleFromUrl(canonical);
  const description = endpoint.description || endpoint.summary || endpoint.title || serviceName;
  const type = endpoint.resourceType || resourceType(endpoint);
  const outputSchema = inferredOutputSchema(endpoint, type);
  const pathTags = (() => {
    try {
      return decodeURIComponent(new URL(canonical).pathname).split('/').filter(Boolean).slice(1);
    } catch {
      return [];
    }
  })();
  const exampleUrl = endpoint.exampleUrl || endpoint.freeSample || (!canonical.includes('{') ? canonical : undefined);
  const tags = dedupe([familyOf(canonical), ...pathTags, ...(endpoint.tags || [])]).slice(0, 5);
  const { pathParams, queryParams } = splitParams(canonical, exampleUrl);
  const method = String(endpoint.method || 'GET').toUpperCase();
  const inputInfo = {
    type: 'http',
    method,
    discoverable: true,
    ...(Object.keys(pathParams).length ? { pathParams } : {}),
    ...(Object.keys(queryParams).length ? { queryParams } : {}),
  };
  const inputSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      type: { const: 'http', type: 'string' },
      method: { enum: [method], type: 'string' },
      ...(Object.keys(pathParams).length ? { pathParams: objectSchemaForParams(pathParams) } : {}),
      ...(Object.keys(queryParams).length ? { queryParams: objectSchemaForParams(queryParams) } : {}),
    },
    required: ['type', 'method'],
  };
  if (Object.keys(pathParams).length) inputSchema.required.push('pathParams');
  if (Object.keys(queryParams).length) inputSchema.required.push('queryParams');
  const outputExample = endpoint.outputExample || exampleFromSchema(outputSchema);
  const shaped = {
    resource: url,
    serviceName,
    description,
    type: 'http',
    x402Version: endpoint.x402Version || 2,
    tags,
    accepts: shapeAccepts(endpoint.accepts),
    lastUpdated: new Date().toISOString(),
    _discoveryPriority: popularityScore(endpoint.url),
    extensions: {
      bazaar: {
        info: {
          input: inputInfo,
          output: {
            type: 'json',
            example: outputExample,
          },
        },
        routeTemplate: (() => {
          try {
            return new URL(url).pathname;
          } catch {
            return undefined;
          }
        })(),
        canonicalResource: canonical,
        callableResource: url,
      },
    },
  };
  shaped.extensions.bazaar.schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      input: inputSchema,
      output: {
        type: 'object',
        properties: {
          type: { const: 'json', type: 'string' },
          example: outputSchema,
        },
        required: ['type'],
      },
    },
    required: ['input'],
  };
  return shaped;
}

function popularityScore(url) {
  for (const [needle, score] of POPULARITY_HINTS) {
    if (String(url).includes(needle)) return score;
  }
  return 0;
}

async function main() {
  const bazaar = JSON.parse(readFileSync(OUT, 'utf8'));
  const live = await fetch(SAYLOR_MANIFEST, {
    headers: { accept: 'application/json', 'user-agent': 'AgentBazaarManifestSync/1.0' },
  });
  if (!live.ok) throw new Error(`fetch ${SAYLOR_MANIFEST} failed: ${live.status}`);
  const manifest = await live.json();
  const candidates = [
    ...(manifest.liveDataEndpoints || []).map((endpoint) => ({ ...endpoint, __source: 'liveDataEndpoint' })),
    ...(manifest.utilityEndpoints || []).map((endpoint) => ({ ...endpoint, __source: 'utilityEndpoint' })),
    ...(manifest.resources || []).map((endpoint) => ({ ...endpoint, __source: 'guide' })),
  ].filter((endpoint) => endpoint?.url && Array.isArray(endpoint.accepts) && endpoint.accepts.length > 0);

  const seen = new Set();
  const resources = [];
  for (const endpoint of candidates) {
    const key = endpoint.url;
    if (seen.has(key)) continue;
    seen.add(key);
    resources.push(shapeResource(endpoint));
  }
  resources.sort((a, b) => (b._discoveryPriority || 0) - (a._discoveryPriority || 0) || a.resource.localeCompare(b.resource));
  for (const resource of resources) delete resource._discoveryPriority;

  bazaar.updated = new Date().toISOString().slice(0, 10);
  bazaar.resources = MAX_RESOURCES > 0 ? resources.slice(0, MAX_RESOURCES) : resources;
  writeFileSync(OUT, JSON.stringify(bazaar, null, 2) + '\n');
  console.log(`Wrote ${bazaar.resources.length} payable endpoint resource(s) to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

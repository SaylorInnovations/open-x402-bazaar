#!/usr/bin/env node
// Rebuilds Agent Bazaar's own /.well-known/x402.json from the live Saylor
// Innovations manifest so crawler-facing resources stay broad, current and
// Coinbase Bazaar-friendly.

import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/.well-known/x402.json';
const SAYLOR_MANIFEST = 'https://saylorinnovations.com/.well-known/x402.json';
const MAX_RESOURCES = Number(process.env.MAX_RESOURCES || 0);
// Keep all real payment rails by default. Set MAX_ACCEPTS only for controlled
// experiments; discovery should advertise every network agents can actually pay on.
const MAX_ACCEPTS = Number(process.env.MAX_ACCEPTS || 0);
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
const TOP_PAID_PATTERNS = [
  {
    needle: '/api/base/token/',
    priority: 5200,
    serviceName: 'Saylor Token Verdict',
    description: 'Base token contract verdict: risk score, plain-English take, holder concentration, owner privileges, taxes, liquidity, pair age and buy/sell safety signals.',
    tags: ['agents', 'token', 'verdict', 'base'],
    outputExample: { verdict: 'caution', score: 72, one_liner: 'Live liquidity, elevated holder concentration.', reasons: [], liquidity_usd: 125000 },
  },
  {
    needle: '/api/web/read',
    priority: 5100,
    serviceName: 'Saylor Web Read',
    description: 'Read a public web page as clean markdown for agents: title, canonical URL, main content, links, tables, code blocks and extraction caveats.',
    tags: ['web', 'read', 'markdown', 'agent'],
    outputExample: { title: 'Example page', url: 'https://example.com', markdown: '# Example page\n\nClean extracted content...', links: [] },
  },
  {
    needle: '/api/mcp-scan',
    priority: 5050,
    serviceName: 'Saylor MCP Security Scan',
    description: 'Scan an MCP server before connecting: tools, prompts, risky capabilities, prompt-injection strings, data-smuggling parameters, TLS and registry signals.',
    tags: ['mcp', 'security', 'scan', 'agent'],
    outputExample: { verdict: 'review', score: 81, riskyCapabilities: ['network'], findings: [] },
  },
  {
    needle: '/api/market/bestsellers',
    priority: 5000,
    serviceName: 'Saylor x402 Bestsellers',
    description: 'x402 demand feed: resources agents actually pay for, ranked by unique payers, paid calls, estimated revenue, category, network and price.',
    tags: ['x402', 'market', 'bestsellers', 'demand'],
    outputExample: { items: [], window: '30d', source: 'coinbase-bazaar-public-discovery' },
  },
  {
    needle: '/api/base/launches',
    priority: 4980,
    serviceName: 'Saylor Base Launch Radar',
    description: 'Fresh Base token launches with safety verdicts, liquidity, age, buy/sell flow, holder concentration and owner-risk flags.',
    tags: ['base', 'launches', 'token', 'verdict'],
    outputExample: { launches: [], filters: { safeOnly: false }, updatedAt: '2026-10-11T00:00:00Z' },
  },
  {
    needle: '/api/evm/base/transfers/',
    priority: 4960,
    serviceName: 'Saylor Base Token Activity',
    description: 'Base token transfer activity for agents: recent ERC-20/ERC-721 transfers, optional wallet filter, direction labels and decoded amounts.',
    tags: ['base', 'token', 'activity', 'transfers'],
    outputExample: { transfers: [], token: '0x4200000000000000000000000000000000000006', latestBlock: 1 },
  },
  {
    needle: '/api/evm/base/balance/',
    priority: 4940,
    serviceName: 'Saylor Base Wallet Profile',
    description: 'Base wallet profile: native ETH, selected ERC-20 balances, symbols, decimals, human-readable amounts and live chain head.',
    tags: ['base', 'wallet', 'profile', 'portfolio'],
    outputExample: { wallet: '0x0000000000000000000000000000000000000000', native: {}, tokens: [] },
  },
  {
    needle: '/api/docs/github/',
    priority: 4933,
    serviceName: 'Saylor GitHub Repo Docs',
    description: 'Public GitHub repository docs for coding agents: README sections, default branch metadata, repository URL, install hints and targeted section search.',
    tags: ['github', 'repo', 'docs', 'coding'],
    outputExample: { owner: 'vercel', repo: 'ai', sections: [], repository: 'https://github.com/vercel/ai' },
  },
  {
    needle: '/api/docs/go/',
    priority: 4932,
    serviceName: 'Saylor Go Module Docs',
    description: 'Go module documentation for coding agents: current README, pkg.go.dev link, version, install command and searchable sections.',
    tags: ['go', 'module', 'docs', 'coding'],
    outputExample: { module: 'github.com/gin-gonic/gin', version: 'latest', sections: [], install: 'go get github.com/gin-gonic/gin' },
  },
  {
    needle: '/api/docs/crates/',
    priority: 4931,
    serviceName: 'Saylor Rust Crate Docs',
    description: 'Rust crate documentation for coding agents: current README, docs.rs link, latest version, cargo install command and searchable sections.',
    tags: ['rust', 'crate', 'docs', 'coding'],
    outputExample: { crate: 'serde', version: 'latest', sections: [], install: 'cargo add serde' },
  },
  {
    needle: '/api/docs/',
    priority: 4920,
    serviceName: 'Saylor Package Docs',
    description: 'Package documentation for coding agents: current README, version, install command, docs URL, repository and searchable sections.',
    tags: ['docs', 'package', 'coding', 'agent'],
    outputExample: { package: 'fastapi', version: 'latest', sections: [], install: 'pip install fastapi' },
  },
  {
    needle: '/api/token-price/solana/',
    priority: 4900,
    serviceName: 'Saylor Solana Token Price',
    description: 'Solana token market snapshot: USD price, liquidity, volume, FDV, price changes and best pair for a mint address.',
    tags: ['solana', 'token', 'price', 'market'],
    outputExample: { mint: 'So11111111111111111111111111111111111111112', price_usd: 1, liquidity_usd: 1000000, volume_24h: 250000 },
  },
  {
    needle: '/api/security/{mint}',
    priority: 4880,
    serviceName: 'Saylor Solana Token Security',
    description: 'Solana token security verdict: mint/freeze authority, LP lock, top-holder concentration, RugCheck flags and plain-English safety summary.',
    tags: ['solana', 'token', 'security', 'verdict'],
    outputExample: { verdict: 'caution', riskScore: 41, flags: [], summary: 'No critical authority risk found.' },
  },
  {
    needle: '/api/wallet/{address}',
    priority: 4860,
    serviceName: 'Saylor Solana Wallet Profile',
    description: 'Solana wallet profile: SOL balance, token positions, recent activity, wallet age, failed-transaction rate and behavioral flags.',
    tags: ['solana', 'wallet', 'profile', 'portfolio'],
    outputExample: { address: '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7', balanceSol: 1, tokens: [], flags: [] },
  },
  {
    needle: '/api/agent/feeds',
    priority: 4840,
    serviceName: 'Saylor Feed Discovery',
    description: 'Discover RSS, Atom and JSON feeds for agent monitoring, summarization and ingestion workflows from a public website URL.',
    tags: ['web', 'feeds', 'monitoring', 'agent'],
    outputExample: { feeds: [{ type: 'rss', url: 'https://example.com/feed.xml' }], page: 'https://example.com' },
  },
];

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
  if (network === 'eip155:1') return 3;
  if (network === 'eip155:56') return 4;
  if (network === 'eip155:137') return 5;
  if (network === 'eip155:42161') return 6;
  if (network === 'eip155:10') return 7;
  if (network === 'eip155:43114') return 8;
  return 9;
}

function shapeAccepts(accepts) {
  const sorted = accepts.map(normalizeAccept).sort((a, b) => acceptRank(a) - acceptRank(b));
  return MAX_ACCEPTS > 0 ? sorted.slice(0, MAX_ACCEPTS) : sorted;
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

function topPaidPattern(endpoint) {
  const url = String(endpoint.url || '');
  return TOP_PAID_PATTERNS.find((pattern) => url.includes(pattern.needle));
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
    pathParams[name[1]] = sampleForParam(name[1], url);
  }
  for (const name of String(url).matchAll(/[?&]([^=&#]+)=\{([^}]+)\}/g)) {
    queryParams[name[1]] = sampleForParam(name[1], url);
  }
  if (exampleUrl) {
    try {
      for (const [key, value] of new URL(exampleUrl).searchParams) {
        if (!queryParams[key]) queryParams[key] = value || sampleForParam(key, url);
      }
    } catch {}
  }
  return { pathParams, queryParams };
}

function sampleForParam(name, url = '') {
  if (name === 'address' && (url.includes('/api/wallet/') || url.includes('/solana/'))) return '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7';
  if (['address', 'wallet', 'owner', 'spender', 'token', 'contract'].includes(name) && url.includes('/api/evm/')) return '0x4200000000000000000000000000000000000006';
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
    owner: 'vercel',
    package: 'fastapi',
    q: 'machine learning',
    query: 'machine learning',
    repo: 'ai',
    slug: 'example',
    symbol: 'AAPL',
    module: 'github.com/gin-gonic/gin',
    ecosystem: 'npm',
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
  const pattern = topPaidPattern(endpoint);
  const url = callableUrl(canonical);
  const serviceName = pattern?.serviceName || endpoint.serviceName || endpoint.title || endpoint.name || titleFromUrl(canonical);
  const description = pattern?.description || endpoint.description || endpoint.summary || endpoint.title || serviceName;
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
  const tags = pattern?.tags || dedupe([familyOf(canonical), ...pathTags, ...(endpoint.tags || [])]).slice(0, 5);
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
  const outputExample = pattern?.outputExample || endpoint.outputExample || exampleFromSchema(outputSchema);
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
  const pattern = topPaidPattern({ url });
  if (pattern) return pattern.priority;
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

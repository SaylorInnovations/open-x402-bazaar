#!/usr/bin/env node
// Rebuilds Agent Bazaar's own /.well-known/x402.json from the live Saylor
// Innovations manifest so crawler-facing resources stay broad, current and
// Coinbase Bazaar-friendly.

import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/.well-known/x402.json';
const SAYLOR_MANIFEST = 'https://saylorinnovations.com/.well-known/x402.json';
const MAX_RESOURCES = Number(process.env.MAX_RESOURCES || 0);
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

function dedupe(items) {
  return Array.from(new Set(items.filter(Boolean).map((t) => String(t).trim()).filter(Boolean)));
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

function resourceType(endpoint) {
  if (endpoint.__source === 'guide') return 'Guide';
  const tags = (endpoint.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => ['solana', 'evm', 'onchain', 'token-data', 'defi'].includes(t))) return 'Blockchain Data';
  if (tags.some((t) => ['docs', 'documentation', 'npm', 'pypi', 'github', 'coding'].includes(t))) return 'Developer Tool';
  if (tags.some((t) => ['research', 'papers', 'doi', 'citations'].includes(t))) return 'Research Data';
  if (tags.some((t) => ['security', 'cve', 'vulnerabilities', 'sanctions'].includes(t))) return 'Security Data';
  return 'API';
}

function useWhen(endpoint) {
  if (endpoint.__source === 'guide') return 'Use when an agent needs a focused technical guide, playbook or implementation reference before acting.';
  const tags = (endpoint.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes('token-price')) return 'Use when an agent needs live token price, liquidity or market context before ranking, quoting or alerting.';
  if (tags.includes('security') || tags.includes('cve')) return 'Use when an agent needs a machine-readable security, risk or vulnerability lookup.';
  if (tags.includes('docs') || tags.includes('documentation')) return 'Use when an agent needs current package or repository documentation without scraping pages.';
  if (tags.includes('research') || tags.includes('doi')) return 'Use when an agent needs publication metadata, DOI resolution or research discovery.';
  if (tags.includes('stocks') || tags.includes('market-data')) return 'Use when an agent needs live market data for a ticker, asset or macro data point.';
  return 'Use when an agent needs fresh external data that should be fetched from the source instead of guessed by a language model.';
}

function shapeResource(endpoint) {
  const canonical = endpoint.url;
  const url = callableUrl(canonical);
  const serviceName = endpoint.serviceName || endpoint.title || endpoint.name || titleFromUrl(canonical);
  const description = endpoint.description || endpoint.summary || endpoint.title || serviceName;
  const tags = dedupe([familyOf(canonical), ...(endpoint.tags || []), 'x402', 'pay-per-request', 'agent-ready']).map((t) => t.toLowerCase());
  const parameters = paramsFromUrl(canonical);
  const shaped = {
    url,
    serviceName,
    description,
    type: 'http',
    resourceType: endpoint.resourceType || resourceType(endpoint),
    x402Version: endpoint.x402Version || 2,
    tags,
    accepts: endpoint.accepts.map(normalizeAccept),
    metadata: {
      provider: 'Saylor Innovations',
      ...(popularityScore(endpoint.url) ? { discoveryPriority: popularityScore(endpoint.url) } : {}),
      ...(endpoint.category ? { category: endpoint.category } : {}),
      ...(endpoint.difficulty ? { difficulty: endpoint.difficulty } : {}),
      ...(endpoint.readMins ? { readMins: endpoint.readMins } : {}),
      useWhen: endpoint.useWhen || useWhen(endpoint),
      sideEffects: 'none',
      permissions: ['Read-only endpoint. No account or API key; send an x402 payment proof for paid calls.'],
      canonicalResource: canonical,
      ...(endpoint.exampleUrl || endpoint.freeSample ? { exampleUrl: endpoint.exampleUrl || endpoint.freeSample } : {}),
    },
    extensions: {
      bazaar: {
        info: {
          input: {
            type: 'http',
            method: String(endpoint.method || 'GET').toUpperCase(),
            discoverable: true,
            ...(Object.keys(parameters).length ? { parameters } : {}),
            ...(endpoint.exampleUrl || endpoint.freeSample ? { exampleUrl: endpoint.exampleUrl || endpoint.freeSample } : {}),
          },
          output: {
            type: 'json',
            ...(endpoint.outputExample ? { example: endpoint.outputExample } : {}),
          },
        },
        canonicalResource: canonical,
        callableResource: url,
      },
    },
  };
  if (endpoint.outputSchema) {
    shaped.outputSchema = endpoint.outputSchema;
    shaped.extensions.bazaar.schema = {
      type: 'object',
      properties: { output: endpoint.outputSchema },
    };
  }
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
  resources.sort((a, b) => (b.metadata?.discoveryPriority || 0) - (a.metadata?.discoveryPriority || 0) || a.url.localeCompare(b.url));

  bazaar.updated = new Date().toISOString().slice(0, 10);
  bazaar.resources = MAX_RESOURCES > 0 ? resources.slice(0, MAX_RESOURCES) : resources;
  writeFileSync(OUT, JSON.stringify(bazaar, null, 2) + '\n');
  console.log(`Wrote ${bazaar.resources.length} payable endpoint resource(s) to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

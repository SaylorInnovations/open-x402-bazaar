const SITE = 'https://saylorinnovations.com';
const HOST = 'saylorinnovations.com';
const SOLANA_NET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_PAYTO = '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const MIN_LISTING_PRICE_USD = 0.01;
const SAYLOR_SERVICE_NAME = 'Saylor Innovations';
const SAYLOR_ICON_URL = 'https://bazaar.saylorinnovations.com/assets/saylor-logo.jpg';
const USD_STABLECOINS_6DP = new Set([
  USDC_MINT,
  USDT_MINT,
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
]);

const SOLANA_INTELLIGENCE = [
  { path: '/api/price/{mint}', title: 'Solana Token Price', priceUsd: 0.01, amount: 10000, desc: 'Live price for a Solana SPL token by mint address.' },
  { path: '/api/compare?mints=', title: 'Solana Token Comparison', priceUsd: 0.01, amount: 10000, desc: 'Compare price, liquidity and momentum across multiple Solana tokens in one request.' },
  { path: '/api/launches', title: 'Solana New Token Launches', priceUsd: 0.01, amount: 10000, desc: 'Recently launched Solana tokens with early liquidity and momentum signals.' },
  { path: '/api/token/{mint}', title: 'Solana Token Report', priceUsd: 0.01, amount: 10000, desc: 'Full token report for a Solana mint: metadata, liquidity, holders and momentum.' },
  { path: '/api/narrative/{mint}', title: 'Solana Token Narrative', priceUsd: 0.01, amount: 10000, desc: 'Plain-language summary of what a Solana token is and why it is trending, generated from on-chain and social signals.' },
  { path: '/api/security/{mint}', title: 'Solana Token Security Intelligence', priceUsd: 0.01, amount: 10000, desc: 'On-chain risk report for a Solana token: mint/freeze authority, liquidity lock status, holder concentration and contract risk flags.' },
  { path: '/api/holders/{mint}', title: 'Solana Token Holder Distribution', priceUsd: 0.01, amount: 10000, desc: 'Holder concentration and distribution breakdown for a Solana token.' },
  { path: '/api/history/{mint}', title: 'Solana Token Price History', priceUsd: 0.01, amount: 10000, desc: 'Historical price and volume series for a Solana token.' },
  { path: '/api/wallet/{address}', title: 'Solana Wallet Report', priceUsd: 0.01, amount: 10000, desc: 'Holdings, activity and risk signals for a Solana wallet address.' },
  { path: '/api/trending', title: 'Solana Trending Tokens', priceUsd: 0.01, amount: 10000, desc: 'Currently trending Solana tokens ranked by momentum and volume.' },
];

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function normalizeAccept(a, fallbackAmountUsd) {
  const amountUsd = Math.max(Number(a.amountUsd ?? fallbackAmountUsd) || 0, MIN_LISTING_PRICE_USD);
  let amount = a.amount || a.maxAmountRequired;
  if (a.asset && USD_STABLECOINS_6DP.has(a.asset) && Number(amount) < MIN_LISTING_PRICE_USD * 1e6) {
    amount = String(MIN_LISTING_PRICE_USD * 1e6);
  }
  return {
    scheme: a.scheme,
    network: a.network,
    payTo: a.payTo,
    asset: a.asset || undefined,
    amount: amount || undefined,
    amountUsd,
    maxTimeoutSeconds: a.maxTimeoutSeconds ?? 120,
  };
}

function solanaAccepts(amountRaw, amountUsd) {
  return [
    normalizeAccept({ network: SOLANA_NET, scheme: 'exact', amount: String(amountRaw), asset: USDC_MINT, payTo: SOLANA_PAYTO, maxTimeoutSeconds: 120 }, amountUsd),
    normalizeAccept({ network: SOLANA_NET, scheme: 'exact', amount: String(amountRaw), asset: USDT_MINT, payTo: SOLANA_PAYTO, maxTimeoutSeconds: 120 }, amountUsd),
  ];
}

function routeParameters(url) {
  const rawPath = String(url).split('?')[0];
  const pathParams = [...rawPath.matchAll(/\{([^}]+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }));
  const u = new URL(url);
  const queryParams = [...u.searchParams.keys()].map((name) => ({ name, in: 'query', required: false, schema: { type: 'string' } }));
  return [...pathParams, ...queryParams];
}

function exampleValue(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('wallet') || n === 'address') return n.includes('sol') ? '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7' : '0x0000000000000000000000000000000000000000';
  if (n.includes('mint')) return USDC_MINT;
  if (n.includes('chain')) return 'base';
  if (n.includes('block')) return '12345678';
  if (n.includes('hash') || n.includes('tx')) return '0x1234';
  if (n.includes('symbol')) return 'USDC';
  if (n.includes('query') || n === 'q') return 'base wallet balance';
  if (n.includes('mints')) return USDC_MINT;
  return 'string';
}

function serviceNameForFamily(family, resourceType) {
  const f = String(family || '').toLowerCase();
  if (f === 'solana') return 'Saylor Solana Data';
  if (f === 'evm' || f === 'chain') return 'Saylor EVM Chain Data';
  if (f === 'defi') return 'Saylor DeFi Data';
  if (f === 'guide' || String(resourceType).toLowerCase() === 'guide') return 'Saylor Agent Guides';
  if (f === 'research' || f === 'medical' || f === 'legal') return 'Saylor Research APIs';
  return SAYLOR_SERVICE_NAME;
}

function inputExample(url) {
  const params = routeParameters(url);
  const input = { type: 'http', method: 'GET', discoverable: true };
  const pathParams = {};
  const queryParams = {};
  for (const p of params) {
    if (p.in === 'path') pathParams[p.name] = exampleValue(p.name);
    if (p.in === 'query') queryParams[p.name] = exampleValue(p.name);
  }
  if (Object.keys(pathParams).length) input.pathParams = pathParams;
  if (Object.keys(queryParams).length) input.queryParams = queryParams;
  return input;
}

function inputSchema(url) {
  const params = routeParameters(url);
  const props = {};
  const required = [];
  for (const p of params) {
    props[p.name] = p.schema || { type: 'string' };
    if (p.required) required.push(p.name);
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: props,
    ...(required.length ? { required } : {}),
  };
}

function outputExample({ family, url, description, resourceType }) {
  const text = `${family || ''} ${url || ''} ${description || ''}`.toLowerCase();
  if (text.includes('balance')) {
    return { address: '0x0000000000000000000000000000000000000000', chain: 'base', nativeBalance: '0', tokens: [], blockNumber: 12345678 };
  }
  if (text.includes('block')) {
    return { chain: 'base', number: 12345678, hash: '0x1234', timestamp: '2026-10-12T00:00:00.000Z' };
  }
  if (text.includes('nonce')) return { address: '0x0000000000000000000000000000000000000000', nonce: 0, chain: 'base' };
  if (text.includes('transfer')) return { address: '0x0000000000000000000000000000000000000000', chain: 'base', transfers: [] };
  if (text.includes('price')) return { asset: 'USDC', priceUsd: 1, source: SAYLOR_SERVICE_NAME, timestamp: '2026-10-12T00:00:00.000Z' };
  if (text.includes('security') || text.includes('risk')) return { riskLevel: 'low', flags: [], summary: 'No high-risk signals found in the sample response.' };
  if (text.includes('wallet')) return { address: exampleValue('wallet'), holdings: [], activity: [], riskSignals: [] };
  if (text.includes('trending') || text.includes('launch')) return { items: [], source: SAYLOR_SERVICE_NAME, timestamp: '2026-10-12T00:00:00.000Z' };
  if (String(resourceType).toLowerCase() === 'guide') return { title: 'Agent-ready x402 guide', summary: description, readMins: 5, sections: [] };
  return { success: true, data: {}, source: SAYLOR_SERVICE_NAME };
}

function bazaarExtensions({ url, description, family, resourceType }) {
  const output = outputExample({ family, url, description, resourceType });
  return {
    bazaar: {
      info: {
        input: inputExample(url),
        output: { type: 'json', example: output },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        required: ['input', 'output'],
        properties: {
          input: inputSchema(url),
          output: { type: 'object', additionalProperties: true, examples: [output] },
        },
      },
    },
  };
}

function agentTags(tags, url, description) {
  const text = `${url} ${description} ${(tags || []).join(' ')}`.toLowerCase();
  const inferred = ['x402', 'pay-per-request', 'no-api-key', 'agent-readable'];
  if (text.includes('wallet') || text.includes('balance') || text.includes('token') || text.includes('chain')) inferred.push('blockchain', 'crypto');
  if (text.includes('solana')) inferred.push('solana', 'on-chain-data');
  if (text.includes('security') || text.includes('risk')) inferred.push('security', 'risk-intelligence');
  if (text.includes('price') || text.includes('market')) inferred.push('market-data');
  if (text.includes('python') || text.includes('package') || text.includes('dependency')) inferred.push('developer-tools');
  if (text.includes('guide') || text.includes('documentation')) inferred.push('technical-guide');
  return [...new Set([...(tags || []), ...inferred].filter(Boolean).map((t) => String(t).toLowerCase()))];
}

function metadata({ url, description, capabilities = [], exampleUrl, family, extra = {} }) {
  const resourceType = extra.resourceType || 'API';
  const serviceName = extra.serviceName || serviceNameForFamily(family, resourceType);
  const extensions = extra.extensions || bazaarExtensions({ url, description, family, resourceType });
  return {
    serviceName,
    mimeType: 'application/json',
    iconUrl: SAYLOR_ICON_URL,
    extensions,
    method: 'GET',
    inputMimeTypes: ['application/json', 'application/x-www-form-urlencoded'],
    outputMimeTypes: ['application/json'],
    paymentProtocol: 'x402',
    noAccountRequired: true,
    noApiKeyRequired: true,
    auth: 'none-before-payment',
    pricingPolicy: { unit: 'request', minimumUsd: MIN_LISTING_PRICE_USD },
    parameters: routeParameters(url),
    exampleUrl: exampleUrl || url,
    discoveryUrl: 'https://bazaar.saylorinnovations.com/discovery/search?urlSubstring=https%3A%2F%2Fsaylorinnovations.com',
    capabilities: capabilities.length ? capabilities : [description],
    useWhen: 'Use when an agent needs live, structured data or analysis that should be fetched at request time instead of guessed by a model.',
    doNotUseWhen: 'Do not use for investment, medical, legal, or safety-critical decisions without independent verification.',
    sideEffects: 'none; read-only GET endpoint after x402 payment',
    license: 'Commercial - pay-per-request via x402',
    repository: 'https://github.com/SaylorInnovations/solana-x402',
    family,
    ...extra,
  };
}

function resource({ slug, url, description, accepts, tags, resourceType = 'API', outputSchema, metadata: meta }) {
  const family = meta?.family;
  const serviceName = meta?.serviceName || serviceNameForFamily(family, resourceType);
  const extensions = meta?.extensions || bazaarExtensions({ url, description, family, resourceType });
  return {
    slug,
    resource: url,
    description,
    type: 'http',
    serviceName,
    mimeType: meta?.mimeType || 'application/json',
    iconUrl: meta?.iconUrl || SAYLOR_ICON_URL,
    resourceType,
    x402Version: 2,
    accepts,
    outputSchema,
    extensions,
    tags,
    sourceHost: HOST,
    lastUpdated: new Date().toISOString(),
    metadata: meta,
    liveness: { reliability: null },
    verified: true,
    featured: false,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`fallback fetch failed: ${url} ${res.status}`);
  return res.json();
}

async function fallbackSaylorResources() {
  const [servicesBody, manifest] = await Promise.all([
    fetchJson(`${SITE}/api/services`),
    fetchJson(`${SITE}/.well-known/x402.json`),
  ]);
  const out = [];
  const covered = new Set();
  const bare = (u) => String(u).split('?')[0].replace(/\{[^}]+\}/g, '{}');
  const add = (r) => {
    if (covered.has(bare(r.resource))) return;
    covered.add(bare(r.resource));
    out.push(r);
  };

  for (const s of servicesBody.services || []) {
    const tags = agentTags([s.category, ...(s.tags || [])], s.url, s.description);
    const family = s.category || new URL(s.url).pathname.split('/').filter(Boolean)[1] || 'api';
    add(resource({
      slug: slugify(s.title),
      url: s.url,
      description: s.description,
      accepts: (s.accepts || []).map((a) => normalizeAccept(a, s.priceUsd)),
      tags,
      outputSchema: s.outputSchema,
      metadata: metadata({ url: s.url, description: s.description, capabilities: s.useCases, family }),
    }));
  }

  for (const s of SOLANA_INTELLIGENCE) {
    const url = `${SITE}${s.path}`;
    add(resource({
      slug: slugify(s.title),
      url,
      description: s.desc,
      accepts: solanaAccepts(s.amount, s.priceUsd),
      tags: agentTags(['solana', 'crypto intelligence', 'blockchain data'], url, s.desc),
      resourceType: 'Blockchain Data',
      metadata: metadata({ url, description: s.desc, capabilities: [s.desc], family: 'solana', extra: { assetClass: 'SPL token data' } }),
    }));
  }

  for (const e of [...(manifest.liveDataEndpoints || []), ...(manifest.utilityEndpoints || [])]) {
    if (!e.price || e.price === 'free' || e.price === '0' || !Array.isArray(e.accepts) || !e.accepts.length) continue;
    const rawPath = e.url.replace(SITE, '').split('?')[0];
    const family = rawPath.split('/').filter(Boolean)[1] || 'api';
    const amountUsd = e.priceUsd ?? Number(e.price) / 1e6;
    add(resource({
      slug: `saylorinnovations-${slugify(rawPath)}`,
      url: e.url,
      description: e.description,
      accepts: e.accepts.map((a) => normalizeAccept(a, Number.isFinite(amountUsd) ? amountUsd : undefined)),
      tags: agentTags([family, ...(e.tags || [])], e.url, e.description),
      metadata: metadata({ url: e.url, description: e.description, exampleUrl: e.exampleUrl, family }),
    }));
  }

  for (const g of manifest.resources || []) {
    if (!Array.isArray(g.accepts) || !g.accepts.length) continue;
    const guideAmountUsd = Number(g.price) / 1e6;
    add(resource({
      slug: slugify(g.id),
      url: g.url,
      description: g.summary || g.title,
      accepts: g.accepts.map((a) => normalizeAccept(a, Number.isFinite(guideAmountUsd) ? guideAmountUsd : undefined)),
      tags: agentTags([g.category, g.difficulty, ...(g.tags || [])], g.url, g.summary || g.title),
      resourceType: 'Guide',
      metadata: metadata({
        url: g.url,
        description: g.summary || g.title,
        capabilities: [`${g.title} - a ${g.readMins ?? '?'}-minute technical guide`],
        family: 'guide',
        extra: { difficulty: g.difficulty, readMins: g.readMins, license: g.license || 'Commercial - pay-per-request via x402' },
      }),
    }));
  }

  return out;
}

function matchesFilters(r, { query, network, asset, scheme, payTo, maxUsdPrice, urlSubstring, family, resourceType, tag } = {}) {
  const accepts = r.accepts || [];
  if (query) {
    const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = [r.resource, r.description, ...(r.tags || []), ...(r.metadata?.capabilities || [])].join(' ').toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) return false;
  }
  if (urlSubstring && !r.resource.includes(urlSubstring)) return false;
  if (family && r.metadata?.family !== family) return false;
  if (resourceType && String(r.resourceType).toLowerCase() !== String(resourceType).toLowerCase()) return false;
  if (tag && !(r.tags || []).includes(String(tag).toLowerCase())) return false;
  if (network && !accepts.some((a) => a.network === network)) return false;
  if (asset && !accepts.some((a) => a.asset === asset)) return false;
  if (scheme && !accepts.some((a) => a.scheme === scheme)) return false;
  if (payTo && !accepts.some((a) => a.payTo === payTo)) return false;
  if (maxUsdPrice !== undefined && !accepts.some((a) => a.amountUsd === undefined || a.amountUsd <= Number(maxUsdPrice))) return false;
  return true;
}

async function fallbackSearchResources(filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const resources = (await fallbackSaylorResources()).filter((r) => matchesFilters(r, filters)).slice(0, limit);
  return { resources, fallback: 'saylor-live-manifest' };
}

async function fallbackSaylorOfficial({ limit, offset, sort, ...filters } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const resources = (await fallbackSaylorResources()).filter((r) => matchesFilters(r, filters));
  if (sort === 'recent') resources.reverse();
  return {
    resources: resources.slice(off, off + lim),
    total: resources.length,
    limit: lim,
    offset: off,
    fallback: 'saylor-live-manifest',
  };
}

async function fallbackSaylorResourceBySlug(slug) {
  const key = String(slug || '');
  const resources = await fallbackSaylorResources();
  return resources.find((r) => r.slug === key || String(r.resource).includes(key)) || null;
}

async function fallbackListResources({ limit, offset, sort } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const resources = await fallbackSaylorResources();
  if (sort === 'recent') resources.reverse();
  return {
    resources: resources.slice(off, off + lim),
    total: resources.length,
    limit: lim,
    offset: off,
    fallback: 'saylor-live-manifest',
  };
}

function fallbackHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
    'cache-control': 'public, max-age=60',
    ...extra,
  };
}

export { fallbackSearchResources, fallbackSaylorOfficial, fallbackSaylorResourceBySlug, fallbackListResources, fallbackHeaders };

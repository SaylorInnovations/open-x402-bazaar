const FETCH_TIMEOUT_MS = 8000;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

// Arrays commonly used across real x402 manifests (Coinbase's own examples vary the key name).
const RESOURCE_ARRAY_KEYS = ['resources', 'liveDataEndpoints', 'endpoints'];

function isIPv4Literal(host) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

function isIPv6Literal(host) {
  return host.includes(':');
}

function isPrivateIp(ip) {
  if (isIPv4Literal(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true;
    return false;
  }
  if (isIPv6Literal(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true; // loopback / unspecified
    if (low.startsWith('fe80:')) return true; // link-local
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique local
    if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // unrecognized shape — treat as unsafe
}

// Cloudflare Workers have no native DNS resolution API, so hostnames are resolved via
// Cloudflare's own DNS-over-HTTPS endpoint (just an ordinary fetch) instead of Node's `dns`.
async function resolveHostIps(hostname) {
  const queries = ['A', 'AAAA'].map((type) =>
    fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
    })
      .then((r) => (r.ok ? r.json() : { Answer: [] }))
      .catch(() => ({ Answer: [] }))
  );
  const [a, aaaa] = await Promise.all(queries);
  const answers = [...(a.Answer || []), ...(aaaa.Answer || [])];
  return answers.filter((r) => r.type === 1 || r.type === 28).map((r) => r.data);
}

/**
 * Rejects anything pointing at loopback/private/link-local space before a fetch is ever
 * made, so a submitted manifest URL can't be used to probe internal infrastructure or
 * cloud metadata endpoints (classic SSRF via user-supplied URLs). IP-literal hostnames are
 * checked directly; domain names are resolved via DNS-over-HTTPS first. This is a
 * point-in-time check — it doesn't fully close a DNS-rebinding race against the later
 * fetch — but it stops the overwhelmingly common case of a direct private-IP/localhost target.
 */
async function assertPublicHttpsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('manifestUrl is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new Error('manifestUrl must be https');
  if (url.username || url.password) throw new Error('manifestUrl must not contain credentials');

  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new Error('manifestUrl resolves to a private/internal address');
  }
  if (isIPv4Literal(url.hostname) || isIPv6Literal(url.hostname)) {
    if (isPrivateIp(url.hostname)) throw new Error('manifestUrl resolves to a private/internal address');
    return url;
  }

  const ips = await resolveHostIps(url.hostname);
  if (ips.length === 0) throw new Error('manifestUrl hostname does not resolve');
  if (ips.some(isPrivateIp)) throw new Error('manifestUrl resolves to a private/internal address');
  return url;
}

async function fetchManifest(manifestUrl) {
  const url = await assertPublicHttpsUrl(manifestUrl);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), {
      signal: ctl.signal,
      redirect: 'manual', // re-validate manually rather than silently following into private space
      headers: { accept: 'application/json' },
    });
  } finally {
    clearTimeout(t);
  }
  if (res.status >= 300 && res.status < 400) {
    throw new Error('manifestUrl redirects are not followed — submit the final URL directly');
  }
  if (!res.ok) throw new Error(`manifestUrl fetch failed with status ${res.status}`);

  const lenHeader = res.headers.get('content-length');
  if (lenHeader && Number(lenHeader) > MAX_MANIFEST_BYTES) {
    throw new Error('manifest too large');
  }
  const text = await res.text();
  if (new TextEncoder().encode(text).length > MAX_MANIFEST_BYTES) {
    throw new Error('manifest too large');
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('manifestUrl did not return valid JSON');
  }
  return json;
}

function looksLikeResource(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const hasUrl = typeof entry.url === 'string' || typeof entry.resource === 'string';
  const accepts = entry.accepts;
  const hasAccepts = Array.isArray(accepts) && accepts.length > 0 &&
    accepts.every((a) => a && typeof a === 'object' && a.scheme && a.network && a.payTo);
  return hasUrl && hasAccepts;
}

/**
 * Normalizes a manifest into the flat resource-list shape the discovery endpoints serve,
 * mirroring the field names CDP's own Bazaar search response uses (resource, accepts, etc.).
 */
function extractResources(manifest, sourceManifestUrl) {
  if (!manifest || typeof manifest !== 'object') throw new Error('manifest is not an object');
  if (manifest.x402Version === undefined) throw new Error('manifest is missing x402Version');

  const host = new URL(sourceManifestUrl).host;
  const found = [];
  for (const key of RESOURCE_ARRAY_KEYS) {
    const arr = manifest[key];
    if (Array.isArray(arr)) {
      for (const entry of arr) {
        if (looksLikeResource(entry)) found.push(entry);
      }
    }
  }
  if (found.length === 0) {
    throw new Error('no paid resources found (expected an accepts[] with scheme/network/payTo on at least one entry)');
  }

  return found.map((entry) => ({
    resource: entry.url || entry.resource,
    description: entry.description || entry.summary || '',
    type: 'http',
    x402Version: manifest.x402Version,
    accepts: entry.accepts,
    outputSchema: entry.outputSchema,
    tags: entry.tags || [],
    sourceManifestUrl,
    sourceHost: host,
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * Normalizes an A2A agent card into the flat shape agent_cards stores. Per the A2A
 * spec an agent card needs at minimum a name and a url; skills[] is expected but not
 * strictly required (some cards describe a general-purpose agent with no fixed skill
 * list), so it is validated as an array-if-present rather than mandatory.
 */
function extractAgentCard(card, cardUrl) {
  if (!card || typeof card !== 'object') throw new Error('agent card is not an object');
  if (typeof card.name !== 'string' || !card.name.trim()) throw new Error('agent card is missing "name"');
  if (card.skills !== undefined && !Array.isArray(card.skills)) throw new Error('agent card "skills" must be an array if present');

  const host = new URL(cardUrl).host;
  return {
    host,
    cardUrl,
    name: card.name.trim(),
    description: card.description || '',
    providerOrg: card.provider?.organization || undefined,
    providerUrl: card.provider?.url || undefined,
    version: card.version || undefined,
    protocolVersion: card.protocolVersion || undefined,
    documentationUrl: card.documentationUrl || undefined,
    skills: card.skills || [],
    capabilities: card.capabilities || undefined,
    inputModes: card.defaultInputModes || undefined,
    outputModes: card.defaultOutputModes || undefined,
    rawCard: card,
  };
}

export { assertPublicHttpsUrl, fetchManifest, extractResources, extractAgentCard, isPrivateIp, resolveHostIps };

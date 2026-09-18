const dns = require('dns').promises;
const net = require('net');

const FETCH_TIMEOUT_MS = 8000;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

// Arrays commonly used across real x402 manifests (Coinbase's own examples vary the key name).
const RESOURCE_ARRAY_KEYS = ['resources', 'liveDataEndpoints', 'endpoints'];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1') return true; // loopback
    if (low.startsWith('fe80:')) return true; // link-local
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique local
    if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // unknown shape — treat as unsafe
}

/**
 * Resolves the hostname and rejects anything pointing at loopback/private/link-local
 * space before a fetch is ever made, so a submitted manifest URL can't be used to probe
 * internal infrastructure or cloud metadata endpoints (classic SSRF via user-supplied URLs).
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

  const records = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (records.length === 0) throw new Error('manifestUrl hostname does not resolve');
  if (records.some((r) => isPrivateIp(r.address))) {
    throw new Error('manifestUrl resolves to a private/internal address');
  }
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
  if (Buffer.byteLength(text, 'utf8') > MAX_MANIFEST_BYTES) throw new Error('manifest too large');

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

module.exports = { assertPublicHttpsUrl, fetchManifest, extractResources, isPrivateIp };

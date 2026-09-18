const { fetchManifest, extractResources } = require('../../src/validate');
const { upsertListing } = require('../../src/store');

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'use POST' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid JSON body' }) };
  }

  const manifestUrl = body.manifestUrl;
  if (typeof manifestUrl !== 'string' || !manifestUrl) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'manifestUrl is required' }) };
  }

  try {
    const manifest = await fetchManifest(manifestUrl);
    const resources = extractResources(manifest, manifestUrl);
    const sourceHost = new URL(manifestUrl).host;

    await upsertListing(sourceHost, {
      sourceHost,
      sourceManifestUrl: manifestUrl,
      manifestName: manifest.name || sourceHost,
      submittedAt: new Date().toISOString(),
      resources,
    });

    return {
      statusCode: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, sourceHost, resourceCount: resources.length }),
    };
  } catch (e) {
    return {
      statusCode: 422,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e.message || e) }),
    };
  }
};

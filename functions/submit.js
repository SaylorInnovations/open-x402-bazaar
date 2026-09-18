import { fetchManifest, extractResources } from '../src/validate.js';
import { upsertListing } from '../src/db.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const manifestUrl = body.manifestUrl;
  if (typeof manifestUrl !== 'string' || !manifestUrl) {
    return json({ error: 'manifestUrl is required' }, 400);
  }

  try {
    const manifest = await fetchManifest(manifestUrl);
    const resources = extractResources(manifest, manifestUrl);
    const host = new URL(manifestUrl).host;

    await upsertListing(env, {
      host,
      sourceManifestUrl: manifestUrl,
      manifestName: manifest.name || host,
      submittedAt: new Date().toISOString(),
      resources,
    });

    return json({ ok: true, host, resourceCount: resources.length }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 422);
  }
}

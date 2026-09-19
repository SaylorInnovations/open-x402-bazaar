import { fetchManifest, extractAgentCard } from '../src/validate.js';
import { upsertAgent } from '../src/agentRegistry.js';
import { isRateLimited, logSubmission } from '../src/db.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
  if (await isRateLimited(env, { clientIp })) {
    return json({ error: 'rate limit exceeded — try again later' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const agentCardUrl = body.agentCardUrl;
  if (typeof agentCardUrl !== 'string' || !agentCardUrl) {
    return json({ error: 'agentCardUrl is required' }, 400);
  }

  await logSubmission(env, { clientIp, host: agentCardUrl });

  try {
    // Reuses the same SSRF-guarded, size/time-capped fetcher x402 manifests go
    // through — an agent card is just another JSON document at a caller-supplied URL.
    const card = await fetchManifest(agentCardUrl);
    const normalized = extractAgentCard(card, agentCardUrl);
    const slug = await upsertAgent(env, normalized);
    return json({ ok: true, slug, host: normalized.host, name: normalized.name }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 422);
  }
}

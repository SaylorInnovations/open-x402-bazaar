// Paid placement — the "get paid on listings we didn't author" answer that
// doesn't touch anyone else's payment. A provider pays Agent Bazaar directly
// (x402, our own payTo) for featured placement on their own already-listed
// resource; the resource's own accepts[] and payTo are completely untouched.
//
// Built on solana-x402 (Saylor Innovations' own tested x402 resource-server
// library) rather than hand-rolled payment verification.
import x402pkg from 'solana-x402';
import { getResourceBySlugOrId, recordFeaturePurchase } from '../src/db.js';

const { X402 } = x402pkg;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type, x-payment, payment-signature',
};

// $ per tier, in USDC atomic units (6 decimals). Adjustable — see README.
const TIERS = { 7: 2_000_000, 30: 6_000_000, 90: 15_000_000 };

// Saylor Innovations' existing receiving wallets (same ones already used by
// x402.saylorinnovations.com and Propz) — this endpoint pays into the same
// business wallets, not a new address.
const PAY_TO = '7LSjfrJf8fNsB8VA9u7N3WEn25smQLpob3SvyUvXacy7';
const EVM_PAY_TO = '0xf8A376eBF123D7252cd7b66bcD77A727a4def22f';
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const days = Number(url.searchParams.get('days'));

  if (!slug) return json({ error: 'slug is required' }, 400);
  if (!TIERS[days]) return json({ error: `days must be one of: ${Object.keys(TIERS).join(', ')}` }, 400);

  const resource = await getResourceBySlugOrId(env, slug);
  if (!resource) return json({ error: `no resource found for slug "${slug}"` }, 404);

  // env.FEATURE_SECRET is a Pages secret (wrangler pages secret put); falls back
  // to a dev-only value so `wrangler pages dev` works without it configured.
  const x402 = new X402({
    payTo: PAY_TO,
    evmPayTo: EVM_PAY_TO,
    secret: env.FEATURE_SECRET || 'local-dev-only-not-for-production',
    rpcUrl: env.FEATURE_RPC_URL || DEFAULT_RPC,
  });

  const featureResource = {
    id: `feature:${resource.id}:${days}`,
    title: `Feature "${(resource.description || resource.resource).slice(0, 60)}" for ${days} days`,
    price: TIERS[days],
  };
  const resourceUrl = url.toString();

  const payment = x402.readPayment(Object.fromEntries(request.headers));
  if (!payment) {
    const r = await x402.paymentRequiredResponse(featureResource, resourceUrl);
    return new Response(r.body, { status: r.statusCode, headers: { ...CORS, ...r.headers } });
  }

  const settled = await x402.settle(payment, featureResource, resourceUrl);
  if (!settled.ok) {
    const r = await x402.paymentRequiredResponse(featureResource, resourceUrl, settled.reason);
    return new Response(r.body, { status: r.statusCode, headers: { ...CORS, ...r.headers } });
  }

  const result = await recordFeaturePurchase(env, {
    resourceId: resource.id,
    signature: settled.signature || `${settled.via}:${Date.now()}:${Math.random()}`,
    amountUsd: TIERS[days] / 1e6,
    days,
  });
  if (!result.ok) return json({ ok: false, error: result.reason }, 409);

  return json({ ok: true, slug: resource.slug, featuredUntil: result.featuredUntil, signature: settled.signature });
}

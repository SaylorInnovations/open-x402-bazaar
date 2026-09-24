// x402 market insights, free and open. The numbers are computed by
// saylorinnovations.com from Coinbase's public x402 discovery catalog (its own
// 30-day usage per resource) — no D1 reads here, so this page costs the
// free-tier database nothing. The detailed paid version lives at
// saylorinnovations.com/api/market/*.
const SUMMARY_URL = 'https://saylorinnovations.com/api/market/summary';

export async function fetchInsights() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(SUMMARY_URL, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('insights source HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

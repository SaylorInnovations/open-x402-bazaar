# open-x402-bazaar

An open, permissionless discovery layer for **x402**-payable resources — APIs, data feeds, and services that AI agents can find and pay for per-request.

Coinbase's own [x402 Bazaar](https://docs.cdp.coinbase.com/x402/bazaar) is excellent, but getting listed on it requires a verified Coinbase Developer Platform account, which in turn can require business/KYC verification for some account paths. That's a real barrier for a protocol whose whole point is permissionless, agent-to-agent commerce. This project is an attempt at an alternative: **anyone with a valid x402 manifest can list here, with no account and no identity verification at all.**

It's built to be **wire-compatible** with Coinbase's Bazaar discovery API, so any existing x402 client library that already knows how to query the CDP Bazaar can point at this instead with a config change, not a rewrite.

## Status

Early / pre-alpha. This is the first working scaffold: submission, validation, storage, and the three read endpoints below. Not yet running in production, not yet seeded with real listings beyond testing.

## How listing works

No signup. `POST` the URL of your own `.well-known/x402.json` (or equivalent) manifest:

```bash
curl -X POST https://<this-site>/submit \
  -H "content-type: application/json" \
  -d '{"manifestUrl": "https://yoursite.com/.well-known/x402.json"}'
```

The manifest is fetched (over HTTPS, with SSRF guards — private/internal addresses are refused before any request is made), validated, and any resource with a populated `accepts[]` (scheme + network + payTo) is indexed. Re-submitting the same manifest URL refreshes your listing.

## Discovery API (agent-facing)

Mirrors the field names and shape of Coinbase's CDP Bazaar API:

| Endpoint | Purpose |
|---|---|
| `GET /discovery/search?query=&network=&asset=&scheme=&payTo=&urlSubstring=&maxUsdPrice=&limit=` | Keyword/filter search across all listed resources |
| `GET /discovery/resources?limit=&offset=` | Paginated listing of every indexed resource |
| `GET /discovery/merchant?payTo=<address>` | All resources that pay a specific address |

No API key required for any read endpoint — same as Coinbase's.

## Architecture

- **Runtime**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) (Workers runtime).
- **Storage**: [D1](https://developers.cloudflare.com/d1/) (SQLite), normalized across `listings` / `resources` / `resource_accepts`, plus an FTS5 virtual table for real keyword search — not just JS-array filtering.
- **Ingestion**: pull-based. Sellers submit a manifest URL; nothing is pushed. Re-submitting the same manifest URL deletes and re-inserts its resources (a full refresh, not a merge).
- **Zero runtime dependencies** — `wrangler` is dev-only, for local D1/Pages tooling.

### Local development

```bash
npm install
npm run db:init   # applies schema.sql to a local D1 database
npm run dev        # wrangler pages dev, with the D1 binding wired up
```

## Security notes

`POST /submit` fetches a URL the caller supplies — a classic SSRF vector if unguarded. Before any request is made, the hostname is resolved and rejected if it points at loopback, RFC1918 private ranges, or link-local space (including the `169.254.169.254` cloud-metadata address). Redirects are not followed automatically. Manifest size and fetch time are capped.

## Not yet built (roadmap)

- **Periodic re-crawl / liveness checks.** Listings are currently indexed once at submission time and never re-validated — a resource that goes offline or changes its payment address stays listed until someone re-submits. A scheduled function that re-fetches and prunes/updates listings is the next real piece of work.
- **Semantic search.** Current search is keyword/substring only, unlike Coinbase's hybrid text+semantic search.
- **Abuse/spam resistance.** No rate limiting on `/submit` yet.
- **Federation with the x402 Foundation's discovery working group** (`x402-foundation/wg-domain-discovery`) — the goal is to align with an open standard rather than become a second walled garden.

## License

MIT — see [LICENSE](LICENSE).

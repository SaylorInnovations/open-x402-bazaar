# open-x402-bazaar

An open, permissionless discovery layer for **x402**-payable resources — APIs, data feeds, and services that AI agents can find and pay for per-request.

Coinbase's own [x402 Bazaar](https://docs.cdp.coinbase.com/x402/bazaar) is excellent, but getting listed on it requires a verified Coinbase Developer Platform account, which in turn can require business/KYC verification for some account paths. That's a real barrier for a protocol whose whole point is permissionless, agent-to-agent commerce. This project is an attempt at an alternative: **anyone with a valid x402 manifest can list here, with no account and no identity verification at all.**

It's built to be **wire-compatible** with Coinbase's Bazaar discovery API, so any existing x402 client library that already knows how to query the CDP Bazaar can point at this instead with a config change, not a rewrite.

## Status

Early. Submission, validation, storage, ranked discovery, and anti-spam basics are all working. Not yet running in production. The catalog is bootstrapped from a full mirror of Coinbase's public CDP Bazaar — see below.

## Seeded from Coinbase's Bazaar

Coinbase's discovery API itself requires no API key or account to *read* — only to *list* on it. So this project mirrors the whole public catalog (`~15,600` resources across `~2,000` hosts, at last import) via `scripts/import-cdp-bazaar.mjs`, and layers permissionless listing on top:

- Every mirrored listing is tagged `source: 'cdp-mirror'` internally.
- Any owner can `POST /submit` their own manifest at any time — a self-submitted listing always overwrites the mirrored copy for that host and is tagged `source: 'submitted'`. The importer never touches a claimed host.
- Mirrored resources carry Coinbase's own 30-day usage stats (`calls30d`, `uniquePayers30d`, `lastCalledAt`) as a `quality` field on each resource — a trust signal that matters more here than on a KYC'd catalog, since anyone can list anything.

Re-run the mirror periodically to pick up new resources Coinbase has indexed (safe to re-run — see script header):

```bash
npm run seed:cdp-bazaar          # generates + applies against local D1
npm run seed:cdp-bazaar:remote   # generates + applies against production D1
```

## How listing works

No signup. `POST` the URL of your own `.well-known/x402.json` (or equivalent) manifest:

```bash
curl -X POST https://<this-site>/submit \
  -H "content-type: application/json" \
  -d '{"manifestUrl": "https://yoursite.com/.well-known/x402.json"}'
```

The manifest is fetched (over HTTPS, with SSRF guards — private/internal addresses are refused before any request is made), validated, and any resource with a populated `accepts[]` (scheme + network + payTo) is indexed. Re-submitting the same manifest URL refreshes your listing and claims the host if it was previously only in the Coinbase mirror. Submissions are rate-limited per IP (20/hour, 60/day) — every attempt counts, not just successful ones, so failing probes can't dodge the limit.

## Discovery API (agent-facing)

Mirrors the field names and shape of Coinbase's CDP Bazaar API, plus an additive `quality` field and a stats endpoint:

| Endpoint | Purpose |
|---|---|
| `GET /discovery/search?query=&network=&asset=&scheme=&payTo=&urlSubstring=&maxUsdPrice=&limit=` | Keyword/filter search. Text queries rank by relevance (FTS5 bm25); filter-only queries rank by 30-day call volume |
| `GET /discovery/resources?limit=&offset=` | Paginated listing of every indexed resource, ranked by 30-day call volume |
| `GET /discovery/merchant?payTo=<address>` | All resources that pay a specific address |
| `GET /discovery/stats` | Catalog totals: listings, resources, accepts, merchants, calls, network/source breakdown |

No API key required for any read endpoint — same as Coinbase's.

Agent-facing docs: [`/llms.txt`](public/llms.txt) (plain-language summary for LLMs) and [`/openapi.json`](public/openapi.json) (full machine-readable API spec, importable into most agent/tool frameworks).

## Architecture

- **Runtime**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) (Workers runtime).
- **Storage**: [D1](https://developers.cloudflare.com/d1/) (SQLite), normalized across `listings` / `resources` / `resource_accepts`, plus an FTS5 virtual table for real keyword search — not just JS-array filtering. `submission_log` backs per-IP rate limiting.
- **Ingestion**: pull-based. Sellers submit a manifest URL; nothing is pushed. Re-submitting the same manifest URL deletes and re-inserts its resources (a full refresh, not a merge). The Coinbase-mirror importer (`scripts/import-cdp-bazaar.mjs`) is the one exception — a standalone Node script that fetches Coinbase's public catalog and writes SQL directly, run out-of-band from the Workers request path.
- **Zero runtime dependencies** — `wrangler` is dev-only, for local D1/Pages tooling and the mirror importer.

### Local development

```bash
npm install
npm run db:init          # applies schema.sql to a local D1 database
npm run seed:cdp-bazaar   # optional: mirror Coinbase's public Bazaar catalog into it
npm run dev               # wrangler pages dev, with the D1 binding wired up
```

If you already have a deployed D1 database from before the mirror/rate-limiting/quality-signal changes, apply the additive migration instead of re-running `schema.sql`: `npm run db:migrate:remote`.

## Security notes

`POST /submit` fetches a URL the caller supplies — a classic SSRF vector if unguarded. Before any request is made, the hostname is resolved and rejected if it points at loopback, RFC1918 private ranges, or link-local space (including the `169.254.169.254` cloud-metadata address). Redirects are not followed automatically. Manifest size and fetch time are capped.

## Not yet built (roadmap)

- **Periodic re-crawl / liveness checks.** Directly-submitted listings are indexed once at submission time and never re-validated — a resource that goes offline or changes its payment address stays listed until someone re-submits. A scheduled function that re-fetches and prunes/updates listings is the next real piece of work. (Mirrored listings get fresher data for free each time `seed:cdp-bazaar` is re-run, since Coinbase does this crawling themselves.)
- **Semantic search.** Current search is keyword/substring (FTS5) only, unlike Coinbase's hybrid text+semantic search.
- **Scheduled auto-mirroring.** The importer is run manually today; a Cloudflare Cron Trigger re-running it daily would keep the mirror current without a person remembering to.
- **MCP server.** An `/mcp` endpoint exposing search/list as MCP tools, so agents that speak MCP rather than raw HTTP can use this without a custom client.
- **Federation with the x402 Foundation's discovery working group** (`x402-foundation/wg-domain-discovery`) — the goal is to align with an open standard rather than become a second walled garden.

## License

MIT — see [LICENSE](LICENSE).

# Agent Bazaar

_by [Saylor Innovations](https://saylorinnovations.com)_

An open, permissionless marketplace and discovery layer for **AI agents** — APIs, MCP tools, datasets, and **x402**-payable services that autonomous software can find, evaluate, and pay for per request. Repo/package name is still `open-x402-bazaar` for continuity; the product is Agent Bazaar.

Coinbase's own [x402 Bazaar](https://docs.cdp.coinbase.com/x402/bazaar) is excellent, but getting listed on it requires a verified Coinbase Developer Platform account, which in turn can require business/KYC verification for some account paths. That's a real barrier for a protocol whose whole point is permissionless, agent-to-agent commerce. This project is an attempt at an alternative: **anyone with a valid x402 manifest can list here, with no account and no identity verification at all.**

It's built to be **wire-compatible** with Coinbase's Bazaar discovery API, so any existing x402 client library that already knows how to query the CDP Bazaar can point at this instead with a config change, not a rewrite.

Live at: **https://bazaar.saylorinnovations.com**

## Status

Live at [bazaar.saylorinnovations.com](https://bazaar.saylorinnovations.com), on Cloudflare Pages + D1. Submission, validation, storage, ranked discovery, resource/provider detail pages, and anti-spam basics are all working. The catalog is bootstrapped from a full mirror of Coinbase's public CDP Bazaar plus Saylor Innovations' own real endpoints — see below.

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

## Saylor Innovations' own listings

`scripts/import-saylor-official.mjs` lists Saylor Innovations' real, live x402 endpoints (research/security/data utilities plus Solana on-chain intelligence, all served from `saylorinnovations.com`) as verified (`source: 'submitted'`) resources — the same trust tier a self-submission gets, seeded directly since Saylor Innovations operates this bazaar. Nothing here is fabricated: pricing, descriptions and `accepts[]` come from the live `/api/services` endpoint and the public manifest at `saylorinnovations.com/.well-known/x402.json`.

```bash
npm run seed:saylor-official          # local
npm run seed:saylor-official:remote   # production
```

### How providers actually get paid

x402 payments settle **peer-to-peer** — agent to `payTo` wallet — never through this bazaar. So listing here doesn't change *how* you get paid, it changes *how many agents find the endpoint to pay*. There's no platform fee on the transaction itself today; the plan is to keep discovery free and, if/when it makes sense, monetize optional things like featured placement or verified-provider tooling rather than taxing the payment path.

## How listing works

No signup. `POST` the URL of your own `.well-known/x402.json` (or equivalent) manifest:

```bash
curl -X POST https://<this-site>/submit \
  -H "content-type: application/json" \
  -d '{"manifestUrl": "https://yoursite.com/.well-known/x402.json"}'
```

The manifest is fetched (over HTTPS, with SSRF guards — private/internal addresses are refused before any request is made), validated, and any resource with a populated `accepts[]` (scheme + network + payTo) is indexed. Re-submitting the same manifest URL refreshes your listing and claims the host if it was previously only in the Coinbase mirror. Submissions are rate-limited per IP (20/hour, 60/day) — every attempt counts, not just successful ones, so failing probes can't dodge the limit.

### Registering an A2A agent

Same model, different shape — an A2A agent card has `skills[]` instead of `accepts[]` and no inherent payment model, so it lives in its own `agent_cards` table rather than being forced into the resources shape:

```bash
curl -X POST https://<this-site>/submit-agent \
  -H "content-type: application/json" \
  -d '{"agentCardUrl": "https://youragent.example.com/.well-known/agent-card.json"}'
```

Requires at minimum a `name`; `skills[]`, `provider`, `protocolVersion` and `documentationUrl` are stored when present. Same SSRF guards, same rate limiting, same no-account model.

## Discovery API (agent-facing)

Mirrors the field names and shape of Coinbase's CDP Bazaar API, plus an additive `quality` field and a stats endpoint:

| Endpoint | Purpose |
|---|---|
| `GET /discovery/search?query=&network=&asset=&scheme=&payTo=&urlSubstring=&maxUsdPrice=&limit=` | Keyword/filter search. Text queries rank by relevance (FTS5 bm25); filter-only queries rank by 30-day call volume |
| `GET /discovery/resources?limit=&offset=&sort=` | Paginated listing of every indexed resource. `sort=recent` for newest-first, default ranks by 30-day call volume |
| `GET /discovery/merchant?payTo=<address>` | All resources that pay a specific address |
| `GET /discovery/stats` | Catalog totals: listings, resources, accepts, merchants, calls, network/source breakdown |
| `GET /resources/{slug}.json` | Full machine-readable record for a single resource |
| `GET /discovery/agents?query=&limit=&offset=` | Search/list the A2A agent registry (other agents' cards, not Agent Bazaar's own) |
| `GET /agents/{slug}.json` | Full A2A agent card as submitted |

No API key required for any read endpoint — same as Coinbase's.

Agent-facing docs: [`/llms.txt`](public/llms.txt) &middot; [`/llms-full.txt`](public/llms-full.txt) &middot; [`/openapi.json`](public/openapi.json) &middot; [`/agents.json`](public/agents.json) &middot; [`/.well-known/agent-card.json`](public/.well-known/agent-card.json) (A2A).

## Human-facing pages

Every resource has a permanent, crawlable, server-rendered URL — not a client-side-only modal — with a machine-readable JSON twin alongside it:

| Page | Purpose |
|---|---|
| `/resources/{slug}` | Resource detail: description, pricing, accepts[], schema, curl/JS/Python examples |
| `/providers/{host}` | Every resource published by one provider |
| `/agents` | Quickstart for connecting an agent (discover → inspect → pay → execute → verify), plus the registered-agents directory |
| `/agents/{slug}` | A2A agent detail page — skills, provider, protocol version, card URL |
| `/publish` | How to list a resource as a seller |
| `/docs` | What x402/MCP/A2A are, how agent payments work, self-hosting |
| `/categories`, `/categories/{type}` | Browse by resource type (populated as providers set one — sparse for the mirrored bulk of the catalog, which doesn't) |
| `/networks`, `/networks/{network}` | Browse by CAIP-2 network — populated for every resource, since it comes from `accepts[]` |
| `/protocols`, `/protocols/{x402,mcp,a2a}` | What each protocol is and how Agent Bazaar uses it, with live stats |
| `/mcp` | GET: info page. POST: a real MCP server (JSON-RPC/Streamable HTTP) over the same catalog — `search_resources`, `get_resource`, `get_pricing`, `discover_provider`, `list_resources`, `get_stats` |

## Architecture

- **Runtime**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) (Workers runtime).
- **Storage**: [D1](https://developers.cloudflare.com/d1/) (SQLite), normalized across `listings` / `resources` / `resource_accepts`, plus an FTS5 virtual table for real keyword search — not just JS-array filtering. `submission_log` backs per-IP rate limiting.
- **Ingestion**: pull-based. Sellers submit a manifest URL; nothing is pushed. Re-submitting the same manifest URL deletes and re-inserts its resources (a full refresh, not a merge). The Coinbase-mirror importer (`scripts/import-cdp-bazaar.mjs`) is the one exception — a standalone Node script that fetches Coinbase's public catalog and writes SQL directly, run out-of-band from the Workers request path.
- **Zero runtime dependencies** — `wrangler` is dev-only, for local D1/Pages tooling and the mirror importer.

### Local development

```bash
npm install
npm run db:init                # applies schema.sql to a local D1 database
npm run seed:saylor-official   # Saylor Innovations' own real, verified endpoints
npm run seed:cdp-bazaar        # optional: mirror Coinbase's public Bazaar catalog into it
npm run check:liveness          # optional: probe owner-submitted resources, flag any that don't respond
npm run dev                     # wrangler pages dev, with the D1 binding wired up
```

If you already have a deployed D1 database predating later schema changes, apply the additive migrations in order instead of re-running `schema.sql`: `npm run db:migrate:remote`, then `:0003`, `:0004`, `:0005`.

### Keeping it fresh (self-hosting)

`seed:cdp-bazaar:remote`, `seed:saylor-official:remote` and `check:liveness:remote` are just npm scripts — run them on whatever scheduler you already have (cron, GitHub Actions, a Cloudflare Worker with its own Cron Trigger calling out to a small script, etc). They're deliberately plain Node scripts with no dependency on any particular scheduling platform.

## Security notes

`POST /submit` fetches a URL the caller supplies — a classic SSRF vector if unguarded. Before any request is made, the hostname is resolved and rejected if it points at loopback, RFC1918 private ranges, or link-local space (including the `169.254.169.254` cloud-metadata address). Redirects are not followed automatically. Manifest size and fetch time are capped.

## Not yet built (roadmap)

- ~~Periodic liveness checks~~ — done. `scripts/check-liveness.mjs` probes every owner-submitted resource (not the mirrored ones — Coinbase already crawls those) and marks it `is_live: true/false`; a confirmed-down resource gets a visible "not responding" badge on its card, detail page and provider page. It doesn't yet auto-prune or re-fetch changed payment addresses — a down resource stays listed, just flagged.
- **Semantic search.** Current search is keyword/substring (FTS5) only, unlike Coinbase's hybrid text+semantic search.
- ~~Scheduled auto-mirroring~~ — done, via a daily scheduled job that runs both importers and the liveness check against production. (Implemented as a scheduled Claude Code cloud routine rather than a Cloudflare Cron Trigger — Pages Functions don't support cron triggers the way standalone Workers do — so this is operational, not something a fork of this repo gets automatically; see the "Keeping it fresh" note below if self-hosting.)
- **Third-party MCP tool directory.** `/mcp` is now a real, working MCP server over *this* catalog (see above), but it doesn't yet proxy or list *other* MCP servers with their own detail pages the way `/resources/{slug}` does for x402 resources.
- ~~A2A agent registry~~ — done. `/discovery/agents`, `POST /submit-agent`, and `/agents/{slug}` list a directory of *other* agents' cards (separate from `/.well-known/agent-card.json`, which is Agent Bazaar's own). Not yet built within it: liveness checks on registered agents (only resources get probed today), and no reputation/trust signal beyond "registered."
- **Automated provider ingestion.** Publishing today is manifest-URL only; importing directly from an OpenAPI document, MCP schema, or Git repo is not yet built.
- **Guides/content library.** `/docs` is one consolidated page today, not the full set of individually-indexed how-to guides a mature content strategy would want.
- **Trust badges beyond "verified owner."** Endpoint/schema verification with live uptime checks isn't built; today "verified" means only "owner proved control via POST /submit."
- **Federation with the x402 Foundation's discovery working group** (`x402-foundation/wg-domain-discovery`) — the goal is to align with an open standard rather than become a second walled garden.

## License

MIT — see [LICENSE](LICENSE).

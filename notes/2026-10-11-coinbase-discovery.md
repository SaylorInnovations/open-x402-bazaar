# Coinbase Bazaar Discovery Pass - 2026-10-11

Tags: #x402 #coinbase-bazaar #agent-bazaar #discovery #saylor-endpoints

## Snapshot

Scanned Coinbase Bazaar public discovery on 2026-10-11:

- Total Coinbase resources scanned: 32,058
- Saylor-matching resources found: 175
- Coinbase usage field: `quality.l30DaysTotalCalls`
- D1 note: Agent Bazaar remote D1 hit the free daily row-read cap during investigation, so production served the Saylor manifest fallback.

## Most-Pinged Saylor Endpoints

| Rank | Calls 30d | Unique payers | Endpoint |
|---:|---:|---:|---|
| 1 | 27 | 2 | `https://saylorinnovations.com/api/token-price/solana/:solana_address` |
| 2 | 20 | 2 | `https://saylorinnovations.com/api/stocks/quote/:symbol` |
| 3 | 8 | 3 | `https://saylorinnovations.com/api/python/report` |
| 4 | 6 | 4 | `https://saylorinnovations.com/api/kb/cuda-driver-ollama` |
| 5 | 6 | 3 | `https://saylorinnovations.com/api/data/country` |
| 6 | 6 | 3 | `https://saylorinnovations.com/api/data/economy` |
| 7 | 6 | 3 | `https://saylorinnovations.com/api/data/exchange-rates` |
| 8 | 6 | 3 | `https://saylorinnovations.com/api/docs/pypi/fastapi` |
| 9 | 6 | 3 | `https://saylorinnovations.com/api/evm/ethereum/block/latest` |
| 10 | 6 | 3 | `https://saylorinnovations.com/api/package/report` |
| 11 | 6 | 3 | `https://saylorinnovations.com/api/package/search` |
| 12 | 6 | 3 | `https://saylorinnovations.com/api/research/doi` |
| 13 | 6 | 3 | `https://saylorinnovations.com/api/research/search` |
| 14 | 6 | 3 | `https://saylorinnovations.com/api/security/cve` |
| 15 | 5 | 4 | `https://saylorinnovations.com/api/games/deals` |
| 16 | 5 | 3 | `https://saylorinnovations.com/api/aircraft/military` |
| 17 | 5 | 3 | `https://saylorinnovations.com/api/market/bestsellers` |
| 18 | 5 | 1 | `https://saylorinnovations.com/api/security/:mint` |

## What Worked

The endpoints that got real Coinbase activity had these traits:

- Callable-looking URLs with `:param` placeholders or concrete examples.
- Top-level `serviceName`.
- Focused tags that match agent intent.
- `quality` populated by Coinbase after paid calls.
- Multiple payment options in `accepts[]`.
- Practical utility categories: token price, stock quote, package/security reports, docs lookup, research, CVE, economic data.

## Changes Made

- Fallback discovery now returns Coinbase-compatible `items` and `pagination`.
- Fallback Saylor records now normalize `{param}` into `:param` in returned `resource` URLs.
- Fallback Saylor records now include top-level `serviceName`.
- Fallback Saylor records now include `extensions.bazaar.info.input` with `type`, `method`, and `discoverable`.
- DB-backed records now include the same callable URL normalization, `serviceName`, and `extensions.bazaar` shape.
- Agent Bazaar's own `/.well-known/x402.json` now seeds high-performing payable resources instead of advertising an empty `resources[]`.
- Follow-up expansion added 17 Coinbase-facing Saylor resources sourced from the live Saylor manifest's real `accepts[]`.

## Seeded In Agent Bazaar Manifest

These are now present in `public/.well-known/x402.json` as payable resources:

- `https://saylorinnovations.com/api/token-price/solana/:solana_address`
- `https://saylorinnovations.com/api/stocks/quote/:symbol`
- `https://saylorinnovations.com/api/python/report?name=:name`
- `https://saylorinnovations.com/api/data/country?country=:country`
- `https://saylorinnovations.com/api/data/economy?country=:country`
- `https://saylorinnovations.com/api/data/exchange-rates?base=:base`
- `https://saylorinnovations.com/api/package/report?name=:name`
- `https://saylorinnovations.com/api/package/search?q=:q`
- `https://saylorinnovations.com/api/research/doi?doi=:doi`
- `https://saylorinnovations.com/api/research/search?q=:q`
- `https://saylorinnovations.com/api/security/cve?cve=:cve`
- `https://saylorinnovations.com/api/games/deals`
- `https://saylorinnovations.com/api/aircraft/military`
- `https://saylorinnovations.com/api/market/bestsellers`
- `https://saylorinnovations.com/api/security/:mint`
- `https://saylorinnovations.com/api/docs/pypi/fastapi`
- `https://saylorinnovations.com/api/evm/ethereum/block/latest`

## Follow-Ups

- After deploy, recheck:
  - `https://bazaar.saylorinnovations.com/discovery/resources?limit=3`
  - `https://bazaar.saylorinnovations.com/discovery/search?query=solana&limit=3`
  - `https://bazaar.saylorinnovations.com/.well-known/x402.json`
- When D1 row reads reset or the plan is upgraded, import Coinbase quality back into local catalog fields so `calls_30d` is populated for Saylor-owned rows.
- 2026-10-11 follow-up: `scripts/sync-agent-bazaar-manifest.mjs` now rebuilds Agent Bazaar's public manifest from the live Saylor manifest. Current generated count: 534 payable resources.
- Each generated endpoint keeps real `accepts[]`, has a callable `:param` URL, top-level `serviceName`, focused tags, canonical URL metadata, and `extensions.bazaar.info.input`.
- `/discovery/resources` fallback and DB-backed records also include extracted parameter hints for `{path}` and `{query}` variables.
- The generated manifest includes live data endpoints, utility endpoints, and paid guide endpoints. Known high-performing Coinbase resources are sorted first via `metadata.discoveryPriority`; this is an ordering hint, not a fabricated call count.
- Pricing floor pass: public manifest generation, live Saylor fallback discovery, DB-backed discovery output, DB inserts, and the Saylor official importer now clamp positive numeric accepts to at least `10000` base units / `$0.01`. Current generated manifest audit: 534 resources, 0 accepts below `$0.01`.
- Endpoint enrichment pass: generated manifest, DB-backed discovery, and live fallback now fill conservative JSON `outputSchema` values when a source omits one, expose richer parameter hints, normalize URL placeholder tags, add `capabilities`, `doNotUseWhen`, `documentation`, and `license`, and use static endpoint URLs as examples when no placeholder substitution is required. Current generated manifest audit: 534 resources, 2670 accepts, 0 missing names/descriptions/examples/schemas/use guidance/Bazaar metadata, 0 accepts below `$0.01`.
- Coinbase shape pass: sampled the current top 5000 Coinbase Bazaar resources and profiled the top 50/200 by `quality.l30DaysTotalCalls`. High-use records are lean: top-level `resource` rather than `url`, no `metadata`, schema under `extensions.bazaar.schema`, input examples as `pathParams`/`queryParams`/`body`, average ~2.6-2.7 tags, and ~1.7-2.4 accepts. The public Saylor manifest now follows that shape: 534 resources, 1602 accepts, `resource` present on every record, no top-level `url` or `metadata`, Bazaar schema/input/output example present on every record, average 4.5 tags, average 3 accepts, Base USDC prioritized first, and 0 accepts below `$0.01`.

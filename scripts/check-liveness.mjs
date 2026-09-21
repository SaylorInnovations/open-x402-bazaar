#!/usr/bin/env node
// Probes owner-submitted (source = 'submitted') resources to see whether they still
// respond at all. Deliberately NOT run against the ~15k mirrored resources — Coinbase
// already crawls those, and probing that many endpoints from one script isn't a good
// use of anyone's rate limits.
//
// "Alive" means the endpoint responded at all (including 402 Payment Required, which
// is the *expected* unpaid response for an x402 resource, and 4xx from an unfilled
// {template} path segment) — only a network failure, timeout, or 5xx counts as down.
//
// Usage: node scripts/check-liveness.mjs --local | --remote [--apply]

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DB_NAME = 'open-x402-bazaar';
const TIMEOUT_MS = 8000;
const CONCURRENCY = 8;

const args = process.argv.slice(2);
const target = args.includes('--remote') ? '--remote' : '--local';
const apply = args.includes('--apply') || target === '--local';
const outDir = path.resolve('.data/liveness-check');

function sqlString(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

function d1Json(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, target, '--command', sql, '--json'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32,
  });
  return JSON.parse(out)[0]?.results || [];
}

function d1File(file) {
  execFileSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, target, '--file', file], {
    stdio: 'inherit',
    maxBuffer: 1024 * 1024 * 32,
  });
}

async function probe(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', signal: ctl.signal, redirect: 'follow' });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  console.log(`Target: ${target}${apply ? ' (will apply)' : ' (dry run)'}`);

  const rows = d1Json(
    `SELECT r.id, r.resource_url FROM resources r JOIN listings l ON l.host = r.listing_host WHERE l.source = 'submitted'`
  );
  console.log(`Checking ${rows.length} owner-submitted resource(s)...`);

  const results = await mapWithConcurrency(rows, CONCURRENCY, async (r) => ({
    id: r.id,
    alive: await probe(r.resource_url),
  }));

  const now = new Date().toISOString();
  const aliveCount = results.filter((r) => r.alive).length;
  console.log(`  ${aliveCount}/${results.length} responded (status < 500)`);

  // One history row per probe, then a rolling reliability window (last 10 checks,
  // computed in-SQL from that history) precomputed onto the resource row itself —
  // keeps every read-path query a plain column read, no per-row subquery at request time.
  const sql = results
    .map((r) => {
      const window = `(SELECT is_live FROM liveness_checks WHERE resource_id = ${r.id} ORDER BY checked_at DESC LIMIT 10)`;
      return [
        `INSERT INTO liveness_checks (resource_id, checked_at, is_live) VALUES (${r.id}, ${sqlString(now)}, ${r.alive ? 1 : 0});`,
        `UPDATE resources SET is_live = ${r.alive ? 1 : 0}, last_checked_at = ${sqlString(now)}, reliability_checks = (SELECT COUNT(*) FROM ${window}), reliability_live = (SELECT COUNT(*) FROM ${window} WHERE is_live = 1) WHERE id = ${r.id};`,
      ].join('\n');
    })
    .join('\n');

  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'liveness.sql');
  writeFileSync(file, sql || '-- nothing to check\n');
  console.log(`Wrote ${file}`);

  if (!apply || results.length === 0) {
    console.log(apply ? 'Nothing to apply.' : 'Dry run complete. Re-run with --apply to write results to D1.');
    return;
  }

  d1File(file);
  console.log('Liveness check complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

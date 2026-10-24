import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* SQLite integration runs on Node 22+, other tests support Node 18. */ }
import { extractResources } from '../src/validate.js';
import { upsertListing, listResources, searchResources, merchantResources } from '../src/db.js';
import { onRequestGet } from '../functions/resources/[slug].js';
import { callTool } from '../src/mcp.js';
import { requestContract, curlExample, jsExample, pyExample } from '../src/requestContract.js';

// Synthetic, unpaid fixture. No wallet, network request or live catalog write.
const body = { claim: "It's a quoted claim: $(printf injected)", context: null, nested: { verified: false } };
const extension = { bazaar: { info: { input: { type: 'http', method: 'POST', bodyType: 'json', body }, output: { type: 'json', example: { status: 'supported' } } }, schema: { type: 'object', properties: { input: { type: 'object', required: ['body'] } } } } };
const accepts = [{ scheme: 'exact', network: 'eip155:8453', payTo: '0xabc', asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', amount: '200000' }];
function manifest() {
  return { x402Version: 2, resources: [
    { url: 'https://example.com/verify', method: 'POST', extensions: structuredClone(extension), serviceName: 'Fixture verifier', mimeType: 'application/json', iconUrl: 'https://example.com/icon.png', metadata: { useWhen: 'Fixture report review' }, accepts },
    { url: 'https://example.com/extension-only', extensions: structuredClone(extension), accepts },
    { url: 'https://example.com/legacy', accepts },
  ] };
}
function d1(db) {
  return {
    prepare(sql) {
      const stmt = db.prepare(sql);
      const bound = values => ({
        bind: (...next) => bound(next),
        async all() { return { results: stmt.all(...values) }; },
        async first() { return stmt.get(...values) || null; },
        async run() { const r = stmt.run(...values); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; },
      });
      return bound([]);
    },
    async batch(statements) { const out = []; for (const stmt of statements) out.push(await stmt.run()); return out; },
  };
}

test('normalization retains explicit and extension-derived POST contracts without mutating the manifest', () => {
  const original = manifest(), snapshot = structuredClone(original);
  const rows = extractResources(original, 'https://example.com/manifest.json');
  assert.deepEqual(original, snapshot);
  for (const row of rows.slice(0, 2)) {
    assert.equal(row.method, 'POST');
    assert.deepEqual(row.extensions, extension);
    assert.deepEqual(row.metadata.extensions, extension);
    assert.equal(row.metadata.method, 'POST');
  }
  assert.equal(rows[0].metadata.useWhen, 'Fixture report review');
  assert.equal(rows[0].metadata.serviceName, 'Fixture verifier');
  assert.equal(rows[0].metadata.iconUrl, 'https://example.com/icon.png');
  assert.equal(requestContract(rows[2]).method, 'GET');
});

test('POST schema and example survive real SQLite storage, HTTP discovery, MCP and rendered examples', { skip: !DatabaseSync }, async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    const env = { DB: d1(db) };
    const rows = extractResources(manifest(), 'https://example.com/manifest.json');
    await upsertListing(env, { host: 'example.com', sourceManifestUrl: 'https://example.com/manifest.json', submittedAt: new Date().toISOString(), resources: rows });
    const listing = await listResources(env, { limit: 20 });
    const row = listing.resources.find(r => r.resource.endsWith('/verify'));
    assert.equal(row.method, 'POST');
    assert.deepEqual(row.extensions, extension);
    assert.equal(row.serviceName, 'Fixture verifier');
    assert.equal(row.iconUrl, 'https://example.com/icon.png');
    assert.deepEqual((await merchantResources(env, '0xabc')).find(r => r.id === row.id).extensions, extension);
    assert.equal((await searchResources(env, { urlSubstring: '/verify', limit: 20 }))[0].method, 'POST');
    const rpc = await callTool(env, 'get_resource', { slug: row.slug });
    const tool = JSON.parse(rpc.content[0].text);
    assert.deepEqual(tool.extensions, extension);
    assert.equal(tool.method, 'POST');
    const json = await (await onRequestGet({ params: { slug: row.slug + '.json' }, env })).json();
    assert.deepEqual(json.extensions, extension);
    const html = await (await onRequestGet({ params: { slug: row.slug }, env })).text();
    assert.match(html, /Call <code>POST https:\/\/example.com\/verify<\/code>/);
    assert.ok(html.includes('PAYMENT-REQUIRED'));
    assert.ok(!html.includes('Call <code>GET https://example.com/verify'));
    const stored = db.prepare('SELECT metadata FROM resources WHERE id = ?').get(Number(row.id));
    assert.equal(JSON.parse(stored.metadata).method, 'POST');
  } finally { db.close(); }
});

test('generated JS sends the declared JSON and understands header v2 and body v1 challenges', async () => {
  const row = extractResources(manifest(), 'https://example.com/manifest.json')[0];
  for (const v2 of [true, false]) {
    let sent;
    const challenge = { accepts };
    const sandbox = { atob, console: { log(value) { assert.deepEqual(JSON.parse(JSON.stringify(value)), accepts); } }, fetch: async (url, options) => {
      sent = { url, options }; return { status: 402, headers: new Headers(v2 ? { 'PAYMENT-REQUIRED': btoa(JSON.stringify(challenge)) } : {}), json: async () => challenge };
    } };
    await vm.runInNewContext('(async()=>{' + jsExample(row) + '})()', sandbox);
    assert.equal(sent.url, row.resource);
    assert.equal(sent.options.method, 'POST');
    assert.deepEqual(JSON.parse(sent.options.body), body);
    assert.equal(sent.options.headers['Content-Type'], 'application/json');
  }
  assert.match(curlExample(row), /-X POST/);
  if (process.platform !== 'win32') {
    const argument = /--data-raw (.*)\n#/.exec(curlExample(row))[1];
    const captured = execFileSync('sh', ['-c', "printf '%s' " + argument], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(captured), body, 'shell must preserve quotes and dollar expressions literally');
  }
  assert.match(pyExample(row), /httpx.request\("POST"/);
  assert.match(pyExample(row), /base64.b64decode\(header\)/);
  assert.match(pyExample(row), /json=json.loads\(/);
});

test('legacy GET remains bodyless; metadata-only records and JSON null stay representable', () => {
  const get = { resource: 'https://example.com/get' };
  assert.deepEqual(requestContract(get), { method: 'GET' });
  assert.ok(!jsExample(get).includes('Content-Type'));
  assert.ok(!curlExample(get).includes('--data-raw'));
  assert.match(pyExample(get), /httpx.request\("GET"/);
  assert.deepEqual(requestContract({ ...get, metadata: { extensions: extension } }), { method: 'POST', body });
  assert.deepEqual(requestContract({ ...get, method: 'POST', extensions: { bazaar: { info: { input: { bodyType: 'json', body: null } } } } }), { method: 'POST', body: null });
});

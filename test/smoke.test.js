import assert from 'assert';
import { isPrivateIp, assertPublicHttpsUrl, extractResources } from '../src/validate.js';
import { toFtsQuery } from '../src/db.js';

async function main() {
  // --- SSRF guard: private/loopback/link-local ranges ---
  assert.strictEqual(isPrivateIp('127.0.0.1'), true, 'loopback must be private');
  assert.strictEqual(isPrivateIp('10.0.0.5'), true, 'RFC1918 10/8 must be private');
  assert.strictEqual(isPrivateIp('192.168.1.1'), true, 'RFC1918 192.168/16 must be private');
  assert.strictEqual(isPrivateIp('172.20.0.1'), true, 'RFC1918 172.16/12 must be private');
  assert.strictEqual(isPrivateIp('169.254.169.254'), true, 'cloud metadata address must be private');
  assert.strictEqual(isPrivateIp('8.8.8.8'), false, 'public IP must not be flagged private');
  assert.strictEqual(isPrivateIp('::1'), true, 'IPv6 loopback must be private');

  await assert.rejects(
    () => assertPublicHttpsUrl('http://example.com/x402.json'),
    /https/,
    'non-https manifestUrl must be rejected'
  );
  await assert.rejects(
    () => assertPublicHttpsUrl('https://localhost/x402.json'),
    /private|internal/,
    'localhost must be rejected as private'
  );
  await assert.rejects(
    () => assertPublicHttpsUrl('https://169.254.169.254/x402.json'),
    /private|internal/,
    'cloud metadata IP literal must be rejected'
  );

  // Real DNS-over-HTTPS resolution path (network required) — a genuine public domain must pass.
  await assertPublicHttpsUrl('https://example.com/x402.json');

  // --- manifest normalization ---
  const manifest = {
    x402Version: 2,
    resources: [
      {
        url: 'https://example.com/api/price',
        description: 'Live price feed',
        tags: ['crypto'],
        accepts: [{ scheme: 'exact', network: 'eip155:8453', payTo: '0xabc', asset: '0xusdc', amount: '1000' }],
      },
      { url: 'https://example.com/free', description: 'no accepts, must be skipped', accepts: [] },
    ],
  };
  const resources = extractResources(manifest, 'https://example.com/.well-known/x402.json');
  assert.strictEqual(resources.length, 1, 'entries without a valid accepts[] must be dropped');
  assert.strictEqual(resources[0].sourceHost, 'example.com');
  assert.strictEqual(resources[0].resource, 'https://example.com/api/price');

  assert.throws(() => extractResources({ x402Version: 2 }, 'https://example.com/x.json'), /no paid resources/);
  assert.throws(() => extractResources({ resources: [] }, 'https://example.com/x.json'), /x402Version/);

  // --- FTS5 query sanitization: arbitrary input must never be parsed as an FTS5 operator ---
  assert.strictEqual(toFtsQuery('solana price'), '"solana" "price"');
  assert.strictEqual(toFtsQuery('say "hi" -x'), '"say" """hi""" "-x"');
  assert.strictEqual(toFtsQuery('NEAR(a b)'), '"NEAR(a" "b)"');

  console.log('ok — all smoke tests passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

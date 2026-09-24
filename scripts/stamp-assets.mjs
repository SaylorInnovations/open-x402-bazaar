// Cache-busts /assets/*.css and /assets/*.js references by appending ?v=<content hash>.
// _headers gives /assets/* a 24h Cache-Control, and Cloudflare's edge on the custom
// domain honors it — so after a deploy that changed bazaar.css, the live site kept
// serving the old stylesheet against the new markup (a fully unstyled homepage) until
// the cached copy expired. A hash in the URL means a changed file is a new URL.
// Run by deploy.sh before every deploy; idempotent.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const hashOf = (name) =>
  createHash('sha256').update(readFileSync(join(root, 'public/assets', name))).digest('hex').slice(0, 10);

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return p.endsWith('.html') ? [p] : [];
  });
}

const targets = [join(root, 'src/layout.js'), ...htmlFiles(join(root, 'public'))];
const hashes = {};
for (const file of targets) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(/\/assets\/([\w-]+\.(?:css|js))(?:\?v=[\w]+)?(?=["'])/g, (_, name) => {
    hashes[name] ??= hashOf(name);
    return `/assets/${name}?v=${hashes[name]}`;
  });
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`stamped ${file.slice(root.length)}`);
  }
}

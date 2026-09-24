// Re-renders the shared header/footer into the hand-authored static pages so they
// can never drift from src/layout.js. Idempotent: run it after editing header() or
// footer() there.   node scripts/sync-shell.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { header, footer } from '../src/layout.js';

const PAGES = {
  'public/agents/index.html': '/agents',
  'public/publish/index.html': '/publish',
  'public/docs/index.html': '/docs',
  'public/protocols/index.html': '/protocols',
  'public/protocols/x402/index.html': '/protocols',
  'public/protocols/mcp/index.html': '/protocols',
  'public/protocols/a2a/index.html': '/protocols',
  'public/404.html': '/',
};

for (const [file, path] of Object.entries(PAGES)) {
  let html;
  try { html = readFileSync(file, 'utf8'); } catch { continue; }
  const before = html;

  html = html
    .replace(/(<a class="skip"[\s\S]*?<\/a>\s*)?<header class="(?:site-nav|site-header)">[\s\S]*?<\/header>/, header(path).trim())
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer().trim())
    .replace(/<main(?![^>]*\bid=)([^>]*)>/, '<main id="main"$1>');

  if (!html.includes('/assets/legacy.css')) {
    html = html.replace('<link rel="stylesheet" href="/assets/bazaar.css">',
      '<link rel="stylesheet" href="/assets/bazaar.css">\n<link rel="stylesheet" href="/assets/legacy.css">');
  }
  if (!html.includes('/assets/bazaar.js')) {
    html = html.replace('</body>', '<script src="/assets/bazaar.js" defer></script>\n</body>');
  }
  if (html !== before) { writeFileSync(file, html); console.log('synced', file); }
  else console.log('unchanged', file);
}

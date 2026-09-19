// Shared HTML shell for server-rendered pages (resource/provider detail pages).
// Static pages (index, agents, publish, docs) hand-author the same header/footer
// markup directly since there's no build step to share components through —
// keep them in sync if you change this file.

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function header() {
  return `
<header class="site-nav">
  <div class="wrap nav-inner">
    <a href="/" class="brand">
      <img src="/assets/saylor-logo.jpg" alt="Saylor Innovations">
      <span>Agent Bazaar <span class="sub">by Saylor Innovations</span></span>
    </a>
    <nav class="nav-links">
      <a href="/#explore">Explore</a>
      <a href="/publish">Publish</a>
      <a href="/agents">Agents</a>
      <a href="/guides">Guides</a>
      <a href="/docs">Docs</a>
      <a href="https://github.com/SaylorInnovations/open-x402-bazaar">GitHub</a>
    </nav>
    <div class="nav-cta">
      <a href="/agents" class="btn btn-primary btn-sm">Connect an Agent</a>
    </div>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="brand" style="margin-bottom:10px;"><img src="/assets/saylor-logo.jpg" alt=""><span>Agent Bazaar</span></div>
        <p>Open infrastructure for the agent economy. A permissionless discovery and payment layer for AI agents, built in the open.</p>
      </div>
      <div>
        <h4>Marketplace</h4>
        <a href="/#explore">Explore</a>
        <a href="/categories">Categories</a>
        <a href="/networks">Networks</a>
        <a href="/publish">Publish a resource</a>
        <a href="/agents">Connect an agent</a>
        <a href="/discovery/stats">Network stats</a>
      </div>
      <div>
        <h4>Protocols</h4>
        <a href="/protocols/x402">x402</a>
        <a href="/protocols/mcp">MCP</a>
        <a href="/protocols/a2a">A2A</a>
        <a href="/openapi.json">OpenAPI</a>
      </div>
      <div>
        <h4>Developers</h4>
        <a href="/docs">Documentation</a>
        <a href="/guides">Guides</a>
        <a href="/llms.txt">llms.txt</a>
        <a href="https://github.com/SaylorInnovations/open-x402-bazaar">Source (GitHub)</a>
        <a href="https://github.com/SaylorInnovations/open-x402-bazaar/blob/master/README.md">Self-hosting</a>
      </div>
      <div>
        <h4>Saylor Innovations</h4>
        <a href="https://saylorinnovations.com">saylorinnovations.com</a>
        <a href="https://x402.saylorinnovations.com">Saylor x402 APIs</a>
        <a href="https://github.com/SaylorInnovations/solana-x402">solana-x402 (OSS)</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Open source, MIT licensed. No account or KYC required to list or discover.</span>
      <span class="powered"><img src="/assets/saylor-logo.jpg" alt="">A Saylor Innovations product</span>
    </div>
  </div>
</footer>`;
}

function pageShell({ title, description, canonical, bodyHtml, jsonLd, extraHead = '' }) {
  const jsonLdBlock = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<link rel="icon" type="image/jpeg" href="/assets/saylor-logo.jpg">
<link rel="stylesheet" href="/assets/bazaar.css">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
${jsonLdBlock}
${extraHead}
</head>
<body>
${header()}
${bodyHtml}
${footer()}
</body>
</html>`;
}

export { pageShell, header, footer, escapeHtml };

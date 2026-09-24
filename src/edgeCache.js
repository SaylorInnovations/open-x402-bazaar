// Edge cache for server-rendered pages that read D1. The catalog changes a few
// times a day (imports, submissions), not per request, so a page view should almost
// never reach the database. Rendering at most once per TTL per Cloudflare location
// is what keeps the free-tier daily row-read cap out of reach — the previous
// homepage fired five D1-backed fetches on every single view.
//
// `render()` returns { response, cacheable }. Degraded output (a D1 error rendered as
// a friendly page) is returned but never cached, so a transient failure heals on the
// next request instead of being served for the whole TTL.
export async function withEdgeCache({ request, waitUntil }, ttlSeconds, render) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });

  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  const { response, cacheable } = await render();
  if (!cacheable) {
    response.headers.set('cache-control', 'no-store');
    return response;
  }

  response.headers.set('cache-control', `public, max-age=60, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 4}`);
  if (cache) waitUntil(cache.put(key, response.clone()));
  return response;
}

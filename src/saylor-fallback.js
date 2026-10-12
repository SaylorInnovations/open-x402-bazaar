async function fallbackListResources({ limit, offset } = {}) {
  return {
    resources: [],
    total: 0,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
    fallback: 'empty',
  };
}

function fallbackHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
    'cache-control': 'public, max-age=60',
    ...extra,
  };
}

export { fallbackListResources, fallbackHeaders };

function paginate(items, { limit = 20, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  return items.slice(off, off + lim);
}

function acceptsMatch(resource, { network, asset, scheme, payTo, maxUsdPrice } = {}) {
  return (resource.accepts || []).some((a) => {
    if (network && a.network !== network) return false;
    if (asset && a.asset !== asset) return false;
    if (scheme && a.scheme !== scheme) return false;
    if (payTo && a.payTo !== payTo) return false;
    if (maxUsdPrice !== undefined && a.amountUsd !== undefined && Number(a.amountUsd) > Number(maxUsdPrice)) {
      return false;
    }
    return true;
  });
}

function textMatch(resource, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [resource.resource, resource.description, resource.sourceHost, ...(resource.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

module.exports = { paginate, acceptsMatch, textMatch };

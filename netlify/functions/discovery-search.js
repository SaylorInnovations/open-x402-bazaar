const { allResources } = require('../../src/store');
const { paginate, acceptsMatch, textMatch } = require('../../src/query');

const CORS = { 'access-control-allow-origin': '*' };

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const all = await allResources();

  const filtered = all.filter((r) =>
    textMatch(r, q.query) &&
    acceptsMatch(r, {
      network: q.network,
      asset: q.asset,
      scheme: q.scheme,
      payTo: q.payTo,
      maxUsdPrice: q.maxUsdPrice,
    }) &&
    (!q.urlSubstring || (r.resource || '').toLowerCase().includes(String(q.urlSubstring).toLowerCase()))
  );

  const resources = paginate(filtered, { limit: q.limit, offset: 0 });

  return {
    statusCode: 200,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify({
      x402Version: 2,
      resources,
      partialResults: false,
      searchMethod: q.query ? 'text' : 'filter',
    }),
  };
};

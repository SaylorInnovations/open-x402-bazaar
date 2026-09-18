const { allResources } = require('../../src/store');
const { paginate } = require('../../src/query');

const CORS = { 'access-control-allow-origin': '*' };

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const all = await allResources();
  const resources = paginate(all, { limit: q.limit, offset: q.offset });

  return {
    statusCode: 200,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify({
      x402Version: 2,
      resources,
      total: all.length,
      offset: Number(q.offset) || 0,
      limit: Math.min(Math.max(Number(q.limit) || 20, 1), 100),
    }),
  };
};

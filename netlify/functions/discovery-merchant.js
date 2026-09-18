const { allResources } = require('../../src/store');
const { acceptsMatch } = require('../../src/query');

const CORS = { 'access-control-allow-origin': '*' };

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (!q.payTo) {
    return {
      statusCode: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'payTo query parameter is required' }),
    };
  }

  const all = await allResources();
  const resources = all.filter((r) => acceptsMatch(r, { payTo: q.payTo }));

  return {
    statusCode: 200,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify({ x402Version: 2, payTo: q.payTo, resources }),
  };
};

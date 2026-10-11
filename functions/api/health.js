const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet({ env }) {
  let database = 'unavailable';
  try {
    await env.DB.prepare('SELECT 1').first();
    database = 'ok';
  } catch {
    database = 'degraded';
  }

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'Agent Bazaar',
      database,
      fallback: database === 'ok' ? null : 'saylor-manifest',
      time: new Date().toISOString(),
    }),
    {
      headers: {
        ...CORS,
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    }
  );
}

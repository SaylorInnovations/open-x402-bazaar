export async function onRequestGet() {
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

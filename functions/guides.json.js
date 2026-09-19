import { guideSummaries } from '../src/guides.js';

const CORS = { 'access-control-allow-origin': '*' };

export async function onRequestGet() {
  return new Response(JSON.stringify({ guides: guideSummaries() }, null, 2), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

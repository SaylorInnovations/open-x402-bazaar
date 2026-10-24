// Read-only call examples share the same declared HTTP contract. Never infer POST
// from the presence of a body, and never invent values for a required input.
function requestContract(resource) {
  const input = (resource.extensions || resource.metadata?.extensions)?.bazaar?.info?.input;
  const declared = resource.method || resource.metadata?.method || input?.method;
  const normalized = typeof declared === 'string' ? declared.toUpperCase() : '';
  const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(normalized) ? normalized : 'GET';
  const hasBody = !['GET', 'HEAD'].includes(method) && input?.bodyType === 'json' && Object.hasOwn(input, 'body');
  return { method, ...(hasBody ? { body: input.body } : {}) };
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function curlExample(resource) {
  const { method, body } = requestContract(resource);
  return `curl -i -X ${method} ${shellQuote(resource.resource)}` +
    (body !== undefined ? ` \\\n+  -H 'Content-Type: application/json' \\\n+  --data-raw ${shellQuote(JSON.stringify(body))}` : '') +
    '\n# Unpaid request only. x402 v2: read PAYMENT-REQUIRED (base64 JSON).\n# Authorize a bounded payment with an x402 client before retrying.';
}

function jsExample(resource) {
  const { method, body } = requestContract(resource);
  const options = JSON.stringify({ method, ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }, null, 2);
  return `const res = await fetch(${JSON.stringify(resource.resource)}, ${options});
if (res.status === 402) {
  const header = res.headers.get("PAYMENT-REQUIRED");
  const challenge = header ? JSON.parse(atob(header)) : await res.json();
  console.log(challenge.accepts);
  // Inspect terms; authorize a bounded payment with an x402 client before retrying.
}`;
}

function pyExample(resource) {
  const { method, body } = requestContract(resource);
  return `import base64, json, httpx
res = httpx.request(${JSON.stringify(method)}, ${JSON.stringify(resource.resource)}${body !== undefined ? ', json=json.loads(' + JSON.stringify(JSON.stringify(body)) + ')' : ''})
if res.status_code == 402:
    header = res.headers.get("PAYMENT-REQUIRED")
    challenge = json.loads(base64.b64decode(header)) if header else res.json()
    print(challenge["accepts"])
    # Inspect terms; authorize a bounded payment with an x402 client before retrying.`;
}

export { requestContract, curlExample, jsExample, pyExample };

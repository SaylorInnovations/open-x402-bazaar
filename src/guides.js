// The guides library. Each guide is real, substantive content — not templated
// filler — kept in one module so every guide page (human HTML + machine JSON)
// renders from a single source, the same principle as resources/providers.
// Add a guide by appending to GUIDES; nothing else needs to change.

const GUIDES = [
  {
    slug: 'what-is-an-ai-agent-marketplace',
    title: 'What Is an AI Agent Marketplace?',
    description: 'A deep dive on what an AI agent marketplace actually is, why plain API directories fall short for autonomous software, and how discovery, pricing and payment fit together.',
    category: 'Concepts',
    readMins: 9,
    related: ['what-is-agentic-commerce', 'how-do-agents-discover-apis', 'x402-vs-api-keys'],
    body: `
<p>An <strong>AI agent marketplace</strong> is a catalog of APIs, tools, datasets and services that software — not a human clicking through documentation — can search, evaluate, and start using on its own. That sounds like a small distinction from "API directory," but it changes almost everything about how the catalog has to be built.</p>

<h2>The gap a normal API directory leaves open</h2>
<p>A human-facing API directory (think a marketplace landing page with cards and a "Get API Key" button) assumes a person reads a description, decides it fits, signs up for an account, copies a key into their code, and comes back later if something changes. Every one of those steps requires a human in the loop. An autonomous agent has none of that: no account to sign into, no key to copy, and — critically — no ability to "come back later" unless the system it's working from tells it something changed.</p>
<p>So an agent marketplace has to answer, in a format software can parse without guessing, four questions a human directory leaves to prose:</p>
<ul>
<li><strong>What does this do?</strong> Not marketing copy — a description and, ideally, explicit <code>capabilities</code>/<code>useWhen</code>/<code>doNotUseWhen</code> fields an agent can match against its task.</li>
<li><strong>What does it cost, and how do I pay?</strong> A price an agent can compare against its budget, and a payment method it can execute without a human approving a card charge.</li>
<li><strong>What do I send, and what do I get back?</strong> A machine-readable input/output schema, not a paragraph describing the JSON shape.</li>
<li><strong>How reliable is this, right now?</strong> Some signal beyond "trust us" — usage volume, a liveness check, whether the owner has actually claimed the listing.</li>
</ul>

<h2>Why this requires new infrastructure, not just a nicer UI</h2>
<p>Every one of those four answers has to be structured data the marketplace itself hosts and keeps current — not a claim the provider makes once and never has to prove. That's why Agent Bazaar's <a href="/resources/solana-token-security-intelligence">resource pages</a> carry a real <code>accepts[]</code> array (not a price written in prose), a <code>quality</code> object built from actual call volume, and a <code>verified</code> flag that only flips to true when the provider proved control of the listing via <code>POST /submit</code> — not when they merely claimed to own it.</p>
<p>This is also why the catalog is exposed the same way to a browser and to an agent: <a href="/discovery/search"><code>/discovery/search</code></a> returns the same underlying rows as the HTML page at <code>/resources/{slug}</code>. There isn't a "real" human-facing database and a stripped-down "API version" bolted on afterward — the structured data <em>is</em> the marketplace, and the website is one client of it, same as an MCP tool call or a raw HTTP request from an agent are other clients of it.</p>

<h2>Discovery, pricing and payment are three separate problems</h2>
<p>It's worth naming these separately because conflating them is where a lot of "agent marketplace" pitches go vague:</p>
<table>
<tr><th>Problem</th><th>What solves it</th><th>Where</th></tr>
<tr><td>Finding a resource that matches a task</td><td>Structured search over real fields (description, tags, category, network)</td><td><a href="/discovery/search">/discovery/search</a>, <a href="/protocols/mcp">MCP</a> tools</td></tr>
<tr><td>Knowing exactly what it costs before calling it</td><td>A price the agent can read, not infer</td><td><code>accepts[]</code> on every resource</td></tr>
<tr><td>Actually paying, without a human approving each transaction</td><td>A settlement protocol built for machine payment</td><td><a href="/protocols/x402">x402</a></td></tr>
</table>
<p>A marketplace that only solves discovery (a searchable list of APIs) still leaves an agent stuck at the payment step, back to needing a human to enter a credit card. A marketplace that only solves payment (an x402-enabled endpoint with no discovery layer) is unreachable unless an agent already knows the URL. You need both, which is the actual scope of what "AI agent marketplace" means in practice.</p>

<h2>Humans still matter — they're just not required</h2>
<p>None of this means the human experience is an afterthought. People still browse Agent Bazaar to evaluate what exists, read a resource's documentation, or decide what to publish. The design goal is narrower than "agents only": every page a human reads has to be backed by the same structured data an agent would consume, so nothing is hidden behind a UI interaction an agent can't perform (a modal, a "click to reveal pricing" button, JavaScript-only content with no server-rendered equivalent). See <a href="/docs">the docs</a> for how that plays out architecturally.</p>

<h2>What this looks like in the catalog today</h2>
<p>Browse <a href="/categories">categories</a> or <a href="/networks">networks</a> to see real listings, or query the API directly:</p>
<div class="codeblock"><pre>curl "https://bazaar.saylorinnovations.com/discovery/search?query=token+security&limit=3"</pre></div>
<p>Every result includes <code>accepts[]</code>, a <code>quality</code> signal, and a <code>verified</code> flag — the four questions above, answered as data rather than prose.</p>
`,
  },

  {
    slug: 'what-is-x402',
    title: 'What Is x402? A Complete Guide to the Protocol',
    description: 'The full picture of x402: where the HTTP 402 status code came from, exactly what happens on the wire during a payment, the scheme and network model, and how it compares to the alternatives.',
    category: 'Protocols',
    readMins: 12,
    related: ['how-do-ai-agents-pay-for-apis', 'how-to-build-an-x402-endpoint', 'x402-vs-api-keys'],
    body: `
<p><strong>x402</strong> is an open protocol that turns the long-dormant HTTP <code>402 Payment Required</code> status code into a working machine-payment handshake: a server can tell a client exactly how to pay for a resource, in the response itself, and the client can pay and retry in the same exchange. No account creation, no stored card, no API key — payment <em>is</em> the authentication.</p>

<h2>Where 402 came from</h2>
<p>HTTP 402 has been reserved "for future use" since the original HTTP/1.1 specification in the 1990s. It was never standardized for anything, which left it sitting unused for three decades while 401 (Unauthorized), 403 (Forbidden) and 404 (Not Found) became some of the most recognizable codes on the web. x402 is what happens when someone finally builds the "future use" the spec always gestured at: a status code whose entire job is "you need to pay, and here's exactly how."</p>

<h2>The full round trip</h2>
<p>Concretely, an x402 exchange is two HTTP requests:</p>
<div class="codeblock"><pre>1) GET /api/security/abc123          (no payment attached)

   &lt;- HTTP/1.1 402 Payment Required
      Content-Type: application/json
      {
        "x402Version": 2,
        "accepts": [
          {
            "scheme": "exact",
            "network": "eip155:8453",
            "payTo": "0xf8A376...def22f",
            "asset": "0x833589...bdA02913",
            "amount": "10000",
            "maxTimeoutSeconds": 120
          }
        ]
      }

2) [agent settles a payment matching one accepts[] entry]

3) GET /api/security/abc123
   Header: PAYMENT-SIGNATURE: &lt;base64 proof&gt;

   &lt;- HTTP/1.1 200 OK
      { ...the resource... }</pre></div>
<p>Everything an agent needs to decide whether and how to pay is in that first 402 response — no separate pricing page, no documentation lookup, no signup flow. That's the entire value proposition in one exchange.</p>

<h2>Reading an <code>accepts[]</code> entry</h2>
<table>
<tr><th>Field</th><th>Meaning</th></tr>
<tr><td><code>scheme</code></td><td>How the payment is constructed and verified. <code>exact</code> is the common case: pay this exact amount. Other schemes exist for different settlement mechanics (e.g. batched settlement).</td></tr>
<tr><td><code>network</code></td><td>A <a href="/networks">CAIP-2 chain id</a> — <code>eip155:8453</code> is Base, <code>solana:5eykt4Us...</code> is Solana mainnet. A resource can list multiple <code>accepts[]</code> entries across several networks; the caller picks whichever it can settle.</td></tr>
<tr><td><code>payTo</code></td><td>The address that receives payment. On Agent Bazaar this goes straight from the caller's wallet to the provider's — the marketplace is never in the payment path.</td></tr>
<tr><td><code>asset</code></td><td>The token contract (almost always USDC in practice, though the protocol doesn't require it).</td></tr>
<tr><td><code>amount</code></td><td>In the asset's base units — e.g. <code>10000</code> for 0.01 USDC (6 decimals).</td></tr>
<tr><td><code>maxTimeoutSeconds</code></td><td>How long the quoted price is valid before the caller needs to re-request the 402.</td></tr>
</table>

<h2>Facilitators, and why most integrations don't need to think about them</h2>
<p>Settling an on-chain payment and then proving that settlement to the server can be handled two ways: the caller submits the transaction itself and includes proof, or a <strong>facilitator</strong> — a third-party service both sides trust — verifies and relays settlement so the client library only has to sign, not manage RPC nodes and confirmation polling. Most x402 client libraries default to using a facilitator, which is why "pay with x402" from an agent's side is usually a handful of lines, not a blockchain integration project. See <a href="https://github.com/SaylorInnovations/solana-x402">solana-x402</a> for a zero-dependency reference implementation that supports both self-verified and facilitator-routed settlement.</p>

<h2>What x402 deliberately doesn't do</h2>
<p>x402 has no concept of accounts, sessions, or identity beyond a wallet address. It doesn't handle discovery (that's what a marketplace like this one, or an <a href="/protocols/mcp">MCP</a> tool list, or an <a href="/protocols/a2a">A2A</a> agent card is for) and it doesn't handle subscription billing or usage aggregation across calls — every request is priced and paid independently. That narrowness is a feature: it's a payment primitive other systems compose on top of, not a full commerce platform trying to do everything.</p>

<h2>Try it</h2>
<p>Every resource on Agent Bazaar publishes real <code>accepts[]</code> — see <a href="/resources/solana-token-security-intelligence">an example</a>, or read the full guide to actually writing the client code in <a href="/guides/how-do-ai-agents-pay-for-apis">How Do AI Agents Pay for APIs?</a></p>
`,
  },

  {
    slug: 'how-do-ai-agents-pay-for-apis',
    title: 'How Do AI Agents Pay for APIs? A Practical Walkthrough',
    description: 'Working JavaScript and Python code for handling an x402 402 response end to end: detecting it, picking a payment option, settling it, and retrying — plus the mistakes that trip up a first implementation.',
    category: 'For Agent Builders',
    readMins: 11,
    related: ['what-is-x402', 'how-to-build-an-x402-endpoint', 'x402-vs-api-keys'],
    body: `
<p>This is the practical companion to <a href="/guides/what-is-x402">What Is x402?</a> — actual code for the client side: catching a 402, choosing how to pay, settling it, and retrying successfully.</p>

<h2>The shape of the problem</h2>
<p>Handling x402 correctly means treating <code>402</code> as an expected, structured response — not an error to catch and give up on. The response body tells you everything you need:</p>
<div class="codeblock"><pre>{
  "x402Version": 2,
  "accepts": [
    { "scheme": "exact", "network": "eip155:8453", "payTo": "0x...",
      "asset": "0x...USDC", "amount": "10000", "maxTimeoutSeconds": 120 }
  ]
}</pre></div>

<h2>JavaScript: a minimal client</h2>
<div class="codeblock"><pre>async function callX402Resource(url, wallet) {
  let res = await fetch(url);
  if (res.status !== 402) return res; // already free, or an unrelated error

  const { accepts } = await res.json();

  // Pick the first option your wallet can actually settle — in practice,
  // filter by network (does your wallet hold funds there?) and by asset.
  const option = accepts.find((a) => wallet.supportsNetwork(a.network));
  if (!option) throw new Error('no payable option for this wallet');

  // Settling is wallet/library-specific. A facilitator-backed client
  // (see the x402 protocol guide) reduces this to a sign + submit call —
  // you are not writing raw transaction construction code here.
  const paymentSignature = await wallet.pay(option);

  res = await fetch(url, {
    headers: { 'PAYMENT-SIGNATURE': paymentSignature },
  });
  return res; // 200 with the resource, or another 402 if payment didn't verify
}</pre></div>

<h2>Python equivalent</h2>
<div class="codeblock"><pre>import httpx

def call_x402_resource(url: str, wallet) -> httpx.Response:
    res = httpx.get(url)
    if res.status_code != 402:
        return res

    accepts = res.json()["accepts"]
    option = next((a for a in accepts if wallet.supports_network(a["network"])), None)
    if option is None:
        raise RuntimeError("no payable option for this wallet")

    payment_signature = wallet.pay(option)
    return httpx.get(url, headers={"PAYMENT-SIGNATURE": payment_signature})</pre></div>

<h2>Real-world details that matter</h2>
<ul>
<li><strong>The quote expires.</strong> <code>maxTimeoutSeconds</code> means the amount and any embedded reference are only valid for that long. If your agent evaluates a bunch of options before deciding, re-fetch the 402 right before paying rather than using a stale quote.</li>
<li><strong>Retry once, not in a loop.</strong> A second 402 after you paid usually means the payment didn't verify (wrong amount, wrong network, expired quote) — not that you should keep retrying the same broken payment. Surface the error.</li>
<li><strong>Pick the cheapest viable option, not the first one.</strong> Multi-network resources often list the same USD price across several chains; if your wallet holds funds on more than one, compare actual gas/settlement cost, not just the listed amount.</li>
<li><strong>Budget checks belong before the request, not after.</strong> If your agent has a per-task spending limit, check the resource's price via <a href="/resources/solana-token-security-intelligence.json">the JSON record</a> or an MCP <code>get_pricing</code> call before making the first request at all — don't rely on catching the 402 as your only price discovery.</li>
</ul>

<h2>Using the MCP tool instead of raw HTTP</h2>
<p>If your agent already speaks MCP, <code>get_pricing</code> on <a href="/mcp">Agent Bazaar's MCP server</a> gives you a resource's <code>accepts[]</code> without an extra round trip:</p>
<div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/mcp \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_pricing","arguments":{"slug":"solana-token-security-intelligence"}}}'</pre></div>
<p>You still pay directly against the resource's own endpoint, not through MCP — the tool call just saves you a lookup.</p>

<h2>Testing without spending real money</h2>
<p>Start with the free discovery endpoints (<a href="/discovery/search">/discovery/search</a> costs nothing) to confirm your agent's HTTP plumbing works, then move to a low-cost resource like <a href="/resources/solana-token-price">Solana Token Price</a> ($0.001) to validate the full payment round trip before wiring up anything expensive.</p>
`,
  },

  {
    slug: 'what-is-mcp-and-how-does-it-work',
    title: 'What Is MCP and How Does It Work?',
    description: 'A ground-up explanation of Model Context Protocol: the problem it solves, its transports, its primitives (tools, resources, prompts), and a worked example of a minimal server.',
    category: 'Protocols',
    readMins: 11,
    related: ['mcp-vs-rest-api-vs-x402', 'how-do-agents-discover-apis', 'what-is-x402'],
    body: `
<p><strong>Model Context Protocol (MCP)</strong> is a standard for how an AI model or agent discovers what a server can do — and how to call it — at the moment it needs to, instead of that knowledge being hard-coded into the agent ahead of time.</p>

<h2>The problem before MCP</h2>
<p>Before a standard existed, "giving an LLM a tool" meant writing a custom integration: a function definition matching the exact shape one specific API expected, wired into one specific agent framework. Every new tool was bespoke glue code. Every agent framework had its own convention for describing what a function did and how to call it. None of it was portable — a tool built for one agent couldn't be dropped into another without rewriting the integration layer.</p>
<p>MCP standardizes the interface between "thing that has capabilities" (an MCP server) and "thing that wants to use them" (an MCP client, usually embedded in an agent or IDE). A client that speaks MCP can connect to <em>any</em> compliant server and immediately know what it offers — no custom glue code per integration.</p>

<h2>The core exchange</h2>
<p>An MCP session, boiled down:</p>
<div class="codeblock"><pre>client -> server: initialize (protocol version, capabilities)
server -> client: capabilities, server info

client -> server: tools/list
server -> client: [ { name, description, inputSchema }, ... ]

client -> server: tools/call { name, arguments }
server -> client: { content: [...] }  (or isError: true)</pre></div>
<p>Everything the client needs to use a tool correctly — its name, what it does in plain language, and a JSON Schema for its arguments — comes back from <code>tools/list</code>. The client never needs prior knowledge of that specific server.</p>

<h2>Transports: stdio vs. Streamable HTTP</h2>
<p>MCP defines more than one way to carry that exchange:</p>
<ul>
<li><strong>stdio</strong> — the server runs as a local subprocess; the client writes JSON-RPC to its stdin and reads responses from stdout. Common for local dev tools and desktop agent apps.</li>
<li><strong>Streamable HTTP</strong> — the server is a normal web endpoint. A client POSTs a JSON-RPC request and gets a JSON-RPC response; a server that needs to push multiple messages can upgrade to a streamed response, but a stateless, read-only server (like a search tool) can just answer once per request with no persistent connection at all.</li>
</ul>
<p><a href="/mcp">Agent Bazaar's MCP server</a> uses Streamable HTTP in fully stateless mode — no session handshake, because none of its tools (search, get_resource, get_pricing, etc.) need to remember anything between calls:</p>
<div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/mcp \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'</pre></div>

<h2>Tools, resources, and prompts</h2>
<p>MCP defines three primitives a server can expose, though most servers (including this one) mainly use the first:</p>
<table>
<tr><th>Primitive</th><th>Purpose</th></tr>
<tr><td>Tools</td><td>Callable functions with side effects or computation — <code>search_resources</code>, <code>get_resource</code>.</td></tr>
<tr><td>Resources</td><td>Addressable, readable content a client can fetch, more like a file than a function call.</td></tr>
<tr><td>Prompts</td><td>Reusable prompt templates a server suggests to the client, parameterized by arguments.</td></tr>
</table>

<h2>Building a minimal MCP server</h2>
<p>The actual protocol surface is small enough to hand-roll without an SDK, which is exactly what <a href="/mcp">Agent Bazaar's implementation</a> does — it's a single JSON-RPC dispatcher over the same functions the REST <a href="/discovery/search">/discovery</a> API already calls:</p>
<div class="codeblock"><pre>async function handleRpc(request) {
  const { id, method, params } = request;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: {
      protocolVersion: params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'my-server', version: '1.0.0' },
    }};
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }
  if (method === 'tools/call') {
    const result = await runTool(params.name, params.arguments);
    return { jsonrpc: '2.0', id, result };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found' } };
}</pre></div>
<p>That's the whole shape. The work is in <code>TOOLS</code> (accurate names, descriptions and JSON Schemas — this is what the client actually reasons over) and <code>runTool</code> (your real logic).</p>

<h2>Where MCP fits next to x402 and A2A</h2>
<p>MCP answers "what can this server do and how do I call it." It doesn't say anything about payment (that's <a href="/protocols/x402">x402</a>) or about one agent describing itself to another agent as a whole entity rather than a tool server (that's <a href="/protocols/a2a">A2A</a>). See <a href="/guides/mcp-vs-rest-api-vs-x402">MCP vs REST vs x402</a> for the full comparison.</p>
`,
  },

  {
    slug: 'what-is-agentic-commerce',
    title: 'What Is Agentic Commerce?',
    description: 'What changes when the entity buying and selling is software instead of a person — trust without identity, pricing without negotiation, and the infrastructure that has to exist for it to work at all.',
    category: 'Concepts',
    readMins: 10,
    related: ['what-is-an-ai-agent-marketplace', 'what-is-x402', 'how-to-sell-an-api-to-ai-agents'],
    body: `
<p><strong>Agentic commerce</strong> is economic activity — discovering an offer, deciding to buy, paying, receiving the good or service — carried out end to end by autonomous software rather than by a person clicking through a checkout flow. The interesting part isn't that a computer is involved (computers have processed payments for decades); it's that no human decides <em>which specific transaction</em> to make, in the moment it happens.</p>

<h2>What actually has to change for this to work</h2>
<p>Ordinary e-commerce infrastructure — accounts, saved payment methods, human-readable checkout pages, CAPTCHAs — is built on an assumption that breaks the moment you remove the human: someone is there to authenticate themselves, read a price, and approve a charge. Agentic commerce needs each of those replaced with something a program can execute unattended:</p>
<table>
<tr><th>Human commerce assumes</th><th>Agentic commerce needs instead</th></tr>
<tr><td>A person signs up for an account ahead of time</td><td>No account — <a href="/protocols/x402">payment itself is the credential</a></td></tr>
<tr><td>A person reads a price on a page and clicks "buy"</td><td>A price in a field a program can parse and compare, before or during the request</td></tr>
<tr><td>A person enters card details into a trusted checkout UI</td><td>A wallet the agent already controls, authorizing a specific, bounded payment</td></tr>
<tr><td>A person judges whether a seller looks legitimate</td><td>Structured trust signals — verified-ownership flags, real usage data, not a five-star rating system built for humans skimming</td></tr>
</table>

<h2>Trust without identity</h2>
<p>This is the part that's genuinely different from digitizing an existing process. Human commerce leans heavily on identity — a merchant's reputation, a platform's buyer protection, a person's own judgment about whether something looks right. An agent transacting autonomously, at machine speed, across a catalog it discovered seconds ago, doesn't have that judgment to apply, and identity verification that requires a human review step defeats the purpose.</p>
<p>What's left is trust built from things a machine <em>can</em> check: has this provider proven control of this listing (Agent Bazaar's <code>verified</code> flag), does this endpoint actually respond (the <a href="/guides/how-do-agents-discover-apis">liveness checks</a> covered elsewhere), and how much real usage does it have (the <code>quality</code> object's call volume — a much harder signal to fake at scale than a written review). None of these are perfect. All of them are at least mechanically verifiable without a human in the loop, which is the actual bar agentic commerce infrastructure has to clear.</p>

<h2>Pricing without negotiation</h2>
<p>Most agentic commerce today is fixed-price, not because negotiation is impossible in principle but because negotiation requires a shared protocol for making and evaluating offers — infrastructure that doesn't broadly exist yet. Fixed, machine-readable pricing (an x402 <code>accepts[]</code> entry, an OpenAPI-documented rate) is the version that works today: an agent reads a price, compares it to a budget, and decides yes or no. That's a much lower bar than negotiation, and it's sufficient for the overwhelming majority of pay-per-request API and data use cases — which is most of what agentic commerce looks like in practice right now.</p>

<h2>Why this needs a marketplace, not just a protocol</h2>
<p>x402 solves the payment mechanics. It doesn't solve the prior question: <em>which</em> endpoint should an agent even consider paying? Agentic commerce at any scale needs a discovery layer connecting "an agent has a task" to "here is a priced, payable resource that helps with it" — which is the actual job description of <a href="/guides/what-is-an-ai-agent-marketplace">an AI agent marketplace</a>. Payment infrastructure and discovery infrastructure are both necessary; neither is sufficient alone.</p>

<h2>What this looks like today, concretely</h2>
<p>On Agent Bazaar right now: an agent calls <a href="/discovery/search">/discovery/search</a>, gets back real priced resources, picks one, pays it directly via x402 with no account, and gets the result — all without a person approving that specific transaction. That's the whole loop, and it already works end to end for the ~15,000+ resources currently listed. What's still developing across the industry is scale, standardized trust signals, and negotiation — not whether the basic mechanism functions.</p>
`,
  },

  {
    slug: 'how-do-agents-discover-apis',
    title: 'How Do AI Agents Discover APIs?',
    description: 'The real mechanisms behind agent-facing API discovery — manifests, registries, llms.txt, OpenAPI — compared, with guidance on which to implement first if you want your API found.',
    category: 'For Providers',
    readMins: 10,
    related: ['how-do-agents-discover-other-agents', 'how-to-sell-an-api-to-ai-agents', 'what-is-an-ai-agent-marketplace'],
    body: `
<p>An agent can't discover an API by stumbling onto a landing page the way a human might via search or word of mouth. It needs a mechanism built for machines to query. In practice there are a handful of real, distinct mechanisms in active use today — this guide covers what each one actually is, not just that it "exists."</p>

<h2>1. Registry / marketplace discovery</h2>
<p>A centralized (or federated) catalog an agent can search — this is what Agent Bazaar is. The agent doesn't need to know your API exists ahead of time; it queries the registry with intent ("I need Solana token risk data") and the registry returns matching, priced, schema-documented resources:</p>
<div class="codeblock"><pre>curl "https://bazaar.saylorinnovations.com/discovery/search?query=solana+token+risk"</pre></div>
<p><strong>Getting listed:</strong> <a href="/publish"><code>POST /submit</code></a> with your x402 manifest URL. No account, no approval queue.</p>

<h2>2. x402 manifests (self-hosted discoverability)</h2>
<p>A JSON document at a conventional path on your own domain (commonly <code>/.well-known/x402.json</code>) listing your paid resources with their <code>accepts[]</code>. This is the format registries like Agent Bazaar and Coinbase's CDP Bazaar actually crawl and mirror — publishing one is simultaneously self-hosted discoverability <em>and</em> your ticket into every registry that indexes manifests. See <a href="/guides/how-to-build-an-x402-endpoint">How to Build an x402 Endpoint</a> for the format.</p>

<h2>3. llms.txt</h2>
<p>A plain-text file at <code>/llms.txt</code> on your domain, written for an LLM to read directly — a concise summary of what your site/API offers and links to the machine-readable specifics (your OpenAPI doc, your manifest). Not a formal protocol with required fields, more a convention that's become common enough that agents and LLM-integrated tools increasingly check for it by default. Agent Bazaar's own is at <a href="/llms.txt">/llms.txt</a> (and a longer version at <a href="/llms-full.txt">/llms-full.txt</a>).</p>

<h2>4. OpenAPI documents</h2>
<p>The long-established format for describing REST APIs — paths, parameters, response schemas. Not agent-specific (it predates the current wave of agent tooling by a decade), but widely supported by agent frameworks that can import an OpenAPI spec and generate callable tools from it automatically. If you already maintain one, you're most of the way to agent-discoverable without extra work; see Agent Bazaar's own at <a href="/openapi.json">/openapi.json</a> for the shape.</p>

<h2>5. MCP tool listings</h2>
<p>If you run an MCP server, <code>tools/list</code> is itself a discovery mechanism — any MCP client connected to your server immediately sees what you offer. This only helps agents that already know to connect to your specific server, though, which is a narrower form of discovery than a registry an agent can search without prior knowledge of you. See <a href="/guides/what-is-mcp-and-how-does-it-work">What Is MCP?</a>.</p>

<h2>Comparing them</h2>
<table>
<tr><th>Mechanism</th><th>Agent needs to know about you first?</th><th>Includes pricing?</th><th>Effort to implement</th></tr>
<tr><td>Registry/marketplace</td><td>No — that's the point</td><td>Yes, if listed with a manifest</td><td>Low (submit a URL)</td></tr>
<tr><td>x402 manifest</td><td>No, if a registry crawls it</td><td>Yes</td><td>Low-medium</td></tr>
<tr><td>llms.txt</td><td>Only if it already found your domain</td><td>No (usually links out)</td><td>Low</td></tr>
<tr><td>OpenAPI doc</td><td>Only if it already found your domain</td><td>No</td><td>Medium (if not already maintained)</td></tr>
<tr><td>MCP tools/list</td><td>Yes — has to know your MCP server URL</td><td>No</td><td>Medium</td></tr>
</table>

<h2>What to actually implement, in order</h2>
<p>If you're starting from zero: write an x402 manifest first (it's the one artifact that gets you both self-hosted discoverability and eligibility for registry mirroring), submit it to Agent Bazaar and any other registry you care about, then add <code>llms.txt</code> (cheap, broad benefit) and an OpenAPI doc if you don't already have one. MCP is worth building once you have an established set of tools worth exposing that way — it's additive, not a replacement for the manifest.</p>
`,
  },

  {
    slug: 'how-do-agents-discover-other-agents',
    title: 'How Do Agents Discover Other Agents?',
    description: 'Why finding another agent is a different problem than finding an API, how A2A agent cards solve it, and how to register one in a registry that other agents can actually query.',
    category: 'For Agent Builders',
    readMins: 8,
    related: ['what-is-mcp-and-how-does-it-work', 'how-do-agents-discover-apis', 'what-is-an-ai-agent-marketplace'],
    body: `
<p>Finding an API and finding an <em>agent</em> are related problems with a real difference at the center: an API is a fixed set of endpoints with a schema. An agent is a general-purpose actor — its capabilities might be broad, conditional, or described at a level of abstraction ("can research a topic and summarize findings") that doesn't map cleanly onto a single input/output schema the way a REST endpoint does.</p>

<h2>The agent card</h2>
<p>The <a href="/protocols/a2a">A2A (Agent2Agent) protocol</a> solves this with an <strong>agent card</strong> — a JSON document, conventionally published at <code>/.well-known/agent-card.json</code>, describing an agent well enough for another agent to decide whether and how to work with it:</p>
<div class="codeblock"><pre>{
  "name": "Agent Bazaar",
  "description": "Open marketplace and discovery layer for x402-payable resources...",
  "provider": { "organization": "Saylor Innovations", "url": "https://saylorinnovations.com" },
  "protocolVersion": "0.1",
  "skills": [
    {
      "id": "search_resources",
      "name": "Search Resources",
      "description": "Keyword and filter search across every listed x402 resource.",
      "endpoint": "https://bazaar.saylorinnovations.com/discovery/search",
      "method": "GET"
    }
  ]
}</pre></div>
<p>See <a href="/.well-known/agent-card.json">Agent Bazaar's own card</a> for a complete real example.</p>

<h2>Skills vs. endpoints</h2>
<p>The <code>skills[]</code> array is doing similar work to an OpenAPI path list or an MCP <code>tools/list</code> response, but at a coarser grain intentionally — a "skill" can be a whole capability area, not necessarily one deterministic function call. This matters because agents, unlike REST resources, often don't have a fixed contract for every possible request; the card describes what's <em>possible</em>, and the actual interaction (which might itself be a conversation, a multi-step task, or a single tool call) happens after discovery.</p>

<h2>Publishing your own card</h2>
<p>Host the JSON at a stable, public HTTPS URL — <code>/.well-known/agent-card.json</code> on your own domain is the convention. At minimum it needs a <code>name</code>; <code>skills[]</code>, <code>provider</code>, <code>protocolVersion</code> and <code>documentationUrl</code> are all read and stored by registries when present, so include them if you can.</p>

<h2>Registering it so other agents can find it</h2>
<p>Publishing the card makes you discoverable to an agent that already knows your URL. Getting found by one that doesn't needs a registry — the same discovery gap x402 resources had before a Bazaar existed for them:</p>
<div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/submit-agent \\
  -H "content-type: application/json" \\
  -d '{"agentCardUrl": "https://youragent.example.com/.well-known/agent-card.json"}'</pre></div>
<p>No account required — same trust model as listing an x402 resource. Once registered, your agent is searchable at <a href="/discovery/agents">/discovery/agents</a> and gets its own permanent page at <code>/agents/{slug}</code>, with a machine-readable JSON twin.</p>

<h2>Querying the registry from your own agent</h2>
<div class="codeblock"><pre>curl "https://bazaar.saylorinnovations.com/discovery/agents?query=marketplace"</pre></div>
<p>Or via MCP, if your agent already speaks it: the <code>discover_agents</code> and <code>get_agent</code> tools on <a href="/mcp">Agent Bazaar's MCP server</a> do the same query over JSON-RPC.</p>

<h2>How this relates to MCP and x402</h2>
<p>These three protocols answer different questions and compose rather than compete: A2A answers "what agent is this and what can it generally do," MCP answers "what specific tools does a server expose and how do I call them," and x402 answers "how do I pay for a specific call." An agent registered in Agent Bazaar's A2A directory might separately run an MCP server for its concrete tools and price some of them over x402 — all three describing the same underlying system from different angles. See <a href="/guides/mcp-vs-rest-api-vs-x402">MCP vs REST vs x402</a> for the full comparison.</p>
`,
  },

  {
    slug: 'how-to-sell-an-api-to-ai-agents',
    title: 'How to Sell an API to AI Agents',
    description: 'A practical guide to pricing, listing, and writing a manifest that makes your API genuinely attractive to autonomous buyers — not just technically discoverable.',
    category: 'For Providers',
    readMins: 11,
    related: ['how-to-build-an-x402-endpoint', 'how-do-agents-discover-apis', 'what-is-agentic-commerce'],
    body: `
<p>Making an API technically discoverable (a valid manifest, a working 402 response) is necessary but not sufficient for agents to actually choose it over alternatives. This guide covers the difference between an API that's <em>listable</em> and one that's <em>attractive</em> — the things that affect whether an agent picks yours when several similar resources exist.</p>

<h2>Pricing: fine-grained beats bundled</h2>
<p>An agent evaluating your resource is comparing a specific price against a specific task's value, not deciding whether to "subscribe." Price per call, and price it close to your actual marginal cost plus a reasonable margin — not as a proxy for a subscription tier you wish existed. A resource priced at $0.001–$0.01 per call reads as something an agent can use liberally within a task budget; a resource priced at $5/call reads as something to avoid unless nothing else works, regardless of how good the underlying data is.</p>
<p>If different endpoints genuinely cost you different amounts to serve (a light lookup vs. a heavy computation), price them separately rather than averaging into one flat rate across your whole API — Agent Bazaar's own listings do this (<a href="/resources/solana-token-price">a token price lookup</a> at $0.001 vs. <a href="/resources/solana-token-security-intelligence">a full security report</a> at $0.01) precisely because averaging would make the cheap calls unfairly expensive and the expensive ones unfairly cheap.</p>

<h2>Description: write for a parser, not a pitch</h2>
<p>An agent isn't persuaded by adjectives. It's matching your description's actual content against a task. Compare:</p>
<table>
<tr><th>Weak</th><th>Strong</th></tr>
<tr><td>"The best token security data on the market."</td><td>"On-chain risk report for a Solana token: mint/freeze authority, liquidity lock status, holder concentration and contract risk flags."</td></tr>
</table>
<p>The strong version tells an agent exactly what fields it will get back, which is what actually determines whether your resource matches a task — not superlatives. If you supply agent-first metadata (<code>capabilities</code>, <code>useWhen</code>, <code>doNotUseWhen</code>) in your manifest, even better: those are read and surfaced directly on your resource's page and JSON record.</p>

<h2>Schema: document the actual output, not a sketch of it</h2>
<p>Include a real <code>outputSchema</code> in your manifest entries. An agent that can validate a response against a schema before acting on it is an agent that will trust your resource enough to use it in a loop without a human checking each result — which is exactly the usage pattern that drives real call volume.</p>

<h2>Reliability signals compound</h2>
<p>Agent Bazaar's <code>quality</code> object (30-day call volume, unique payers) and <code>verified</code> flag exist because agents — like humans — prefer resources with a track record when several similar ones are available. There's a bootstrapping problem here (a brand-new listing has no call history yet), but the fix isn't to fake it; it's to make the resource itself good enough that early usage compounds. A resource that's fast, accurately described, and reasonably priced accumulates real usage data quickly once it's discoverable at all.</p>

<h2>The actual listing mechanics</h2>
<ol>
<li>Write an x402 manifest (see <a href="/guides/how-to-build-an-x402-endpoint">How to Build an x402 Endpoint</a> for the format) with accurate descriptions, real <code>accepts[]</code>, and an <code>outputSchema</code> per resource.</li>
<li>Host it at a stable, public HTTPS URL — <code>/.well-known/x402.json</code> is the convention.</li>
<li><code>POST /submit</code> the URL to Agent Bazaar. No signup.</li>
<li>Re-submit whenever your manifest changes — it's a full refresh, not a diff, and it always takes priority over any mirrored copy from another catalog.</li>
</ol>
<div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/submit \\
  -H "content-type: application/json" \\
  -d '{"manifestUrl": "https://yoursite.com/.well-known/x402.json"}'</pre></div>

<h2>What you get in return</h2>
<p>Payment settles directly to your own wallet — the marketplace never sits in the payment path, so there's no platform cut on the transaction itself. Discoverability is the actual value on offer: your endpoint gets found by agents that wouldn't otherwise know it exists, across every client that queries this catalog — the website, <a href="/discovery/search">the REST API</a>, and <a href="/mcp">the MCP server</a> alike.</p>
`,
  },

  {
    slug: 'how-to-build-an-x402-endpoint',
    title: 'How to Build an x402 Endpoint',
    description: 'A complete, working walkthrough of building an x402-payable API endpoint on Cloudflare Workers: the 402 response, verifying payment, and the manifest that makes it discoverable.',
    category: 'For Providers',
    readMins: 13,
    related: ['how-do-ai-agents-pay-for-apis', 'how-to-sell-an-api-to-ai-agents', 'what-is-x402'],
    body: `
<p>This walks through building a real x402 endpoint from nothing — the payment-required response, verifying a payment, and the manifest that makes it discoverable. The example targets Cloudflare Workers (matching Agent Bazaar's own stack), but the logic translates directly to any HTTP framework.</p>

<h2>Step 1: the unpaid response</h2>
<p>When a request arrives with no valid payment proof, respond <code>402</code> with your <code>accepts[]</code>:</p>
<div class="codeblock"><pre>const PRICE_USDC_BASE_UNITS = '10000'; // $0.01, 6 decimals
const PAY_TO = '0xYourWalletAddressHere';
const USDC_ON_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function paymentRequiredResponse() {
  return new Response(JSON.stringify({
    x402Version: 2,
    accepts: [{
      scheme: 'exact',
      network: 'eip155:8453', // Base
      payTo: PAY_TO,
      asset: USDC_ON_BASE,
      amount: PRICE_USDC_BASE_UNITS,
      maxTimeoutSeconds: 120,
    }],
  }), { status: 402, headers: { 'content-type': 'application/json' } });
}</pre></div>

<h2>Step 2: verifying a payment</h2>
<p>When a request arrives <em>with</em> a <code>PAYMENT-SIGNATURE</code> header, verify it before returning the resource. The exact verification logic depends on whether you're self-verifying on-chain or routing through a facilitator:</p>
<div class="codeblock"><pre>export async function onRequestGet({ request, env }) {
  const proof = request.headers.get('PAYMENT-SIGNATURE');

  if (!proof) return paymentRequiredResponse();

  const verified = await verifyPayment(proof, {
    expectedAmount: PRICE_USDC_BASE_UNITS,
    expectedPayTo: PAY_TO,
    expectedAsset: USDC_ON_BASE,
  });

  if (!verified) return paymentRequiredResponse(); // wrong amount, expired, etc.

  return new Response(JSON.stringify(await getResourceData(request)), {
    headers: { 'content-type': 'application/json' },
  });
}</pre></div>
<p><strong>Don't hand-roll <code>verifyPayment</code> from scratch unless you have to.</strong> Facilitator services handle settlement verification for you (submit-and-confirm, or check a facilitator's own attestation), which removes the need to run your own RPC infrastructure and handle chain reorgs correctly. <a href="https://github.com/SaylorInnovations/solana-x402">solana-x402</a> is a zero-dependency reference you can read end to end for exactly this logic, supporting both facilitator-routed and self-verified settlement.</p>

<h2>Step 3: supporting multiple networks</h2>
<p>List more than one <code>accepts[]</code> entry to let callers pay on whichever network they hold funds:</p>
<div class="codeblock"><pre>accepts: [
  { scheme: 'exact', network: 'solana:5eykt4Us...', payTo: SOLANA_ADDR, asset: USDC_SOLANA_MINT, amount: '10000', maxTimeoutSeconds: 120 },
  { scheme: 'exact', network: 'eip155:8453', payTo: EVM_ADDR, asset: USDC_ON_BASE, amount: '10000', maxTimeoutSeconds: 120 },
]</pre></div>
<p>Note that <code>payTo</code> can differ across networks (a Solana address and an EVM address are different formats) — that's expected and correct, not a bug.</p>

<h2>Step 4: writing the manifest</h2>
<p>A manifest is what makes your endpoint discoverable, not just payable. Host this JSON at <code>/.well-known/x402.json</code>:</p>
<div class="codeblock"><pre>{
  "x402Version": 2,
  "resources": [
    {
      "url": "https://yourapi.com/api/security-report",
      "description": "On-chain risk report for a token: authority, liquidity, holder concentration.",
      "accepts": [
        { "scheme": "exact", "network": "eip155:8453", "payTo": "0x...",
          "asset": "0x833589...bdA02913", "amount": "10000", "maxTimeoutSeconds": 120 }
      ],
      "outputSchema": {
        "type": "object",
        "properties": {
          "risk_score": { "type": "number" },
          "mint_authority_revoked": { "type": "boolean" }
        }
      }
    }
  ]
}</pre></div>

<h2>Step 5: list it</h2>
<div class="codeblock"><pre>curl -X POST https://bazaar.saylorinnovations.com/submit \\
  -H "content-type: application/json" \\
  -d '{"manifestUrl": "https://yourapi.com/.well-known/x402.json"}'</pre></div>

<h2>Testing before you ship</h2>
<p>Verify the unpaid path first (confirm you get a well-formed 402 with valid <code>accepts[]</code>) using a plain <code>curl</code> — no wallet needed:</p>
<div class="codeblock"><pre>curl -i https://yourapi.com/api/security-report</pre></div>
<p>Then test the full paid round trip with a small real payment before listing publicly. See <a href="/guides/how-to-sell-an-api-to-ai-agents">How to Sell an API to AI Agents</a> for pricing and description guidance once it's live.</p>
`,
  },

  {
    slug: 'x402-vs-api-keys',
    title: 'x402 vs. API Keys: A Thorough Comparison',
    description: 'Security, UX, cost structure and operational overhead, compared directly — plus a practical migration path if you already run a key-based API.',
    category: 'Comparisons',
    readMins: 9,
    related: ['what-is-x402', 'how-to-build-an-x402-endpoint', 'how-do-ai-agents-pay-for-apis'],
    body: `
<p>API keys and x402 solve the same underlying problem — controlling and monetizing access to an endpoint — with fundamentally different mechanics. Neither is strictly better; they fit different situations. This is a direct comparison, not an argument that one should replace the other everywhere.</p>

<h2>Security model</h2>
<table>
<tr><th></th><th>API keys</th><th>x402</th></tr>
<tr><td>What's the credential</td><td>A long-lived secret string, stored by the caller</td><td>A payment, verified per request — no stored secret at all</td></tr>
<tr><td>Leak blast radius</td><td>Every leaked key grants access until manually revoked</td><td>Nothing to leak; a captured payment proof is single-use and already spent</td></tr>
<tr><td>Revocation</td><td>Provider must maintain a revocation list and check it on every request</td><td>Nothing to revoke — access is granted fresh, per call</td></tr>
<tr><td>Rotation overhead</td><td>Real operational burden — rotating a key means updating every caller</td><td>None; there's nothing that rotates</td></tr>
</table>
<p>This is the single biggest practical difference: a leaked API key is a standing liability until someone notices and revokes it. There is no equivalent failure mode with x402 — the "credential" is consumed the instant it's used.</p>

<h2>Onboarding friction</h2>
<p>API keys require signup: an account, usually an email, sometimes a credit card on file before the first real call. That's a real barrier for a human developer evaluating your API, and it's a hard stop for an autonomous agent — there's no automated signup flow a typical key-issuing system expects a program to complete unattended. x402 requires nothing but a wallet the caller already controls: the first request can be the paying one, with zero prior relationship with the provider.</p>

<h2>Cost structure and pricing granularity</h2>
<p>API keys are usually tied to a plan — a monthly quota, a rate limit, a subscription tier — because per-call billing at the granularity a key system tracks well is awkward to implement and awkward to sell to human customers who want predictable bills. x402 is naturally per-call: every request is priced and paid independently, which supports genuinely fine-grained pricing (fractions of a cent) that a subscription model can't easily express. This matters specifically for agent usage patterns, where a single task might call a dozen different resources a handful of times each — a use pattern that fits per-call pricing far better than "pick a monthly plan for each."</p>

<h2>Operational overhead for the provider</h2>
<table>
<tr><th></th><th>API keys</th><th>x402</th></tr>
<tr><td>Infrastructure to run</td><td>Account system, key issuance/storage, billing integration, usage metering</td><td>A wallet address and payment verification logic — no account system needed</td></tr>
<tr><td>Support burden</td><td>"I lost my key," "my card was declined," billing disputes</td><td>Effectively none — payment either verifies or it doesn't</td></tr>
<tr><td>Fraud/abuse surface</td><td>Stolen keys, chargebacks, free-tier abuse</td><td>Minimal — payment is settled before access is granted, no chargebacks on most rails</td></tr>
</table>

<h2>Where API keys still make more sense</h2>
<p>x402 isn't universally better. API keys remain the right fit when: you need per-user rate limiting or usage analytics tied to a specific human account, your customers strongly prefer predictable monthly billing over variable per-call cost, or you need to support callers who don't hold a wallet at all (most human developers, today, calling from a browser or a simple script without crypto infrastructure). x402 is the better fit specifically when your caller might be an autonomous agent, when per-call pricing genuinely reflects your cost structure better than a subscription would, or when the friction of signup is actively costing you integrations.</p>

<h2>Migration path if you already run a keyed API</h2>
<p>You don't have to choose one exclusively. A common pattern: keep your existing keyed tier for established human/enterprise customers who want predictable billing, and add an x402-priced path on the same endpoints for agent and pay-as-you-go traffic. The endpoint logic just needs to check for a valid key <em>or</em> a valid payment proof before serving the request — see <a href="/guides/how-to-build-an-x402-endpoint">How to Build an x402 Endpoint</a> for the payment-verification half of that.</p>
`,
  },

  {
    slug: 'mcp-vs-rest-api-vs-x402',
    title: 'MCP vs. REST API vs. x402: How They Actually Compose',
    description: 'The three protocols answer three different questions. This guide lays out exactly which is which, where they overlap, and how a single resource can use all three at once.',
    category: 'Comparisons',
    readMins: 10,
    related: ['what-is-mcp-and-how-does-it-work', 'what-is-x402', 'x402-vs-api-keys'],
    body: `
<p>These three get compared constantly, usually with the implication that they're competitors. They're not — each answers a different question, and a single resource commonly uses all three layered together. This guide is about untangling which does what.</p>

<h2>The three questions</h2>
<table>
<tr><th>Protocol</th><th>Answers</th></tr>
<tr><td>REST API</td><td>"Here is a fixed set of endpoints, each with a defined request/response shape."</td></tr>
<tr><td>MCP</td><td>"How does a client discover what tools a server offers, and their schemas, at runtime?"</td></tr>
<tr><td>x402</td><td>"How does a caller pay for a specific request, per call, with no account?"</td></tr>
</table>
<p>REST is the baseline: an interface convention, not a discovery or payment mechanism. MCP adds runtime discovery on top of an interface (REST or otherwise). x402 adds payment on top of an interface (REST or otherwise). None of the three requires the others.</p>

<h2>Why "REST vs. MCP" is a category error</h2>
<p>A REST API is a contract; MCP is a way of describing and discovering a contract at runtime instead of via static documentation a human read once. In practice, most MCP tools <em>are</em> thin wrappers around a REST endpoint — the MCP server's <code>tools/call</code> handler often just makes an HTTP request and returns the result. The real comparison isn't "REST or MCP," it's "does the caller already know your API's shape (call REST directly) or does it need to discover that shape at runtime (go through MCP)." Agent Bazaar does both simultaneously: <a href="/discovery/search">a plain REST endpoint</a> and <a href="/mcp">an MCP server</a> that wraps the same underlying function.</p>

<h2>Why "REST vs. x402" is also a category error</h2>
<p>x402 isn't an alternative interface style to REST — it's a status code and response convention (<code>402</code> plus an <code>accepts[]</code> body) that sits on top of whatever interface you already have, REST or otherwise. An x402-priced endpoint is still, mechanically, a REST endpoint; it just returns 402 instead of the resource when payment hasn't been provided yet. See <a href="/guides/what-is-x402">What Is x402?</a> for the mechanics.</p>

<h2>How all three stack on one real resource</h2>
<p>Take <a href="/resources/solana-token-security-intelligence">Solana Token Security Intelligence</a> as a concrete example:</p>
<ul>
<li><strong>REST</strong>: <code>GET /api/security/{mint}</code> is a normal HTTP endpoint with a defined request shape.</li>
<li><strong>x402</strong>: calling it without payment returns <code>402</code> with <code>accepts[]</code>; calling it with a valid payment proof returns the report.</li>
<li><strong>MCP</strong>: the same data is reachable through <a href="/mcp">Agent Bazaar's MCP server</a> via <code>get_resource</code>, which returns the resource's full record including its <code>accepts[]</code> — an agent that already speaks MCP doesn't need to know the raw REST shape at all.</li>
</ul>
<p>One resource, one underlying implementation, three protocols each solving the piece they're actually good at.</p>

<h2>Where A2A fits in relative to all three</h2>
<p>A2A operates one level up from all of this — it describes an <em>agent</em> (a general-purpose actor), not a specific endpoint or tool. An agent's A2A card might list "skills" that are themselves backed by MCP tools or plain REST endpoints, some of which might be x402-priced. See <a href="/guides/how-do-agents-discover-other-agents">How Do Agents Discover Other Agents?</a> for where that boundary actually sits.</p>

<h2>Decision guide</h2>
<table>
<tr><th>If you need...</th><th>Reach for</th></tr>
<tr><td>A caller that already knows your API's shape to call it directly</td><td>Plain REST — no extra protocol needed</td></tr>
<tr><td>A caller to discover your tools' shape at runtime, with no prior integration</td><td>MCP, layered on top of your REST implementation</td></tr>
<tr><td>Per-request payment with no account system</td><td>x402, layered on top of your REST implementation</td></tr>
<tr><td>To describe an autonomous agent as a whole, not a single endpoint</td><td>A2A, describing the agent that may use any/all of the above underneath</td></tr>
</table>
`,
  },
];

function guideBySlug(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}

function guideSummaries() {
  return GUIDES.map(({ slug, title, description, category, readMins }) => ({ slug, title, description, category, readMins }));
}

export { GUIDES, guideBySlug, guideSummaries };

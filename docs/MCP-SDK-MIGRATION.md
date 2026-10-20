# Public MCP SDK migration and acceptance gates

Status: follow-up specification for draft PR #98. The handwritten JSON-RPC endpoint is **not production-ready**.

## SDK decision (20 October 2026)
- Use the official open-source MCP TypeScript v2 server SDK: `@modelcontextprotocol/server`.
- Official v2 documentation: https://ts.sdk.modelcontextprotocol.io/v2/
- Implement Streamable HTTP stateless mode using the officially supported server transport and a Next.js-compatible adapter. Confirm adapter API against the installed **exact pinned** version, not snippets from v1.
- Keep the three existing publicly curated discovery results. Do **not** import private data, Supabase server clients, WHOOP, secret keys, session cookies or the synthetic BBS issuer into this endpoint.
- Before adding dependencies, update both `package.json` and `package-lock.json` with the same version, and run a clean `npm ci`.

## Migration tasks
1. Extract public result payloads and readiness labels to a server-only reviewed constant file.
2. Replace handwritten `initialize`, `tools/list` and `tools/call` protocol dispatch with the official SDK's `McpServer` tool registration and supported stateless Streamable HTTP transport.
3. Give each tool a strict empty-object input schema; reject unexpected arguments.
4. Enforce `Origin` validation, server-side body limit, content negotiation, timeouts and rate limits at the ingress. Disallow sensitive telemetry, cookies and cross-origin credentials.
5. Honour notifications, request identifiers, negotiation and HTTP statuses according to the current SDK transport rather than maintaining custom protocol handling.
6. Keep `request_enterprise_demo` **out of this PR** until lead privacy, spam protection and routing are implemented.
7. Confirm `middleware.ts` cannot refresh user sessions or set authentication cookies for the public MCP path. Narrow middleware matcher or otherwise isolate the public endpoint if necessary.
8. Do not advertise MCP on the public website or in directories until independent client interoperability tests succeed.

## Required automated test matrix

| Test | Expected outcome |
|---|---|
| SDK client initializes via Streamable HTTP | Version negotiation succeeds |
| List tools | Only the 3 public discovery tools appear |
| Invoke each tool | Typed public result, correct readiness labels |
| Unknown or private tool name | Rejected, with no private data lookup |
| Unexpected tool arguments | Rejected |
| Forged Origin | Rejected |
| Bad content type / malformed JSON | Rejected |
| Oversized body with / without Content-Length | Rejected |
| Empty notification | Correct MCP protocol semantics |
| Authorization/cookie header included by client | Ignored, no member/session lookup and no cookie issuance |
| Prompt injection embedded in arguments | No extra privileges, no data-access side effects |
| Multiple concurrent stateless clients | No cross-client state |
| Repeated tool requests | Deterministic responses; no stored PHI |
| Vercel-compatible runtime constraints | Tested in build/preview environment |

Run `npm run lint`, TypeScript typecheck, `npm run build`, and the repository isolation suite. Report actual outcomes (never claim unexecuted tests passed).

## Deployment gate
Before merging: green checks; review for open redirects/SSRF; independent MCP Inspector plus ChatGPT/Claude compatibility; rate limiting demonstrated; production monitoring plan without PHI. Do not merge or deploy from this specification.

## Architectural boundaries
This route is public **Discovery MCP only**. Future private Verification MCP will have a separate authenticated handler, proof verification trust model, consent and user-approval gates, and security review. Patent investigation is tracked separately, without claiming open-source use establishes freedom to operate.

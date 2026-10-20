/**
 * Public Discovery MCP. Deliberately static: no Supabase, session, user data,
 * WHOOP, issuer keys, credential wallets or private APIs are imported.
 * Experimental endpoint: requires interoperability and abuse testing pre-merge.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOLS = [
  {
    name: 'get_vitalid_capabilities',
    description: 'List public VitalID capabilities and their documented readiness.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_supported_credential_types',
    description: 'List credential categories with clear prototype-versus-production status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_verification_requirements',
    description: 'Describe the proposed enterprise benefit-verification workflow, not a live verifier.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;

const RESULTS: Record<string, unknown> = {
  get_vitalid_capabilities: {
    project: 'VitalID',
    tagline: "Prove what matters. Share only what's necessary.",
    capabilities: [
      { name: 'Member health dashboard and account-based sharing', status: 'implemented_in_app_not_mcp' },
      { name: 'WHOOP OAuth connection', status: 'implemented_configuration_required' },
      { name: 'BBS selective-disclosure proof', status: 'isolated_synthetic_research_demo' },
      { name: 'Solana permission reference', status: 'isolated_devnet_research_demo' },
      { name: 'Enterprise credential verification', status: 'planned_not_live' },
    ],
  },
  get_supported_credential_types: {
    credentials: [
      {
        name: 'Wellness benefit eligibility assertion',
        status: 'proposed_enterprise_pilot',
        issuer: 'To be agreed with a trusted enterprise issuer',
        notes: 'No insurer integration, real issuer attestation or production credential is asserted.',
      },
      {
        name: 'Synthetic 7-of-30-day wellness assertion',
        status: 'research_demo_only',
        issuer: 'VitalID Demo',
        notes: 'Synthetic issuer evaluates the condition; BBS verifies its signed assertion rather than computing the threshold privately.',
      },
    ],
  },
  get_verification_requirements: {
    use_case: 'Verification of access to an already-contracted wellness benefit',
    proposed_steps: [
      'Trusted organisation defines the verification requirement',
      'Issuer attests the applicable eligibility claim',
      'Holder reviews an exact disclosure and explicitly consents',
      'Verifier checks issuer trust, cryptographic proof, holder binding, purpose, expiry and revocation state',
      'Verifier receives only the authorised assertion',
    ],
    availability: 'Proposed B2B workflow; no production verifier or eligibility adjudication is available.',
    exclusions: ['medical underwriting', 'clinical decisions', 'premium pricing', 'automatic access to personal health data'],
  },
};

function reply(id: unknown, result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function error(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return error(null, -32000, 'Forbidden origin', 403);
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return error(null, -32600, 'Content-Type must be application/json', 415);
  }
  // Limit actual request bytes, even if Content-Length is omitted or falsified.
  // This prototype accepts tiny JSON-RPC messages only.
  const MAX_BYTES = 16_384;
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BYTES) {
    return error(null, -32600, 'Request too large', 413);
  }
  let message: unknown;
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return error(null, -32600, 'Request too large', 413);
    message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return error(null, -32700, 'Parse error', 400);
  }
  if (!message || typeof message !== 'object' || Array.isArray(message)) return error(null, -32600, 'Invalid Request', 400);
  const m = message as Record<string, unknown>;
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return error(m.id, -32600, 'Invalid Request', 400);
  if (m.id === undefined) return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  if (typeof m.id !== 'string' && typeof m.id !== 'number') return error(null, -32600, 'Invalid Request', 400);

  switch (m.method) {
    case 'initialize':
      return reply(m.id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'vitalid-discovery', version: '0.1.0' },
        instructions: 'Public capability discovery only. No personal, medical or enterprise verification data can be accessed.',
      });
    case 'ping':
      return reply(m.id, {});
    case 'tools/list':
      return reply(m.id, { tools: TOOLS });
    case 'tools/call': {
      const params = m.params;
      if (!params || typeof params !== 'object' || Array.isArray(params)) return error(m.id, -32602, 'Invalid params');
      const p = params as Record<string, unknown>;
      if (typeof p.name !== 'string' || !Object.prototype.hasOwnProperty.call(RESULTS, p.name)) return error(m.id, -32602, 'Unknown public tool');
      if (p.arguments !== undefined && (!p.arguments || typeof p.arguments !== 'object' || Array.isArray(p.arguments) || Object.keys(p.arguments).length !== 0)) return error(m.id, -32602, 'Tool accepts no arguments');
      return reply(m.id, {
        content: [{ type: 'text', text: JSON.stringify(RESULTS[p.name]) }],
        structuredContent: RESULTS[p.name],
        isError: false,
      });
    }
    default:
      return error(m.id, -32601, 'Method not found');
  }
}

// This route intentionally provides no SSE event stream, credentials, lead submission,
// authenticated tools, or durable session. Independently validate MCP client compatibility.
export async function GET() {
  return new Response('SSE is not supported on this prototype', { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
}
export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

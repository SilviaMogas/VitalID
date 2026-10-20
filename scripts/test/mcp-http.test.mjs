import assert from 'node:assert/strict';
import { test } from 'node:test';

// Opt-in integration probe. Set VITALID_MCP_TEST_URL to a LOCAL or disposable
// preview endpoint only. Never test real member credentials or health accounts.
// npm run test:mcp
const url = process.env.VITALID_MCP_TEST_URL;
const integration = url ? test : test.skip;
let sequence = 0;

async function call(method, params, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++sequence, method, ...(params === undefined ? {} : { params }) }),
    signal: AbortSignal.timeout(8000),
  });
  const raw = await response.text();
  assert.ok(raw.length < 200_000, 'unexpectedly large MCP response');
  assert.doesNotMatch(raw, /(?:whoop_refresh_token|SUPABASE_SECRET_KEY|vitalid_rt|patient_history)/i);
  return { response, raw, body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(raw) : null };
}

integration('MCP initialize and tool catalogue are public and bounded', async () => {
  const initial = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'vitalid-test', version: '0.1.0' } });
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body?.result?.serverInfo?.name, 'vitalid-discovery');
  const listed = await call('tools/list', {});
  assert.equal(listed.response.status, 200);
  assert.deepEqual((listed.body?.result?.tools ?? []).map((x) => x.name).sort(), [
    'get_supported_credential_types', 'get_verification_requirements', 'get_vitalid_capabilities'
  ].sort());
  assert.equal(listed.response.headers.get('set-cookie'), null);
});

integration('MCP read-only tools disclose no personal records', async () => {
  for (const name of ['get_vitalid_capabilities', 'get_supported_credential_types', 'get_verification_requirements']) {
    const result = await call('tools/call', { name, arguments: {} });
    assert.equal(result.response.status, 200);
    assert.equal(result.body?.result?.isError, false);
    assert.match(result.raw, /(?:demo|planned|proposed|implemented)/i);
    assert.equal(result.response.headers.get('cache-control'), 'no-store');
  }
});

integration('MCP rejects private tools, unexpected arguments and cross-origin calls', async () => {
  for (const name of ['list_my_credentials', 'verify_authorised_proof', 'request_disclosure']) {
    const result = await call('tools/call', { name, arguments: {} });
    assert.ok(result.body?.error || result.body?.result?.isError);
  }
  const unexpected = await call('tools/call', { name: 'get_vitalid_capabilities', arguments: { patientId: 'secret' } });
  assert.ok(unexpected.body?.error || unexpected.body?.result?.isError);
  const crossSite = await call('tools/list', {}, { Origin: 'https://attacker.invalid' });
  assert.equal(crossSite.response.status, 403);
});

integration('MCP does not mint cookies from incoming health session cookies', async () => {
  const result = await call('tools/list', {}, { Cookie: 'vitalid_at=invalid; vitalid_rt=invalid' });
  assert.equal(result.response.headers.get('set-cookie'), null);
});

test('integration suite is deliberately opt-in', () => {
  if (!url) assert.equal(process.env.VITALID_MCP_TEST_URL, undefined);
  else assert.match(url, /^https?:\/\//);
});

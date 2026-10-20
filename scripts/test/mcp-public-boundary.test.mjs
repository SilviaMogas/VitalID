import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Regression checks for the public/private boundary.
// Static checks are deliberately supplemental; SDK client E2E is still required.
const route = readFileSync(new URL('../../app/api/mcp/discovery/route.ts', import.meta.url), 'utf8');
const middleware = readFileSync(new URL('../../middleware.ts', import.meta.url), 'utf8');

test('public discovery route does not import private account or health services', () => {
  assert.doesNotMatch(route, /(?:import|require\s*\().*(?:supabase|user-data|share-store|auth\/|whoop|colosseum|demo-data|stripe)/i);
});
test('public discovery only lists curated tools', () => {
  for (const tool of ['get_vitalid_capabilities', 'get_supported_credential_types', 'get_verification_requirements']) {
    assert.match(route, new RegExp(tool));
  }
  for (const sensitive of ['list_my_credentials', 'inspect_credential', 'request_disclosure', 'verify_authorised_proof', 'revoke_permission']) {
    assert.doesNotMatch(route, new RegExp(sensitive));
  }
});
test('MCP discovery route does not invoke member-session cookie rotation', () => {
  assert.match(middleware, /api\/mcp\/discovery/);
  // Reconstruct the matcher expression from its literal source in the config.
  const literal = middleware.match(/matcher:\s*\[\s*"([^"]+)"\s*\]/);
  assert.ok(literal, 'middleware must have an inspectable matcher');
  const pattern = new RegExp(literal[1]);
  assert.equal(pattern.test('/api/mcp/discovery'), false);
  assert.equal(pattern.test('/api/mcp/discovery/'), false);
  assert.equal(pattern.test('/api/share'), true);
  assert.equal(pattern.test('/vital-id'), true);
});
test('MCP public endpoint retains body validation and no-store headers', () => {
  assert.match(route, /request\.arrayBuffer\(\)/);
  assert.match(route, /MAX_BYTES/);
  assert.match(route, /Content-Type must be application\/json/);
  assert.match(route, /Cache-Control/);
});

import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

register('./wallet-auth-loader.mjs', import.meta.url);

for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) delete process.env[key];

const { isStrictSameOrigin, isJsonContentType } = await import('../../lib/same-origin.ts');
const { POST: signin } = await import('../../app/api/auth/signin/route.ts');
const { POST: signup } = await import('../../app/api/auth/signup/route.ts');
const { POST: signout } = await import('../../app/api/auth/signout/route.ts');
const { csrfRejection } = await import('../../middleware.ts');

const SITE = 'https://vitalid.example';
const ATTACK_BODY = '{"email":"attacker@example.test","password":"attacker-pass","z":"="}';

function request(path, { method = 'POST', origin, fetchSite, contentType, host, body } = {}) {
  const headers = {};
  if (origin) headers.origin = origin;
  if (fetchSite) headers['sec-fetch-site'] = fetchSite;
  if (contentType) headers['content-type'] = contentType;
  if (host) headers.host = host;
  const base = host ? `http://${host.replace('127.0.0.1', 'localhost')}` : SITE;
  return new Request(`${base}${path}`, { method, headers, body });
}

test('strict same-origin requires a matching Origin and rejects non-same-origin fetch metadata', () => {
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: SITE })), true);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: SITE, fetchSite: 'same-origin' })), true);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin')), false);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: 'https://evil.example' })), false);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: 'null' })), false);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: SITE, fetchSite: 'cross-site' })), false);
  assert.equal(isStrictSameOrigin(request('/api/auth/signin', { origin: SITE, fetchSite: 'same-site' })), false);
  assert.equal(
    isStrictSameOrigin(request('/api/auth/signin', { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' })),
    true,
  );
});

test('JSON content-type check ignores parameters and rejects form encodings', () => {
  assert.equal(isJsonContentType(request('/x', { contentType: 'application/json; charset=utf-8' })), true);
  assert.equal(isJsonContentType(request('/x', { contentType: 'text/plain' })), false);
  assert.equal(isJsonContentType(request('/x', { contentType: 'application/x-www-form-urlencoded' })), false);
  assert.equal(isJsonContentType(request('/x')), false);
});

for (const [name, POST, path] of [['signin', signin, '/api/auth/signin'], ['signup', signup, '/api/auth/signup']]) {
  test(`${name} rejects cross-site and Origin-less posts before reading credentials`, async () => {
    const missing = await POST(request(path, { contentType: 'application/json', body: ATTACK_BODY }));
    assert.equal(missing.status, 403);
    assert.equal(missing.headers.get('set-cookie'), null);
    const foreign = await POST(request(path, { origin: 'https://evil.example', contentType: 'text/plain', body: ATTACK_BODY }));
    assert.equal(foreign.status, 403);
    assert.equal(foreign.headers.get('set-cookie'), null);
  });

  test(`${name} rejects text/plain JSON-shaped form bodies`, async () => {
    const response = await POST(request(path, { origin: SITE, contentType: 'text/plain', body: ATTACK_BODY }));
    assert.equal(response.status, 415);
    assert.equal(response.headers.get('set-cookie'), null);
  });
}

test('signout rejects Origin-less and cross-site posts', async () => {
  assert.equal((await signout(request('/api/auth/signout'))).status, 403);
  assert.equal((await signout(request('/api/auth/signout', { origin: 'https://evil.example' }))).status, 403);
});

test('middleware enforces strict same-origin on non-GET /api/* except non-browser endpoints', () => {
  assert.equal(csrfRejection(request('/api/onboarding', { method: 'PUT' }))?.status, 403);
  assert.equal(csrfRejection(request('/api/auth/signin', { origin: 'https://evil.example' }))?.status, 403);
  assert.equal(csrfRejection(request('/api/consent', { origin: SITE, fetchSite: 'cross-site' }))?.status, 403);
  assert.equal(csrfRejection(request('/api/onboarding', { method: 'PUT', origin: SITE })), null);
  assert.equal(csrfRejection(request('/api/auth/me', { method: 'GET' })), null);
  assert.equal(csrfRejection(request('/api/stripe/webhook')), null);
  assert.equal(csrfRejection(request('/api/connectors/wearables/ingest')), null);
  assert.equal(csrfRejection(request('/api/mobile/v1/auth/signin')), null);
  assert.equal(csrfRejection(request('/api/mcp/discovery')), null);
  assert.equal(csrfRejection(request('/signin')), null);
});

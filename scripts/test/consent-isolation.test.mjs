// Synthetic users A/B only; Supabase env cleared so stores are in-memory.
import test from 'node:test';
import assert from 'node:assert/strict';

for (const k of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_APP_URL']) delete process.env[k];
Object.assign(process.env, {
  WHOOP_CLIENT_ID: 'mock', WHOOP_CLIENT_SECRET: 'mock',
  WHOOP_OAUTH_BASE: 'http://localhost:4010', WHOOP_API_BASE: 'http://localhost:4010/developer',
});

const A = { id: '00000000-0000-4000-8000-0000000000a1', email: 'a@example.test' };
const B = { id: '00000000-0000-4000-8000-0000000000b1', email: 'b@example.test' };
const consent = await import('@/app/api/consent/route');
const connect = await import('@/app/api/connectors/whoop/connect/route');
const callback = await import('@/app/api/connectors/whoop/callback/route');
const signup = await import('@/app/api/auth/signup/route');

const json = (url, body) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const as = (u) => { globalThis.__testUser = u; };
const req = (path) => Object.assign(new Request(`http://localhost:3000${path}`), { nextUrl: new URL(`http://localhost:3000${path}`) });
const connectReq = () => req('/api/connectors/whoop/connect');
const callbackReq = (q) => req(`/api/connectors/whoop/callback?${q}`);

// Track every outbound fetch: exchangeCode must never fire for a denied flow.
const realFetch = globalThis.fetch;
globalThis.__fetchUrls = [];
globalThis.fetch = (u, i) => { globalThis.__fetchUrls.push(String(u)); return realFetch(u, i); };

test('consent API requires a session', async () => {
  as(null);
  assert.equal((await consent.GET()).status, 401);
  assert.equal((await consent.POST(json('http://x/api/consent', { type: 'health_data' }))).status, 401);
});

test('consent POST rejects null/array bodies and stamps the server-owned version', async () => {
  as(A);
  for (const body of ['null', '[]', '"x"', '42']) {
    const r = await consent.POST(new Request('http://x/api/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
    assert.equal(r.status, 400, `body ${body} accepted`);
  }
  // A client-supplied arbitrary version is ignored — the server stamps its own.
  const r = await consent.POST(json('http://x/api/consent', { type: 'health_data', policyVersion: 'v999-fake' }));
  assert.equal(r.status, 200);
  const got = (await (await consent.GET()).json());
  assert.equal(got.consents.health_data.policyVersion, got.versions.health_data);
  assert.notEqual(got.consents.health_data.policyVersion, 'v999-fake');
});

test('A records consent; B sees none and cannot write for A', async () => {
  as(B);
  assert.deepEqual((await (await consent.GET()).json()).consents, {});
  as(A);
  const a = (await (await consent.GET()).json()).consents;
  assert.doesNotMatch(JSON.stringify(a), /user_?id|0000000000/i);
});

test('signup is refused server-side without both separate consents', async () => {
  const base = { firstName: 'T', lastName: 'S', email: 's@example.test', password: 'synthetic-pass-1', country: 'AE', city: 'X' };
  globalThis.__signupId = '00000000-0000-4000-8000-0000000000c1';
  for (const extra of [{}, { consentTerms: true }, { consentHealthData: true }, { consentTerms: 'true', consentHealthData: 'true' }]) {
    const r = await signup.POST(json('http://x/api/auth/signup', { ...base, ...extra }));
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'consent_required');
  }
  const ok = await signup.POST(json('http://x/api/auth/signup', { ...base, consentTerms: true, consentHealthData: true }));
  assert.equal(ok.status, 200);
  as({ id: globalThis.__signupId, email: base.email });
  const c = (await (await consent.GET()).json()).consents;
  assert.deepEqual(Object.keys(c).sort(), ['health_data', 'privacy_policy', 'terms_of_service']);
});

test('signup fails explicitly when the consent audit write fails', async () => {
  const real = globalThis.__vitalIdConsentStore;
  globalThis.__vitalIdConsentStore = {
    backend: 'memory',
    store: { record: () => Promise.reject(new Error('table missing')), latest: () => Promise.resolve(null) },
  };
  globalThis.__signupId = '00000000-0000-4000-8000-0000000000d1';
  const r = await signup.POST(json('http://x/api/auth/signup', {
    firstName: 'F', lastName: 'S', email: 'f@example.test', password: 'synthetic-pass-1',
    country: 'AE', city: 'X', consentTerms: true, consentHealthData: true,
  }));
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'consent_audit_failed');
  globalThis.__vitalIdConsentStore = real;
});

test('anonymous/demo sessions cannot start WHOOP OAuth', async () => {
  as(null);
  const r = await connect.GET(connectReq());
  const loc = r.headers.get('location') ?? '';
  assert.doesNotMatch(loc, /oauth2\/auth/, `anonymous reached WHOOP authorize: ${loc.split('?')[0]}`);
  assert.match(loc, /consent_required/);
});

test('member B without health-data consent cannot start WHOOP OAuth', async () => {
  as(B);
  const r = await connect.GET(connectReq());
  const loc = r.headers.get('location') ?? '';
  assert.doesNotMatch(loc, /oauth2\/auth/, `B was sent to WHOOP authorize without consent: ${loc.split('?')[0]}`);
});

test('member A with current consent can start WHOOP OAuth; state binds the user', async () => {
  as(A);
  const loc = (await connect.GET(connectReq())).headers.get('location') ?? '';
  assert.match(loc, /localhost:4010\/oauth\/oauth2\/auth/);
  const state = new URL(loc).searchParams.get('state');
  assert.equal(globalThis.__testCookies?.vitalid_whoop_state, `${A.id}:${state}`);
});

test('callback without session or with a different user never exchanges the code', async () => {
  globalThis.__fetchUrls.length = 0;
  globalThis.__testCookies = { vitalid_whoop_state: `${A.id}:deadbeef` };
  as(null);
  assert.match((await callback.GET(callbackReq('code=x&state=deadbeef'))).headers.get('location') ?? '', /invalid_state/);
  // consumeState deletes the cookie on every attempt — re-issue a valid state
  // so B's rejection is for identity mismatch, not for a missing state.
  globalThis.__testCookies = { vitalid_whoop_state: `${A.id}:deadbeef` };
  as(B);
  assert.match((await callback.GET(callbackReq('code=x&state=deadbeef'))).headers.get('location') ?? '', /invalid_state/);
  assert.equal(globalThis.__fetchUrls.length, 0, `token exchange fired: ${globalThis.__fetchUrls.join(',')}`);
});

test('callback re-checks consent before exchanging the code', async () => {
  globalThis.__fetchUrls.length = 0;
  globalThis.__testCookies = { vitalid_whoop_state: `${B.id}:deadbeef` };
  as(B);
  assert.match((await callback.GET(callbackReq('code=x&state=deadbeef'))).headers.get('location') ?? '', /consent_required/);
  assert.equal(globalThis.__fetchUrls.length, 0, `token exchange fired: ${globalThis.__fetchUrls.join(',')}`);
});

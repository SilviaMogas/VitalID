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
const signup = await import('@/app/api/auth/signup/route');
const callback = await import('@/app/api/connectors/whoop/callback/route');
const { getWhoopStore } = await import('@/lib/connectors/whoop');

const json = (url, body) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const as = (u) => { globalThis.__testUser = u; };
const connectReq = () => Object.assign(new Request('http://localhost:3000/api/connectors/whoop/connect'), { nextUrl: new URL('http://localhost:3000/api/connectors/whoop/connect') });

test('consent API requires a session', async () => {
  as(null);
  assert.equal((await consent.GET()).status, 401);
  assert.equal((await consent.POST(json('http://x/api/consent', { type: 'health_data' }))).status, 401);
});

test('A records consent; B sees none and cannot write for A', async () => {
  as(A);
  assert.equal((await consent.POST(json('http://x/api/consent', { type: 'health_data', policyVersion: 'v1', userId: B.id }))).status, 200);
  as(B);
  assert.deepEqual((await (await consent.GET()).json()).consents, {});
  as(A);
  const a = (await (await consent.GET()).json()).consents;
  assert.equal(a.health_data.policyVersion, 'v1');
  assert.doesNotMatch(JSON.stringify(a), /user_?id|0000000000/i);
});

test('signup is refused server-side without both consents', async () => {
  const base = { firstName: 'T', lastName: 'S', email: 's@example.test', password: 'synthetic-pass-1', country: 'AE', city: 'X' };
  globalThis.__signupId = '00000000-0000-4000-8000-0000000000c1';
  for (const extra of [{}, { consentPrivacy: true }, { consentHealthData: true }, { consentPrivacy: 'true', consentHealthData: 'true' }]) {
    const r = await signup.POST(json('http://x/api/auth/signup', { ...base, ...extra }));
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'consent_required');
  }
  const ok = await signup.POST(json('http://x/api/auth/signup', { ...base, consentPrivacy: true, consentHealthData: true }));
  assert.equal(ok.status, 200);
  as({ id: globalThis.__signupId, email: base.email });
  const c = (await (await consent.GET()).json()).consents;
  assert.deepEqual(Object.keys(c).sort(), ['health_data', 'privacy_policy', 'terms_of_service']);
});

test('member B without health-data consent cannot start WHOOP OAuth', async () => {
  as(B);
  const r = await connect.GET(connectReq());
  const loc = r.headers.get('location') ?? '';
  assert.doesNotMatch(loc, /oauth2\/auth/, `B was sent to WHOOP authorize without consent: ${loc.split('?')[0]}`);
});

test('member A with their own consent can start WHOOP OAuth; demo flow unchanged', async () => {
  as(A);
  assert.match((await connect.GET(connectReq())).headers.get('location') ?? '', /localhost:4010\/oauth\/oauth2\/auth/);
  as(null);
  assert.match((await connect.GET(connectReq())).headers.get('location') ?? '', /localhost:4010\/oauth\/oauth2\/auth/);
});

test('OAuth started logged-out cannot complete into a member account without consent', async () => {
  as(null);
  const loc = new URL((await connect.GET(connectReq())).headers.get('location'));
  const state = loc.searchParams.get('state');
  as(B);
  const url = `http://localhost:3000/api/connectors/whoop/callback?code=mock&state=${state}`;
  const r = await callback.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }));
  assert.match(r.headers.get('location') ?? '', /whoop=consent_required/);
  assert.equal(await getWhoopStore().get(B.id), null);
});

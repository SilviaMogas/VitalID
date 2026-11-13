import { register } from 'node:module';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

register('./wallet-auth-loader.mjs', import.meta.url);
register('./signup-loader.mjs', import.meta.url);

process.env.SUPABASE_URL = 'https://supabase.signup-throttle.test';
process.env.SUPABASE_SECRET_KEY = 'synthetic-signup-throttle-key';
process.env.AUTH_THROTTLE_STORE = 'memory';
process.env.NODE_ENV = 'test';

let createCalls = [];
let resendCalls = 0;
globalThis.__walletAuthClient = {
  auth: {
    async resend() {
      resendCalls += 1;
      return { error: null };
    },
  },
};
globalThis.__walletSupabase = {
  auth: {
    admin: {
      async createUser(args) {
        createCalls.push(args);
        if (args.email === 'taken@example.test') {
          return {
            data: { user: null },
            error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
          };
        }
        return {
          data: { user: { id: `synthetic-${createCalls.length}`, email: args.email, email_confirmed_at: null, app_metadata: {} } },
          error: null,
        };
      },
    },
  },
};

const route = await import('../../app/api/auth/signup/route.ts');

function signup(email, ip = '203.0.113.10', overrides = {}) {
  return route.POST(new Request('https://vitalid.example/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({
      firstName: 'Synthetic',
      lastName: 'Person',
      country: 'Spain',
      city: 'Barcelona',
      email,
      password: 'synthetic-pass-123',
      consentTerms: true,
      consentHealthData: true,
      ...overrides,
    }),
  }));
}

beforeEach(() => {
  process.env.AUTH_THROTTLE_STORE = 'memory';
  globalThis.__vitalIdLoginThrottleAttempts?.clear();
  globalThis.__signupWrites = [];
  createCalls = [];
  resendCalls = 0;
});

test('new and already-registered emails get the same response', async () => {
  const fresh = await signup('fresh@example.test', '203.0.113.11');
  const taken = await signup('taken@example.test', '203.0.113.12');
  assert.equal(fresh.status, 200);
  assert.equal(taken.status, fresh.status);
  assert.deepEqual(await taken.json(), await fresh.json());
  assert.equal(taken.headers.get('cache-control'), 'no-store');
  assert.equal(resendCalls, 1);
  assert.ok(globalThis.__signupWrites.every(([, userId]) => userId === 'synthetic-1'));
});

test('signup never pre-confirms the email', async () => {
  assert.equal((await signup('fresh@example.test')).status, 200);
  assert.equal(createCalls.length, 1);
  assert.notEqual(createCalls[0].email_confirm, true);
  assert.equal(resendCalls, 1);
});

test('the fourth signup for one email is limited before Supabase', async () => {
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await signup('victim@example.test', `198.51.100.${i + 1}`)).status, 200);
  }
  const limited = await signup(' Victim@Example.TEST ', '198.51.100.9');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(limited.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  assert.equal(createCalls.length, 3);
});

test('the eleventh signup from one IP is limited and other IPs are not', async () => {
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await signup(`user-${i}@example.test`, '198.51.100.20')).status, 200);
  }
  const limited = await signup('another@example.test', '198.51.100.20');
  assert.equal(limited.status, 429);
  assert.equal(createCalls.length, 10);

  assert.equal((await signup('other-ip@example.test', '198.51.100.21')).status, 200);
  assert.equal(createCalls.length, 11);
});

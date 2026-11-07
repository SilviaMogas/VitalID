import { register } from 'node:module';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

register('./login-throttle-loader.mjs', import.meta.url);

process.env.SUPABASE_URL = 'https://supabase.login-throttle.test';
process.env.SUPABASE_SECRET_KEY = 'synthetic-login-throttle-key';
process.env.AUTH_THROTTLE_STORE = 'memory';
process.env.NODE_ENV = 'test';

let authCalls = 0;
globalThis.__loginAuthClient = {
  auth: {
    async signInWithPassword({ email, password }) {
      authCalls += 1;
      if (email.trim().toLowerCase() === 'victim@example.test' && password === 'correct-password') {
        const user = { id: 'synthetic-user', email: 'victim@example.test', app_metadata: {} };
        return {
          data: {
            user,
            session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' },
          },
          error: null,
        };
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
    },
  },
};
globalThis.__loginSupabase = {
  rpc: async () => ({ data: 0, error: null }),
  from: () => ({ delete: () => ({ eq: async () => ({ error: null }) }) }),
};

const route = await import('../../app/api/auth/signin/route.ts');
const { throttlePasswordLogin } = await import('../../lib/auth/login-throttle.ts');

function request(email, password, ip = '203.0.113.10') {
  return new Request('https://vitalid.example/api/auth/signin', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({ email, password }),
  });
}

async function signin(email, password, ip) {
  return route.POST(request(email, password, ip));
}

async function responseBody(response) {
  return response.json();
}

function resetMemoryStore() {
  globalThis.__vitalIdLoginThrottleAttempts?.clear();
}

beforeEach(() => {
  process.env.AUTH_THROTTLE_STORE = 'memory';
  authCalls = 0;
  resetMemoryStore();
});

test('web sign-in allows ten failures and rejects the eleventh before Supabase', async () => {
  for (let i = 0; i < 10; i += 1) {
    const response = await signin('victim@example.test', 'wrong-password');
    assert.equal(response.status, 401);
  }
  assert.equal(authCalls, 10);

  const limited = await signin('victim@example.test', 'correct-password');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(limited.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await responseBody(limited), { error: 'rate_limited' });
  assert.equal(authCalls, 10);
});

test('email variants share one normalized throttle bucket', async () => {
  for (let i = 0; i < 10; i += 1) {
    const email = i % 2 === 0 ? 'victim@example.test' : ' Victim@Example.TEST ';
    const result = await throttlePasswordLogin(
      request(email, 'wrong-password'),
      email,
      async () => false,
      Boolean,
    );
    assert.deepEqual(result, { limited: false, result: false });
  }
  const limited = await throttlePasswordLogin(
    request(' Victim@Example.TEST ', 'wrong-password'),
    ' Victim@Example.TEST ',
    async () => false,
    Boolean,
  );
  assert.equal(limited.limited, true);
  if (limited.limited) {
    assert.ok(limited.retryAfterSeconds > 0 && limited.retryAfterSeconds <= 900);
  }
  assert.equal(authCalls, 0);
});

test('successful sign-in clears only the email bucket', async () => {
  for (let i = 0; i < 9; i += 1) {
    assert.equal((await signin('victim@example.test', 'wrong-password')).status, 401);
  }
  assert.equal((await signin('victim@example.test', 'correct-password')).status, 200);
  for (let i = 0; i < 9; i += 1) {
    assert.equal((await signin('victim@example.test', 'wrong-password')).status, 401);
  }
  assert.equal(authCalls, 19);
});

test('IP throttle limits distinct emails and is isolated by client IP', async () => {
  for (let i = 0; i < 50; i += 1) {
    const response = await signin(`user-${i}@example.test`, 'wrong-password', '198.51.100.20');
    assert.equal(response.status, 401);
  }
  const limited = await signin('another@example.test', 'wrong-password', '198.51.100.20');
  assert.equal(limited.status, 429);
  assert.equal(authCalls, 50);

  const otherIp = await signin('fresh@example.test', 'wrong-password', '198.51.100.21');
  assert.equal(otherIp.status, 401);
  assert.equal(authCalls, 51);
});

test('memory throttle allows attempts after its fixed window expires', async () => {
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  try {
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await signin('victim@example.test', 'wrong-password')).status, 401);
    }
    now += 15 * 60 * 1000 + 1;
    assert.equal((await signin('victim@example.test', 'wrong-password')).status, 401);
    assert.equal(authCalls, 11);
  } finally {
    Date.now = originalNow;
  }
});

test('Supabase store retry responses limit before the attempt', async () => {
  process.env.AUTH_THROTTLE_STORE = 'supabase';
  let rpcCalls = 0;
  globalThis.__loginSupabase.rpc = async () => {
    rpcCalls += 1;
    return { data: 30, error: null };
  };
  let attemptCalls = 0;
  const result = await throttlePasswordLogin(
    new Request('https://vitalid.example', { headers: { 'x-real-ip': '203.0.113.80' } }),
    'supabase@example.test',
    async () => { attemptCalls += 1; return false; },
    Boolean,
  );
  assert.deepEqual(result, { limited: true, retryAfterSeconds: 30 });
  assert.equal(attemptCalls, 0);
  assert.equal(rpcCalls, 2);
});

test('Supabase RPC errors fall back to memory and still run the attempt', async () => {
  process.env.AUTH_THROTTLE_STORE = 'supabase';
  globalThis.__loginSupabase.rpc = async () => ({
    data: null,
    error: { message: 'synthetic migration missing' },
  });
  let attemptCalls = 0;
  const result = await throttlePasswordLogin(
    new Request('https://vitalid.example', { headers: { 'x-real-ip': '203.0.113.81' } }),
    'fallback@example.test',
    async () => { attemptCalls += 1; return false; },
    Boolean,
  );
  assert.deepEqual(result, { limited: false, result: false });
  assert.equal(attemptCalls, 1);
});

test('migration restricts throttle table and function to server-side use', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20261107_vital_id_auth_attempts.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /alter table public\.vital_id_auth_attempts enable row level security/i);
  assert.match(migration, /revoke all privileges on table public\.vital_id_auth_attempts from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.vital_id_auth_attempt[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.vital_id_auth_attempt[\s\S]*to service_role/i);
  assert.match(migration, /set search_path = ''/i);
});

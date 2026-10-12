// Regression: subscription billing stays bound to the paying member. Synthetic
// users, in-memory membership store and a mocked Stripe client — no real
// Stripe/Supabase calls (their env is cleared/faked below).
import test from 'node:test';
import assert from 'node:assert/strict';

for (const k of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) delete process.env[k];
process.env.MEMBERSHIP_STORE = 'memory';
process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic_mock';
process.env.STRIPE_PRICE_PLUS_MONTHLY = 'price_plus_monthly';
process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

const subs = {};
const createdSessions = [];
globalThis.__vitalIdStripe = {
  prices: {
    retrieve: async (id) => ({ id, active: true, type: 'recurring', currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }),
  },
  checkout: {
    sessions: {
      create: async (p) => {
        createdSessions.push(p);
        return { id: `cs_mock_${createdSessions.length}`, url: 'https://checkout.mock/session' };
      },
    },
  },
  subscriptions: { retrieve: async (id) => subs[id] },
  billingPortal: { sessions: { create: async (p) => ({ url: `https://portal.mock/${p.customer}` }) } },
};

const { getMembershipStore } = await import('@/lib/membership/store');
const { syncSubscriptionFromStripe } = await import('@/lib/stripe/verify');
const checkout = await import('../../app/api/stripe/checkout/route.ts');
const portal = await import('../../app/api/stripe/portal/route.ts');

const A = { id: '00000000-0000-4000-8000-00000000000a', email: 'a@example.test' };
const B = { id: '00000000-0000-4000-8000-00000000000b', email: 'b@example.test' };
const post = (body) =>
  new Request('http://localhost:3000/api/x', { method: 'POST', body: JSON.stringify(body) });
const sub = (id, userKey, plan, status, customer) => ({
  id,
  status,
  customer,
  metadata: { plan, userKey },
  items: { data: [{ current_period_end: 2000000000 }] },
});
const store = getMembershipStore();

test('no session (demo/expired) cannot start a subscription checkout for the shared demo user', async () => {
  globalThis.__testUser = null;
  const before = createdSessions.length;
  const res = await checkout.POST(post({ plan: 'pro' }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'demo_not_allowed');
  assert.equal(createdSessions.length, before);
});

test('signed-in member checkout is bound to their own user key', async () => {
  globalThis.__testUser = A;
  const res = await checkout.POST(post({ plan: 'plus' }));
  assert.equal(res.status, 200);
  const s = createdSessions.at(-1);
  assert.equal(s.mode, 'subscription');
  assert.equal(s.client_reference_id, A.id);
  assert.equal(s.subscription_data.metadata.userKey, A.id);
});

test('late event for an old subscription does not downgrade or rebind the active one', async () => {
  await store.activatePlan({
    userKey: A.id, plan: 'plus', stripeCustomerId: 'cus_a1', stripeCheckoutSessionId: 'cs_a1',
    stripeSubscriptionId: 'sub_a1', subscriptionStatus: 'active',
  });
  subs.sub_a1 = sub('sub_a1', A.id, 'plus', 'canceled', 'cus_a1');
  assert.equal((await syncSubscriptionFromStripe('sub_a1')).plan, 'free');

  await store.activatePlan({
    userKey: A.id, plan: 'pro', stripeCustomerId: 'cus_a2', stripeCheckoutSessionId: 'cs_a2',
    stripeSubscriptionId: 'sub_a2', subscriptionStatus: 'active',
  });
  assert.equal(await syncSubscriptionFromStripe('sub_a1'), null);
  const a = await store.get(A.id);
  assert.equal(a.plan, 'pro');
  assert.equal(a.stripeSubscriptionId, 'sub_a2');
  assert.equal(a.stripeCustomerId, 'cus_a2');

  globalThis.__testUser = A;
  const p = await (await portal.POST(post({}))).json();
  assert.equal(p.url, 'https://portal.mock/cus_a2');
});

test('cancelling the bound subscription still downgrades to free', async () => {
  subs.sub_a2 = sub('sub_a2', A.id, 'pro', 'canceled', 'cus_a2');
  const r = await syncSubscriptionFromStripe('sub_a2');
  assert.equal(r.userKey, A.id);
  assert.equal(r.plan, 'free');
});

test("B's subscription events and portal never touch A", async () => {
  await store.upsert({ userKey: B.id });
  const before = await store.get(A.id);
  subs.sub_b = sub('sub_b', B.id, 'pro', 'active', 'cus_b');
  const r = await syncSubscriptionFromStripe('sub_b');
  assert.equal(r.userKey, B.id);
  assert.deepEqual(await store.get(A.id), before);
  globalThis.__testUser = B;
  assert.equal((await (await portal.POST(post({}))).json()).url, 'https://portal.mock/cus_b');
  globalThis.__testUser = null;
  assert.equal((await portal.POST(post({}))).status, 403);
});

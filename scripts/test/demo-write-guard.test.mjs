import test from 'node:test';
import assert from 'node:assert/strict';

for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
  delete process.env[key];
}
process.env.MEMBERSHIP_STORE = 'memory';
process.env.STRIPE_SECRET_KEY = 'sk_test_demo_guard';
process.env.STRIPE_PRICE_PLUS_MONTHLY = 'price_test_plus_monthly';

const DEMO = 'fatima';
const MEMBER = { id: '00000000-0000-4000-8000-0000000000d1', email: 'member@example.com' };

const created = [];
const subscriptions = new Map();
const checkoutSessions = new Map();
globalThis.__vitalIdStripe = {
  prices: {
    retrieve: async (id) => ({ id, active: true, type: 'recurring', currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }),
  },
  checkout: {
    sessions: {
      create: async (params) => {
        created.push(params);
        return { id: `cs_test_${created.length}`, url: 'https://checkout.stripe.test/session' };
      },
      retrieve: async (id) => {
        const s = checkoutSessions.get(id);
        if (!s) throw new Error(`unexpected session ${id}`);
        return s;
      },
    },
  },
  subscriptions: {
    retrieve: async (id) => {
      const s = subscriptions.get(id);
      if (!s) throw new Error(`unexpected subscription ${id}`);
      return s;
    },
  },
};

const { getMembershipStore } = await import('@/lib/membership/store');
const { verifyAndActivate, verifyCheckoutSession, syncSubscriptionFromStripe } = await import('@/lib/stripe/verify');
const { getWhoopStore } = await import('@/lib/connectors/whoop');
const reset = await import('@/app/api/membership/reset/route');
const checkout = await import('@/app/api/stripe/checkout/route');
const whoopDisconnect = await import('@/app/api/connectors/whoop/disconnect/route');
const whoopSync = await import('@/app/api/connectors/whoop/sync/route');

const post = (url, body, headers = {}) =>
  new Request(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function activate(userKey, plan, suffix) {
  await getMembershipStore().activatePlan({
    userKey,
    plan,
    stripeCustomerId: `cus_${suffix}`,
    stripeCheckoutSessionId: `cs_${suffix}`,
    stripeSubscriptionId: `sub_${suffix}`,
    subscriptionStatus: 'active',
    subscriptionPeriodEnd: null,
  });
}

function whoopConn(userKey) {
  return {
    userKey,
    whoopUserId: 1,
    accessToken: `at-${userKey}`,
    refreshToken: `rt-${userKey}`,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    scope: null,
    heightM: null,
    weightKg: null,
    maxHeartRate: null,
    connectedAt: new Date().toISOString(),
    lastSyncedAt: null,
    lastSyncError: null,
  };
}

test('membership reset rejects anonymous visitors and keeps the demo plan', async () => {
  await activate(DEMO, 'pro', 'demo-reset');
  globalThis.__testUser = null;
  const res = await reset.POST(post('/api/membership/reset'));
  assert.equal(res.status, 401);
  assert.equal((await getMembershipStore().get(DEMO))?.plan, 'pro');

  await activate(MEMBER.id, 'pro', 'member-reset');
  globalThis.__testUser = MEMBER;
  const ok = await reset.POST(post('/api/membership/reset'));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).userKey, MEMBER.id);
  assert.equal((await getMembershipStore().get(MEMBER.id))?.plan, 'free');
  assert.equal((await getMembershipStore().get(DEMO))?.plan, 'pro');
  globalThis.__testUser = null;
});

test('stripe checkout requires a signed-in member', async () => {
  globalThis.__testUser = null;
  const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'plus' }));
  assert.equal(res.status, 401);
  assert.equal(created.length, 0);

  globalThis.__testUser = MEMBER;
  const ok = await checkout.POST(post('/api/stripe/checkout', { plan: 'plus' }));
  assert.equal(ok.status, 200);
  assert.equal(created.length, 1);
  assert.equal(created[0].metadata.userKey, MEMBER.id);
  assert.equal(created[0].subscription_data.metadata.userKey, MEMBER.id);
  globalThis.__testUser = null;
});

test('checkout verification never activates the demo account', async () => {
  await getMembershipStore().reset(DEMO);
  subscriptions.set('sub_demo_paid', {
    id: 'sub_demo_paid',
    status: 'active',
    customer: 'cus_demo_paid',
    metadata: { userKey: DEMO, plan: 'plus' },
    items: { data: [{ price: { id: 'price_test_plus_monthly', product: 'prod_x', type: 'recurring', currency: 'usd' }, current_period_end: 1_900_000_000 }] },
  });
  checkoutSessions.set('cs_demo_paid', {
    id: 'cs_demo_paid',
    mode: 'subscription',
    payment_status: 'paid',
    customer: 'cus_demo_paid',
    subscription: 'sub_demo_paid',
    metadata: { plan: 'plus', interval: 'monthly', userKey: DEMO },
    line_items: { data: [{ quantity: 1, price: { id: 'price_test_plus_monthly', product: 'prod_x', type: 'recurring', currency: 'usd' } }] },
  });
  assert.deepEqual(await verifyCheckoutSession('cs_demo_paid'), { ok: false, reason: 'bad_plan' });
  assert.deepEqual(await verifyAndActivate('cs_demo_paid'), { ok: false, reason: 'bad_plan' });
  assert.equal((await getMembershipStore().get(DEMO))?.plan, 'free');
});

test('subscription sync does not fall back to the demo row by metadata', async () => {
  const updated = await syncSubscriptionFromStripe('sub_demo_paid');
  assert.equal(updated, null);
  assert.equal((await getMembershipStore().get(DEMO))?.plan, 'free');
});

test('WHOOP disconnect and sync reject anonymous and cross-origin requests', async () => {
  const realFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response('{}');
  };
  try {
    const store = getWhoopStore();
    await store.upsert(whoopConn(DEMO));
    await store.upsert(whoopConn(MEMBER.id));

    globalThis.__testUser = null;
    assert.equal((await whoopDisconnect.POST(post('/api/connectors/whoop/disconnect'))).status, 401);
    assert.equal((await whoopSync.POST(post('/api/connectors/whoop/sync'))).status, 401);

    globalThis.__testUser = MEMBER;
    const evil = { Origin: 'https://evil.example' };
    assert.equal((await whoopDisconnect.POST(post('/api/connectors/whoop/disconnect', undefined, evil))).status, 403);
    assert.equal((await whoopSync.POST(post('/api/connectors/whoop/sync', undefined, evil))).status, 403);
    assert.equal(fetches, 0);
    assert.ok(await store.get(DEMO));
    assert.ok(await store.get(MEMBER.id));

    const ok = await whoopDisconnect.POST(post('/api/connectors/whoop/disconnect'));
    assert.equal(ok.status, 200);
    assert.equal(await store.get(MEMBER.id), null);
    assert.ok(await store.get(DEMO));
  } finally {
    globalThis.fetch = realFetch;
    globalThis.__testUser = null;
  }
});

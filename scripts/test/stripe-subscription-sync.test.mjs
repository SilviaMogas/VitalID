import test from 'node:test';
import assert from 'node:assert/strict';

for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
  delete process.env[key];
}
process.env.MEMBERSHIP_STORE = 'memory';
process.env.STRIPE_PRICE_PLUS_MONTHLY = 'price_test_plus_monthly';
process.env.STRIPE_PRICE_PLUS_ANNUAL = 'prod_test_plus';
process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_test_pro_monthly';
process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_test_pro_annual';

const fixtures = new Map();
globalThis.__vitalIdStripe = {
  subscriptions: {
    retrieve: async (id) => {
      const fixture = fixtures.get(id);
      if (!fixture) throw new Error(`unexpected subscription retrieval: ${id}`);
      return fixture;
    },
  },
};

const { syncSubscriptionFromStripe } = await import('@/lib/stripe/verify');
const { getMembershipStore } = await import('@/lib/membership/store');

async function syncFixture({
  name,
  status = 'active',
  metadataPlan = 'pro',
  priceId = 'price_test_unknown',
  product = 'prod_test_unknown',
  currency = 'usd',
  type = 'recurring',
}) {
  const subscriptionId = `sub_test_${name}`;
  const userKey = `user-stripe-sync-${name}`;
  await getMembershipStore().activatePlan({
    userKey,
    plan: 'pro',
    stripeCustomerId: `cus_test_${name}`,
    stripeCheckoutSessionId: `cs_test_${name}`,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: 'active',
    subscriptionPeriodEnd: null,
  });
  fixtures.set(subscriptionId, {
    id: subscriptionId,
    status,
    customer: `cus_test_${name}`,
    metadata: { userKey, plan: metadataPlan },
    items: {
      data: [
        {
          price: { id: priceId, product, type, currency },
          current_period_end: 1_900_000_000,
        },
      ],
    },
  });
  await syncSubscriptionFromStripe(subscriptionId);
  return getMembershipStore().get(userKey);
}

test('syncs Plus when the current configured price is Plus despite Pro checkout metadata', async () => {
  const membership = await syncFixture({
    name: 'plus-price-metadata-pro',
    metadataPlan: 'pro',
    priceId: 'price_test_plus_monthly',
  });
  assert.equal(membership?.plan, 'plus');
});

test('syncs Pro when the current configured price is Pro despite Plus checkout metadata', async () => {
  const membership = await syncFixture({
    name: 'pro-price-metadata-plus',
    metadataPlan: 'plus',
    priceId: 'price_test_pro_monthly',
  });
  assert.equal(membership?.plan, 'pro');
});

test('fails closed when the subscription price and product are not configured', async () => {
  const membership = await syncFixture({
    name: 'unknown-price',
    metadataPlan: 'pro',
  });
  assert.equal(membership?.plan, 'free');
});

test('matches a configured product through the subscription price product field', async () => {
  const membership = await syncFixture({
    name: 'plus-product-match',
    metadataPlan: 'pro',
    priceId: 'price_test_rotated_plus',
    product: 'prod_test_plus',
  });
  assert.equal(membership?.plan, 'plus');
});

test('fails closed for non-USD and non-recurring prices', async () => {
  const wrongCurrency = await syncFixture({
    name: 'wrong-currency',
    metadataPlan: 'pro',
    priceId: 'price_test_pro_monthly',
    currency: 'eur',
  });
  const nonRecurring = await syncFixture({
    name: 'non-recurring',
    metadataPlan: 'pro',
    priceId: 'price_test_pro_monthly',
    type: 'one_time',
  });
  assert.equal(wrongCurrency?.plan, 'free');
  assert.equal(nonRecurring?.plan, 'free');
});

test('downgrades canceled subscriptions even when their current price is Pro', async () => {
  const membership = await syncFixture({
    name: 'canceled-pro',
    status: 'canceled',
    metadataPlan: 'pro',
    priceId: 'price_test_pro_monthly',
  });
  assert.equal(membership?.plan, 'free');
});

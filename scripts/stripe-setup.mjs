// Creates (idempotently) the Vital ID products + recurring subscription prices.
// Usage: STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs
//        STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs   (test-mode first!)
// NEVER prints secret key values.
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
const stripe = new Stripe(key);

// Prices must match lib/plans.ts display prices.
const PLANS = [
  {
    plan: 'plus',
    productName: 'Vital ID Plus',
    description: 'Vital ID Plus membership subscription.',
    prices: [
      { interval: 'monthly', unit_amount: 1000, lookup_key: 'vital_id_plus_monthly_usd', env: 'STRIPE_PRICE_PLUS_MONTHLY' },
      { interval: 'annual', unit_amount: 9600, lookup_key: 'vital_id_plus_annual_usd', env: 'STRIPE_PRICE_PLUS_ANNUAL' },
    ],
  },
  {
    plan: 'pro',
    productName: 'Vital ID Pro',
    description: 'Vital ID Pro membership subscription.',
    prices: [
      { interval: 'monthly', unit_amount: 2500, lookup_key: 'vital_id_pro_monthly_usd', env: 'STRIPE_PRICE_PRO_MONTHLY' },
      { interval: 'annual', unit_amount: 24000, lookup_key: 'vital_id_pro_annual_usd', env: 'STRIPE_PRICE_PRO_ANNUAL' },
    ],
  },
];

const rows = [];
for (const p of PLANS) {
  let product;
  const found = await stripe.products.search({ query: `metadata['vital_id_plan']:'${p.plan}'` });
  if (found.data.length > 0) {
    product = found.data[0];
  } else {
    product = await stripe.products.create({
      name: p.productName,
      description: p.description,
      metadata: { vital_id_plan: p.plan },
    });
  }

  for (const spec of p.prices) {
    const existing = await stripe.prices.list({ lookup_keys: [spec.lookup_key], limit: 1 });
    let price = existing.data[0];
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: spec.unit_amount,
        currency: 'usd',
        recurring: { interval: spec.interval === 'monthly' ? 'month' : 'year' },
        lookup_key: spec.lookup_key,
        metadata: { vital_id_plan: p.plan, vital_id_interval: spec.interval },
      });
    }
    rows.push({ plan: p.plan, env: spec.env, interval: spec.interval, price });
  }
}

console.log(rows[0]?.price.livemode ? 'LIVE MODE' : 'TEST MODE');
console.log('');
for (const r of rows) {
  console.log(
    `${r.plan.padEnd(5)} ${r.interval.padEnd(7)} price=${r.price.id} amount=${r.price.unit_amount} currency=${r.price.currency} recurring=${r.price.recurring?.interval} livemode=${r.price.livemode}`,
  );
}
console.log('');
console.log('# Env lines:');
for (const r of rows) console.log(`${r.env}=${r.price.id}`);

// Creates (idempotently) the Vital ID demo products + one-time $1 USD prices.
// Usage: STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs
// NEVER prints secret key values.
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
const stripe = new Stripe(key);

const PLANS = [
  {
    plan: 'plus',
    productName: 'Vital ID Plus',
    description: 'Hackathon demo: one-time $1 payment. Displayed price $10/month (Plus). No subscription.',
    displayed_price: '$10/month',
    lookup_key: 'vital_id_plus_demo_usd_1',
    env: 'STRIPE_PLUS_DEMO_PRICE_ID',
  },
  {
    plan: 'pro',
    productName: 'Vital ID Pro',
    description: 'Hackathon demo: one-time $1 payment. Displayed price $25/month (Pro). No subscription.',
    displayed_price: '$25/month',
    lookup_key: 'vital_id_pro_demo_usd_1',
    env: 'STRIPE_PRO_DEMO_PRICE_ID',
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
      metadata: { vital_id_plan: p.plan, displayed_price: p.displayed_price },
    });
  }

  const prices = await stripe.prices.list({ lookup_keys: [p.lookup_key], limit: 1 });
  let price = prices.data[0];
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 100,
      currency: 'usd',
      lookup_key: p.lookup_key,
      metadata: { vital_id_plan: p.plan, hackathon_demo: 'true' },
    });
  }
  rows.push({ plan: p.plan, env: p.env, product, price });
}

console.log(rows[0]?.price.livemode ? 'LIVE MODE' : 'TEST MODE');
console.log('');
for (const r of rows) {
  console.log(
    `${r.plan.padEnd(5)} product=${r.product.id} price=${r.price.id} amount=${r.price.unit_amount} currency=${r.price.currency} type=${r.price.type} livemode=${r.price.livemode}`,
  );
}
console.log('');
console.log('# Env lines:');
for (const r of rows) console.log(`${r.env}=${r.price.id}`);

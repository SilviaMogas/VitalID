// Creates (or finds) the membership webhook endpoint for a public base URL.
// Usage: STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-webhook-setup.mjs https://your-app.vercel.app
// The STRIPE_WEBHOOK_SECRET is only returned on creation — store it when printed.
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
const base = process.argv[2]?.replace(/\/$/, '');
if (!key || !base) {
  console.error('Usage: STRIPE_SECRET_KEY=... node scripts/stripe-webhook-setup.mjs <publicBaseUrl>');
  process.exit(1);
}
const stripe = new Stripe(key);
const url = `${base}/api/stripe/webhook`;

const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === url);
if (existing) {
  console.log(`existing endpoint: ${existing.id} url=${existing.url} status=${existing.status}`);
  console.log('(webhook secret is only returned on creation — rotate it in the Stripe dashboard if lost)');
} else {
  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ],
    description: 'Vital ID membership',
  });
  console.log(`created endpoint: ${endpoint.id} url=${endpoint.url}`);
  console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
}

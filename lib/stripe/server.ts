import 'server-only';
import Stripe from 'stripe';
import { PLANS, type PlanId } from '@/lib/plans';

interface StripeGlobal {
  __vitalIdStripe?: Stripe;
}

/** Cached Stripe client (survives dev HMR). */
export function getStripe(): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error('getStripe() must never run in the browser');
  }
  const g = globalThis as StripeGlobal;
  if (g.__vitalIdStripe) return g.__vitalIdStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY (see .env.example).');
  g.__vitalIdStripe = new Stripe(key);
  return g.__vitalIdStripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** The one-time $1 demo Price ID for a paid plan; throws when the env var is missing. */
export function getDemoPriceId(plan: PlanId): string {
  const envKey = PLANS[plan].demoPriceEnvKey;
  if (!envKey) throw new Error(`Plan "${plan}" has no demo price.`);
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`Missing env var ${envKey} — run scripts/stripe-setup.mjs to create demo prices.`);
  }
  return priceId;
}

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

/** The raw configured demo id for a paid plan — a `price_…` or `prod_…` id. */
export function getDemoPriceId(plan: PlanId): string {
  const envKey = PLANS[plan].demoPriceEnvKey;
  if (!envKey) throw new Error(`Plan "${plan}" has no demo price.`);
  const upper = plan.toUpperCase();
  const candidates = [`STRIPE_PRICE_${upper}`, envKey, `STRIPE_PRODUCT_${upper}`];
  const priceId = candidates.map((k) => process.env[k]).find(Boolean);
  if (!priceId) {
    throw new Error(
      `Missing env var: set one of ${candidates.join(', ')} (price_… or prod_… id) — or run scripts/stripe-setup.mjs.`,
    );
  }
  return priceId;
}

/**
 * Resolves the configured id to an actual Price ID. A `prod_…` value maps to
 * the product's `default_price`; a `price_…` value is returned as-is.
 * Fetches the product on every call — one call per checkout, never cached.
 */
export async function resolveDemoPriceId(plan: PlanId): Promise<string> {
  const configured = getDemoPriceId(plan);
  if (!configured.startsWith("prod_")) return configured;

  const product = await getStripe().products.retrieve(configured);
  const defaultPrice = product.default_price;
  const priceId = typeof defaultPrice === "string" ? defaultPrice : defaultPrice?.id;
  if (!product.active || !priceId) {
    throw new Error(
      `Configured product "${configured}" for plan "${plan}" is inactive or has no default_price.`,
    );
  }
  return priceId;
}

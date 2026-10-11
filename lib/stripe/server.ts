import 'server-only';
import Stripe from 'stripe';
import { PLANS, type BillingInterval, type PlanId } from '@/lib/plans';

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

/** Configuration error carrying a stable, client-safe `code`. */
export class StripeConfigError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Env var candidates for a paid plan + billing interval, in priority order. */
function priceEnvCandidates(plan: PlanId, interval: BillingInterval): string[] {
  const keys = PLANS[plan].priceEnvKey;
  if (!keys) return [];
  const upper = plan.toUpperCase();
  const suffix = interval.toUpperCase();
  return [keys[interval], `STRIPE_PRODUCT_${upper}_${suffix}`];
}

/** The raw configured id for a plan + interval — a `price_…` or `prod_…` id. */
export function getPriceId(plan: PlanId, interval: BillingInterval): string {
  const candidates = priceEnvCandidates(plan, interval);
  if (candidates.length === 0) throw new Error(`Plan "${plan}" has no subscription prices.`);
  const priceId = candidates.map((k) => process.env[k]).find(Boolean);
  if (!priceId) {
    throw new StripeConfigError(
      'price_env_missing',
      `Missing env var: set one of ${candidates.join(', ')} (price_… or prod_… id) — or run scripts/stripe-setup.mjs.`,
    );
  }
  return priceId;
}

/** Every configured `price_…`/`prod_…` reference for a plan (both intervals). */
export function getConfiguredPriceRefs(plan: PlanId): string[] {
  return ['monthly', 'annual']
    .flatMap((interval) => priceEnvCandidates(plan, interval as BillingInterval))
    .map((k) => process.env[k])
    .filter((v): v is string => Boolean(v));
}

/**
 * Resolves the configured id to an actual Price ID. A `prod_…` value maps to
 * the product's `default_price`; a `price_…` value is returned as-is.
 * Fetches the product on every call — one call per checkout, never cached.
 */
export async function resolvePriceId(plan: PlanId, interval: BillingInterval): Promise<string> {
  const configured = getPriceId(plan, interval);
  if (!configured.startsWith("prod_")) return configured;

  const product = await getStripe().products.retrieve(configured);
  const defaultPrice = product.default_price;
  const priceId = typeof defaultPrice === "string" ? defaultPrice : defaultPrice?.id;
  if (!product.active || !priceId) {
    throw new StripeConfigError(
      product.active ? 'product_no_default_price' : 'product_inactive',
      `Configured product "${configured}" for plan "${plan}" is inactive or has no default_price.`,
    );
  }
  return priceId;
}

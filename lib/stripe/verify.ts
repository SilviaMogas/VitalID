import 'server-only';
import type Stripe from 'stripe';
import { DEMO_CHARGE_CENTS, DEMO_CURRENCY, type PlanId } from '@/lib/plans';
import { getMembershipStore } from '@/lib/membership/store';
import type { MembershipRecord } from '@/lib/membership/types';
import { getDemoPriceId, getStripe, StripeConfigError } from './server';

export type VerifyResult =
  | { ok: true; plan: 'plus' | 'pro'; userKey: string; session: Stripe.Checkout.Session }
  | {
      ok: false;
      reason:
        | 'not_paid'
        | 'bad_amount'
        | 'bad_currency'
        | 'bad_mode'
        | 'bad_price'
        | 'bad_plan'
        | 'user_mismatch'
        | 'not_found';
    };

/**
 * Re-retrieves a Checkout Session from Stripe and validates every field that
 * decides entitlement. Never trust webhook payload fields — always verify here.
 */
export async function verifyCheckoutSession(
  sessionId: string,
  opts?: { expectedUserKey?: string },
): Promise<VerifyResult> {
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
  } catch {
    return { ok: false, reason: 'not_found' };
  }

  if (session.mode !== 'payment') return { ok: false, reason: 'bad_mode' };
  if (session.payment_status !== 'paid') return { ok: false, reason: 'not_paid' };
  if (session.amount_total !== DEMO_CHARGE_CENTS) return { ok: false, reason: 'bad_amount' };
  if (session.currency !== DEMO_CURRENCY) return { ok: false, reason: 'bad_currency' };

  const plan = session.metadata?.plan;
  if (plan !== 'plus' && plan !== 'pro') return { ok: false, reason: 'bad_plan' };

  const items = session.line_items?.data ?? [];
  const configured = getDemoPriceId(plan);
  const price = items[0]?.price;
  // The line item belongs to the plan when it IS the configured price, or when
  // the configured value is a product and the price belongs to that product —
  // so rotating a product's default_price never orphans in-flight sessions.
  const belongsToPlan =
    price?.id === configured ||
    (configured.startsWith('prod_') &&
      (typeof price?.product === 'string' ? price.product : price?.product?.id) === configured);
  if (
    items.length !== 1 ||
    !belongsToPlan ||
    items[0].quantity !== 1 ||
    price?.unit_amount !== DEMO_CHARGE_CENTS ||
    price?.currency !== DEMO_CURRENCY ||
    price?.type !== 'one_time'
  ) {
    return { ok: false, reason: 'bad_price' };
  }

  const userKey = session.metadata?.userKey;
  if (!userKey) return { ok: false, reason: 'bad_plan' };
  if (opts?.expectedUserKey && opts.expectedUserKey !== userKey) {
    return { ok: false, reason: 'user_mismatch' };
  }

  return { ok: true, plan, userKey, session };
}

/** Persists the membership upgrade for an already-verified session. */
export async function activateFromVerifiedSession(
  result: Extract<VerifyResult, { ok: true }>,
): Promise<MembershipRecord> {
  const { session, plan, userKey } = result;
  return getMembershipStore().activatePlan({
    userKey,
    plan,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
  });
}

export async function verifyAndActivate(
  sessionId: string,
  opts?: { expectedUserKey?: string },
): Promise<VerifyResult> {
  const result = await verifyCheckoutSession(sessionId, opts);
  if (result.ok) await activateFromVerifiedSession(result);
  return result;
}

/**
 * Guard used before creating a Checkout Session: ensures the configured Price
 * is an active one-time $1 USD price — a misconfigured Price ID can never
 * create a checkout for the wrong amount or a subscription.
 */
export async function assertDemoPrice(priceId: string, plan: PlanId): Promise<void> {
  const price = await getStripe().prices.retrieve(priceId);
  if (
    !price.active ||
    price.type !== 'one_time' ||
    price.unit_amount !== DEMO_CHARGE_CENTS ||
    price.currency !== DEMO_CURRENCY ||
    price.recurring
  ) {
    const why = !price.active
      ? 'price_inactive'
      : price.type !== 'one_time' || price.recurring
        ? 'price_recurring'
        : price.currency !== DEMO_CURRENCY
          ? 'price_not_usd'
          : `price_amount_${price.unit_amount ?? 'null'}`;
    throw new StripeConfigError(
      why,
      `Configured price for plan "${plan}" is not an active one-time $1 USD price — refusing to create checkout.`,
    );
  }
}

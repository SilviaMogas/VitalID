import 'server-only';
import type Stripe from 'stripe';
import { BILLING_CURRENCY, type BillingInterval, type PlanId } from '@/lib/plans';
import { getMembershipStore } from '@/lib/membership/store';
import type { MembershipRecord } from '@/lib/membership/types';
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/membership/constants';
import { getConfiguredPriceRefs, getStripe, StripeConfigError } from './server';

export type VerifyResult =
  | {
      ok: true;
      plan: 'plus' | 'pro';
      userKey: string;
      session: Stripe.Checkout.Session;
      subscription: Stripe.Subscription;
    }
  | {
      ok: false;
      reason:
        | 'not_paid'
        | 'bad_currency'
        | 'bad_mode'
        | 'bad_price'
        | 'bad_plan'
        | 'subscription_inactive'
        | 'user_mismatch'
        | 'not_found';
    };


function isConfiguredPriceForPlan(plan: PlanId, price: Stripe.Price | null | undefined): boolean {
  if (!price) return false;
  const refs = getConfiguredPriceRefs(plan);
  const productId = typeof price.product === 'string' ? price.product : price.product?.id;
  return refs.includes(price.id) || (productId !== undefined && refs.includes(productId));
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  return typeof end === 'number' ? new Date(end * 1000).toISOString() : null;
}

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

  if (session.mode !== 'subscription') return { ok: false, reason: 'bad_mode' };
  if (session.payment_status !== 'paid') return { ok: false, reason: 'not_paid' };

  const plan = session.metadata?.plan;
  if (plan !== 'plus' && plan !== 'pro') return { ok: false, reason: 'bad_plan' };

  const items = session.line_items?.data ?? [];
  const price = items[0]?.price;
  // The line item belongs to the plan when it IS a configured price, or when
  // the configured value is a product and the price belongs to that product —
  // so rotating a product's default_price never orphans in-flight sessions.
  if (
    items.length !== 1 ||
    items[0].quantity !== 1 ||
    !isConfiguredPriceForPlan(plan, price) ||
    price?.type !== 'recurring' ||
    price?.currency !== BILLING_CURRENCY
  ) {
    return { ok: false, reason: 'bad_price' };
  }

  const userKey = session.metadata?.userKey;
  if (!userKey) return { ok: false, reason: 'bad_plan' };
  if (opts?.expectedUserKey && opts.expectedUserKey !== userKey) {
    return { ok: false, reason: 'user_mismatch' };
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return { ok: false, reason: 'subscription_inactive' };

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return { ok: false, reason: 'subscription_inactive' };
  }

  return { ok: true, plan, userKey, session, subscription };
}

/** Persists the membership upgrade for an already-verified session. */
export async function activateFromVerifiedSession(
  result: Extract<VerifyResult, { ok: true }>,
): Promise<MembershipRecord> {
  const { session, subscription, plan, userKey } = result;
  return getMembershipStore().activatePlan({
    userKey,
    plan,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    stripeCheckoutSessionId: session.id,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionPeriodEnd: subscriptionPeriodEnd(subscription),
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
 * Syncs the membership plan with a subscription's current state — re-retrieved
 * from Stripe (webhook payloads are never trusted). Active/trialing/past_due
 * keeps (or restores) the paid plan from the subscription metadata; every other
 * status (canceled, unpaid, incomplete_expired, paused, incomplete) downgrades
 * to free.
 */
export async function syncSubscriptionFromStripe(
  subscriptionId: string,
): Promise<MembershipRecord | null> {
  let subscription: Stripe.Subscription;
  try {
    subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
  const metaPlan = subscription.metadata?.plan;
  const plan = metaPlan === 'plus' || metaPlan === 'pro' ? metaPlan : null;
  const isActive = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  return getMembershipStore().syncSubscription({
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    userKey: subscription.metadata?.userKey ?? null,
    plan: isActive ? plan : null,
    status: subscription.status,
    periodEnd: subscriptionPeriodEnd(subscription),
  });
}

/**
 * Guard used before creating a Checkout Session: ensures the configured Price
 * is an active recurring USD price with the expected billing interval — a
 * misconfigured Price ID can never create a checkout for the wrong cadence.
 */
export async function assertSubscriptionPrice(
  priceId: string,
  plan: PlanId,
  interval: BillingInterval,
): Promise<void> {
  const price = await getStripe().prices.retrieve(priceId);
  const expectedInterval = interval === 'monthly' ? 'month' : 'year';
  const intervalCount = price.recurring?.interval_count ?? 1;
  if (
    !price.active ||
    price.type !== 'recurring' ||
    price.currency !== BILLING_CURRENCY ||
    price.recurring?.interval !== expectedInterval ||
    intervalCount !== 1
  ) {
    const why = !price.active
      ? 'price_inactive'
      : price.type !== 'recurring'
        ? 'price_not_recurring'
        : price.currency !== BILLING_CURRENCY
          ? 'price_not_usd'
          : `price_interval_${price.recurring?.interval ?? 'null'}_x${intervalCount}`;
    throw new StripeConfigError(
      why,
      `Configured price for plan "${plan}" (${interval}) is not an active recurring USD ${expectedInterval}ly price — refusing to create checkout.`,
    );
  }
}

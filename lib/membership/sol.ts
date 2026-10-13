import type { MembershipRecord } from './types';

/**
 * One-time SOL payments reuse `stripeCheckoutSessionId` with a `sol:` prefix —
 * it is the idempotency anchor for membership activation. Unlike Stripe
 * subscriptions there is no webhook to end access, so paid plans granted by a
 * SOL payment are read as `free` once `subscriptionPeriodEnd` has passed.
 */
export const SOL_SESSION_PREFIX = 'sol:';

/** Stripe statuses where the subscription still entitles the member to a paid plan. */
const LIVE_STRIPE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * True while a Stripe-managed subscription keeps the member on a paid plan.
 * A SOL purchase can overwrite stripeCheckoutSessionId while a live Stripe
 * subscription is attached — read-time expiry must never downgrade that
 * member (Stripe webhooks own their lifecycle).
 */
export function hasLiveStripeSubscription(record: MembershipRecord): boolean {
  return (
    Boolean(record.stripeSubscriptionId) &&
    LIVE_STRIPE_STATUSES.has(record.subscriptionStatus ?? '')
  );
}

export function applySolReadExpiry(record: MembershipRecord): MembershipRecord {
  if (record.plan === 'free') return record;
  if (!record.stripeCheckoutSessionId?.startsWith(SOL_SESSION_PREFIX)) return record;
  if (hasLiveStripeSubscription(record)) return record;
  if (record.subscriptionPeriodEnd && Date.parse(record.subscriptionPeriodEnd) <= Date.now()) {
    return { ...record, plan: 'free' };
  }
  return record;
}

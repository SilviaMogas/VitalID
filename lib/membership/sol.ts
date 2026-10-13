import type { MembershipRecord } from './types';

/**
 * One-time SOL payments reuse `stripeCheckoutSessionId` with a `sol:` prefix —
 * it is the idempotency anchor for membership activation. Unlike Stripe
 * subscriptions there is no webhook to end access, so paid plans granted by a
 * SOL payment are read as `free` once `subscriptionPeriodEnd` has passed.
 */
export const SOL_SESSION_PREFIX = 'sol:';

export function applySolReadExpiry(record: MembershipRecord): MembershipRecord {
  if (record.plan === 'free') return record;
  if (!record.stripeCheckoutSessionId?.startsWith(SOL_SESSION_PREFIX)) return record;
  if (record.subscriptionPeriodEnd && Date.parse(record.subscriptionPeriodEnd) <= Date.now()) {
    return { ...record, plan: 'free' };
  }
  return record;
}

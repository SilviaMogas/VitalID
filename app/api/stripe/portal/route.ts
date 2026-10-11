import { NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import { DEMO_USER_KEY, getCurrentUserKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function requestOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const proto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) return `${proto ?? 'https'}://${host}`;
  return new URL(req.url).origin;
}

/** Stripe Billing Portal session — where a member manages/cancels their subscription. */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }
  try {
    const userKey = await getCurrentUserKey();
    if (userKey === DEMO_USER_KEY) {
      return NextResponse.json({ error: 'demo_not_allowed' }, { status: 403 });
    }
    const membership = await getMembershipStore().get(userKey);
    if (!membership?.stripeCustomerId) {
      return NextResponse.json({ error: 'no_billing_account' }, { status: 400 });
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: `${requestOrigin(req)}/pricing`,
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[stripe portal] failed:', err);
    return NextResponse.json({ error: 'portal_failed' }, { status: 500 });
  }
}

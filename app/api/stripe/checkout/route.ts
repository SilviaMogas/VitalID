import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isBillingInterval, PAID_PLANS } from '@/lib/plans';
import { getStripe, isStripeConfigured, resolvePriceId, StripeConfigError } from '@/lib/stripe/server';
import { assertSubscriptionPrice } from '@/lib/stripe/verify';
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

type Stage = 'auth' | 'membership_store' | 'price_config' | 'stripe_session';

/** Stripe error code/type only — never the message, which may echo config values. */
function safeDetail(err: unknown): string | undefined {
  if (err instanceof StripeConfigError) return err.code;
  if (!(err instanceof Stripe.errors.StripeError)) return undefined;
  const parts = [err.type, err.code, err.statusCode]
    .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v).replace(/[^A-Za-z0-9_.-]/g, ''));
  return parts.length ? parts.join(':') : undefined;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { plan, interval: rawInterval } = (body ?? {}) as { plan?: string; interval?: string };
  if (!PAID_PLANS.includes(plan as 'plus' | 'pro')) {
    return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
  }
  const interval = rawInterval === undefined ? 'monthly' : rawInterval;
  if (!isBillingInterval(interval)) {
    return NextResponse.json({ error: 'invalid interval' }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  let stage: Stage = 'auth';
  try {
    const userKey = await getCurrentUserKey();
    if (userKey === DEMO_USER_KEY) {
      return NextResponse.json({ error: 'demo_not_allowed' }, { status: 403 });
    }
    stage = 'membership_store';
    const membership = await getMembershipStore().upsert({ userKey });
    stage = 'price_config';
    const priceId = await resolvePriceId(plan as 'plus' | 'pro', interval);
    await assertSubscriptionPrice(priceId, plan as 'plus' | 'pro', interval);
    stage = 'stripe_session';

    const origin = requestOrigin(req);
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?plan=${plan}`,
      client_reference_id: userKey,
      metadata: { plan: plan as string, interval, userKey, app: 'vital-id' },
      subscription_data: { metadata: { plan: plan as string, interval, userKey } },
      customer_email: membership.email ?? undefined,
      locale: 'auto',
      allow_promotion_codes: false,
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[stripe checkout] failed at ${stage}:`, err);
    return NextResponse.json(
      { error: 'checkout_failed', stage, detail: safeDetail(err) },
      { status: 500 },
    );
  }
}

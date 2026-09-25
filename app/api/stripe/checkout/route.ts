import { NextResponse } from 'next/server';
import { PAID_PLANS } from '@/lib/plans';
import { getStripe, isStripeConfigured, resolveDemoPriceId } from '@/lib/stripe/server';
import { assertDemoPrice } from '@/lib/stripe/verify';
import { getCurrentUserKey } from '@/lib/membership/session';
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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { plan } = (body ?? {}) as { plan?: string };
  if (!PAID_PLANS.includes(plan as 'plus' | 'pro')) {
    return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  try {
    const userKey = await getCurrentUserKey();
    const membership = await getMembershipStore().upsert({ userKey });
    const priceId = await resolveDemoPriceId(plan as 'plus' | 'pro');
    await assertDemoPrice(priceId, plan as 'plus' | 'pro');

    const origin = requestOrigin(req);
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?plan=${plan}`,
      client_reference_id: userKey,
      metadata: { plan: plan as string, userKey, app: 'vital-id', offer: 'hackathon-demo' },
      payment_intent_data: { metadata: { plan: plan as string, userKey } },
      customer_email: membership.email ?? undefined,
      locale: 'auto',
      allow_promotion_codes: false,
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[stripe checkout] failed:', err);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}

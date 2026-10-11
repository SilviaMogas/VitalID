import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { syncSubscriptionFromStripe, verifyAndActivate } from '@/lib/stripe/verify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;
    // Never trust payload fields — re-retrieve and verify from Stripe.
    const result = await verifyAndActivate(session.id);
    if (!result.ok) {
      console.warn(`[stripe webhook] verify failed for ${session.id}: ${result.reason}`);
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object;
    // Never trust payload fields — re-retrieve the subscription from Stripe.
    const updated = await syncSubscriptionFromStripe(subscription.id);
    if (!updated) {
      console.warn(`[stripe webhook] subscription ${subscription.id} matched no member`);
    }
  }

  return NextResponse.json({ received: true });
}

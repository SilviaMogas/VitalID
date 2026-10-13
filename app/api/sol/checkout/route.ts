import { NextResponse } from 'next/server';
import { isBillingInterval, PAID_PLANS } from '@/lib/plans';
import { isSolPayConfigured } from '@/lib/solpay/config';
import { createSolPayment } from '@/lib/solpay/service';
import { DEMO_USER_KEY, getCurrentUserKey } from '@/lib/membership/session';
import { isAuthConfigured } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  if (!isSolPayConfigured()) {
    return NextResponse.json({ error: 'solpay_not_configured' }, { status: 503 });
  }
  try {
    const userKey = await getCurrentUserKey();
    // With auth configured, unauthenticated visitors resolve to the shared demo
    // user — paying under it would upgrade the demo account for everyone.
    if (userKey === DEMO_USER_KEY && isAuthConfigured()) {
      return NextResponse.json({ error: 'demo_not_allowed' }, { status: 403 });
    }
    const request = await createSolPayment(userKey, plan as 'plus' | 'pro', interval);
    return NextResponse.json(request, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[sol checkout] failed:', err);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}

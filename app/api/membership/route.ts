import { NextResponse } from 'next/server';
import { DEMO_USER_KEY, getCurrentMembership } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const membership = await getCurrentMembership();
  const isDemoUser = membership.userKey === DEMO_USER_KEY;
  return NextResponse.json(
    {
      userKey: membership.userKey,
      plan: membership.plan,
      isDemoUser,
      // Fatima bypasses the signup funnel entirely.
      planChosen: isDemoUser || membership.planChosenAt !== null,
      onboardingComplete: isDemoUser || membership.onboardingCompletedAt !== null,
      displayName: membership.displayName,
      activatedAt: membership.activatedAt,
      subscriptionStatus: membership.subscriptionStatus,
      subscriptionPeriodEnd: membership.subscriptionPeriodEnd,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

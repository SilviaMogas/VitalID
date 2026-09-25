import { NextResponse } from 'next/server';
import { DEMO_USER_KEY, getCurrentMembership } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const membership = await getCurrentMembership();
  return NextResponse.json(
    {
      userKey: membership.userKey,
      plan: membership.plan,
      isDemoUser: membership.userKey === DEMO_USER_KEY,
      displayName: membership.displayName,
      activatedAt: membership.activatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

import { NextResponse } from 'next/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const userKey = await getCurrentUserKey();
  await getMembershipStore().upsert({ userKey });
  const membership = await getMembershipStore().completeOnboarding(userKey);
  return NextResponse.json(
    { userKey: membership.userKey, onboardingComplete: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

import { NextResponse } from 'next/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const userKey = await getCurrentUserKey();
  const membership = await getMembershipStore().reset(userKey);
  return NextResponse.json(
    { userKey: membership.userKey, plan: membership.plan },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

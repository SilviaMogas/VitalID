import { NextResponse } from 'next/server';
import { DEMO_USER_KEY, getCurrentUserKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const userKey = await getCurrentUserKey();
  // Demo-only: real members must never wipe their paid plan state.
  if (userKey !== DEMO_USER_KEY) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const membership = await getMembershipStore().reset(userKey);
  return NextResponse.json(
    { userKey: membership.userKey, plan: membership.plan },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

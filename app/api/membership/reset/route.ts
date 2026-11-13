import { NextResponse } from 'next/server';
import { requireMemberKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function POST() {
  const userKey = await requireMemberKey();
  if (!userKey) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, ...NO_STORE });
  const membership = await getMembershipStore().reset(userKey);
  return NextResponse.json({ userKey: membership.userKey, plan: membership.plan }, NO_STORE);
}

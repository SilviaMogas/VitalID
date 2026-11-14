import { NextResponse } from 'next/server';
import { requireMemberKey } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';
import { isSameOrigin } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Non-production reset of the signed-in member's own membership only. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }
  const userKey = await requireMemberKey();
  if (!userKey) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: NO_STORE });
  }
  const membership = await getMembershipStore().reset(userKey);
  return NextResponse.json(
    { userKey: membership.userKey, plan: membership.plan },
    { headers: NO_STORE },
  );
}

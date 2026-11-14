import { NextRequest, NextResponse } from 'next/server';
import { requireMemberKey } from '@/lib/membership/session';
import { isSameOrigin } from '@/lib/share-api';
import { getOnboardingStore } from '@/lib/onboarding/store';
import { getWhoopStore, revokeAccess } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, ...NO_STORE });
  const userKey = await requireMemberKey();
  if (!userKey) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, ...NO_STORE });
  const store = getWhoopStore();
  const conn = await store.get(userKey);
  if (conn) await revokeAccess(conn.accessToken);
  await store.delete(userKey);
  await getOnboardingStore().setConnectorStatus(userKey, 'whoop', 'disconnected', null);
  return NextResponse.json({ ok: true }, NO_STORE);
}

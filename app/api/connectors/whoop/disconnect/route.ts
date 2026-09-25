import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getOnboardingStore } from '@/lib/onboarding/store';
import { getWhoopStore, revokeAccess } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const userKey = await getCurrentUserKey();
  const store = getWhoopStore();
  const conn = await store.get(userKey);
  if (conn) await revokeAccess(conn.accessToken);
  await store.delete(userKey);

  const user = await getCurrentUser();
  if (user) {
    await getOnboardingStore().setConnectorStatus(user.id, 'whoop', 'disconnected', null);
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getWhoopStore, syncWhoop, WhoopError } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function POST() {
  const userKey = await getCurrentUserKey();
  const conn = await getWhoopStore().get(userKey);
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 404, ...NO_STORE });

  try {
    const { days, lastSyncedAt } = await syncWhoop(userKey);
    return NextResponse.json({ ok: true, lastSyncedAt, days }, NO_STORE);
  } catch (e) {
    if (e instanceof WhoopError && e.code === 'refresh_failed') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401, ...NO_STORE });
    }
    if (e instanceof WhoopError && e.code === 'unavailable') {
      return NextResponse.json({ error: 'whoop_unavailable' }, { status: 502, ...NO_STORE });
    }
    if (e instanceof WhoopError && e.code === 'unauthorized') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401, ...NO_STORE });
    }
    return NextResponse.json({ error: 'sync_failed' }, { status: 500, ...NO_STORE });
  }
}

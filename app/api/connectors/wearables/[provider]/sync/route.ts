import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { isSameOrigin } from '@/lib/share-api';
import { getWearableStore, syncWearable, WearableError } from '@/lib/connectors/wearables';
import { NO_STORE, resolveProvider, unknownProvider, type ProviderCtx } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: ProviderCtx) {
  const id = await resolveProvider(ctx);
  if (!id) return unknownProvider();
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, ...NO_STORE });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, ...NO_STORE });
  const conn = await getWearableStore().get(user.id, id);
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 404, ...NO_STORE });
  try {
    const { days, lastSyncedAt } = await syncWearable(id, user.id);
    return NextResponse.json({ ok: true, lastSyncedAt, days }, NO_STORE);
  } catch (e) {
    if (e instanceof WearableError && (e.code === 'refresh_failed' || e.code === 'unauthorized')) {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401, ...NO_STORE });
    }
    if (e instanceof WearableError && e.code === 'unavailable') {
      return NextResponse.json({ error: 'provider_unavailable' }, { status: 502, ...NO_STORE });
    }
    return NextResponse.json({ error: 'sync_failed' }, { status: 500, ...NO_STORE });
  }
}

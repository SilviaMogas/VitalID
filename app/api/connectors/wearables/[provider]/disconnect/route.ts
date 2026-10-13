import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { isSameOrigin } from '@/lib/share-api';
import { getOnboardingStore } from '@/lib/onboarding/store';
import { getWearableStore, revokeAccess } from '@/lib/connectors/wearables';
import { NO_STORE, resolveProvider, unknownProvider, type ProviderCtx } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: ProviderCtx) {
  const id = await resolveProvider(ctx);
  if (!id) return unknownProvider();
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, ...NO_STORE });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, ...NO_STORE });
  const store = getWearableStore();
  const conn = await store.get(user.id, id);
  if (conn) await revokeAccess(id, conn.accessToken);
  await store.delete(user.id, id);
  await getOnboardingStore().setConnectorStatus(user.id, id, 'disconnected', null);
  return NextResponse.json({ ok: true }, NO_STORE);
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getWearableStatus } from '@/lib/connectors/wearables';
import { NO_STORE, resolveProvider, unknownProvider, type ProviderCtx } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: ProviderCtx) {
  const id = await resolveProvider(ctx);
  if (!id) return unknownProvider();
  return NextResponse.json(await getWearableStatus(id, await getCurrentUserKey()), NO_STORE);
}

import { NextResponse } from 'next/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getWhoopStatus } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const userKey = await getCurrentUserKey();
  return NextResponse.json(await getWhoopStatus(userKey), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

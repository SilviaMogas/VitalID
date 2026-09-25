import { NextResponse } from 'next/server';
import { clearForOwner } from '@/lib/share-store';
import { getCurrentUserKey } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const ownerKey = await getCurrentUserKey();
  await clearForOwner(ownerKey);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { getShare, revokeShare } from '@/lib/share-store';
import { DEMO_USER_KEY, getCurrentUserKey } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [share, ownerKey] = await Promise.all([getShare(id), getCurrentUserKey()]);
  if (!share || (share.ownerKey ?? DEMO_USER_KEY) !== ownerKey) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const ok = await revokeShare(id);
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ id, revoked: true }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { revokeShare } from '@/lib/share-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await revokeShare(id);
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ id, revoked: true }, { headers: { 'Cache-Control': 'no-store' } });
}

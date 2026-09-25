import { NextResponse } from 'next/server';
import { isShareActive } from '@/lib/sharing';
import { getShare } from '@/lib/share-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getShare(id);
  if (!payload || !isShareActive(payload)) {
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 410, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const publicPayload: Partial<typeof payload> = { ...payload };
  delete publicPayload.ownerKey;
  return NextResponse.json(publicPayload, { headers: { 'Cache-Control': 'no-store' } });
}

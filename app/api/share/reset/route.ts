import { NextResponse } from 'next/server';
import { clearAll } from '@/lib/share-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  await clearAll();
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { isStrictSameOrigin } from '@/lib/same-origin';
import { signOut } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isStrictSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  await signOut();
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

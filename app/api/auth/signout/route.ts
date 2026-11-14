import { NextResponse } from 'next/server';
import { sessionRequestRejection } from '@/lib/same-origin';
import { signOut } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rejected = sessionRequestRejection(req);
  if (rejected) return rejected;
  await signOut();
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

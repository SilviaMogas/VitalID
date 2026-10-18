import { NextResponse } from 'next/server';
import { refreshSessionIfNeeded } from '@/lib/auth/server';
import { getAccountState } from '@/lib/auth/next-route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Session probe used by the client shell: who am I and where should I be? */
export async function GET() {
  const user = await refreshSessionIfNeeded();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const state = await getAccountState(user.id);
  return NextResponse.json(
    { authenticated: true, userId: user.id, email: user.email, wallet: user.wallet, ...state },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

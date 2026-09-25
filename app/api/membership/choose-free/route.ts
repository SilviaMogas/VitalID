import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getAccountState } from '@/lib/auth/next-route';
import { getOnboardingStore } from '@/lib/onboarding/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Free plan never touches Stripe: just records that a plan was chosen. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  await getOnboardingStore().patch(user.id, { planSelected: true });
  const state = await getAccountState(user.id);
  return NextResponse.json({ ok: true, next: state.next }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getOnboardingStore, sanitizePatch } from '@/lib/onboarding/store';
import { isProfileComplete } from '@/lib/onboarding/types';
import { emptySetup } from '@/lib/onboarding/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const setup = (await getOnboardingStore().get(user.id)) ?? emptySetup();
  return NextResponse.json(setup, NO_STORE);
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const store = getOnboardingStore();
  const patch = sanitizePatch(body);
  if (patch.onboardingCompleted) {
    const current = await store.get(user.id);
    if (!current?.planSelected || !isProfileComplete({ ...current.profile, ...patch.profile })) {
      return NextResponse.json({ error: 'incomplete' }, { status: 409 });
    }
  }
  const setup = await store.patch(user.id, patch);
  return NextResponse.json(setup, NO_STORE);
}

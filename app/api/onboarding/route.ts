import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getOnboardingStore, sanitizePatch } from '@/lib/onboarding/store';
import { getMembershipStore } from '@/lib/membership/store';
import { applyPlanToConnectors } from '@/lib/connectors';
import { isProfileComplete } from '@/lib/onboarding/types';
import { emptySetup } from '@/lib/onboarding/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const [setup, membership] = await Promise.all([
    getOnboardingStore().get(user.id),
    getMembershipStore().get(user.id),
  ]);
  const resolved = setup ?? emptySetup();
  resolved.connectors = applyPlanToConnectors(resolved.connectors, membership?.plan ?? 'free');
  return NextResponse.json(resolved, NO_STORE);
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
  if (patch.connectors) {
    const membership = await getMembershipStore().get(user.id);
    patch.connectors = applyPlanToConnectors(patch.connectors, membership?.plan ?? 'free');
  }
  if (patch.onboardingCompleted) {
    const [current, membership] = await Promise.all([
      store.get(user.id),
      getMembershipStore().get(user.id),
    ]);
    // A paid plan counts as plan selected (same rule as lib/auth/next-route.ts)
    // — paid buyers never visit the plan picker, so plan_selected stays unset.
    const planSelected = Boolean(current?.planSelected) || (membership?.plan ?? 'free') !== 'free';
    if (
      !planSelected ||
      !isProfileComplete({ ...emptySetup().profile, ...current?.profile, ...patch.profile })
    ) {
      return NextResponse.json({ error: 'incomplete' }, { status: 409 });
    }
  }
  const setup = await store.patch(user.id, patch);
  return NextResponse.json(setup, NO_STORE);
}

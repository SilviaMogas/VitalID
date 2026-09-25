import { NextResponse } from 'next/server';
import { setUserSession } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Demo-grade email-only sign-in: no password, no verification.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { email } = (body ?? {}) as { email?: string };
  const mail = typeof email === 'string' ? email.trim() : '';
  if (!mail || mail.length > 254 || !EMAIL_RE.test(mail)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  const membership = await getMembershipStore().findByEmail(mail);
  if (!membership) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  await setUserSession(membership.userKey);
  return NextResponse.json(
    {
      userKey: membership.userKey,
      plan: membership.plan,
      planChosen: membership.planChosenAt !== null,
      onboardingComplete: membership.onboardingCompletedAt !== null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

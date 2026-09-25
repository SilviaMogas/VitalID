import { NextResponse } from 'next/server';
import { signUpWithPassword } from '@/lib/auth/server';
import { getMembershipStore } from '@/lib/membership/store';
import { getOnboardingStore } from '@/lib/onboarding/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const firstName = field(body.firstName, 80);
  const lastName = field(body.lastName, 80);
  const email = field(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const country = field(body.country, 80);
  const city = field(body.city, 80);

  if (!firstName || !lastName || !country || !city) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: 'weak_password' }, { status: 400 });
  }

  const result = await signUpWithPassword({ email, password, firstName, lastName, country, city });
  if (!result.ok) {
    const status = result.code === 'not_configured' ? 503 : result.code === 'unknown' ? 500 : 400;
    return NextResponse.json({ error: result.code }, { status });
  }

  const [membership] = await Promise.all([
    getMembershipStore().upsert({ userKey: result.user.id, displayName: `${firstName} ${lastName}`, email }),
    getOnboardingStore().patch(result.user.id, { profile: { firstName, lastName, country, city } }),
  ]);
  return NextResponse.json(
    { userId: result.user.id, plan: membership.plan, next: '/pricing' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

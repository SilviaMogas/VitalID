import { NextResponse } from 'next/server';
import { signUpWithPassword } from '@/lib/auth/server';
import { getMembershipStore } from '@/lib/membership/store';
import { getOnboardingStore } from '@/lib/onboarding/store';
import { getConsentStore } from '@/lib/consent';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';

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

  // Explicit, unbundled consent is required before an account that will hold
  // health data can be created (GDPR Art. 9(2)(a)). The client checkbox is
  // never pre-ticked; this check is the server-side enforcement.
  const consentPrivacy = body.consentPrivacy === true;
  const consentHealthData = body.consentHealthData === true;

  if (!firstName || !lastName || !country || !city) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (!consentPrivacy || !consentHealthData) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
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

  // Audit the consent (timestamped, append-only). If the consents table is not
  // migrated yet we still let signup succeed — the consent act itself was
  // enforced above — and log so the gap is visible server-side.
  try {
    const store = getConsentStore();
    await store.record(result.user.id, 'privacy_policy', PRIVACY_VERSION);
    await store.record(result.user.id, 'terms_of_service', TERMS_VERSION);
    await store.record(result.user.id, 'health_data', PRIVACY_VERSION);
  } catch (err) {
    console.error('[signup] consent audit write failed — run supabase/migrations/20261008_vital_id_consents.sql', err);
  }
  return NextResponse.json(
    { userId: result.user.id, plan: membership.plan, next: '/pricing' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

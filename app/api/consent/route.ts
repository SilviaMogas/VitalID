import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getConsentStore, isConsentType } from '@/lib/consent';
import { CONSENT_POLICY_VERSIONS } from '@/lib/legal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

/** Latest consent of each type + the current policy versions the server stamps. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const consents = await getConsentStore().latest(user.id);
  return NextResponse.json({ consents: consents ?? {}, versions: CONSENT_POLICY_VERSIONS }, NO_STORE);
}

/**
 * Record a consent event: { type: 'privacy_policy'|'terms_of_service'|'health_data' }.
 * The policy version is server-owned — clients can never assert one.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const type = (body as Record<string, unknown>).type;
  if (!isConsentType(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  const record = await getConsentStore().record(user.id, type, CONSENT_POLICY_VERSIONS[type]);
  return NextResponse.json({ consent: record }, NO_STORE);
}

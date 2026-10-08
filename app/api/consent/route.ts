import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getConsentStore, isConsentType } from '@/lib/consent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };
const MAX_VERSION_LEN = 40;

/** Latest consent of each type for the signed-in member. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const consents = await getConsentStore().latest(user.id);
  return NextResponse.json({ consents: consents ?? {} }, NO_STORE);
}

/** Record a consent event: { type: 'privacy_policy'|'health_data', policyVersion?: string } */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!isConsentType(body.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  const policyVersion =
    typeof body.policyVersion === 'string' && body.policyVersion.trim()
      ? body.policyVersion.trim().slice(0, MAX_VERSION_LEN)
      : 'unknown';
  const record = await getConsentStore().record(user.id, body.type, policyVersion);
  return NextResponse.json({ consent: record }, NO_STORE);
}

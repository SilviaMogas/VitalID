import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { isSameOrigin } from '@/lib/share-api';
import { getOnboardingStore } from '@/lib/onboarding/store';
import { getWearableStore, hashToken } from '@/lib/connectors/wearables';
import { parseIngestPayload } from '@/lib/connectors/wearables/ingest';
import { hasHealthConsent, NO_STORE } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST: companion app (iOS HealthKit / Android Health Connect) pushes daily
 * metrics with `Authorization: Bearer vid_…`. Apple Health and Health Connect
 * have no cloud API, so the phone app reads on-device and uploads here.
 */
export async function POST(req: NextRequest) {
  const bearer = /^Bearer (vid_[A-Za-z0-9_-]{20,})$/.exec(req.headers.get('authorization') ?? '');
  if (!bearer) return NextResponse.json({ error: 'unauthorized' }, { status: 401, ...NO_STORE });
  const store = getWearableStore();
  const userKey = await store.findUserByIngestTokenHash(hashToken(bearer[1])).catch(() => null);
  if (!userKey) return NextResponse.json({ error: 'unauthorized' }, { status: 401, ...NO_STORE });
  // Consent may have been withdrawn after the token was issued.
  if (!(await hasHealthConsent(userKey))) {
    return NextResponse.json({ error: 'consent_required' }, { status: 403, ...NO_STORE });
  }

  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413, ...NO_STORE });
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400, ...NO_STORE }); }
  const parsed = parseIngestPayload(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400, ...NO_STORE });

  await store.saveDaily(userKey, parsed.source, parsed.days);
  await store.markSync(userKey, parsed.source, { lastSyncedAt: new Date().toISOString(), lastSyncError: null }).catch(() => undefined);
  // Health Connect has no catalogue entry yet; only Apple Health is mirrored there.
  if (parsed.source === 'apple_health') {
    await getOnboardingStore()
      .setConnectorStatus(userKey, 'apple_health', 'connected', new Date().toISOString())
      .catch(() => undefined);
  }
  return NextResponse.json({ ok: true, days: parsed.days.length }, NO_STORE);
}

/** PUT: a signed-in member issues (or rotates) their push token. Shown once. */
export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, ...NO_STORE });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, ...NO_STORE });
  if (!(await hasHealthConsent(user.id))) return NextResponse.json({ error: 'consent_required' }, { status: 403, ...NO_STORE });
  const token = `vid_${crypto.randomBytes(32).toString('base64url')}`;
  await getWearableStore().setIngestTokenHash(user.id, hashToken(token));
  return NextResponse.json({ token }, NO_STORE);
}

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  SHARE_DURATIONS,
  SHARE_FIELDS,
  SHARE_PURPOSES,
  buildSnapshot,
  type ShareDuration,
  type ShareField,
  type SharePayload,
  type SharePurpose,
} from '@/lib/sharing';
import { buildVitalIdSnapshot } from '@/lib/vital-id';
import { createShare, listShares } from '@/lib/share-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomId(len = 16): string {
  const bytes = crypto.randomBytes(len);
  let id = '';
  for (let i = 0; i < len; i++) id += BASE62[bytes[i] % 62];
  return id;
}

function summarize(p: SharePayload) {
  return {
    id: p.id,
    purpose: p.purpose,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    revoked: p.revoked,
    selectedFields: p.selectedFields,
    sentTo: p.sentTo ?? [],
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { purpose, selectedFields, durationMinutes } = (body ?? {}) as {
    purpose?: SharePurpose;
    selectedFields?: ShareField[];
    durationMinutes?: ShareDuration;
  };
  if (!purpose || !SHARE_PURPOSES.includes(purpose)) {
    return NextResponse.json({ error: 'invalid purpose' }, { status: 400 });
  }
  if (
    !Array.isArray(selectedFields) ||
    selectedFields.length === 0 ||
    !selectedFields.every((f) => SHARE_FIELDS.includes(f))
  ) {
    return NextResponse.json({ error: 'invalid selectedFields' }, { status: 400 });
  }
  if (!durationMinutes || !SHARE_DURATIONS.includes(durationMinutes)) {
    return NextResponse.json({ error: 'invalid durationMinutes' }, { status: 400 });
  }

  const now = new Date();
  const full = buildVitalIdSnapshot();
  const payload: SharePayload = {
    id: randomId(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationMinutes * 60_000).toISOString(),
    revoked: false,
    purpose,
    selectedFields,
    sharedBy: full.identity.fullName,
    sharedByLocalized: full.identity.localizedName,
    snapshot: buildSnapshot(full, selectedFields),
  };
  await createShare(payload);
  return NextResponse.json(payload, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  const shares = await listShares();
  shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(shares.map(summarize), { headers: { 'Cache-Control': 'no-store' } });
}

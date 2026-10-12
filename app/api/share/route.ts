import crypto from 'node:crypto';
import {
  SHARE_DURATIONS,
  SHARE_FIELDS,
  SHARE_PURPOSES,
  buildSnapshot,
  normalizeRecipientUserId,
  projectSharePayload,
  type ShareDuration,
  type ShareField,
  type SharePayload,
  type SharePurpose,
} from '@/lib/sharing';
import { resolveUserData } from '@/lib/user-data';
import { createShare, listShares } from '@/lib/share-store';
import { getShareApiUser, isSameOrigin, shareJson } from '@/lib/share-api';
import { recipientAccountExists } from '@/lib/auth/server';

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

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return shareJson({ error: 'unavailable' }, 403);
  const user = await getShareApiUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shareJson({ error: 'invalid request' }, 400);
  }
  const { purpose, selectedFields, durationMinutes, recipientUserId, expectedSnapshot } = (body ?? {}) as {
    purpose?: SharePurpose;
    selectedFields?: ShareField[];
    durationMinutes?: ShareDuration;
    recipientUserId?: unknown;
    expectedSnapshot?: unknown;
  };
  const normalizedRecipientUserId = normalizeRecipientUserId(recipientUserId);
  if (
    !purpose ||
    !SHARE_PURPOSES.includes(purpose) ||
    !Array.isArray(selectedFields) ||
    selectedFields.length === 0 ||
    !selectedFields.every((f) => typeof f === 'string' && SHARE_FIELDS.includes(f as ShareField)) ||
    new Set(selectedFields).size !== selectedFields.length ||
    !normalizedRecipientUserId
  ) {
    return shareJson({ error: 'invalid request' }, 400);
  }
  if (!durationMinutes || !SHARE_DURATIONS.includes(durationMinutes)) {
    return shareJson({ error: 'invalid request' }, 400);
  }

  try {
    const { snapshot: full, owner } = await resolveUserData();
    if (owner !== 'member') return shareJson({ error: 'unavailable' }, 403);
    if (!user) return shareJson({ error: 'unavailable' }, 401);
    const snapshot = buildSnapshot(full, selectedFields);
    if (
      !expectedSnapshot ||
      typeof expectedSnapshot !== 'object' ||
      Array.isArray(expectedSnapshot) ||
      canonicalJson(expectedSnapshot) !== canonicalJson(snapshot)
    ) {
      return shareJson({ error: 'unavailable' }, 409);
    }
    if (!(await recipientAccountExists(normalizedRecipientUserId))) {
      return shareJson({ error: 'unavailable' }, 404);
    }
    const now = new Date();
    const payload: SharePayload = {
      id: randomId(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationMinutes * 60_000).toISOString(),
      revoked: false,
      purpose,
      selectedFields,
      sharedBy: full.identity.fullName,
      ownerKey: user.id,
      recipientUserId: normalizedRecipientUserId,
      sharedByLocalized: full.identity.localizedName,
      snapshot,
    };
    await createShare(payload);
    return shareJson(projectSharePayload(payload), 201);
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

export async function GET() {
  const user = await getShareApiUser();
  if (!user) return shareJson({ error: 'unavailable' }, 401);
  try {
    const shares = (await listShares()).filter((s) => s.ownerKey === user.id);
    shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return shareJson(shares.map(summarize));
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

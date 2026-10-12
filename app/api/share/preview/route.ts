import {
  SHARE_FIELDS,
  buildSnapshot,
  type ShareField,
} from '@/lib/sharing';
import { resolveUserData } from '@/lib/user-data';
import { getShareApiUser, isSameOrigin, shareJson } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return shareJson({ error: 'unavailable' }, 403);
  const user = await getShareApiUser();
  if (!user) return shareJson({ error: 'unavailable' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shareJson({ error: 'invalid request' }, 400);
  }
  const selectedFields = (body as { selectedFields?: unknown } | null)?.selectedFields;
  if (
    !Array.isArray(selectedFields) ||
    selectedFields.length === 0 ||
    !selectedFields.every((field) => typeof field === 'string' && SHARE_FIELDS.includes(field as ShareField)) ||
    new Set(selectedFields).size !== selectedFields.length
  ) {
    return shareJson({ error: 'invalid request' }, 400);
  }

  try {
    const { snapshot, owner } = await resolveUserData();
    if (owner !== 'member') return shareJson({ error: 'unavailable' }, 403);
    return shareJson({ snapshot: buildSnapshot(snapshot, selectedFields as ShareField[]) });
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

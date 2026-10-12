import { clearForOwner } from '@/lib/share-store';
import { getShareApiUser, isSameOrigin, shareJson } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return shareJson({ error: 'unavailable' }, 403);
  const user = await getShareApiUser();
  if (!user) return shareJson({ error: 'unavailable' }, 401);
  try {
    await clearForOwner(user.id);
    return shareJson({ ok: true });
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

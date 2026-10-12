import { getShare, revokeShare } from '@/lib/share-store';
import { getShareApiUser, isSameOrigin, shareJson } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return shareJson({ error: 'unavailable' }, 403);
  const user = await getShareApiUser();
  if (!user) return shareJson({ error: 'unavailable' }, 401);
  const { id } = await params;
  try {
    const share = await getShare(id);
    if (!share || share.ownerKey !== user.id) return shareJson({ error: 'unavailable' }, 404);
    const ok = await revokeShare(id);
    if (!ok) return shareJson({ error: 'unavailable' }, 404);
    return shareJson({ id, revoked: true });
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

import { canReadShare, isShareActive, projectSharePayload } from '@/lib/sharing';
import { getShare } from '@/lib/share-store';
import { getShareApiUser, shareJson } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getShareApiUser();
  if (!user) return shareJson({ status: 'unavailable' }, 401);
  const { id } = await params;
  try {
    const payload = await getShare(id);
    if (!payload || !isShareActive(payload) || !canReadShare(payload, user)) {
      return shareJson({ status: 'unavailable' }, 404);
    }
    return shareJson(projectSharePayload(payload));
  } catch {
    return shareJson({ status: 'unavailable' }, 500);
  }
}

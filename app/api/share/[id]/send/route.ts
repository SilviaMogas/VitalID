import { INSURER_IDS, type InsurerId } from '@/lib/insurers';
import { createDeliveryRef, isShareActive, type ShareRecipient } from '@/lib/sharing';
import { getShare, setShareRecipients } from '@/lib/share-store';
import { getShareApiUser, isSameOrigin, shareJson } from '@/lib/share-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return shareJson({ error: 'unavailable' }, 403);
  const user = await getShareApiUser();
  if (!user) return shareJson({ error: 'unavailable' }, 401);
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shareJson({ error: 'invalid request' }, 400);
  }

  const { insurers, consent } = (body ?? {}) as { insurers?: unknown; consent?: unknown };
  if (
    !Array.isArray(insurers) ||
    insurers.length === 0 ||
    !insurers.every((insurer) => typeof insurer === 'string' && INSURER_IDS.includes(insurer as InsurerId))
  ) {
    return shareJson({ error: 'invalid request' }, 400);
  }
  if (consent !== true) {
    return shareJson({ error: 'invalid request' }, 400);
  }

  try {
    const share = await getShare(id);
    if (!share || share.ownerKey !== user.id) return shareJson({ error: 'unavailable' }, 404);
    if (!isShareActive(share)) return shareJson({ error: 'unavailable' }, 404);

    const sentAt = new Date().toISOString();
    const recipients: ShareRecipient[] = insurers.map((insurerId) => ({
      insurerId: insurerId as ShareRecipient['insurerId'],
      sentAt,
      deliveryRef: createDeliveryRef(id, insurerId as InsurerId),
      consented: true,
    }));
    const updated = await setShareRecipients(id, recipients);
    if (!updated) return shareJson({ error: 'unavailable' }, 404);
    return shareJson({ id, sentTo: updated.sentTo ?? [] });
  } catch {
    return shareJson({ error: 'unavailable' }, 500);
  }
}

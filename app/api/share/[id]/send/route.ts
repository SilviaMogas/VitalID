import { NextResponse } from 'next/server';
import { INSURER_IDS, type InsurerId } from '@/lib/insurers';
import { isShareActive, type ShareRecipient } from '@/lib/sharing';
import { getShare, setShareRecipients } from '@/lib/share-store';
import { DEMO_USER_KEY, getCurrentUserKey } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const insurers = (body as { insurers?: unknown } | null)?.insurers;
  if (
    !Array.isArray(insurers) ||
    insurers.length === 0 ||
    !insurers.every((insurer) => typeof insurer === 'string' && INSURER_IDS.includes(insurer as InsurerId))
  ) {
    return NextResponse.json({ error: 'invalid insurers' }, { status: 400 });
  }

  const [share, ownerKey] = await Promise.all([getShare(id), getCurrentUserKey()]);
  if (!share || (share.ownerKey ?? DEMO_USER_KEY) !== ownerKey) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!isShareActive(share)) return NextResponse.json({ error: 'share is not active' }, { status: 410 });

  const sentAt = new Date().toISOString();
  const recipients: ShareRecipient[] = insurers.map((insurerId) => ({
    insurerId: insurerId as ShareRecipient['insurerId'],
    sentAt,
  }));
  const updated = await setShareRecipients(id, recipients);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(
    { id, sentTo: updated.sentTo ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

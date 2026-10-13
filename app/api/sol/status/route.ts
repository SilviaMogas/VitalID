import { NextResponse } from 'next/server';
import { isSolPayConfigured } from '@/lib/solpay/config';
import { confirmSolPayment } from '@/lib/solpay/service';
import { isSolanaAddress } from '@/lib/solpay/base58';
import { getCurrentUserKey } from '@/lib/membership/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get('reference');
  if (!reference || !isSolanaAddress(reference)) {
    return NextResponse.json({ error: 'invalid reference' }, { status: 400 });
  }
  if (!isSolPayConfigured()) {
    return NextResponse.json({ error: 'solpay_not_configured' }, { status: 503 });
  }
  try {
    const userKey = await getCurrentUserKey();
    const result = await confirmSolPayment(reference, userKey);
    if (result.state === 'missing') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (result.state === 'forbidden') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[sol status] failed:', err);
    return NextResponse.json({ error: 'status_failed' }, { status: 500 });
  }
}

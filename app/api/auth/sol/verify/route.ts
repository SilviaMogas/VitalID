import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthConfigured, signInWithWallet } from '@/lib/auth/server';
import { verifyWalletMessage } from '@/lib/solpay/wallet-auth';

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as {
    publicKey?: string;
    signature?: string;
    message?: string;
  };
  const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
  const message = typeof body.message === 'string' ? body.message : '';
  if (!publicKey || !signature || !message) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const host = (await headers()).get('host') ?? 'vitalid.site';
  const verdict = await verifyWalletMessage(publicKey, signature, message, host);
  if (verdict === 'bad_signature') return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  if (verdict !== 'ok') return NextResponse.json({ error: verdict }, { status: 400 });
  const result = await signInWithWallet(publicKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: result.code === 'not_configured' ? 503 : 500 });
  }
  return NextResponse.json({ next: '/' });
}

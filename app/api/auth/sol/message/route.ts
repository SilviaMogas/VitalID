import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthConfigured } from '@/lib/auth/server';
import { isSolanaPublicKey, issueMessage } from '@/lib/solpay/wallet-auth';

// Issues the nonce-bound message the wallet signs. The public key is baked in
// server-side so a signature only ever attests this key + this site.
export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { publicKey?: string };
  const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
  if (!isSolanaPublicKey(publicKey)) {
    return NextResponse.json({ error: 'invalid_public_key' }, { status: 400 });
  }
  const host = (await headers()).get('host') ?? 'vitalid.site';
  return NextResponse.json({ message: issueMessage(publicKey, host) });
}

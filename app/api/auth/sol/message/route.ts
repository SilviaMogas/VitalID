import type { NextRequest } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { isSolanaPublicKey, issueMessage } from '@/lib/solpay/wallet-auth';
import { parseWalletJson, walletJson, walletRequestOrigin } from '@/lib/auth/wallet-route';

// Issues the nonce-bound message the wallet signs. The public key is baked in
// server-side so a signature only ever attests this key + this site.
export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return walletJson({ error: 'auth_not_configured' }, 503);
  const origin = walletRequestOrigin(req);
  if (!origin) return walletJson({ error: 'forbidden' }, 403);
  const body = await parseWalletJson(req);
  const publicKey = typeof body?.publicKey === 'string' ? body.publicKey.trim() : '';
  if (!isSolanaPublicKey(publicKey)) {
    return walletJson({ error: 'invalid_public_key' }, 400);
  }
  return walletJson({ message: issueMessage(publicKey, origin.host) });
}

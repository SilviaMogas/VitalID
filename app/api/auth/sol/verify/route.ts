import type { NextRequest } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { verifyWalletMessage } from '@/lib/solpay/wallet-auth';
import { completeWalletSignIn, parseWalletJson, walletJson, walletRequestOrigin } from '@/lib/auth/wallet-route';

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return walletJson({ error: 'auth_not_configured' }, 503);
  const origin = walletRequestOrigin(req);
  if (!origin) return walletJson({ error: 'forbidden' }, 403);
  const body = await parseWalletJson(req);
  const publicKey = typeof body?.publicKey === 'string' ? body.publicKey.trim() : '';
  const signature = typeof body?.signature === 'string' ? body.signature.trim() : '';
  const message = typeof body?.message === 'string' ? body.message : '';
  if (!publicKey || !signature || !message) {
    return walletJson({ error: 'missing_fields' }, 400);
  }
  let verdict: Awaited<ReturnType<typeof verifyWalletMessage>>;
  try {
    verdict = await verifyWalletMessage(publicKey, signature, message, origin.host);
  } catch {
    return walletJson({ error: 'unavailable' }, 503);
  }
  if (verdict === 'unavailable') return walletJson({ error: 'unavailable' }, 503);
  if (verdict === 'bad_signature') return walletJson({ error: 'bad_signature' }, 401);
  if (verdict !== 'ok') return walletJson({ error: verdict }, 400);
  return completeWalletSignIn(publicKey, 'solana', {
    consentTerms: body?.consentTerms === true,
    consentHealthData: body?.consentHealthData === true,
  });
}

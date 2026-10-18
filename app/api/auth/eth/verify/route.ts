import { NextRequest } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { isEthereumAddress, verifyEthereumMessage } from '@/lib/auth/ethereum-wallet-auth';
import { completeWalletSignIn, parseWalletJson, walletJson, walletRequestOrigin } from '@/lib/auth/wallet-route';

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return walletJson({ error: 'auth_not_configured' }, 503);
  const origin = walletRequestOrigin(req);
  if (!origin) return walletJson({ error: 'forbidden' }, 403);
  const body = await parseWalletJson(req);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const chainId = body?.chainId;
  const signature = typeof body?.signature === 'string' ? body.signature.trim() : '';
  const message = typeof body?.message === 'string' ? body.message : '';
  if (
    !isEthereumAddress(address) ||
    !Number.isSafeInteger(chainId) ||
    Number(chainId) <= 0 ||
    !signature ||
    !message
  ) {
    return walletJson({ error: 'invalid_wallet' }, 400);
  }
  let verdict: Awaited<ReturnType<typeof verifyEthereumMessage>>;
  try {
    verdict = await verifyEthereumMessage(address, Number(chainId), signature, message, origin);
  } catch {
    return walletJson({ error: 'unavailable' }, 503);
  }
  if (verdict === 'unavailable') return walletJson({ error: 'unavailable' }, 503);
  if (verdict === 'bad_signature') return walletJson({ error: 'bad_signature' }, 401);
  if (verdict !== 'ok') return walletJson({ error: verdict }, 400);
  return completeWalletSignIn(address, 'ethereum', {
    consentTerms: body?.consentTerms === true,
    consentHealthData: body?.consentHealthData === true,
  });
}

import { NextRequest } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { isEthereumAddress, issueEthereumMessage } from '@/lib/auth/ethereum-wallet-auth';
import { parseWalletJson, walletJson, walletRequestOrigin } from '@/lib/auth/wallet-route';

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return walletJson({ error: 'auth_not_configured' }, 503);
  const origin = walletRequestOrigin(req);
  if (!origin) return walletJson({ error: 'forbidden' }, 403);
  const body = await parseWalletJson(req);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const chainId = body?.chainId;
  if (!isEthereumAddress(address) || !Number.isSafeInteger(chainId) || Number(chainId) <= 0) {
    return walletJson({ error: 'invalid_wallet' }, 400);
  }
  try {
    return walletJson({ message: issueEthereumMessage(address, Number(chainId), origin) });
  } catch {
    return walletJson({ error: 'unavailable' }, 503);
  }
}

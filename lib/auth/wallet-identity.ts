import { base58Decode } from '@/lib/solpay/base58';

export type WalletChain = 'solana' | 'ethereum';

export interface WalletIdentity {
  chain: WalletChain;
  address: string;
}

export function normalizeWalletAddress(address: string, chain: WalletChain): string {
  return chain === 'ethereum' ? address.toLowerCase() : address;
}

export function walletEmail(address: string, chain: WalletChain): string {
  const normalized = normalizeWalletAddress(address, chain);
  return `${chain === 'ethereum' ? 'eth' : 'sol'}.${normalized}@wallet.vitalid.site`;
}

export function isWalletIdentity(value: unknown): value is WalletIdentity {
  if (!value || typeof value !== 'object') return false;
  const identity = value as { chain?: unknown; address?: unknown };
  if (typeof identity.address !== 'string') return false;
  if (identity.chain === 'ethereum') {
    return /^0x[0-9a-f]{40}$/.test(identity.address);
  }
  if (identity.chain === 'solana') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identity.address)) return false;
    try {
      return base58Decode(identity.address).length === 32;
    } catch {
      return false;
    }
  }
  return false;
}

export function trustedWalletFromAppMetadata(
  email: string | null | undefined,
  appMetadata: unknown,
): WalletIdentity | null {
  if (!email || !appMetadata || typeof appMetadata !== 'object') return null;
  const metadata = appMetadata as { vitalid_wallet?: unknown };
  const identity = metadata.vitalid_wallet;
  if (!isWalletIdentity(identity)) return null;
  return email.toLowerCase() === walletEmail(identity.address, identity.chain).toLowerCase()
    ? identity
    : null;
}

export function hasWalletBinding(
  user: {
    email?: string | null;
    app_metadata?: unknown;
    user_metadata?: unknown;
  },
  expected: WalletIdentity,
): boolean {
  const trusted = trustedWalletFromAppMetadata(user.email, user.app_metadata);
  if (trusted) return trusted.chain === expected.chain && trusted.address === expected.address;
  if (expected.chain !== 'solana' || !user.email || !user.user_metadata || typeof user.user_metadata !== 'object') {
    return false;
  }
  const metadata = user.user_metadata as { solana_wallet?: unknown };
  return (
    metadata.solana_wallet === expected.address &&
    user.email.toLowerCase() === walletEmail(expected.address, 'solana').toLowerCase()
  );
}

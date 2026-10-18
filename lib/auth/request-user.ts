import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { WalletIdentity } from '@/lib/auth/wallet-identity';

export interface RequestAuthUser {
  id: string;
  email: string | null;
  wallet: WalletIdentity | null;
}

const users = new AsyncLocalStorage<RequestAuthUser>();

export function getRequestAuthUser(): RequestAuthUser | null {
  return users.getStore() ?? null;
}

export function withRequestAuthUser<T>(
  user: RequestAuthUser,
  callback: () => T,
): T {
  return users.run(user, callback);
}

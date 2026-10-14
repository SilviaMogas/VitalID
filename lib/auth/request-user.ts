import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestAuthUser {
  id: string;
  email: string | null;
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

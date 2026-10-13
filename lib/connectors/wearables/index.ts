import 'server-only';
import { isProviderConfigured } from './registry';
import { getWearableStore } from './store';
import type { OAuthWearableId, WearableConnectionPublic, WearableDaily, WearableId } from './types';

/** Server-only public surface — safe shapes only, never tokens. */
export async function getWearableStatus(id: OAuthWearableId, userKey: string): Promise<WearableConnectionPublic> {
  const conn = await getWearableStore().get(userKey, id);
  return {
    provider: id,
    configured: isProviderConfigured(id),
    connected: conn !== null,
    connectedAt: conn?.connectedAt ?? null,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
    needsReauth: conn?.lastSyncError === 'refresh_failed' || conn?.lastSyncError === 'unauthorized',
  };
}

export async function getWearableDaily(id: WearableId, userKey: string): Promise<WearableDaily[]> {
  return getWearableStore().getDaily(userKey, id);
}

export { buildAuthorizeUrl, exchangeCode, publicOrigin, redirectUri, revokeAccess, WearableError } from './oauth';
export { OAUTH_PROVIDERS, readProviderEnv, isProviderConfigured } from './registry';
export { getWearableStore, hashToken } from './store';
export { issueState, consumeState } from './state';
export { syncWearable } from './sync';
export * from './types';

import 'server-only';
import { isWhoopConfigured } from './env';
import { getWhoopStore } from './store';
import type { WhoopConnectionPublic, WhoopDaily } from './types';

/**
 * Server-only public surface of the WHOOP connector — safe shapes only,
 * never tokens.
 */

export async function getWhoopStatus(userKey: string): Promise<WhoopConnectionPublic> {
  const configured = isWhoopConfigured();
  const conn = await getWhoopStore().get(userKey);
  return {
    configured,
    connected: conn !== null,
    connectedAt: conn?.connectedAt ?? null,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
    needsReauth: conn?.lastSyncError === 'refresh_failed' || conn?.lastSyncError === 'unauthorized',
  };
}

/** Body measurements from the last sync (for the health profile). */
export async function getWhoopBody(
  userKey: string,
): Promise<{ heightM: number; weightKg: number; maxHeartRate: number | null } | null> {
  const conn = await getWhoopStore().get(userKey);
  if (!conn || conn.heightM === null || conn.weightKg === null) return null;
  return { heightM: conn.heightM, weightKg: conn.weightKg, maxHeartRate: conn.maxHeartRate };
}

export async function getWhoopDaily(userKey: string): Promise<WhoopDaily[]> {
  const conn = await getWhoopStore().get(userKey);
  if (!conn) return [];
  return getWhoopStore().getDaily(userKey);
}

export {
  buildAuthorizeUrl,
  exchangeCode,
  refreshTokens,
  revokeAccess,
  WhoopError,
} from './oauth';
export { isWhoopConfigured, readWhoopEnv, WHOOP_SCOPES } from './env';
export { getWhoopStore } from './store';
export { issueState, consumeState } from './state';
export { publicOrigin, whoopRedirectUri } from './redirect';
export { mapWhoopToDaily } from './mapping';
export { syncWhoop } from './sync';
export { whoopGet, whoopGetAll } from './client';
export type {
  Cycle,
  CycleScore,
  Paginated,
  Recovery,
  RecoveryScore,
  Sleep,
  SleepScore,
  SleepStageSummary,
  UserBasicProfile,
  UserBodyMeasurement,
  WhoopConnectionPublic,
  WhoopDaily,
  Workout,
  WorkoutScore,
} from './types';
export type { WhoopConnection, WhoopStore } from './store';

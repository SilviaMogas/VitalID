import 'server-only';
import { hitAttemptLimit } from '@/lib/auth/login-throttle';
import type { OAuthWearableId } from './types';

/** Provider API quotas are per app, so syncs are limited per user and provider. */
export const SYNC_COOLDOWN_SECONDS = 5 * 60;
export const SYNC_HOURLY_LIMIT = 10;

/** Seconds left before another sync is allowed after the last successful one; 0 if none. */
export function syncCooldownRemaining(lastSyncedAt: string | null, now = Date.now()): number {
  const last = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  if (!Number.isFinite(last)) return 0;
  const remainingMs = last + SYNC_COOLDOWN_SECONDS * 1000 - now;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/** Counts one sync attempt (successful or not); returns 0 if allowed, else seconds to wait. */
export function reserveWearableSync(userKey: string, provider: OAuthWearableId): Promise<number> {
  return hitAttemptLimit(`wearable-sync:${provider}:${userKey}`, SYNC_HOURLY_LIMIT, 60 * 60);
}

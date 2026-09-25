import 'server-only';
import { whoopGet, whoopGetAll } from './client';
import { mapWhoopToDaily } from './mapping';
import { WhoopError } from './oauth';
import { getWhoopStore } from './store';
import type {
  Cycle,
  Recovery,
  Sleep,
  UserBasicProfile,
  UserBodyMeasurement,
  Workout,
} from './types';

/**
 * Syncs the last 30 days of WHOOP data into vital_id_whoop_daily.
 * Existing daily rows are kept on failure — a sync error never deletes data.
 */
export async function syncWhoop(userKey: string): Promise<{ days: number; lastSyncedAt: string }> {
  const store = getWhoopStore();
  try {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [profile, body, recoveries, cycles, sleeps, workouts] = await Promise.all([
      whoopGet<UserBasicProfile>(userKey, '/v2/user/profile/basic'),
      whoopGet<UserBodyMeasurement>(userKey, '/v2/user/measurement/body').catch(() => null),
      whoopGetAll<Recovery>(userKey, '/v2/recovery', { start }),
      whoopGetAll<Cycle>(userKey, '/v2/cycle', { start }),
      whoopGetAll<Sleep>(userKey, '/v2/activity/sleep', { start }),
      whoopGetAll<Workout>(userKey, '/v2/activity/workout', { start }),
    ]);

    const rows = mapWhoopToDaily({ recoveries, cycles, sleeps, workouts });
    await store.saveDaily(userKey, rows);
    const lastSyncedAt = new Date().toISOString();
    await store.markSync(userKey, {
      lastSyncedAt,
      lastSyncError: null,
      whoopUserId: profile.user_id,
      body: body
        ? {
            heightM: body.height_meter,
            weightKg: body.weight_kilogram,
            maxHeartRate: body.max_heart_rate,
          }
        : undefined,
    });
    return { days: rows.length, lastSyncedAt };
  } catch (e) {
    const code = e instanceof WhoopError ? e.code : 'unavailable';
    await store.markSync(userKey, { lastSyncError: code }).catch(() => undefined);
    throw e;
  }
}

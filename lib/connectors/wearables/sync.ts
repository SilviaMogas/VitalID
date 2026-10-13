import 'server-only';
import { wearableGet } from './client';
import { WearableError } from './oauth';
import { mapOuraToDaily, type OuraDailyActivity, type OuraDailyReadiness, type OuraDailySleep, type OuraSleepPeriod, type OuraWorkout } from './providers/oura-mapping';
import { mapStravaToDaily, type StravaActivity } from './providers/strava-mapping';
import { getWearableStore } from './store';
import type { OAuthWearableId, WearableDaily } from './types';

const DAYS = 30;
const MAX_PAGES = 10;

async function ouraAll<T>(userKey: string, path: string, start: string, end: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const q: Record<string, string> = { start_date: start, end_date: end };
    if (next) q.next_token = next;
    const page: { data?: T[]; next_token?: string | null } = await wearableGet(
      'oura', userKey, `/v2/usercollection/${path}`, q,
    );
    if (Array.isArray(page?.data)) out.push(...page.data);
    next = typeof page?.next_token === 'string' ? page.next_token : null;
    if (!next) break;
  }
  return out;
}

async function fetchOura(userKey: string): Promise<WearableDaily[]> {
  const end = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10); // end_date is exclusive-ish; pad a day
  const start = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
  const [dailySleep, readiness, activity, sleep, workouts] = await Promise.all([
    ouraAll<OuraDailySleep>(userKey, 'daily_sleep', start, end),
    ouraAll<OuraDailyReadiness>(userKey, 'daily_readiness', start, end),
    ouraAll<OuraDailyActivity>(userKey, 'daily_activity', start, end),
    ouraAll<OuraSleepPeriod>(userKey, 'sleep', start, end),
    ouraAll<OuraWorkout>(userKey, 'workout', start, end).catch(() => []),
  ]);
  return mapOuraToDaily({ dailySleep, readiness, activity, sleep, workouts });
}

async function fetchStrava(userKey: string): Promise<WearableDaily[]> {
  const after = String(Math.floor((Date.now() - DAYS * 86_400_000) / 1000));
  const all: StravaActivity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await wearableGet<StravaActivity[]>('strava', userKey, '/athlete/activities', {
      after, per_page: '100', page: String(page),
    });
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return mapStravaToDaily(all);
}

/** Syncs the last 30 days. A failed sync never deletes stored rows. */
export async function syncWearable(id: OAuthWearableId, userKey: string): Promise<{ days: number; lastSyncedAt: string }> {
  const store = getWearableStore();
  try {
    const rows = id === 'oura' ? await fetchOura(userKey) : await fetchStrava(userKey);
    await store.saveDaily(userKey, id, rows);
    const lastSyncedAt = new Date().toISOString();
    await store.markSync(userKey, id, { lastSyncedAt, lastSyncError: null });
    return { days: rows.length, lastSyncedAt };
  } catch (e) {
    const code = e instanceof WearableError ? e.code : 'unavailable';
    await store.markSync(userKey, id, { lastSyncError: code }).catch(() => undefined);
    throw e;
  }
}

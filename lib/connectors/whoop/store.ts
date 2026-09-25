import 'server-only';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { WhoopDaily } from './types';

/**
 * Per-user WHOOP connection + synced daily metrics. Supabase (service key)
 * when configured, in-memory otherwise — selected exactly like the onboarding
 * store. `WhoopConnection` carries live tokens: never return it from routes.
 */

export interface WhoopConnection {
  userKey: string;
  whoopUserId: number | null;
  accessToken: string;
  refreshToken: string;
  /** ISO datetime when the access token expires. */
  expiresAt: string;
  scope: string | null;
  heightM: number | null;
  weightKg: number | null;
  maxHeartRate: number | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface WhoopStore {
  get(userKey: string): Promise<WhoopConnection | null>;
  upsert(conn: WhoopConnection): Promise<void>;
  updateTokens(
    userKey: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: string },
  ): Promise<void>;
  markSync(
    userKey: string,
    patch: {
      lastSyncedAt?: string;
      lastSyncError?: string | null;
      body?: { heightM: number | null; weightKg: number | null; maxHeartRate: number | null };
      whoopUserId?: number;
    },
  ): Promise<void>;
  /** Records a refresh failure only if the row still holds the refresh token that failed. */
  markRefreshFailed(userKey: string, attemptedRefreshToken: string): Promise<void>;
  delete(userKey: string): Promise<void>;
  saveDaily(userKey: string, rows: WhoopDaily[]): Promise<void>;
  getDaily(userKey: string): Promise<WhoopDaily[]>;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/* ------------------------------------------------------------------ */
/* Memory backend                                                       */
/* ------------------------------------------------------------------ */

class MemoryWhoopStore implements WhoopStore {
  private connections = new Map<string, WhoopConnection>();
  private daily = new Map<string, WhoopDaily[]>();

  async get(userKey: string) {
    return this.connections.get(userKey) ?? null;
  }
  async upsert(conn: WhoopConnection) {
    this.connections.set(conn.userKey, conn);
  }
  async updateTokens(userKey: string, tokens: { accessToken: string; refreshToken: string; expiresAt: string }) {
    const c = this.connections.get(userKey);
    if (!c) return;
    this.connections.set(userKey, {
      ...c,
      ...tokens,
      lastSyncError: c.lastSyncError === 'refresh_failed' ? null : c.lastSyncError,
    });
  }
  async markSync(userKey: string, patch: Parameters<WhoopStore['markSync']>[1]) {
    const c = this.connections.get(userKey);
    if (!c) return;
    this.connections.set(userKey, {
      ...c,
      lastSyncedAt: patch.lastSyncedAt ?? c.lastSyncedAt,
      lastSyncError: patch.lastSyncError !== undefined ? patch.lastSyncError : c.lastSyncError,
      whoopUserId: patch.whoopUserId ?? c.whoopUserId,
      heightM: patch.body?.heightM ?? c.heightM,
      weightKg: patch.body?.weightKg ?? c.weightKg,
      maxHeartRate: patch.body?.maxHeartRate ?? c.maxHeartRate,
    });
  }
  async markRefreshFailed(userKey: string, attemptedRefreshToken: string) {
    const c = this.connections.get(userKey);
    if (!c || c.refreshToken !== attemptedRefreshToken) return;
    this.connections.set(userKey, { ...c, lastSyncError: 'refresh_failed' });
  }
  async delete(userKey: string) {
    this.connections.delete(userKey);
    this.daily.delete(userKey);
  }
  async saveDaily(userKey: string, rows: WhoopDaily[]) {
    const byDate = new Map((this.daily.get(userKey) ?? []).map((r) => [r.date, r]));
    for (const r of rows) byDate.set(r.date, r);
    this.daily.set(
      userKey,
      [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
    );
  }
  async getDaily(userKey: string) {
    return this.daily.get(userKey) ?? [];
  }
}

/* ------------------------------------------------------------------ */
/* Supabase backend                                                     */
/* ------------------------------------------------------------------ */

interface ConnectionRow {
  user_key: string;
  whoop_user_id: number | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  height_m: number | string | null;
  weight_kg: number | string | null;
  max_heart_rate: number | null;
  connected_at: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

interface DailyRow {
  date: string;
  recovery_score: number | string | null;
  hrv_ms: number | string | null;
  resting_hr: number | string | null;
  sleep_hours: number | string | null;
  sleep_performance: number | string | null;
  strain: number | string | null;
  avg_heart_rate: number | string | null;
  workout_minutes: number | string | null;
  workout_count: number | null;
}

function toConnection(r: ConnectionRow): WhoopConnection {
  return {
    userKey: r.user_key,
    whoopUserId: r.whoop_user_id,
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: r.expires_at,
    scope: r.scope,
    heightM: num(r.height_m),
    weightKg: num(r.weight_kg),
    maxHeartRate: r.max_heart_rate,
    connectedAt: r.connected_at,
    lastSyncedAt: r.last_synced_at,
    lastSyncError: r.last_sync_error,
  };
}

function toDaily(r: DailyRow): WhoopDaily {
  return {
    date: r.date,
    recoveryScore: num(r.recovery_score),
    hrvMs: num(r.hrv_ms),
    restingHr: num(r.resting_hr),
    sleepHours: num(r.sleep_hours),
    sleepPerformance: num(r.sleep_performance),
    strain: num(r.strain),
    avgHeartRate: num(r.avg_heart_rate),
    workoutMinutes: num(r.workout_minutes),
    workoutCount: r.workout_count,
  };
}

class SupabaseWhoopStore implements WhoopStore {
  async get(userKey: string): Promise<WhoopConnection | null> {
    const sb = getSupabaseServerClient();
    const { data, error } = await sb
      .from('vital_id_whoop_connections')
      .select('*')
      .eq('user_key', userKey)
      .maybeSingle();
    if (error) throw new Error(`whoop get failed: ${error.message}`);
    return data ? toConnection(data as ConnectionRow) : null;
  }

  async upsert(conn: WhoopConnection): Promise<void> {
    const sb = getSupabaseServerClient();
    const { error } = await sb.from('vital_id_whoop_connections').upsert(
      {
        user_key: conn.userKey,
        whoop_user_id: conn.whoopUserId,
        access_token: conn.accessToken,
        refresh_token: conn.refreshToken,
        expires_at: conn.expiresAt,
        scope: conn.scope,
        height_m: conn.heightM,
        weight_kg: conn.weightKg,
        max_heart_rate: conn.maxHeartRate,
        connected_at: conn.connectedAt,
        last_synced_at: conn.lastSyncedAt,
        last_sync_error: conn.lastSyncError,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_key' },
    );
    if (error) throw new Error(`whoop upsert failed: ${error.message}`);
  }

  async updateTokens(
    userKey: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: string },
  ): Promise<void> {
    const sb = getSupabaseServerClient();
    const { error } = await sb
      .from('vital_id_whoop_connections')
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_key', userKey);
    if (error) throw new Error(`whoop token update failed: ${error.message}`);
    // A stale refresh_failed from a lost refresh race is void once valid tokens are stored.
    const cleared = await sb
      .from('vital_id_whoop_connections')
      .update({ last_sync_error: null })
      .eq('user_key', userKey)
      .eq('last_sync_error', 'refresh_failed');
    if (cleared.error) throw new Error(`whoop token update failed: ${cleared.error.message}`);
  }

  async markRefreshFailed(userKey: string, attemptedRefreshToken: string): Promise<void> {
    const sb = getSupabaseServerClient();
    const { error } = await sb
      .from('vital_id_whoop_connections')
      .update({ last_sync_error: 'refresh_failed', updated_at: new Date().toISOString() })
      .eq('user_key', userKey)
      .eq('refresh_token', attemptedRefreshToken);
    if (error) throw new Error(`whoop mark refresh failed: ${error.message}`);
  }

  async markSync(userKey: string, patch: Parameters<WhoopStore['markSync']>[1]): Promise<void> {
    const sb = getSupabaseServerClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.lastSyncedAt !== undefined) row.last_synced_at = patch.lastSyncedAt;
    if (patch.lastSyncError !== undefined) row.last_sync_error = patch.lastSyncError;
    if (patch.whoopUserId !== undefined) row.whoop_user_id = patch.whoopUserId;
    if (patch.body) {
      row.height_m = patch.body.heightM;
      row.weight_kg = patch.body.weightKg;
      row.max_heart_rate = patch.body.maxHeartRate;
    }
    const { error } = await sb
      .from('vital_id_whoop_connections')
      .update(row)
      .eq('user_key', userKey);
    if (error) throw new Error(`whoop markSync failed: ${error.message}`);
  }

  async delete(userKey: string): Promise<void> {
    const sb = getSupabaseServerClient();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from('vital_id_whoop_connections').delete().eq('user_key', userKey),
      sb.from('vital_id_whoop_daily').delete().eq('user_key', userKey),
    ]);
    if (e1 || e2) throw new Error(`whoop delete failed: ${(e1 ?? e2)?.message}`);
  }

  async saveDaily(userKey: string, rows: WhoopDaily[]): Promise<void> {
    if (rows.length === 0) return;
    const sb = getSupabaseServerClient();
    const now = new Date().toISOString();
    const { error } = await sb.from('vital_id_whoop_daily').upsert(
      rows.map((r) => ({
        user_key: userKey,
        date: r.date,
        recovery_score: r.recoveryScore,
        hrv_ms: r.hrvMs,
        resting_hr: r.restingHr,
        sleep_hours: r.sleepHours,
        sleep_performance: r.sleepPerformance,
        strain: r.strain,
        avg_heart_rate: r.avgHeartRate,
        workout_minutes: r.workoutMinutes,
        workout_count: r.workoutCount,
        updated_at: now,
      })),
      { onConflict: 'user_key,date' },
    );
    if (error) throw new Error(`whoop saveDaily failed: ${error.message}`);
  }

  async getDaily(userKey: string): Promise<WhoopDaily[]> {
    const sb = getSupabaseServerClient();
    const { data, error } = await sb
      .from('vital_id_whoop_daily')
      .select(
        'date,recovery_score,hrv_ms,resting_hr,sleep_hours,sleep_performance,strain,avg_heart_rate,workout_minutes,workout_count',
      )
      .eq('user_key', userKey)
      .order('date', { ascending: true });
    if (error) throw new Error(`whoop getDaily failed: ${error.message}`);
    return (data as DailyRow[]).map(toDaily);
  }
}

interface StoreGlobal {
  __vitalIdWhoopStore?: { backend: 'supabase' | 'memory'; store: WhoopStore };
}

export function getWhoopStore(): WhoopStore {
  const g = globalThis as StoreGlobal;
  const backend = isSupabaseConfigured() ? 'supabase' : 'memory';
  if (g.__vitalIdWhoopStore?.backend === backend) return g.__vitalIdWhoopStore.store;
  const store = backend === 'supabase' ? new SupabaseWhoopStore() : new MemoryWhoopStore();
  g.__vitalIdWhoopStore = { backend, store };
  return store;
}

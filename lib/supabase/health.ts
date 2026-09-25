import 'server-only';
import { isSupabaseConfigured } from './env';
import { getSupabaseServerClient } from './server';
import { VITAL_ID_SHARES_TABLE } from './shares';

export type SupabaseHealth =
  | { ok: true; backend: 'supabase'; table: string }
  | { ok: false; backend: 'memory' | 'supabase'; error: string };

/** Cheap connectivity + table-exists check. Safe to expose via an API route. */
export async function checkSupabaseConnection(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured()) {
    return { ok: false, backend: 'memory', error: 'SUPABASE_URL / SUPABASE_SECRET_KEY not set' };
  }
  try {
    const { error } = await getSupabaseServerClient()
      .from(VITAL_ID_SHARES_TABLE)
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) return { ok: false, backend: 'supabase', error: error.message };
    return { ok: true, backend: 'supabase', table: VITAL_ID_SHARES_TABLE };
  } catch (e) {
    return { ok: false, backend: 'supabase', error: e instanceof Error ? e.message : String(e) };
  }
}

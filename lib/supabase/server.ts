import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireServerSupabaseEnv } from './env';

export { isSupabaseConfigured } from './env';

/**
 * Server-side Supabase client using the SECRET key (bypasses RLS).
 *
 * - Importing this module from a client component fails at build time
 *   thanks to the `server-only` guard.
 * - Throws a clear error if SUPABASE_URL / SUPABASE_SECRET_KEY are missing.
 * - Cached on globalThis so dev HMR doesn't create a client per reload.
 */

interface ClientGlobal {
  __vitalIdSupabaseServerClient?: SupabaseClient;
}

export function getSupabaseServerClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServerClient() must never run in the browser');
  }
  const g = globalThis as ClientGlobal;
  if (g.__vitalIdSupabaseServerClient) return g.__vitalIdSupabaseServerClient;

  const { url, secretKey } = requireServerSupabaseEnv();
  g.__vitalIdSupabaseServerClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return g.__vitalIdSupabaseServerClient;
}

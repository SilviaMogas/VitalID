/**
 * Env wiring for Supabase.
 *
 * Server-only:  SUPABASE_URL, SUPABASE_SECRET_KEY (service_role / secret key).
 * Client-safe:  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 *
 * The secret key bypasses RLS, so it must only ever be read here, on the server.
 */

export interface ServerSupabaseEnv {
  url: string;
  secretKey: string;
}

export function readServerSupabaseEnv(): ServerSupabaseEnv | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return { url, secretKey };
}

/** True when the server has everything it needs to talk to Supabase. */
export function isSupabaseConfigured(): boolean {
  return readServerSupabaseEnv() !== null;
}

export function requireServerSupabaseEnv(): ServerSupabaseEnv {
  const env = readServerSupabaseEnv();
  if (!env) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY ' +
        '(see .env.example). Falling back to MemoryShareStore is automatic when ' +
        'using getShareStore().',
    );
  }
  return env;
}

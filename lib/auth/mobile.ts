import 'server-only';
import { createClient, type User } from '@supabase/supabase-js';
import { readServerSupabaseEnv } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthUser } from '@/lib/auth/server';
import { trustedWalletFromAppMetadata } from '@/lib/auth/wallet-identity';

export type MobileAuthFailure = {
  ok: false;
  status: 401 | 503;
  error: 'invalid_credentials' | 'unauthenticated' | 'unavailable';
};

export type MobileAuthSuccess = {
  ok: true;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

type MobileAuthResult = MobileAuthSuccess | MobileAuthFailure;

function authClient() {
  const env = readServerSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function authUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    wallet: trustedWalletFromAppMetadata(user.email, user.app_metadata),
  };
}

function makeSession(data: {
  session: {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_at?: unknown;
    expires_in?: unknown;
  } | null;
  user: User | null;
}): MobileAuthSuccess | null {
  const accessToken = data.session?.access_token;
  const refreshToken = data.session?.refresh_token;
  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    typeof refreshToken !== 'string' ||
    refreshToken.length === 0 ||
    !data.user
  ) {
    return null;
  }
  const expiresAt = typeof data.session?.expires_at === 'number' && Number.isFinite(data.session.expires_at)
    ? data.session.expires_at
    : Math.floor(Date.now() / 1000) +
      (typeof data.session?.expires_in === 'number' && Number.isFinite(data.session.expires_in)
        ? data.session.expires_in
        : 3600);
  return {
    ok: true,
    accessToken,
    refreshToken,
    expiresAt,
    user: authUser(data.user),
  };
}

function isInvalidCredentials(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; message?: unknown; status?: unknown };
  return value.code === 'invalid_credentials' ||
    (value.status === 400 && typeof value.message === 'string' &&
      /invalid login credentials/i.test(value.message));
}

function isInvalidRefreshToken(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; message?: unknown; status?: unknown };
  if (['invalid_grant', 'invalid_refresh_token', 'refresh_token_not_found', 'refresh_token_already_used']
    .includes(String(value.code ?? ''))) {
    return true;
  }
  return (value.status === 400 || value.status === 401) &&
    typeof value.message === 'string' && /refresh token/i.test(value.message);
}

export async function signInMobile(
  email: string,
  password: string,
): Promise<MobileAuthResult> {
  const client = authClient();
  if (!client) return { ok: false, status: 503, error: 'unavailable' };
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      return isInvalidCredentials(error)
        ? { ok: false, status: 401, error: 'invalid_credentials' }
        : { ok: false, status: 503, error: 'unavailable' };
    }
    return makeSession({ session: data.session, user: data.user })
      ?? { ok: false, status: 503, error: 'unavailable' };
  } catch {
    return { ok: false, status: 503, error: 'unavailable' };
  }
}

export async function refreshMobile(
  refreshToken: string,
): Promise<MobileAuthResult> {
  const client = authClient();
  if (!client) return { ok: false, status: 503, error: 'unavailable' };
  try {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error) {
      return isInvalidRefreshToken(error)
        ? { ok: false, status: 401, error: 'unauthenticated' }
        : { ok: false, status: 503, error: 'unavailable' };
    }
    return makeSession({ session: data.session, user: data.user })
      ?? { ok: false, status: 401, error: 'unauthenticated' };
  } catch {
    return { ok: false, status: 503, error: 'unavailable' };
  }
}

export async function authenticateMobileAccessToken(
  accessToken: string,
): Promise<{ ok: true; user: AuthUser } | MobileAuthFailure> {
  if (!readServerSupabaseEnv()) return { ok: false, status: 503, error: 'unavailable' };
  try {
    const { data, error } = await getSupabaseServerClient().auth.getUser(accessToken);
    if (error) {
      const status = (error as { status?: unknown }).status;
      return status === 400 || status === 401
        ? { ok: false, status: 401, error: 'unauthenticated' }
        : { ok: false, status: 503, error: 'unavailable' };
    }
    if (!data.user) return { ok: false, status: 401, error: 'unauthenticated' };
    return { ok: true, user: authUser(data.user) };
  } catch {
    return { ok: false, status: 503, error: 'unavailable' };
  }
}

export async function signOutMobile(accessToken: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseServerClient().auth.admin.signOut(accessToken, 'local');
    return !error;
  } catch {
    return false;
  }
}

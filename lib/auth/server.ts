import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { readServerSupabaseEnv } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getRequestAuthUser } from '@/lib/auth/request-user';
import {
  hasWalletBinding,
  legacySolanaWalletEmail,
  normalizeWalletAddress,
  trustedWalletFromAppMetadata,
  walletEmail,
  type WalletChain,
  type WalletIdentity,
} from '@/lib/auth/wallet-identity';
import { isSolanaPublicKey, walletPasswordForChain } from '@/lib/solpay/wallet-auth';

/**
 * Supabase Auth (email + password) with httpOnly cookie sessions.
 *
 * - Sign-up creates a confirmed user through the admin API (no e-mail round-trip
 *   for the demo) and then signs the user in.
 * - Access + refresh tokens are stored in httpOnly cookies; `getCurrentUser()`
 *   validates the access token against Supabase on every request (React-cached).
 * - `refreshSessionIfNeeded()` is called from `/api/auth/me`, so a client that is
 *   still open when its access token expires is silently rolled over.
 *
 * Nothing in here is ever imported by client components (`server-only`).
 */

export const ACCESS_COOKIE = 'vitalid_at';
export const REFRESH_COOKIE = 'vitalid_rt';
const YEAR = 60 * 60 * 24 * 365;

function isUserNotFoundError(error: { code?: string; status?: number; message?: string }): boolean {
  return error.code === 'user_not_found' || /user not found/i.test(error.message ?? '');
}

export interface AuthUser {
  id: string;
  email: string | null;
  wallet: WalletIdentity | null;
}

export function isAuthConfigured(): boolean {
  return readServerSupabaseEnv() !== null;
}

/** Throw-away GoTrue client (no persistence) for password grants / refreshes. */
function authClient(): SupabaseClient {
  const env = readServerSupabaseEnv();
  if (!env) throw new Error('Supabase Auth is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY).');
  return createClient(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

async function writeSessionCookies(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, cookieOpts(YEAR));
  store.set(REFRESH_COOKIE, refreshToken, cookieOpts(YEAR));
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export type AuthResult =
  | { ok: true; user: AuthUser; created?: boolean }
  | { ok: false; code: 'invalid_credentials' | 'email_taken' | 'weak_password' | 'not_configured' | 'consent_required' | 'reserved_email' | 'unknown'; message: string };

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    wallet: trustedWalletFromAppMetadata(u.email, u.app_metadata),
  };
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
}): Promise<AuthResult> {
  if (!isAuthConfigured()) return { ok: false, code: 'not_configured', message: 'auth not configured' };
  if (input.email.trim().toLowerCase().endsWith('@wallet.vitalid.site')) {
    return { ok: false, code: 'reserved_email', message: 'wallet email addresses are reserved' };
  }
  const admin = getSupabaseServerClient();
  const { error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      country: input.country,
      city: input.city,
    },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || error.code === 'email_exists') {
      return { ok: false, code: 'email_taken', message: error.message };
    }
    if (msg.includes('password') || error.code === 'weak_password') {
      return { ok: false, code: 'weak_password', message: error.message };
    }
    return { ok: false, code: 'unknown', message: error.message };
  }
  return signInWithPassword({ email: input.email, password: input.password });
}

export async function signInWithPassword(input: { email: string; password: string }): Promise<AuthResult> {
  if (!isAuthConfigured()) return { ok: false, code: 'not_configured', message: 'auth not configured' };
  const { data, error } = await authClient().auth.signInWithPassword(input);
  if (error || !data.session || !data.user) {
    return { ok: false, code: 'invalid_credentials', message: error?.message ?? 'invalid credentials' };
  }
  await writeSessionCookies(data.session.access_token, data.session.refresh_token);
  return { ok: true, user: toAuthUser(data.user) };
}

/**
 * Session for a verified Solana wallet. The wallet owns a synthetic Supabase
 * user under an injective synthetic email whose password is derived from the
 * server secret — created on first login, re-derived on every later one.
 */
export async function signInWithWallet(
  address: string,
  consents: { consentTerms: boolean; consentHealthData: boolean },
  chain: WalletChain = 'solana',
): Promise<AuthResult> {
  if (!isAuthConfigured()) return { ok: false, code: 'not_configured', message: 'auth not configured' };
  if (chain === 'solana' ? !isSolanaPublicKey(address) : !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return { ok: false, code: 'invalid_credentials', message: 'invalid wallet identity' };
  }
  const identity: WalletIdentity = { chain, address: normalizeWalletAddress(address, chain) };
  const email = walletEmail(identity.address, chain);
  const password = walletPasswordForChain(identity.address, chain);
  const admin = getSupabaseServerClient();

  const completePasswordSignIn = async (attempt: AuthResult): Promise<AuthResult> => {
    if (!attempt.ok) return attempt;
    const { data, error } = await admin.auth.admin.getUserById(attempt.user.id);
    if (error || !data.user) {
      await clearSessionCookies();
      return { ok: false, code: 'unknown', message: error?.message ?? 'wallet user not found' };
    }
    if (!hasWalletBinding(data.user, identity)) {
      await clearSessionCookies();
      return { ok: false, code: 'invalid_credentials', message: 'wallet account binding mismatch' };
    }
    if (trustedWalletFromAppMetadata(data.user.email, data.user.app_metadata)) return attempt;
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...data.user.app_metadata, vitalid_wallet: identity },
    });
    if (updateError || !updated.user) {
      await clearSessionCookies();
      return { ok: false, code: 'unknown', message: updateError?.message ?? 'wallet metadata update failed' };
    }
    return { ok: true, user: toAuthUser(updated.user) };
  };

  const first = await completePasswordSignIn(await signInWithPassword({ email, password }));
  if (first.ok) return first;
  if (first.code !== 'invalid_credentials') return first;
  // Password grant failed: either the wallet has no account yet or its
  // derived password predates a secret rotation. Tell them apart by a
  // cryptographically verified wallet binding, not the case-folded email.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (linkError && !isUserNotFoundError(linkError)) {
    return { ok: false, code: 'unknown', message: linkError.message };
  }
  const existingUser = link?.user ?? null;
  if (existingUser) {
    if (!hasWalletBinding(existingUser, identity)) {
      return { ok: false, code: 'invalid_credentials', message: 'wallet account binding mismatch' };
    }
    // Known wallet, rotated secret: reset to the current derived password.
    const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
      password,
      app_metadata: { ...existingUser.app_metadata, vitalid_wallet: identity },
    });
    if (error) return { ok: false, code: 'unknown', message: error.message };
    return signInWithPassword({ email, password });
  }
  if (chain === 'solana') {
    const legacyEmail = legacySolanaWalletEmail(identity.address);
    // Prefer the current derived secret so an ordinary legacy sign-in does
    // not write credentials through the admin API.
    const legacy = await completePasswordSignIn(await signInWithPassword({ email: legacyEmail, password }));
    if (legacy.ok) return legacy;
    if (legacy.code !== 'invalid_credentials') return legacy;

    const { data: legacyLink, error: legacyLinkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: legacyEmail,
    });
    if (legacyLinkError && !isUserNotFoundError(legacyLinkError)) {
      return { ok: false, code: 'unknown', message: legacyLinkError.message };
    }
    const legacyUser = legacyLink?.user ?? null;
    if (legacyUser && hasWalletBinding(legacyUser, identity)) {
      const { error } = await admin.auth.admin.updateUserById(legacyUser.id, {
        password,
        app_metadata: { ...legacyUser.app_metadata, vitalid_wallet: identity },
      });
      if (error) return { ok: false, code: 'unknown', message: error.message };
      return signInWithPassword({ email: legacyUser.email ?? legacyEmail, password });
    }
  }
  // New wallet account: same legal gate as password signup — no terms or
  // health-data consent, no account.
  if (!consents.consentTerms || !consents.consentHealthData) {
    return { ok: false, code: 'consent_required', message: 'consent required for new wallet account' };
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(chain === 'solana' ? { user_metadata: { solana_wallet: identity.address } } : {}),
    app_metadata: { vitalid_wallet: identity },
  });
  if (error) return { ok: false, code: 'unknown', message: error.message };
  const created = await signInWithPassword({ email, password });
  if (!created.ok) return created;
  return { ok: true, user: created.user, created: true };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const at = store.get(ACCESS_COOKIE)?.value;
  if (at && isAuthConfigured()) {
    try {
      await getSupabaseServerClient().auth.admin.signOut(at, 'local');
    } catch {
      /* cookie removal below is what matters for the app */
    }
  }
  await clearSessionCookies();
}

/**
 * Currently signed-in Supabase user, or null. Read-only (safe in server
 * components); does not refresh tokens.
 */
const getCookieCurrentUser = cache(async (): Promise<AuthUser | null> => {
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  const at = store.get(ACCESS_COOKIE)?.value;
  if (!at) return null;
  const { data, error } = await getSupabaseServerClient().auth.getUser(at);
  if (error || !data.user) return null;
  return toAuthUser(data.user);
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  return getRequestAuthUser() ?? getCookieCurrentUser();
}

export async function recipientAccountExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseServerClient().auth.admin.getUserById(userId);
    return !error && data.user?.id === userId;
  } catch {
    return false;
  }
}

/** True when any member session cookie is present, even if the access token has expired. */
export async function hasMemberCookies(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(ACCESS_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value);
}

/**
 * Route-handler only (sets cookies): returns the user, refreshing the session
 * when the access token has expired and a refresh token is available.
 */
export async function refreshSessionIfNeeded(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (user) return user;
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  const rt = store.get(REFRESH_COOKIE)?.value;
  if (!rt) return null;
  const { data, error } = await authClient().auth.refreshSession({ refresh_token: rt });
  if (error || !data.session || !data.user) {
    await clearSessionCookies();
    return null;
  }
  await writeSessionCookies(data.session.access_token, data.session.refresh_token);
  return toAuthUser(data.user);
}

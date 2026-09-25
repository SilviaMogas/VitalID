import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getMembershipStore } from './store';
import type { MembershipRecord } from './types';

export const DEMO_USER_KEY = 'fatima';
const COOKIE_NAME = 'vitalid_uid';
const USER_KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Cookie-identified user, or the Fatima demo user when no valid cookie exists. */
export async function getCurrentUserKey(): Promise<string> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value && USER_KEY_RE.test(value) ? value : DEMO_USER_KEY;
}

/** Creates a fresh user key and sets the httpOnly session cookie. */
export async function createUserSession(): Promise<{ userKey: string }> {
  const userKey = crypto.randomBytes(16).toString('base64url');
  const store = await cookies();
  store.set(COOKIE_NAME, userKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return { userKey };
}

export async function clearUserSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Membership row for the current user — creates a free row on first visit so
 * Fatima (no cookie) and real users always have a record.
 */
export async function getCurrentMembership(): Promise<MembershipRecord> {
  const userKey = await getCurrentUserKey();
  return getMembershipStore().upsert({ userKey });
}

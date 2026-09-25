import 'server-only';
import { getCurrentUser } from '@/lib/auth/server';
import { getMembershipStore } from './store';
import type { MembershipRecord } from './types';

export { DEMO_USER_KEY } from './constants';
import { DEMO_USER_KEY } from './constants';

/**
 * Membership user key = Supabase Auth user id. Without a signed-in user the
 * request belongs to the Fatima demo account (reached only via "Login as Fatima").
 */
export async function getCurrentUserKey(): Promise<string> {
  const user = await getCurrentUser();
  return user?.id ?? DEMO_USER_KEY;
}

/**
 * Membership row for the current user — creates a free row on first visit so
 * Fatima and real users always have a record.
 */
export async function getCurrentMembership(): Promise<MembershipRecord> {
  const userKey = await getCurrentUserKey();
  return getMembershipStore().upsert({ userKey });
}

import 'server-only';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { SupabaseMembershipStore } from './supabase-store';
import { MemoryMembershipStore } from './memory-store';
import type { MembershipStore } from './types';

export type MembershipStoreBackend = 'supabase' | 'memory';

/**
 * Backend selection:
 *   MEMBERSHIP_STORE=supabase  -> force Supabase (throws if env is missing)
 *   MEMBERSHIP_STORE=memory    -> force in-memory
 *   unset                      -> Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY exist, else memory
 */
export function resolveMembershipStoreBackend(): MembershipStoreBackend {
  const forced = process.env.MEMBERSHIP_STORE?.toLowerCase();
  if (forced === 'supabase' || forced === 'memory') return forced;
  return isSupabaseConfigured() ? 'supabase' : 'memory';
}

interface StoreGlobal {
  __vitalIdMembershipStoreInstance?: { backend: MembershipStoreBackend; store: MembershipStore };
}

/** Single entry point: returns the active MembershipStore. */
export function getMembershipStore(): MembershipStore {
  const g = globalThis as StoreGlobal;
  const backend = resolveMembershipStoreBackend();
  if (g.__vitalIdMembershipStoreInstance?.backend === backend) {
    return g.__vitalIdMembershipStoreInstance.store;
  }
  const store: MembershipStore =
    backend === 'supabase' ? new SupabaseMembershipStore() : new MemoryMembershipStore();
  g.__vitalIdMembershipStoreInstance = { backend, store };
  return store;
}

export { MemoryMembershipStore } from './memory-store';
export { SupabaseMembershipStore } from './supabase-store';
export * from './types';

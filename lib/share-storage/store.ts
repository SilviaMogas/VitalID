import 'server-only';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { SupabaseShareStore } from '@/lib/supabase/shares';
import { MemoryShareStore } from './memory-store';
import type { ShareStore } from './types';

export type ShareStoreBackend = 'supabase' | 'memory';

/**
 * Backend selection:
 *   SHARE_STORE=supabase  -> force Supabase (throws if env is missing)
 *   SHARE_STORE=memory    -> force in-memory
 *   unset                 -> Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY exist, else memory
 */
export function resolveShareStoreBackend(): ShareStoreBackend {
  const forced = process.env.SHARE_STORE?.toLowerCase();
  if (forced === 'supabase' || forced === 'memory') return forced;
  return isSupabaseConfigured() ? 'supabase' : 'memory';
}

interface StoreGlobal {
  __vitalIdShareStoreInstance?: { backend: ShareStoreBackend; store: ShareStore };
}

/** Single entry point for Chat B: returns the active ShareStore. */
export function getShareStore(): ShareStore {
  const g = globalThis as StoreGlobal;
  const backend = resolveShareStoreBackend();
  if (g.__vitalIdShareStoreInstance?.backend === backend) {
    return g.__vitalIdShareStoreInstance.store;
  }
  const store: ShareStore = backend === 'supabase' ? new SupabaseShareStore() : new MemoryShareStore();
  g.__vitalIdShareStoreInstance = { backend, store };
  return store;
}

export { MemoryShareStore } from './memory-store';
export { SupabaseShareStore } from '@/lib/supabase/shares';
export * from './types';
export { generateShareToken, pickSelectedFields, isVitalIdShareValid } from './shared';

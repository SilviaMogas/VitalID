import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Single-use nonces for wallet sign-in. A nonce is claimed exactly once at
 * verification time — replay of a captured signed message within its TTL is
 * refused. Rows older than the TTL are swept on each claim.
 */

const TABLE = 'vital_id_wallet_nonces';
const TTL_MS = 10 * 60 * 1000;

export interface WalletNonceStore {
  /** True only for the first claim of a nonce. */
  claim(nonce: string): Promise<boolean>;
}

class SupabaseWalletNonceStore implements WalletNonceStore {
  async claim(nonce: string): Promise<boolean> {
    const client = getSupabaseServerClient();
    const { error } = await client.from(TABLE).insert({ nonce });
    if (error) {
      if (error.code === '23505') return false; // already claimed
      throw new Error(`wallet nonce claim failed: ${error.message}`);
    }
    // Best-effort sweep of expired nonces.
    void client
      .from(TABLE)
      .delete()
      .lt('created_at', new Date(Date.now() - TTL_MS).toISOString())
      .then(() => undefined, () => undefined);
    return true;
  }
}

interface MemoryGlobal {
  __vitalIdWalletNonces?: Map<string, number>;
}

class MemoryWalletNonceStore implements WalletNonceStore {
  private nonces(): Map<string, number> {
    const g = globalThis as MemoryGlobal;
    g.__vitalIdWalletNonces ??= new Map();
    return g.__vitalIdWalletNonces;
  }

  async claim(nonce: string): Promise<boolean> {
    const map = this.nonces();
    const cutoff = Date.now() - TTL_MS;
    for (const [key, at] of map) if (at < cutoff) map.delete(key);
    if (map.has(nonce)) return false;
    map.set(nonce, Date.now());
    return true;
  }
}

interface StoreGlobal {
  __vitalIdWalletNonceStore?: { backend: 'supabase' | 'memory'; store: WalletNonceStore };
}

export function getWalletNonceStore(): WalletNonceStore {
  const g = globalThis as StoreGlobal;
  const backend: 'supabase' | 'memory' =
    process.env.WALLET_NONCE_STORE === 'memory'
      ? 'memory'
      : process.env.WALLET_NONCE_STORE === 'supabase' || isSupabaseConfigured()
        ? 'supabase'
        : 'memory';
  if (g.__vitalIdWalletNonceStore?.backend === backend) return g.__vitalIdWalletNonceStore.store;
  const store = backend === 'supabase' ? new SupabaseWalletNonceStore() : new MemoryWalletNonceStore();
  g.__vitalIdWalletNonceStore = { backend, store };
  return store;
}

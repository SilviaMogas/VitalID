import 'server-only';
import type { BillingInterval } from '@/lib/plans';
import { isSolanaAddress } from './base58';

export type SolCluster = 'mainnet-beta' | 'testnet' | 'devnet';

const DEFAULT_RPC: Record<SolCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

/**
 * Demo-friendly default SOL prices in lamports (SOL payments are one-time,
 * not recurring — the plan is granted for the purchased period). Override per
 * plan/interval via SOL_PAY_LAMPORTS_* env vars for real pricing.
 */
const DEFAULT_LAMPORTS: Record<'plus' | 'pro', Record<BillingInterval, bigint>> = {
  plus: { monthly: BigInt(20000000), annual: BigInt(200000000) },
  pro: { monthly: BigInt(50000000), annual: BigInt(500000000) },
};

export interface SolPayConfig {
  cluster: SolCluster;
  rpcUrl: string;
  treasury: string;
  commitment: 'confirmed' | 'finalized';
  /** How long a payment request stays payable. */
  expiryMs: number;
}

function readCluster(): SolCluster {
  const raw = process.env.SOL_PAY_CLUSTER?.toLowerCase() ?? 'devnet';
  if (raw === 'mainnet-beta' || raw === 'mainnet') return 'mainnet-beta';
  if (raw === 'testnet' || raw === 'devnet') return raw;
  throw new Error(`SOL_PAY_CLUSTER must be mainnet-beta, testnet or devnet (got "${raw}")`);
}

export function solPayLamports(plan: 'plus' | 'pro', interval: BillingInterval): bigint {
  const envKey = `SOL_PAY_LAMPORTS_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return DEFAULT_LAMPORTS[plan][interval];
  if (!/^\d+$/.test(raw)) throw new Error(`${envKey} must be a lamports integer`);
  return BigInt(raw);
}

export function readSolPayConfig(): SolPayConfig | null {
  const cluster = readCluster();
  const treasury = process.env.SOL_TREASURY_ADDRESS;
  if (!treasury || !isSolanaAddress(treasury)) return null;
  return {
    cluster,
    rpcUrl: process.env.SOL_PAY_RPC || DEFAULT_RPC[cluster],
    treasury,
    commitment: process.env.SOL_PAY_COMMITMENT === 'finalized' ? 'finalized' : 'confirmed',
    expiryMs: Math.max(5, Number(process.env.SOL_PAY_EXPIRY_MINUTES) || 60) * 60_000,
  };
}

export function isSolPayConfigured(): boolean {
  return readSolPayConfig() !== null;
}

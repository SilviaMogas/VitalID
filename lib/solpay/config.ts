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

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/**
 * Production must name its cluster explicitly: an unset value or a test
 * cluster (free faucet SOL) disables Solana Pay unless
 * SOL_PAY_ALLOW_TEST_CLUSTER=1 is set deliberately.
 */
function readCluster(): SolCluster | null {
  const raw = process.env.SOL_PAY_CLUSTER?.trim().toLowerCase();
  const production = isProductionEnv();
  if (!raw) return production ? null : 'devnet';
  if (raw === 'mainnet-beta' || raw === 'mainnet') return 'mainnet-beta';
  if (raw === 'testnet' || raw === 'devnet') {
    return production && process.env.SOL_PAY_ALLOW_TEST_CLUSTER !== '1' ? null : raw;
  }
  throw new Error(`SOL_PAY_CLUSTER must be mainnet-beta, testnet or devnet (got "${raw}")`);
}

export function solPayLamports(plan: 'plus' | 'pro', interval: BillingInterval): bigint {
  const envKey = `SOL_PAY_LAMPORTS_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return DEFAULT_LAMPORTS[plan][interval];
  if (!/^\d+$/.test(raw)) throw new Error(`${envKey} must be a lamports integer`);
  const lamports = BigInt(raw);
  // Zero would let a dust transfer activate the plan; values above
  // Number.MAX_SAFE_INTEGER would lose precision in the int8 column.
  if (lamports <= BigInt(0)) throw new Error(`${envKey} must be positive`);
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${envKey} exceeds the safe integer range`);
  }
  return lamports;
}

export function readSolPayConfig(): SolPayConfig | null {
  const cluster = readCluster();
  if (!cluster) return null;
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

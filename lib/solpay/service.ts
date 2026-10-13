import 'server-only';
import { generateKeyPairSync } from 'node:crypto';
import type { BillingInterval } from '@/lib/plans';
import { getMembershipStore } from '@/lib/membership/store';
import { SOL_SESSION_PREFIX } from '@/lib/membership/sol';
import { base58Encode } from './base58';
import { readSolPayConfig, solPayLamports, type SolPayConfig } from './config';
import { createRpc, getParsedTransaction, getSignaturesForAddress, type ParsedTransaction, type SolanaRpc } from './rpc';
import { getSolPaymentStore, type SolPayment } from './store';

export const SOL_PAY_LABEL = 'Vital ID';
export const SOL_PAY_MESSAGE = 'Vital ID membership';

export interface SolPaymentRequest {
  reference: string;
  url: string;
  lamports: string;
  sol: string;
  cluster: string;
  treasury: string;
  expiresAt: string;
}

export type SolPaymentState =
  | { state: 'pending' | 'paid' | 'expired' | 'missing' | 'forbidden' }
  | { state: 'underpaid'; paidLamports: string };

export function lamportsToSol(lamports: bigint): string {
  const whole = lamports / BigInt(1000000000);
  const frac = (lamports % BigInt(1000000000)).toString().padStart(9, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/** Raw Ed25519 public key bytes from a generated Node keypair (DER tail). */
function newReference(): string {
  const { publicKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  return base58Encode(der.subarray(der.length - 32));
}

export function buildSolanaPayUrl(config: SolPayConfig, lamports: bigint, reference: string): string {
  const params = new URLSearchParams({
    amount: lamportsToSol(lamports),
    reference,
    label: SOL_PAY_LABEL,
    message: SOL_PAY_MESSAGE,
  });
  return `solana:${config.treasury}?${params.toString()}`;
}

export async function createSolPayment(
  userKey: string,
  plan: 'plus' | 'pro',
  interval: BillingInterval,
): Promise<SolPaymentRequest> {
  const config = readSolPayConfig();
  if (!config) throw new Error('solpay_not_configured');
  const lamports = solPayLamports(plan, interval);
  const reference = newReference();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.expiryMs);
  const payment: SolPayment = {
    reference,
    userKey,
    plan,
    interval,
    lamports: lamports.toString(),
    treasury: config.treasury,
    cluster: config.cluster,
    status: 'pending',
    signature: null,
    payer: null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    confirmedAt: null,
  };
  await getSolPaymentStore().create(payment);
  return {
    reference,
    url: buildSolanaPayUrl(config, lamports, reference),
    lamports: lamports.toString(),
    sol: lamportsToSol(lamports),
    cluster: config.cluster,
    treasury: config.treasury,
    expiresAt: expiresAt.toISOString(),
  };
}

interface ExtractedPayment {
  lamports: bigint;
  payer: string | null;
}

function accountPubkey(key: { pubkey: string; signer?: boolean } | string): string {
  return typeof key === 'string' ? key : key.pubkey;
}

function transferLamports(
  instructions: { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } }[],
  treasury: string,
): bigint {
  let total = BigInt(0);
  for (const ix of instructions) {
    if (ix.program !== 'system' || ix.parsed?.type !== 'transfer') continue;
    const info = ix.parsed.info ?? {};
    if (info.destination !== treasury) continue;
    const raw = info.lamports;
    if (typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0) total += BigInt(raw);
  }
  return total;
}

/** Sums confirmed system transfers to the treasury inside one transaction. */
export function extractPayment(
  tx: ParsedTransaction,
  treasury: string,
  reference: string,
): ExtractedPayment | null {
  if (!tx.meta || tx.meta.err !== null) return null;
  const accountKeys = tx.transaction?.message?.accountKeys ?? [];
  if (!accountKeys.some((key) => accountPubkey(key) === reference)) return null;
  const message = tx.transaction.message;
  let lamports = transferLamports(message.instructions, treasury);
  for (const inner of tx.meta.innerInstructions ?? []) {
    lamports += transferLamports(inner.instructions, treasury);
  }
  if (lamports <= BigInt(0)) return null;
  const signer = accountKeys.find((key) => typeof key !== 'string' && key.signer);
  const payer = signer ? accountPubkey(signer) : accountKeys.length ? accountPubkey(accountKeys[0]) : null;
  return { lamports, payer };
}

function periodEndFor(interval: BillingInterval, from = new Date()): string {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + (interval === 'annual' ? 365 : 30));
  return end.toISOString();
}

async function activate(payment: SolPayment, signature: string, payer: string | null) {
  await getMembershipStore().activatePlan({
    userKey: payment.userKey,
    plan: payment.plan,
    stripeCheckoutSessionId: `${SOL_SESSION_PREFIX}${signature}`,
    stripePaymentIntentId: payer,
    subscriptionStatus: 'sol_one_time',
    subscriptionPeriodEnd: periodEndFor(payment.interval),
  });
}

/**
 * Checks the chain for a settlement of `reference` owned by `userKey` and,
 * on a valid transfer, claims it and activates the plan. Safe to poll.
 */
export async function confirmSolPayment(
  reference: string,
  userKey: string,
  rpc?: SolanaRpc,
): Promise<SolPaymentState> {
  const store = getSolPaymentStore();
  const payment = await store.get(reference);
  if (!payment) return { state: 'missing' };
  if (payment.userKey !== userKey) return { state: 'forbidden' };
  if (payment.status === 'paid') {
    // The signature was claimed already, but a previous poll may have failed
    // before activatePlan ran — retry it. activatePlan is idempotent on the
    // checkout-session id, so this is a no-op once activation has landed.
    if (payment.signature) await activate(payment, payment.signature, payment.payer);
    return { state: 'paid' };
  }
  if (Date.parse(payment.expiresAt) <= Date.now()) return { state: 'expired' };

  const config = readSolPayConfig();
  if (!config || config.treasury !== payment.treasury) return { state: 'missing' };
  const client = rpc ?? createRpc(config.rpcUrl);
  const expected = BigInt(payment.lamports);

  let underpaid: string | null = null;
  const signatures = await getSignaturesForAddress(client, reference, 10);
  for (const { signature, err } of signatures) {
    if (err) continue;
    const tx = await getParsedTransaction(client, signature, config.commitment);
    if (!tx) continue;
    const extracted = extractPayment(tx, payment.treasury, reference);
    if (!extracted) continue;
    if (extracted.lamports < expected) {
      underpaid = extracted.lamports.toString();
      continue;
    }
    const claim = await store.claimSignature(reference, signature, extracted.payer);
    if (claim === 'claimed') {
      await activate(payment, signature, extracted.payer);
      return { state: 'paid' };
    }
    if (claim === 'already-paid') {
      // Claimed by an earlier poll — retry activation in case it never ran.
      const claimed = await store.get(reference);
      if (claimed?.signature) await activate(claimed, claimed.signature, claimed.payer);
      return { state: 'paid' };
    }
    // 'signature-used': this signature settled a different request — keep scanning.
  }
  return underpaid !== null ? { state: 'underpaid', paidLamports: underpaid } : { state: 'pending' };
}

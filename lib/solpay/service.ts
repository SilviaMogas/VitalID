import 'server-only';
import { generateKeyPairSync } from 'node:crypto';
import type { BillingInterval } from '@/lib/plans';
import { base58Encode } from './base58';
import { readSolPayConfig, solPayLamports, type SolPayConfig } from './config';
import {
  createRpc,
  getParsedTransaction,
  getSignaturesForAddress,
  type ParsedTransaction,
  type SignatureInfo,
  type SolanaRpc,
} from './rpc';
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
    appliedAt: null,
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

// Anyone can add a reference to cheap transactions, so the newest page of
// signatures is not trusted to contain the payment: page back to the request
// creation and check the oldest successful candidates first.
const SIGNATURE_PAGE_SIZE = 1000;
const MAX_SIGNATURE_PAGES = 10;
const MAX_TRANSACTION_LOOKUPS = 25;
const BLOCK_TIME_SKEW_SECONDS = 300;

/** Successful signatures for `reference` since `notBefore` (unix s), oldest first. */
async function candidateSignatures(client: SolanaRpc, reference: string, notBefore: number): Promise<SignatureInfo[]> {
  const found: SignatureInfo[] = [];
  let before: string | undefined;
  for (let page = 0; page < MAX_SIGNATURE_PAGES; page += 1) {
    const batch = await getSignaturesForAddress(client, reference, SIGNATURE_PAGE_SIZE, before);
    let reachedStart = false;
    for (const info of batch) {
      if (typeof info.blockTime === 'number' && info.blockTime < notBefore) {
        reachedStart = true;
        break;
      }
      if (!info.err) found.push(info);
    }
    if (reachedStart || batch.length < SIGNATURE_PAGE_SIZE) break;
    before = batch[batch.length - 1].signature;
  }
  return found.reverse();
}

/**
 * Checks the chain for a settlement of `reference` owned by `userKey` and,
 * on a valid transfer, claims it and activates the plan. Safe to poll.
 * After `expiresAt` only transfers whose block time precedes it still count.
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
    // Applied payments are final: never extend the membership again, however
    // the membership row has changed since (reset, other references polled).
    if (payment.appliedAt) return { state: 'paid' };
    // Claimed but a previous poll failed before applying — retry. The store
    // dedupes on the payment row's applied_at, atomically with the extension.
    if (payment.signature) await store.applyPayment(reference);
    return { state: 'paid' };
  }
  const expiresAtSeconds = Math.floor(Date.parse(payment.expiresAt) / 1000);
  const expired = Date.parse(payment.expiresAt) <= Date.now();

  const config = readSolPayConfig();
  if (!config || config.treasury !== payment.treasury) return { state: expired ? 'expired' : 'missing' };
  const client = rpc ?? createRpc(config.rpcUrl);
  const expected = BigInt(payment.lamports);
  const notBefore = Math.floor(Date.parse(payment.createdAt) / 1000) - BLOCK_TIME_SKEW_SECONDS;

  let underpaid: string | null = null;
  const signatures = await candidateSignatures(client, reference, notBefore);
  let lookups = 0;
  for (const { signature, blockTime: signatureBlockTime } of signatures) {
    if (lookups >= MAX_TRANSACTION_LOOKUPS) break;
    if (typeof signatureBlockTime === 'number' && signatureBlockTime > expiresAtSeconds) continue;
    lookups += 1;
    const tx = await getParsedTransaction(client, signature, config.commitment);
    if (!tx) continue;
    const blockTime = typeof tx.blockTime === 'number' ? tx.blockTime : signatureBlockTime;
    if (typeof blockTime === 'number' ? blockTime < notBefore || blockTime > expiresAtSeconds : expired) continue;
    const extracted = extractPayment(tx, payment.treasury, reference);
    if (!extracted) continue;
    if (extracted.lamports < expected) {
      underpaid = extracted.lamports.toString();
      continue;
    }
    const claim = await store.claimSignature(reference, signature, extracted.payer);
    if (claim === 'claimed' || claim === 'already-paid') {
      // 'already-paid': claimed by an earlier poll — applyPayment is a no-op
      // if that poll already applied it.
      await store.applyPayment(reference);
      return { state: 'paid' };
    }
    // 'signature-used': this signature settled a different request — keep scanning.
  }
  if (expired) return { state: 'expired' };
  return underpaid !== null ? { state: 'underpaid', paidLamports: underpaid } : { state: 'pending' };
}

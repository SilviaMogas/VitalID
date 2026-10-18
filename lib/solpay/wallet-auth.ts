import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base58Decode } from './base58';
import { readServerSupabaseEnv } from '@/lib/supabase/env';
import { getWalletNonceStore } from '@/lib/auth/wallet-nonce';
import { walletEmail as syntheticWalletEmail, type WalletChain } from '@/lib/auth/wallet-identity';

/**
 * Sign-in with a Solana wallet (Solflare, Phantom, …): the server issues a
 * nonce-bound message, the wallet signs it with the account's Ed25519 key and
 * the server verifies the signature — proof of key ownership, no password.
 *
 * The nonce is stateless: `${ts}.${rand}.${hmac}` so it survives serverless
 * instances; freshness is enforced by TTL. A replayed signature can only
 * recreate a session for the same wallet it was already issued to.
 */

const NONCE_TTL_MS = 5 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2048;
const MAX_SIGNATURE_LENGTH = 128;

export function solWalletSecret(): string {
  const secret = process.env.SOL_WALLET_SECRET ?? readServerSupabaseEnv()?.secretKey;
  if (!secret) throw new Error('SOL_WALLET_SECRET is not configured.');
  return secret;
}

function mac(text: string): string {
  return createHmac('sha256', solWalletSecret()).update(text).digest('hex').slice(0, 32);
}

/** Deterministic password for the synthetic wallet user — never guessable
 *  without the server secret, yet reproducible for every later sign-in. */
export function walletPassword(publicKey: string): string {
  return createHmac('sha256', solWalletSecret()).update(`solana:${publicKey}`).digest('hex');
}

export function walletEmail(publicKey: string, chain: WalletChain = 'solana'): string {
  return syntheticWalletEmail(publicKey, chain);
}

export function walletPasswordForChain(address: string, chain: WalletChain): string {
  if (chain === 'solana') return walletPassword(address);
  return createHmac('sha256', solWalletSecret()).update(`ethereum:${address.toLowerCase()}`).digest('hex');
}

export function isSolanaPublicKey(value: string): boolean {
  // 32 bytes base58-encode to 32–44 chars — reject anything else before
  // decoding so oversized inputs never reach the BigInt codec.
  if (value.length < 32 || value.length > 44) return false;
  try {
    return base58Decode(value).length === 32;
  } catch {
    return false;
  }
}

export function issueMessage(publicKey: string, host: string): string {
  const issued = new Date();
  const body = `${issued.getTime()}.${randomBytes(8).toString('hex')}`;
  return `${host} wants you to sign in with your Solana account:
${publicKey}

URI: https://${host}
Nonce: ${body}.${mac(body)}
Issued At: ${issued.toISOString()}`;
}

export type WalletVerify = 'ok' | 'bad_message' | 'expired' | 'bad_signature' | 'unavailable';

function nonceTimestamp(nonce: string): number | null {
  const match = /^(\d{13})\.([a-f0-9]{16})\.([a-f0-9]{32})$/.exec(nonce);
  if (!match) return null;
  const [, timestamp, random, tag] = match;
  const body = `${timestamp}.${random}`;
  const expected = Buffer.from(mac(body), 'utf8');
  const given = Buffer.from(tag, 'utf8');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(timestamp);
}

export async function verifyWalletMessage(
  publicKey: string,
  signature: string,
  message: string,
  host: string,
): Promise<WalletVerify> {
  if (!isSolanaPublicKey(publicKey) || message.length > MAX_MESSAGE_LENGTH) return 'bad_message';
  if (signature.length > MAX_SIGNATURE_LENGTH) return 'bad_signature';
  const lines = message.split('\n');
  if (
    lines.length !== 6 ||
    lines[0] !== `${host} wants you to sign in with your Solana account:` ||
    lines[1] !== publicKey ||
    lines[2] !== '' ||
    lines[3] !== `URI: https://${host}` ||
    !/^Nonce: \d{13}\.[a-f0-9]{16}\.[a-f0-9]{32}$/.test(lines[4]) ||
    !/^Issued At: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(lines[5])
  ) {
    return 'bad_message';
  }
  const nonce = lines[4].slice('Nonce: '.length);
  const timestamp = nonceTimestamp(nonce);
  const issuedAt = lines[5].slice('Issued At: '.length);
  if (timestamp === null || new Date(timestamp).toISOString() !== issuedAt) return 'bad_message';
  if (Math.abs(Date.now() - timestamp) > NONCE_TTL_MS) return 'expired';
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base58Decode(signature);
    if (signatureBytes.length !== 64) return 'bad_signature';
  } catch {
    return 'bad_signature';
  }
  let ok = false;
  try {
    const key = await crypto.subtle.importKey('raw', base58Decode(publicKey) as BufferSource, 'Ed25519', false, ['verify']);
    ok = await crypto.subtle.verify('Ed25519', key, signatureBytes as BufferSource, new TextEncoder().encode(message));
  } catch {
    return 'bad_signature';
  }
  if (!ok) return 'bad_signature';
  // Single-use: burn the nonce only once the signature checked out, so a
  // replay of the same verified request is refused while failures — or a
  // corrupted forgery burning someone else's nonce — never consume it.
  try {
    if (!(await getWalletNonceStore().claim(nonce))) return 'expired';
  } catch {
    return 'unavailable';
  }
  return 'ok';
}

import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base58Decode } from './base58';
import { readServerSupabaseEnv } from '@/lib/supabase/env';
import { getWalletNonceStore } from '@/lib/auth/wallet-nonce';

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
const NONCE_RE = /^Nonce: (\S+)/m;

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

export function walletEmail(publicKey: string): string {
  return `sol.${publicKey}@wallet.vitalid.site`;
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

export type WalletVerify = 'ok' | 'bad_message' | 'expired' | 'bad_signature';

function freshNonce(nonce: string): boolean {
  const lastDot = nonce.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const body = nonce.slice(0, lastDot);
  const tag = nonce.slice(lastDot + 1);
  const expected = Buffer.from(mac(body), 'utf8');
  const given = Buffer.from(tag, 'utf8');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const ts = Number(body.slice(0, body.indexOf('.')));
  return Number.isFinite(ts) && Math.abs(Date.now() - ts) <= NONCE_TTL_MS;
}

export async function verifyWalletMessage(
  publicKey: string,
  signature: string,
  message: string,
  host: string,
): Promise<WalletVerify> {
  if (!isSolanaPublicKey(publicKey)) return 'bad_message';
  // The message must be one we issued: nonce HMAC valid and fresh, and it must
  // name this key and host — otherwise a signature for another site/key works.
  const nonce = message.match(NONCE_RE)?.[1];
  if (!nonce || !message.includes(`\n${publicKey}\n`) || !message.startsWith(`${host} wants you to sign in`)) {
    return 'bad_message';
  }
  if (!freshNonce(nonce)) return 'expired';
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base58Decode(signature);
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
  if (!(await getWalletNonceStore().claim(nonce))) return 'expired';
  return 'ok';
}

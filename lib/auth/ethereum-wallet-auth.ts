import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getAddress, isAddress, verifyMessage } from 'ethers';
import { getWalletNonceStore } from '@/lib/auth/wallet-nonce';
import type { WalletVerify } from '@/lib/solpay/wallet-auth';
import { solWalletSecret } from '@/lib/solpay/wallet-auth';

const NONCE_TTL_MS = 5 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2048;
const MAX_SIGNATURE_LENGTH = 256;
const NONCE_RE = /^[a-f0-9]{96}$/;

function normalizedAddress(address: string): string {
  return getAddress(address);
}

function nonceMac(
  nonce: string,
  address: string,
  chainId: number,
  domain: string,
  uri: string,
  issuedAt: string,
  expirationTime: string,
): string {
  const payload = [
    'vitalid-ethereum-siwe-v1',
    nonce,
    address.toLowerCase(),
    String(chainId),
    domain,
    uri,
    issuedAt,
    expirationTime,
  ].join('\n');
  return createHmac('sha256', solWalletSecret()).update(payload).digest('hex');
}

export function isEthereumAddress(value: string): boolean {
  return value.length === 42 && isAddress(value);
}

export function issueEthereumMessage(address: string, chainId: number, origin: URL): string {
  const account = normalizedAddress(address);
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + NONCE_TTL_MS);
  const issued = issuedAt.toISOString();
  const expires = expirationTime.toISOString();
  const randomNonce = randomBytes(16).toString('hex');
  const mac = nonceMac(randomNonce, account, chainId, origin.host, origin.origin, issued, expires);
  const nonce = `${randomNonce}${mac}`;
  return `${origin.host} wants you to sign in with your Ethereum account:
${account}

URI: ${origin.origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issued}
Expiration Time: ${expires}`;
}

function parseMessage(
  address: string,
  chainId: number,
  message: string,
  origin: URL,
): { nonce: string; issuedAt: string; expirationTime: string } | null {
  const lines = message.split('\n');
  if (
    lines.length !== 9 ||
    lines[0] !== `${origin.host} wants you to sign in with your Ethereum account:` ||
    lines[1] !== normalizedAddress(address) ||
    lines[2] !== '' ||
    lines[3] !== `URI: ${origin.origin}` ||
    lines[4] !== 'Version: 1' ||
    lines[5] !== `Chain ID: ${chainId}` ||
    !/^Nonce: [a-f0-9]{96}$/.test(lines[6]) ||
    !/^Issued At: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(lines[7]) ||
    !/^Expiration Time: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(lines[8])
  ) {
    return null;
  }
  const nonce = lines[6].slice('Nonce: '.length);
  const issuedAt = lines[7].slice('Issued At: '.length);
  const expirationTime = lines[8].slice('Expiration Time: '.length);
  const issued = Date.parse(issuedAt);
  const expires = Date.parse(expirationTime);
  if (
    !NONCE_RE.test(nonce) ||
    new Date(issued).toISOString() !== issuedAt ||
    new Date(expires).toISOString() !== expirationTime ||
    expires - issued !== NONCE_TTL_MS
  ) {
    return null;
  }
  const expected = nonceMac(
    nonce.slice(0, 32),
    normalizedAddress(address),
    chainId,
    origin.host,
    origin.origin,
    issuedAt,
    expirationTime,
  );
  const given = nonce.slice(32);
  const expectedBytes = Buffer.from(expected, 'hex');
  const givenBytes = Buffer.from(given, 'hex');
  if (expectedBytes.length !== givenBytes.length || !timingSafeEqual(expectedBytes, givenBytes)) {
    return null;
  }
  return { nonce, issuedAt, expirationTime };
}

export async function verifyEthereumMessage(
  address: string,
  chainId: number,
  signature: string,
  message: string,
  origin: URL,
): Promise<WalletVerify> {
  if (
    !isEthereumAddress(address) ||
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return 'bad_message';
  }
  if (!signature || signature.length > MAX_SIGNATURE_LENGTH) return 'bad_signature';
  let account: string;
  try {
    account = normalizedAddress(address);
  } catch {
    return 'bad_message';
  }
  let parsed: ReturnType<typeof parseMessage>;
  try {
    parsed = parseMessage(account, chainId, message, origin);
  } catch {
    return 'bad_message';
  }
  if (!parsed) return 'bad_message';
  const issued = Date.parse(parsed.issuedAt);
  const expires = Date.parse(parsed.expirationTime);
  if (issued > Date.now() || expires <= Date.now() || Date.now() - issued > NONCE_TTL_MS) {
    return 'expired';
  }
  let signer: string;
  try {
    signer = verifyMessage(message, signature);
  } catch {
    return 'bad_signature';
  }
  if (signer.toLowerCase() !== account.toLowerCase()) return 'bad_signature';
  try {
    if (!(await getWalletNonceStore().claim(parsed.nonce))) return 'expired';
  } catch {
    return 'unavailable';
  }
  return 'ok';
}

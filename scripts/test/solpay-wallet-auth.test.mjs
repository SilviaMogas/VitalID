// Wallet sign-in: message issuance, nonce freshness and Ed25519 verification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.SOL_WALLET_SECRET = 'test-wallet-secret';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SECRET_KEY = '';

const { issueMessage, verifyWalletMessage, isSolanaPublicKey, walletEmail, walletPassword } =
  await import('../../lib/solpay/wallet-auth.ts');
const { base58Encode } = await import('../../lib/solpay/base58.ts');

const HOST = 'vitalid.site';

async function makeWallet() {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { pair, publicKey: base58Encode(raw) };
}

async function sign(wallet, message) {
  const sig = await crypto.subtle.sign('Ed25519', wallet.pair.privateKey, new TextEncoder().encode(message));
  return base58Encode(new Uint8Array(sig));
}

test('a wallet signature on an issued message verifies', async () => {
  const w = await makeWallet();
  const message = issueMessage(w.publicKey, HOST);
  assert.equal(await verifyWalletMessage(w.publicKey, await sign(w, message), message, HOST), 'ok');
});

test('a wrong or tampered signature is rejected', async () => {
  const w = await makeWallet();
  const message = issueMessage(w.publicKey, HOST);
  const other = await makeWallet();
  const foreignSig = await sign(other, message);
  assert.equal(await verifyWalletMessage(w.publicKey, foreignSig, message, HOST), 'bad_signature');
  assert.equal(await verifyWalletMessage(w.publicKey, 'not-base58!!', message, HOST), 'bad_signature');
});

test('a message for a different key or host cannot be reused', async () => {
  const w = await makeWallet();
  const other = await makeWallet();
  const message = issueMessage(other.publicKey, HOST);
  const sig = await sign(other, message);
  // Signed for `other` — claiming to be `w` fails the embedded-key check.
  assert.equal(await verifyWalletMessage(w.publicKey, sig, message, HOST), 'bad_message');
  // Same key + sig but presented under a different host.
  const msg2 = issueMessage(w.publicKey, 'evil.example');
  const sig2 = await sign(w, msg2);
  assert.equal(await verifyWalletMessage(w.publicKey, sig2, msg2, HOST), 'bad_message');
});

test('stale or forged nonces are rejected', async () => {
  const w = await makeWallet();
  const body = '1577836800000.0123456789abcdef';
  const tag = createHmac('sha256', process.env.SOL_WALLET_SECRET).update(body).digest('hex').slice(0, 32);
  const stale = `${HOST} wants you to sign in with your Solana account:
${w.publicKey}

URI: https://${HOST}
Nonce: ${body}.${tag}
Issued At: 2020-01-01T00:00:00.000Z`;
  assert.equal(await verifyWalletMessage(w.publicKey, await sign(w, stale), stale, HOST), 'expired');
  const forged = stale.replace(/Nonce: .*/, `Nonce: ${body}.deadbeef`);
  assert.equal(await verifyWalletMessage(w.publicKey, await sign(w, forged), forged, HOST), 'bad_message');
  // A real message with the nonce line stripped never reaches signature check.
  const stripped = issueMessage(w.publicKey, HOST).replace(/Nonce: .*\n/, '');
  assert.equal(
    await verifyWalletMessage(w.publicKey, await sign(w, stripped), stripped, HOST),
    'bad_message',
  );
});

test('a verified request cannot be replayed with the same nonce', async () => {
  const w = await makeWallet();
  const message = issueMessage(w.publicKey, HOST);
  const sig = await sign(w, message);
  assert.equal(await verifyWalletMessage(w.publicKey, sig, message, HOST), 'ok');
  // Identical replay within the TTL window is refused.
  assert.equal(await verifyWalletMessage(w.publicKey, sig, message, HOST), 'expired');
});

test('a failed signature never burns the nonce', async () => {
  const w = await makeWallet();
  const message = issueMessage(w.publicKey, HOST);
  assert.equal(await verifyWalletMessage(w.publicKey, 'not-base58!!', message, HOST), 'bad_signature');
  assert.equal(await verifyWalletMessage(w.publicKey, await sign(w, message), message, HOST), 'ok');
});

test('public key validation and derived credentials', async () => {
  const w = await makeWallet();
  assert.equal(isSolanaPublicKey(w.publicKey), true);
  assert.equal(isSolanaPublicKey('0'.repeat(33)), false);
  assert.equal(isSolanaPublicKey('notakey'), false);
  assert.match(walletEmail(w.publicKey), /^sol\..+@wallet\.vitalid\.site$/);
  assert.equal(walletPassword(w.publicKey).length, 64);
  assert.notEqual(walletPassword(w.publicKey), walletPassword((await makeWallet()).publicKey));
});

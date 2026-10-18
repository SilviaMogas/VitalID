import { register } from 'node:module';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { createHmac, webcrypto } from 'node:crypto';

register('./wallet-auth-loader.mjs', import.meta.url);

process.env.SUPABASE_URL = 'https://supabase.wallet.test';
process.env.SUPABASE_SECRET_KEY = 'synthetic-wallet-service-key';
process.env.SOL_WALLET_SECRET = 'wallet-test-secret';
process.env.WALLET_NONCE_STORE = 'memory';
process.env.NODE_ENV = 'test';
globalThis.crypto ??= webcrypto;

const users = new Map();
let nextUser = 1;
const cookieJar = () => (globalThis.__walletCookies ??= {});

function makeUser(input) {
  return {
    id: `wallet-user-${nextUser++}`,
    email: input.email.toLowerCase(),
    app_metadata: input.app_metadata ?? {},
    user_metadata: input.user_metadata ?? {},
  };
}

const admin = {
  async createUser(input) {
    const key = input.email.toLowerCase();
    if (users.has(key)) return { data: { user: null }, error: { code: 'email_exists', message: 'already exists' } };
    const user = makeUser(input);
    users.set(key, { user, password: input.password });
    return { data: { user }, error: null };
  },
  async generateLink({ email }) {
    const record = users.get(email.toLowerCase());
    return { data: { user: record?.user ?? null }, error: null };
  },
  async getUserById(id) {
    const record = [...users.values()].find((value) => value.user.id === id);
    return { data: { user: record?.user ?? null }, error: null };
  },
  async updateUserById(id, changes) {
    const record = [...users.values()].find((value) => value.user.id === id);
    if (!record) return { data: { user: null }, error: { message: 'missing user' } };
    if ('password' in changes) record.password = changes.password;
    if ('app_metadata' in changes) record.user.app_metadata = changes.app_metadata;
    if ('user_metadata' in changes) record.user.user_metadata = changes.user_metadata;
    return { data: { user: record.user }, error: null };
  },
};

globalThis.__walletSupabase = { auth: { admin } };
globalThis.__walletAuthClient = {
  auth: {
    async signInWithPassword({ email, password }) {
      const record = users.get(email.toLowerCase());
      if (!record || record.password !== password) {
        return { data: { session: null, user: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } };
      }
      const token = `access-${record.user.id}`;
      return {
        data: {
          user: record.user,
          session: { access_token: token, refresh_token: `refresh-${record.user.id}` },
        },
        error: null,
      };
    },
  },
};

let consentRows;
let failConsentRecord = false;
globalThis.__vitalIdConsentStore = {
  backend: 'supabase',
  store: {
    async latest(id) { return consentRows.get(id) ?? null; },
    async record(id, type, policyVersion) {
      if (failConsentRecord) throw new Error('consent table unavailable');
      const current = consentRows.get(id) ?? {};
      const record = { type, policyVersion, consentedAt: new Date().toISOString() };
      consentRows.set(id, { ...current, [type]: record });
      return record;
    },
  },
};

const { issueMessage, verifyWalletMessage, isSolanaPublicKey } =
  await import('../../lib/solpay/wallet-auth.ts');
const { base58Encode } = await import('../../lib/solpay/base58.ts');
const { issueEthereumMessage, verifyEthereumMessage } =
  await import('../../lib/auth/ethereum-wallet-auth.ts');
const { signInWithWallet, signUpWithPassword } = await import('../../lib/auth/server.ts');
const ethMessageRoute = await import('../../app/api/auth/eth/message/route.ts');
const ethVerifyRoute = await import('../../app/api/auth/eth/verify/route.ts');

const ORIGIN = new URL('https://vitalid.example');
const HOST = ORIGIN.host;
const CONSENTS = { consentTerms: true, consentHealthData: true };

beforeEach(() => {
  process.env.SOL_WALLET_SECRET = 'wallet-test-secret';
  users.clear();
  nextUser = 1;
  consentRows = new Map();
  failConsentRecord = false;
  for (const name of Object.keys(cookieJar())) delete cookieJar()[name];
});

async function makeSolanaWallet() {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const publicKey = base58Encode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  return { pair, publicKey };
}

async function signSolana(wallet, message) {
  const signature = await crypto.subtle.sign('Ed25519', wallet.pair.privateKey, new TextEncoder().encode(message));
  return base58Encode(new Uint8Array(signature));
}

function request(url, body, origin) {
  const headers = { 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  return new Request(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

test('Ethereum personal_sign verifies canonical messages and rejects replay, signer, chain and origin tampering', async () => {
  const wallet = Wallet.createRandom();
  const message = issueEthereumMessage(wallet.address, 1, ORIGIN);
  const signature = await wallet.signMessage(message);
  assert.equal(await verifyEthereumMessage(wallet.address, 1, signature, message, ORIGIN), 'ok');
  assert.equal(await verifyEthereumMessage(wallet.address, 1, signature, message, ORIGIN), 'expired');

  const second = Wallet.createRandom();
  const otherMessage = issueEthereumMessage(second.address, 1, ORIGIN);
  assert.equal(await verifyEthereumMessage(wallet.address, 1, await second.signMessage(otherMessage), otherMessage, ORIGIN), 'bad_message');
  const wrongSigner = Wallet.createRandom();
  const wrongSignature = await wrongSigner.signMessage(message);
  assert.equal(await verifyEthereumMessage(wallet.address, 1, wrongSignature, message, ORIGIN), 'bad_signature');

  const originMessage = issueEthereumMessage(wallet.address, 1, ORIGIN);
  const originSignature = await wallet.signMessage(originMessage);
  assert.equal(await verifyEthereumMessage(wallet.address, 1, originSignature, originMessage, new URL('https://evil.example')), 'bad_message');
  assert.equal(await verifyEthereumMessage(wallet.address, 137, originSignature, originMessage, ORIGIN), 'bad_message');
  assert.equal(await verifyEthereumMessage(wallet.address, 1, `0x${'00'.repeat(65)}`, originMessage, ORIGIN), 'bad_signature');
});

test('Solana signatures require the exact canonical message and bounded payloads', async () => {
  const wallet = await makeSolanaWallet();
  const message = issueMessage(wallet.publicKey, HOST);
  const signature = await signSolana(wallet, message);
  assert.equal(await verifyWalletMessage(wallet.publicKey, signature, message, HOST), 'ok');

  const changed = `${message}\nStatement: different`;
  assert.equal(await verifyWalletMessage(wallet.publicKey, await signSolana(wallet, changed), changed, HOST), 'bad_message');
  assert.equal(await verifyWalletMessage(wallet.publicKey, signature, message.replace(HOST, 'evil.example'), HOST), 'bad_message');
  assert.equal(await verifyWalletMessage(wallet.publicKey, signature, `${message}${'x'.repeat(3000)}`, HOST), 'bad_message');
  assert.equal(await verifyWalletMessage(wallet.publicKey, `${signature}${'x'.repeat(200)}`, message, HOST), 'bad_signature');
  assert.equal(await verifyWalletMessage(wallet.publicKey, signature, message, HOST), 'expired');
});

test('wallet account bindings prevent case-fold collisions and permit verified legacy secret rotation', async () => {
  const wallet = await makeSolanaWallet();
  const original = await signInWithWallet(wallet.publicKey, CONSENTS);
  assert.equal(original.ok, true);
  assert.deepEqual(original.user.wallet, { chain: 'solana', address: wallet.publicKey });
  const stored = users.get(`sol.${wallet.publicKey.toLowerCase()}@wallet.vitalid.site`);
  assert.deepEqual(stored.user.app_metadata.vitalid_wallet, { chain: 'solana', address: wallet.publicKey });

  let alternate = '';
  for (let index = 5; index < wallet.publicKey.length && !alternate; index += 1) {
    const current = wallet.publicKey[index];
    if (!/[a-zA-Z]/.test(current)) continue;
    const candidate = [...wallet.publicKey];
    candidate[index] = current === current.toLowerCase() ? current.toUpperCase() : current.toLowerCase();
    const value = candidate.join('');
    if (isSolanaPublicKey(value)) alternate = value;
  }
  assert.ok(alternate, 'a case-fold-colliding valid Solana key should exist');
  const originalPassword = stored.password;
  const collision = await signInWithWallet(alternate, CONSENTS);
  assert.equal(collision.ok, false);
  assert.equal(stored.password, originalPassword);
  assert.equal(users.size, 1);

  stored.user.app_metadata = {};
  stored.user.user_metadata = { solana_wallet: wallet.publicKey };
  process.env.SOL_WALLET_SECRET = 'wallet-test-secret-rotated';
  const rotated = await signInWithWallet(wallet.publicKey, CONSENTS);
  assert.equal(rotated.ok, true);
  assert.deepEqual(rotated.user.wallet, { chain: 'solana', address: wallet.publicKey });
  assert.notEqual(stored.password, originalPassword);
  process.env.SOL_WALLET_SECRET = 'wallet-test-secret';
});

test('password signup cannot claim the reserved wallet email domain', async () => {
  const result = await signUpWithPassword({
    email: 'sol.fake@wallet.vitalid.site',
    password: 'safe-test-password',
    firstName: 'Test',
    lastName: 'User',
    country: 'AE',
    city: 'Dubai',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'reserved_email');
  assert.equal(users.size, 0);
});

test('Ethereum message endpoint rejects malformed payloads and foreign origins without caching', async () => {
  const malformed = await ethMessageRoute.POST(request('https://vitalid.example/api/auth/eth/message', '[]'));
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get('cache-control'), 'no-store');
  const foreign = await ethMessageRoute.POST(
    request('https://vitalid.example/api/auth/eth/message', { address: Wallet.createRandom().address, chainId: 1 }, 'https://evil.example'),
  );
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get('cache-control'), 'no-store');
});

test('Ethereum consent audit failure clears the newly created session and fails closed', async () => {
  const wallet = Wallet.createRandom();
  const message = issueEthereumMessage(wallet.address, 1, ORIGIN);
  const signature = await wallet.signMessage(message);
  failConsentRecord = true;
  const response = await ethVerifyRoute.POST(request(
    'https://vitalid.example/api/auth/eth/verify',
    { address: wallet.address, chainId: 1, signature, message, ...CONSENTS },
  ));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'consent_audit_failed');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(cookieJar(), {});
});

test('EIP-4361 nonce MAC is bound to all request fields', () => {
  const wallet = Wallet.createRandom();
  const issuedMessage = issueEthereumMessage(wallet.address, 1, ORIGIN);
  const nonce = issuedMessage.match(/^Nonce: (.*)$/m)?.[1] ?? '';
  assert.match(nonce, /^[a-f0-9]{96}$/);
  const payload = [
    'vitalid-ethereum-siwe-v1',
    nonce.slice(0, 32),
    wallet.address.toLowerCase(),
    '1',
    HOST,
    ORIGIN.origin,
    issuedMessage.match(/^Issued At: (.*)$/m)?.[1],
    issuedMessage.match(/^Expiration Time: (.*)$/m)?.[1],
  ].join('\n');
  const expected = createHmac('sha256', process.env.SOL_WALLET_SECRET).update(payload).digest('hex');
  assert.equal(nonce.slice(32), expected);
});

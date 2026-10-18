import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadTranspiledModule } from './transpile-component.mjs';
import { discoverMetaMask, loginWithWallet } from '../../lib/auth/wallet-client.ts';

const originalFetch = globalThis.fetch;
const consents = { consentTerms: true, consentHealthData: true };
const address = '0x1234567890123456789012345678901234567890';
const publicKey = '11111111111111111111111111111111';
afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.window; });

function api() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return Response.json(url.endsWith('/message') ? { message: 'Vital ID sign-in' } : { next: '/' });
  };
  return calls;
}

function ethereum(overrides = {}) {
  return {
    isMetaMask: true,
    async request({ method, params }) {
      if (method in overrides) return overrides[method]();
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
      if (method === 'eth_chainId') return '0x1';
      assert.equal(method, 'personal_sign');
      assert.equal(params[1], address);
      assert.equal(Buffer.from(params[0].slice(2), 'hex').toString(), 'Vital ID sign-in');
      return '0xsigned';
    },
  };
}

test('Solflare and Phantom accept connect-returned public keys and both signature shapes', async () => {
  for (const wallet of ['solflare', 'phantom']) {
    const calls = api();
    const provider = {
      async connect() { return { publicKey: { toBase58: () => publicKey } }; },
      async signMessage(bytes) {
        assert.equal(new TextDecoder().decode(bytes), 'Vital ID sign-in');
        const signature = new Uint8Array(64).fill(1);
        return wallet === 'solflare' ? signature : { signature };
      },
    };
    globalThis.window = wallet === 'solflare' ? { solflare: provider } : { phantom: { solana: provider } };
    await loginWithWallet(wallet, consents);
    assert.deepEqual(calls.map((c) => c.url), ['/api/auth/sol/message', '/api/auth/sol/verify']);
    assert.equal(calls[1].body.publicKey, publicKey);
    assert.equal(calls[1].body.consentHealthData, true);
  }
});

test('MetaMask uses EIP-6963 discovery instead of a competing injected wallet', async () => {
  const calls = api();
  globalThis.window = new EventTarget();
  window.ethereum = { isPhantom: true, isMetaMask: true, request() { throw new Error('wrong wallet'); } };
  const provider = ethereum();
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: { info: { rdns: 'io.metamask' }, provider },
  }));
  window.addEventListener('eip6963:requestProvider', announce);
  let discovered;
  const dispose = discoverMetaMask((p) => { discovered = p; });
  assert.equal(discovered, provider);
  await loginWithWallet('metamask', consents, discovered);
  assert.equal(calls[0].url, '/api/auth/eth/message');
  assert.deepEqual(calls[1].body, { address, chainId: 1, message: 'Vital ID sign-in', signature: '0xsigned', ...consents });
  dispose();
  discovered = null;
  announce();
  assert.equal(discovered, null);
});

test('legacy MetaMask selection excludes Phantom and selects the correct provider', async () => {
  const calls = api();
  globalThis.window = { ethereum: { providers: [
    { isMetaMask: true, isPhantom: true }, ethereum(),
  ] } };
  await loginWithWallet('metamask', consents);
  assert.equal(calls.length, 2);
});

test('missing wallet, absent consent and rejection do not verify a session', async () => {
  const calls = api();
  globalThis.window = {};
  await assert.rejects(loginWithWallet('phantom', consents), { reason: 'notFound' });
  window.ethereum = ethereum({ personal_sign() { throw { code: 4001 }; } });
  await assert.rejects(loginWithWallet('metamask', { ...consents, consentTerms: false }), { reason: 'failed' });
  assert.equal(calls.length, 0);
  await assert.rejects(loginWithWallet('metamask', consents), { reason: 'rejected' });
  assert.equal(calls.length, 1);
});

test('account or network changes during signing abort before verification', async () => {
  for (const method of ['eth_accounts', 'eth_chainId']) {
    const calls = api();
    let chainCalls = 0;
    globalThis.window = { ethereum: ethereum({
      [method]: method === 'eth_accounts' ? () => ['0x' + 'a'.repeat(40)] : () => ++chainCalls === 1 ? '0x1' : '0x89',
    }) };
    await assert.rejects(loginWithWallet('metamask', consents), { reason: 'failed' });
    assert.equal(calls.length, 1);
  }
});

test('server unavailability is surfaced without signing', async () => {
  globalThis.window = { ethereum: ethereum() };
  globalThis.fetch = async () => Response.json({ error: 'unavailable' }, { status: 503 });
  await assert.rejects(loginWithWallet('metamask', consents), { reason: 'unavailable' });
});

test('wallet login has one auth-driven redirect even when membership refresh finishes later', async () => {
  const require = createRequire(import.meta.url);
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const authContext = React.createContext(null);
  const navigations = [];
  const router = Object.fromEntries(['push', 'replace', 'refresh'].map((method) => [
    method, (...args) => navigations.push([method, ...args]),
  ]));
  let finishMembership;
  const membership = new Promise((resolve) => { finishMembership = resolve; });
  const passThrough = ({ children }) => children;
  const consent = ({ id, checked, onChange }) => React.createElement('input', { id, checked, onChange });
  const mocks = new Map([
    ['next/navigation', { useRouter: () => router }],
    ['next/link', { default: passThrough }],
    ['@/components/providers/LocaleProvider', { useLocale: () => ({ t: (key) => key }) }],
    ['@/components/providers/AuthProvider', { useAuth: () => React.useContext(authContext) }],
    ['@/components/providers/MembershipProvider', { useMembership: () => ({ refresh: () => membership }) }],
    ['@/components/auth/AuthFrame', { AuthFrame: passThrough, Field: passThrough, inputClass: '' }],
    ['@/components/legal/HealthDataConsent', { TermsConsent: consent, HealthDataConsent: consent }],
    ['@/lib/auth/wallet-client', {
      discoverMetaMask: () => () => {},
      loginWithWallet: async () => {},
      WalletLoginError: class extends Error {},
    }],
  ]);
  const { WalletButtons } = loadTranspiledModule(
    fileURLToPath(new URL('../../components/signin/WalletButtons.tsx', import.meta.url)), mocks,
  );
  mocks.set('@/components/signin/WalletButtons', { WalletButtons });
  const { SigninForm } = loadTranspiledModule(
    fileURLToPath(new URL('../../components/signin/SigninForm.tsx', import.meta.url)), mocks,
  );
  function Harness() {
    const [account, setAccount] = React.useState(null);
    return React.createElement(authContext.Provider, { value: {
      status: account ? 'member' : 'guest',
      account,
      refresh: async () => {
        const snapshot = { userId: 'wallet-member', next: '/pricing' };
        setAccount(snapshot);
        return snapshot;
      },
    } }, React.createElement(SigninForm));
  }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Harness)); });
    await act(async () => {
      renderer.root.findAllByType('input').filter((input) => input.props.id?.startsWith('wal-'))
        .forEach((input) => input.props.onChange(true));
    });
    await act(async () => {
      renderer.root.findAllByType('button').find((button) => button.props.children === 'auth.wallet.solflare')
        .props.onClick();
    });
    assert.deepEqual(navigations, [['replace', '/pricing']]);
    await act(async () => { finishMembership(); });
    assert.deepEqual(navigations, [['replace', '/pricing']]);
  } finally {
    finishMembership();
    if (renderer) await act(async () => { renderer.unmount(); });
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

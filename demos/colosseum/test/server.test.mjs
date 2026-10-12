import assert from 'node:assert/strict';
import test from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {
  derivePresentation, enrollmentBytes, hex, issuerKey,
} from '../src/crypto.mjs';
import {createDemoServer} from '../src/server.mjs';

const fixture = {
  name: 'Synthetic Test Person',
  records: Array.from({length: 7}, (_, index) => ({
    date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
    sleep: 7.2,
    hrv: 61,
  })),
  summary: {
    identity: {fullName: 'Synthetic Test Person'},
    healthProfile: {heightCm: 168, weightKg: 63},
  },
};

class FakeAdapter {
  constructor() {
    this.program = '11111111111111111111111111111111';
    this.genesis = 'test-devnet-genesis';
    this.counter = 0;
    this.receipts = new Map();
    this.states = new Map();
    this.checkFailures = new Set();
    this.rpcUnavailable = false;
    this.failCreatePrepare = false;
    this.failCreateSubmit = false;
    this.revokeGate = null;
  }

  async prepare(permission, operation) {
    if (operation === 'create' && this.failCreatePrepare) throw new Error('simulated prepare failure');
    if (operation === 'revoke' && this.revokeGate) {
      this.revokeGate.started();
      await this.revokeGate.promise;
    }
    const transaction = Buffer.from(`prepared:${operation}:${permission.reference}`).toString('base64');
    return {
      operation,
      message: hex(Buffer.from(`${operation}:${permission.reference}`)),
      lastValidBlockHeight: 100,
      transaction,
    };
  }

  async submit(permission, prepared, transaction) {
    if (transaction !== prepared.transaction) throw new Error('simulated changed transaction');
    if (prepared.operation === 'create' && this.failCreateSubmit) throw new Error('simulated submit failure');
    const receipt = {
      signature: `simulated-${prepared.operation}-${++this.counter}`,
      lastValidBlockHeight: 100,
      reference: permission.reference,
      operation: prepared.operation,
    };
    this.receipts.set(permission.reference, receipt);
    this.states.set(receipt.signature, 'confirmed');
    return receipt;
  }

  async transactionState(receipt) {
    if (this.rpcUnavailable) throw new Error('simulated RPC failure');
    return {state: this.states.get(receipt.signature) ?? 'pending', slot: 7};
  }

  async check(permission) {
    if (this.rpcUnavailable || this.checkFailures.has(permission.reference)) {
      throw new Error('simulated account check failure');
    }
    if (permission.localRevoked) throw new Error('simulated local revoke');
    return {state: 'confirmed', slot: 7};
  }

  state(reference, state) {
    const receipt = this.receipts.get(reference);
    if (!receipt) throw new Error('missing simulated receipt');
    this.states.set(receipt.signature, state);
  }

  deferRevoke() {
    let release;
    let started;
    const promise = new Promise(resolve => { release = resolve; });
    const waitStarted = new Promise(resolve => { started = resolve; });
    this.revokeGate = {promise, started, release, waitStarted};
    return this.revokeGate;
  }
}

class DemoClient {
  constructor(origin) {
    this.origin = origin;
    this.cookie = null;
    this.keys = null;
    this.session = null;
  }

  async request(path, {method = 'POST', body, origin = this.origin, cookie = this.cookie, headers = {}} = {}) {
    const requestHeaders = {...headers};
    if (method === 'POST') {
      requestHeaders['Content-Type'] ??= 'application/json';
      if (origin !== null) requestHeaders.Origin = origin;
    }
    if (cookie) requestHeaders.Cookie = cookie;
    const response = await fetch(`${this.origin}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';', 1)[0];
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json().catch(() => null),
    };
  }

  post(path, body, options) {
    return this.request(path, {body, ...options});
  }

  get(path, options) {
    return this.request(path, {method: 'GET', ...options});
  }

  async start() {
    const response = await this.post('/api/start', {});
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body), ['id', 'nonce', 'expiresAt']);
    this.enrollment = response.body;
    return response.body;
  }

  async authenticate() {
    if (!this.enrollment) await this.start();
    this.keys = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
    const publicKey = hex(new Uint8Array(await crypto.subtle.exportKey('raw', this.keys.publicKey)));
    const signature = hex(new Uint8Array(await crypto.subtle.sign(
      'Ed25519', this.keys.privateKey, enrollmentBytes(this.enrollment, publicKey),
    )));
    const response = await this.post('/api/auth', {publicKey, signature});
    assert.equal(response.status, 200);
    this.session = response.body.session;
    return this.session;
  }
}

async function harness(t, options = {}) {
  const adapter = options.adapter ?? new FakeAdapter();
  const server = await createDemoServer({
    adapter,
    fixtureFactory: () => structuredClone(fixture),
    issuerKeys: options.issuerKeys ?? await issuerKey(),
    now: options.now,
    origin: options.origin,
    publicRoot: new URL('../public/', import.meta.url),
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const {port} = server.address();
  const base = `http://127.0.0.1:${port}`;
  return {adapter, server, base, client: () => new DemoClient(base)};
}

async function authenticatedPair(t, options) {
  const env = await harness(t, options);
  const holder = env.client();
  const receiver = env.client();
  await holder.authenticate();
  await receiver.authenticate();
  return {...env, holder, receiver};
}

async function createPermission(holder, receiver, mode = 'proof', fields = []) {
  let expectedSnapshot;
  if (mode === 'summary') {
    const preview = await holder.post('/api/preview', {fields});
    assert.equal(preview.status, 200);
    expectedSnapshot = preview.body.snapshot;
  }
  const prepared = await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode,
    fields,
    consent: true,
    ...(mode === 'summary' ? {expectedSnapshot} : {}),
  });
  assert.equal(prepared.status, 200);
  const submitted = await holder.post('/api/submit', {
    reference: prepared.body.permission.reference,
    operation: 'create',
    transaction: prepared.body.prepared.transaction,
  });
  assert.equal(submitted.status, 200);
  return prepared.body.permission;
}

async function createPresentation(holder, receiver, permission) {
  const challenge = await receiver.post('/api/challenge', {reference: permission.reference});
  assert.equal(challenge.status, 200);
  const issued = await holder.post('/api/credential', {challengeId: challenge.body.context.id});
  assert.equal(issued.status, 200);
  const presentation = await derivePresentation(
    issued.body.credential,
    issued.body.context,
    holder.keys.privateKey,
  );
  return {challenge: challenge.body.context, credential: issued.body.credential, presentation};
}

test('static and API responses are private, same-origin and cookie authenticated', async t => {
  const {base, client} = await harness(t);
  const browser = client();
  const page = await browser.get('/');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await browser.get('/../package.json')).status, 404);
  assert.equal((await browser.get('/api/status')).status, 401);
  assert.equal((await browser.post('/api/start', {}, {origin: null})).status, 403);
  assert.equal((await browser.post('/api/start', {}, {origin: 'https://foreign.example'})).status, 403);
  assert.equal((await browser.post('/api/start', '{}', {
    headers: {'Content-Type': 'text/plain'},
  })).status, 415);
  const started = await browser.start();
  assert.equal(started.id.length, 64);
  assert.notEqual(browser.cookie.slice(browser.cookie.indexOf('=') + 1), started.id);
  const cookieHeader = (await browser.post('/api/start', {})).headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Strict/);
  assert.match(cookieHeader, /Path=\//);
  const oversized = `"${'x'.repeat(128 * 1024)}"`;
  assert.equal((await browser.post('/api/start', oversized)).status, 413);
  assert.equal((await browser.get('/api/status')).status, 401);
  assert.equal(base.startsWith('http://127.0.0.1:'), true);
});

test('enrollment signatures are required, one-use, and replacement drops the old cookie session', async t => {
  const {client} = await harness(t);
  const browser = client();
  await browser.start();
  const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
  const publicKey = hex(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
  const correct = hex(new Uint8Array(await crypto.subtle.sign(
    'Ed25519', keys.privateKey, enrollmentBytes(browser.enrollment, publicKey),
  )));
  assert.equal((await browser.post('/api/auth', {publicKey, signature: '00'.repeat(64)})).status, 401);
  assert.equal((await browser.post('/api/auth', {publicKey, signature: correct})).status, 401);

  await browser.start();
  await browser.authenticate();
  const oldCookie = browser.cookie;
  assert.equal((await browser.get('/api/status')).status, 200);
  await browser.start();
  assert.equal((await browser.get('/api/status', {cookie: oldCookie})).status, 401);
  assert.equal((await browser.get('/api/status')).status, 401);
});

test('proof flow uses real BBS and exposes only recipient-bound minimal verification', async t => {
  const {holder, receiver, client} = await authenticatedPair(t);
  const outsider = client();
  await outsider.authenticate();
  const permission = await createPermission(holder, receiver);
  const holderStatus = await holder.get('/api/status');
  const receiverStatus = await receiver.get('/api/status');
  const outsiderStatus = await outsider.get('/api/status');
  assert.equal(holderStatus.body.permissions.length, 1);
  assert.equal(receiverStatus.body.permissions.length, 1);
  assert.equal(outsiderStatus.body.permissions.length, 0);
  assert.doesNotMatch(JSON.stringify(holderStatus.body), /Synthetic Test Person|records|prepared|credential/);
  assert.equal((await outsider.post('/api/challenge', {reference: permission.reference})).status, 404);
  assert.equal((await outsider.post('/api/revoke', {reference: permission.reference})).status, 404);
  assert.equal((await receiver.post('/api/summary', {reference: permission.reference})).status, 404);

  const proof = await createPresentation(holder, receiver, permission);
  assert.ok(proof.credential.messages);
  assert.ok(proof.credential.signature);
  assert.equal((await receiver.post('/api/credential', {challengeId: proof.challenge.id})).status, 404);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: proof.presentation,
  })).status, 200);
  const verified = await receiver.post('/api/verify', {challengeId: proof.challenge.id});
  assert.equal(verified.status, 200);
  assert.deepEqual(Object.keys(verified.body).sort(), [
    'authorization', 'chain', 'claims', 'proof', 'verified', 'zk',
  ]);
  assert.deepEqual(Object.keys(verified.body.claims).sort(), [
    'claimType', 'controller', 'demo', 'expiresAt', 'permissionRef', 'qualifies', 'windowEnd', 'windowStart',
  ]);
  assert.equal(verified.body.verified, true);
  assert.equal(verified.body.snapshot, undefined);
  assert.equal((await receiver.post('/api/verify', {challengeId: proof.challenge.id})).status, 404);
});

test('summary mode requires its exact preview and never adds deselected identity', async t => {
  const {holder, receiver} = await authenticatedPair(t);
  const missing = await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode: 'summary',
    fields: ['healthProfile'],
    consent: true,
  });
  assert.equal(missing.status, 409);
  const stale = await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode: 'summary',
    fields: ['healthProfile'],
    consent: true,
    expectedSnapshot: {healthProfile: {heightCm: 999, weightKg: 63}},
  });
  assert.equal(stale.status, 409);
  const permission = await createPermission(holder, receiver, 'summary', ['healthProfile']);
  const result = await receiver.post('/api/summary', {reference: permission.reference});
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    demo: true,
    snapshot: {healthProfile: {heightCm: 168, weightKg: 63}},
  });
  assert.doesNotMatch(JSON.stringify(result.body), /Synthetic Test Person|identity|records|sleep|hrv/);
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 404);
  const emptyPreview = await holder.post('/api/preview', {fields: []});
  assert.deepEqual(emptyPreview.body, {demo: true, snapshot: {}});
  assert.equal((await holder.post('/api/preview', {fields: ['identity', 'identity']})).status, 400);
  assert.equal((await holder.post('/api/preview', {fields: ['records']})).status, 400);
});

test('presentations reject extra attributes and verification consumes challenges before awaits', async t => {
  const {holder, receiver} = await authenticatedPair(t);
  const permission = await createPermission(holder, receiver);
  const proof = await createPresentation(holder, receiver, permission);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: {...proof.presentation, messages: ['hidden']},
  })).status, 400);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: {...proof.presentation, claims: {...proof.presentation.claims, name: 'hidden'}},
  })).status, 400);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: proof.presentation,
  })).status, 200);
  const attempts = await Promise.all([
    receiver.post('/api/verify', {challengeId: proof.challenge.id}),
    receiver.post('/api/verify', {challengeId: proof.challenge.id}),
  ]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 404]);
});

test('presentations cannot cross permission contexts and failed verification burns the challenge', async t => {
  const {holder, receiver, client} = await authenticatedPair(t);
  const outsider = client();
  await outsider.authenticate();
  const first = await createPermission(holder, receiver);
  const second = await createPermission(holder, receiver);
  const firstProof = await createPresentation(holder, receiver, first);
  const secondChallenge = await receiver.post('/api/challenge', {reference: second.reference});
  assert.equal(secondChallenge.status, 200);
  assert.equal((await outsider.post('/api/credential', {challengeId: secondChallenge.body.context.id})).status, 404);
  assert.equal((await holder.post('/api/present', {
    challengeId: secondChallenge.body.context.id,
    presentation: firstProof.presentation,
  })).status, 200);
  assert.equal((await receiver.post('/api/verify', {
    challengeId: secondChallenge.body.context.id,
  })).status, 404);
  assert.equal((await receiver.post('/api/verify', {
    challengeId: secondChallenge.body.context.id,
  })).status, 404);
});

test('verification denies when its challenge expires during the final chain check', async t => {
  let clock = Date.now();
  const adapter = new FakeAdapter();
  const {holder, receiver} = await authenticatedPair(t, {adapter, now: () => clock});
  const permission = await createPermission(holder, receiver);
  const proof = await createPresentation(holder, receiver, permission);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: proof.presentation,
  })).status, 200);

  const originalCheck = adapter.check.bind(adapter);
  let checks = 0;
  let enterFinalCheck;
  let releaseFinalCheck;
  const finalCheckStarted = new Promise(resolve => { enterFinalCheck = resolve; });
  const finalCheckGate = new Promise(resolve => { releaseFinalCheck = resolve; });
  adapter.check = async (...args) => {
    checks += 1;
    if (checks === 2) {
      enterFinalCheck();
      await finalCheckGate;
    }
    return originalCheck(...args);
  };

  const verification = receiver.post('/api/verify', {challengeId: proof.challenge.id});
  await Promise.race([
    finalCheckStarted,
    delay(1000).then(() => assert.fail('verification did not reach its final chain check')),
  ]);
  clock = Date.parse(proof.challenge.expiresAt) + 1;
  assert.ok(Date.parse(permission.expiresAt) > clock);
  releaseFinalCheck();
  assert.equal((await verification).status, 404);
});

test('pending, failed, unavailable, missing, expired and locally revoked permissions deny', async t => {
  let clock = Date.now();
  const adapter = new FakeAdapter();
  const {holder, receiver} = await authenticatedPair(t, {adapter, now: () => clock});
  const permission = await createPermission(holder, receiver);
  adapter.state(permission.reference, 'pending');
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 404);
  adapter.state(permission.reference, 'failed');
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 404);
  adapter.state(permission.reference, 'confirmed');
  adapter.rpcUnavailable = true;
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 503);
  adapter.rpcUnavailable = false;
  adapter.checkFailures.add(permission.reference);
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 503);
  adapter.checkFailures.clear();
  clock += 16 * 60 * 1000;
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 404);
});

test('local revocation blocks during chain preparation and invalidates a prepared proof', async t => {
  const adapter = new FakeAdapter();
  const {holder, receiver} = await authenticatedPair(t, {adapter});
  const permission = await createPermission(holder, receiver);
  const proof = await createPresentation(holder, receiver, permission);
  assert.equal((await holder.post('/api/present', {
    challengeId: proof.challenge.id,
    presentation: proof.presentation,
  })).status, 200);
  const gate = adapter.deferRevoke();
  const revoke = holder.post('/api/revoke', {reference: permission.reference});
  await gate.waitStarted;
  assert.equal((await receiver.post('/api/verify', {challengeId: proof.challenge.id})).status, 404);
  assert.equal((await receiver.post('/api/challenge', {reference: permission.reference})).status, 404);
  gate.release();
  assert.equal((await revoke).status, 200);
});

test('create preparation/submission failures never grant access or permit create retry', async t => {
  const adapter = new FakeAdapter();
  const {holder, receiver} = await authenticatedPair(t, {adapter});
  adapter.failCreatePrepare = true;
  assert.equal((await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode: 'proof',
    fields: [],
    consent: true,
  })).status, 503);
  adapter.failCreatePrepare = false;
  const prepared = await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode: 'proof',
    fields: [],
    consent: true,
  });
  assert.equal(prepared.status, 200);
  adapter.failCreateSubmit = true;
  const submission = {
    reference: prepared.body.permission.reference,
    operation: 'create',
    transaction: prepared.body.prepared.transaction,
  };
  assert.equal((await holder.post('/api/submit', submission)).status, 503);
  adapter.failCreateSubmit = false;
  assert.equal((await holder.post('/api/submit', submission)).status, 404);
  assert.equal((await receiver.post('/api/challenge', {
    reference: prepared.body.permission.reference,
  })).status, 404);
});

test('expired enrollment and challenge state fail closed', async t => {
  let clock = Date.now();
  const {client, holder, receiver} = await authenticatedPair(t, {now: () => clock});
  const expiring = client();
  await expiring.start();
  clock += 2 * 60 * 1000 + 1;
  const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
  const publicKey = hex(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
  const signature = hex(new Uint8Array(await crypto.subtle.sign(
    'Ed25519', keys.privateKey, enrollmentBytes(expiring.enrollment, publicKey),
  )));
  assert.equal((await expiring.post('/api/auth', {publicKey, signature})).status, 401);

  clock -= 2 * 60 * 1000 + 1;
  const permission = await createPermission(holder, receiver);
  const challenge = await receiver.post('/api/challenge', {reference: permission.reference});
  assert.equal(challenge.status, 200);
  clock += 2 * 60 * 1000 + 1;
  assert.equal((await holder.post('/api/credential', {challengeId: challenge.body.context.id})).status, 404);
});

test('a holder session is capped at twenty permissions', async t => {
  const {holder, receiver} = await authenticatedPair(t);
  for (let index = 0; index < 20; index += 1) {
    await createPermission(holder, receiver);
  }
  const denied = await holder.post('/api/prepare', {
    receiverId: receiver.session.id,
    mode: 'proof',
    fields: [],
    consent: true,
  });
  assert.equal(denied.status, 429);
});

test('request bodies are bounded without logging or echoing attacker data', async t => {
  const {client} = await harness(t);
  const browser = client();
  const response = await browser.post('/api/start', {payload: 'x'.repeat(129 * 1024)});
  assert.equal(response.status, 413);
  assert.deepEqual(response.body, {error: 'unavailable'});
  await delay(1);
});

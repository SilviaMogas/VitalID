import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {
  FIELDS, enrollmentBytes, hex, issueCredential, issuerKey, unhex, verifyPresentation,
} from './crypto.mjs';
import {DevnetAdapter} from './solana.mjs';

const COOKIE = 'vitalid_demo_session';
const BODY_LIMIT = 128 * 1024;
const MAX_SESSIONS = 1000;
const MAX_PERMISSIONS = 20;
const MAX_CHALLENGES = 1000;
const SESSION_TTL = 60 * 60 * 1000;
const ENROLLMENT_TTL = 2 * 60 * 1000;
const PERMISSION_TTL = 15 * 60 * 1000;
const CHALLENGE_TTL = 2 * 60 * 1000;
const SUMMARY_FIELDS = ['identity', 'healthProfile'];
const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/receiver', ['receiver.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/client.js', ['client.js', 'text/javascript; charset=utf-8']],
  ['/fatima.svg', ['fatima.svg', 'image/svg+xml']],
]);

class HttpError extends Error {
  constructor(status = 400) {
    super('unavailable');
    this.status = status;
  }
}

const fail = status => {
  throw new HttpError(status);
};
const token = () => randomBytes(32).toString('hex');
const exactKeys = (value, keys) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).every(key => keys.includes(key))
);
const validHex = (value, bytes) => (
  typeof value === 'string'
  && value.length === bytes * 2
  && /^[a-f0-9]+$/.test(value)
);
const validReference = value => validHex(value, 32);

function json(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    ...extraHeaders,
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

function empty(response, status) {
  response.writeHead(status, SECURITY_HEADERS);
  response.end();
}

function cookieValue(request) {
  const header = request.headers.cookie;
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=');
  }
  return null;
}

async function requestBody(request) {
  const type = request.headers['content-type'];
  if (typeof type !== 'string' || type.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    fail(415);
  }
  const declared = Number(request.headers['content-length']);
  if (Number.isFinite(declared) && declared > BODY_LIMIT) fail(413);
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > BODY_LIMIT) fail(413);
    chunks.push(chunk);
  }
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail(400);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(400);
  return value;
}

function requestedOrigin(request, configuredOrigin) {
  const supplied = request.headers.origin;
  if (typeof supplied !== 'string') fail(403);
  let expected;
  try {
    expected = configuredOrigin
      ? new URL(configuredOrigin).origin
      : `http://${request.headers.host}`;
    if (new URL(supplied).origin !== supplied || supplied !== expected) fail(403);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(403);
  }
}

function validateOrigin(origin) {
  if (!origin) return;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('DEMO_ORIGIN must be an origin URL.');
  }
  if (
    parsed.origin !== origin
    || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    || parsed.username
    || parsed.password
  ) throw new Error('DEMO_ORIGIN must be an origin URL.');
}

function fieldsFrom(value, {allowEmpty}) {
  if (!Array.isArray(value) || value.length > SUMMARY_FIELDS.length) fail(400);
  if (!allowEmpty && value.length === 0) fail(400);
  if (new Set(value).size !== value.length) fail(400);
  if (!value.every(field => typeof field === 'string' && SUMMARY_FIELDS.includes(field))) fail(400);
  return [...value];
}

function snapshotFor(fields, fixture) {
  const snapshot = {};
  if (fields.includes('identity')) {
    snapshot.identity = {fullName: fixture.summary.identity.fullName};
  }
  if (fields.includes('healthProfile')) {
    snapshot.healthProfile = {
      heightCm: fixture.summary.healthProfile.heightCm,
      weightKg: fixture.summary.healthProfile.weightKg,
    };
  }
  return snapshot;
}

function publicPermission(permission) {
  return {
    reference: permission.reference,
    mode: permission.mode,
    fields: permission.fields,
    receiverId: permission.receiverId,
    holderId: permission.holderId,
    controller: permission.controller,
    expiresAt: permission.expiresAt,
    localRevoked: permission.localRevoked,
    createState: permission.createState,
    revokeState: permission.revokeState,
    createSignature: permission.createReceipt?.signature ?? null,
    revokeSignature: permission.revokeReceipt?.signature ?? null,
  };
}

function safePresentation(value) {
  const top = ['schema', 'issuer', 'publicKey', 'claims', 'proof', 'authorization'];
  if (!exactKeys(value, top) || Object.keys(value).length !== top.length) fail(400);
  if (
    typeof value.schema !== 'string' || value.schema.length > 100
    || typeof value.issuer !== 'string' || value.issuer.length > 100
    || !validHex(value.publicKey, 96)
    || typeof value.proof !== 'string' || value.proof.length === 0 || value.proof.length > 10000
    || !/^[a-f0-9]+$/.test(value.proof)
    || !validHex(value.authorization, 64)
  ) fail(400);
  if (!exactKeys(value.claims, FIELDS) || Object.keys(value.claims).length !== FIELDS.length) fail(400);
  const claims = value.claims;
  if (
    claims.demo !== true
    || typeof claims.claimType !== 'string' || claims.claimType.length > 120
    || claims.qualifies !== true
    || typeof claims.windowStart !== 'string' || claims.windowStart.length > 40
    || typeof claims.windowEnd !== 'string' || claims.windowEnd.length > 40
    || typeof claims.expiresAt !== 'string' || claims.expiresAt.length > 40
    || !validReference(claims.permissionRef)
    || !validHex(claims.controller, 32)
  ) fail(400);
  return structuredClone(value);
}

export async function createDemoServer({
  adapter,
  fixtureFactory,
  issuerKeys,
  origin,
  now = () => Date.now(),
  publicRoot = new URL('./public/', import.meta.url),
} = {}) {
  if (!fixtureFactory) {
    ({syntheticFixture: fixtureFactory} = await import('./fixtures.mjs'));
  }
  if (!adapter || typeof adapter.prepare !== 'function' || typeof fixtureFactory !== 'function') {
    throw new Error('Demo server dependencies are required');
  }
  validateOrigin(origin);
  const trustedIssuer = issuerKeys ?? await issuerKey();
  const sessions = new Map();
  const sessionsById = new Map();
  const permissions = new Map();
  const challenges = new Map();
  const activeChallenge = new Map();

  function removeSession(session) {
    sessions.delete(session.cookie);
    sessionsById.delete(session.id);
  }

  function cleanup() {
    const time = now();
    for (const session of sessions.values()) {
      const expiresAt = session.authExpiresAt ?? session.enrollmentExpiresAt;
      if (expiresAt <= time) removeSession(session);
    }
    for (const [id, challenge] of challenges) {
      if (challenge.used || Date.parse(challenge.context.expiresAt) <= time) {
        challenges.delete(id);
        if (activeChallenge.get(challenge.permission.reference) === id) {
          activeChallenge.delete(challenge.permission.reference);
        }
      }
    }
    for (const [reference, permission] of permissions) {
      if (Date.parse(permission.expiresAt) + SESSION_TTL <= time) permissions.delete(reference);
    }
  }

  function authenticated(request) {
    cleanup();
    const session = sessions.get(cookieValue(request));
    if (!session?.publicKey || !session.authExpiresAt || session.authExpiresAt <= now()) fail(401);
    return session;
  }

  function liveSession(id) {
    cleanup();
    const session = sessionsById.get(id);
    if (!session?.publicKey || !session.authExpiresAt || session.authExpiresAt <= now()) return null;
    return session;
  }

  function requireCurrentSession(session) {
    if (liveSession(session.id) !== session) fail(401);
  }

  function requireActiveChallenge(challenge) {
    if (
      challenge.used
      || Date.parse(challenge.context.expiresAt) <= now()
      || !liveSession(challenge.permission.receiverId)
      || !liveSession(challenge.permission.holderId)
    ) fail(404);
  }

  function permissionFor(reference) {
    if (!validReference(reference)) fail(400);
    const permission = permissions.get(reference);
    if (!permission) fail(404);
    return permission;
  }

  function ensureHolder(permission, session) {
    if (permission.holderId !== session.id) fail(404);
  }

  function ensureReceiver(permission, session) {
    if (permission.receiverId !== session.id) fail(404);
  }

  function immediateLive(permission) {
    if (permission.localRevoked || Date.parse(permission.expiresAt) <= now()) fail(404);
  }

  async function refreshState(permission) {
    if (permission.createReceipt) {
      try {
        permission.createState = (await adapter.transactionState(permission.createReceipt)).state;
      } catch {
        permission.createState = 'unavailable';
      }
    }
    if (permission.revokeReceipt) {
      try {
        permission.revokeState = (await adapter.transactionState(permission.revokeReceipt)).state;
      } catch {
        permission.revokeState = 'unavailable';
      }
    }
  }

  async function requireLive(permission) {
    immediateLive(permission);
    if (!permission.createReceipt) fail(404);
    let state;
    try {
      state = await adapter.transactionState(permission.createReceipt);
    } catch {
      permission.createState = 'unavailable';
      fail(503);
    }
    permission.createState = state.state;
    if (state.state !== 'confirmed') fail(404);
    try {
      await adapter.check(permission);
    } catch {
      fail(503);
    }
    immediateLive(permission);
  }

  function invalidateChallenges(reference) {
    for (const challenge of challenges.values()) {
      if (challenge.permission.reference === reference) {
        challenge.used = true;
        challenge.presentation = undefined;
      }
    }
    activeChallenge.delete(reference);
  }

  async function route(request, response, pathname, body) {
    if (request.method === 'POST' && pathname === '/api/start') {
      if (Object.keys(body).length !== 0) fail(400);
      cleanup();
      const prior = sessions.get(cookieValue(request));
      if (prior) removeSession(prior);
      if (sessions.size >= MAX_SESSIONS) fail(503);
      const session = {
        cookie: token(),
        id: token(),
        nonce: token(),
        enrollmentExpiresAt: now() + ENROLLMENT_TTL,
        enrollmentConsumed: false,
        publicKey: null,
        authExpiresAt: null,
      };
      sessions.set(session.cookie, session);
      sessionsById.set(session.id, session);
      const expiresAt = new Date(session.enrollmentExpiresAt).toISOString();
      const secure = origin && new URL(origin).protocol === 'https:' ? '; Secure' : '';
      json(response, 200, {id: session.id, nonce: session.nonce, expiresAt}, {
        'Set-Cookie': `${COOKIE}=${session.cookie}; HttpOnly; SameSite=Strict; Path=/${secure}`,
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/auth') {
      if (!exactKeys(body, ['publicKey', 'signature']) || Object.keys(body).length !== 2) fail(400);
      cleanup();
      const session = sessions.get(cookieValue(request));
      if (!session || session.enrollmentConsumed || session.enrollmentExpiresAt <= now()) fail(401);
      if (!validHex(body.publicKey, 32) || !validHex(body.signature, 64)) fail(400);
      session.enrollmentConsumed = true;
      const challenge = {
        id: session.id,
        nonce: session.nonce,
        expiresAt: new Date(session.enrollmentExpiresAt).toISOString(),
      };
      let valid = false;
      try {
        const key = await crypto.subtle.importKey('raw', unhex(body.publicKey), 'Ed25519', false, ['verify']);
        valid = await crypto.subtle.verify(
          'Ed25519', key, unhex(body.signature), enrollmentBytes(challenge, body.publicKey),
        );
      } catch {
        valid = false;
      }
      if (!valid || session.enrollmentExpiresAt <= now()) fail(401);
      session.publicKey = body.publicKey;
      session.authExpiresAt = now() + SESSION_TTL;
      json(response, 200, {session: {id: session.id, publicKey: session.publicKey}});
      return;
    }

    const session = authenticated(request);

    if (request.method === 'GET' && pathname === '/api/status') {
      const visible = [...permissions.values()].filter(
        permission => permission.holderId === session.id || permission.receiverId === session.id,
      );
      await Promise.all(visible.map(refreshState));
      requireCurrentSession(session);
      json(response, 200, {
        session: {id: session.id, publicKey: session.publicKey},
        config: {
          program: adapter.program ?? null,
          genesis: adapter.genesis,
          issuerPublicKey: hex(trustedIssuer.publicKey),
        },
        permissions: visible.map(publicPermission),
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/preview') {
      if (!exactKeys(body, ['fields']) || Object.keys(body).length !== 1) fail(400);
      const fields = fieldsFrom(body.fields, {allowEmpty: true});
      json(response, 200, {demo: true, snapshot: snapshotFor(fields, fixtureFactory())});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/prepare') {
      for (const [reference, permission] of permissions) {
        if (
          permission.holderId === session.id
          && permission.createState === 'failed'
          && !permission.createSubmitted
          && !permission.createReceipt
          && !permission.preparedCreate
        ) permissions.delete(reference);
      }
      if (!exactKeys(body, ['receiverId', 'mode', 'fields', 'consent', 'expectedSnapshot'])) fail(400);
      if (typeof body.receiverId !== 'string' || body.receiverId.length !== 64 || body.consent !== true) fail(400);
      if (body.mode !== 'proof' && body.mode !== 'summary') fail(400);
      const receiver = liveSession(body.receiverId);
      if (!receiver || receiver.id === session.id) fail(404);
      const fields = fieldsFrom(body.fields, {allowEmpty: body.mode === 'proof'});
      if (body.mode === 'proof' && fields.length !== 0) fail(400);
      const fixture = structuredClone(fixtureFactory());
      if (body.mode === 'summary') {
        if (!Object.hasOwn(body, 'expectedSnapshot') || !isDeepStrictEqual(body.expectedSnapshot, snapshotFor(fields, fixture))) {
          fail(409);
        }
      } else if (Object.hasOwn(body, 'expectedSnapshot')) {
        fail(400);
      }
      const owned = [...permissions.values()].filter(permission => permission.holderId === session.id);
      if (owned.length >= MAX_PERMISSIONS) fail(429);
      let reference = token();
      while (permissions.has(reference)) reference = token();
      const expiresAt = new Date(Math.floor((now() + PERMISSION_TTL) / 1000) * 1000).toISOString();
      const permission = {
        reference,
        mode: body.mode,
        fields,
        receiverId: receiver.id,
        receiverKey: receiver.publicKey,
        holderId: session.id,
        controller: session.publicKey,
        expiresAt,
        program: adapter.program,
        genesis: adapter.genesis,
        fixture,
        localRevoked: false,
        createState: 'pending',
        revokeState: 'not_requested',
        createSubmitted: false,
      };
      permissions.set(reference, permission);
      try {
        permission.preparedCreate = await adapter.prepare(permission, 'create');
      } catch {
        permission.createState = 'failed';
        fail(503);
      }
      if (liveSession(receiver.id) !== receiver || liveSession(session.id) !== session) {
        permission.preparedCreate = undefined;
        permission.createState = 'failed';
        fail(401);
      }
      json(response, 200, {
        permission: publicPermission(permission),
        prepared: {transaction: permission.preparedCreate.transaction},
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/submit') {
      if (!exactKeys(body, ['reference', 'operation', 'transaction']) || Object.keys(body).length !== 3) fail(400);
      if (body.operation !== 'create' && body.operation !== 'revoke') fail(400);
      if (typeof body.transaction !== 'string' || body.transaction.length === 0 || body.transaction.length > 4000) fail(400);
      const permission = permissionFor(body.reference);
      ensureHolder(permission, session);
      const isCreate = body.operation === 'create';
      if (isCreate && (permission.localRevoked || permission.createSubmitted)) fail(404);
      const key = isCreate ? 'preparedCreate' : 'preparedRevoke';
      const prepared = permission[key];
      if (!prepared || prepared.operation !== body.operation) fail(404);
      permission[key] = undefined;
      if (isCreate) permission.createSubmitted = true;
      try {
        const receipt = await adapter.submit(permission, prepared, body.transaction);
        if (isCreate) {
          permission.createReceipt = receipt;
          permission.createState = 'pending';
        } else {
          permission.revokeReceipt = receipt;
          permission.revokeState = 'pending';
        }
      } catch {
        if (isCreate) permission.createState = 'failed';
        else permission.revokeState = 'failed';
        fail(503);
      }
      json(response, 200, {permission: publicPermission(permission)});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/revoke') {
      if (!exactKeys(body, ['reference']) || Object.keys(body).length !== 1) fail(400);
      const permission = permissionFor(body.reference);
      ensureHolder(permission, session);
      permission.localRevoked = true;
      permission.revokeState = 'pending';
      permission.preparedRevoke = undefined;
      invalidateChallenges(permission.reference);
      try {
        permission.preparedRevoke = await adapter.prepare(permission, 'revoke');
      } catch {
        permission.revokeState = 'failed';
        fail(503);
      }
      json(response, 200, {prepared: {transaction: permission.preparedRevoke.transaction}});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/challenge') {
      if (!exactKeys(body, ['reference']) || Object.keys(body).length !== 1) fail(400);
      const permission = permissionFor(body.reference);
      ensureReceiver(permission, session);
      if (permission.mode !== 'proof') fail(404);
      await requireLive(permission);
      requireCurrentSession(session);
      if (!liveSession(permission.holderId)) fail(404);
      cleanup();
      if (challenges.size >= MAX_CHALLENGES) fail(429);
      const prior = activeChallenge.get(permission.reference);
      if (prior) {
        const previous = challenges.get(prior);
        if (previous) previous.used = true;
        challenges.delete(prior);
      }
      const expires = Math.min(now() + CHALLENGE_TTL, Date.parse(permission.expiresAt));
      if (expires <= now()) fail(404);
      const context = {
        id: token(),
        nonce: token(),
        receiverId: permission.receiverId,
        receiverKey: permission.receiverKey,
        holderId: permission.holderId,
        permissionRef: permission.reference,
        program: permission.program,
        genesis: permission.genesis,
        expiresAt: new Date(expires).toISOString(),
      };
      challenges.set(context.id, {context, permission, used: false, presentation: undefined});
      activeChallenge.set(permission.reference, context.id);
      json(response, 200, {context});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/credential') {
      if (!exactKeys(body, ['challengeId']) || Object.keys(body).length !== 1 || !validReference(body.challengeId)) fail(400);
      const challenge = challenges.get(body.challengeId);
      if (!challenge) fail(404);
      const permission = challenge.permission;
      ensureHolder(permission, session);
      if (permission.mode !== 'proof' || !liveSession(permission.receiverId)) fail(404);
      requireActiveChallenge(challenge);
      await requireLive(permission);
      requireActiveChallenge(challenge);
      requireCurrentSession(session);
      const credential = await issueCredential({
        keys: trustedIssuer,
        records: structuredClone(permission.fixture.records),
        name: permission.fixture.name,
        permission,
        now: now(),
      });
      await requireLive(permission);
      requireActiveChallenge(challenge);
      requireCurrentSession(session);
      json(response, 200, {credential, context: challenge.context});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/present') {
      if (!exactKeys(body, ['challengeId', 'presentation']) || Object.keys(body).length !== 2 || !validReference(body.challengeId)) fail(400);
      const challenge = challenges.get(body.challengeId);
      if (!challenge) fail(404);
      const permission = challenge.permission;
      ensureHolder(permission, session);
      if (permission.mode !== 'proof') fail(404);
      requireActiveChallenge(challenge);
      const presentation = safePresentation(body.presentation);
      await requireLive(permission);
      requireActiveChallenge(challenge);
      requireCurrentSession(session);
      immediateLive(permission);
      challenge.presentation = presentation;
      json(response, 200, {submitted: true});
      return;
    }

    if (request.method === 'POST' && pathname === '/api/verify') {
      if (!exactKeys(body, ['challengeId']) || Object.keys(body).length !== 1 || !validReference(body.challengeId)) fail(400);
      const challenge = challenges.get(body.challengeId);
      if (!challenge || !challenge.presentation) fail(404);
      const permission = challenge.permission;
      ensureReceiver(permission, session);
      requireActiveChallenge(challenge);
      challenge.used = true;
      activeChallenge.delete(permission.reference);
      const presentation = challenge.presentation;
      challenge.presentation = undefined;
      await requireLive(permission);
      requireCurrentSession(session);
      if (!liveSession(permission.holderId)) fail(404);
      const verified = await verifyPresentation({
        presentation,
        context: challenge.context,
        trustedPublicKey: trustedIssuer.publicKey,
        permission,
        now: now(),
      });
      if (!verified) fail(404);
      await requireLive(permission);
      requireCurrentSession(session);
      if (!liveSession(permission.holderId)) fail(404);
      immediateLive(permission);
      if (!(Date.parse(challenge.context.expiresAt) > now())) fail(404);
      json(response, 200, {
        verified: true,
        zk: 'BBS verified off-chain',
        chain: 'Permission checked on Solana devnet',
        claims: presentation.claims,
        proof: presentation.proof,
        authorization: presentation.authorization,
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/summary') {
      if (!exactKeys(body, ['reference']) || Object.keys(body).length !== 1) fail(400);
      const permission = permissionFor(body.reference);
      ensureReceiver(permission, session);
      if (permission.mode !== 'summary') fail(404);
      await requireLive(permission);
      requireCurrentSession(session);
      const snapshot = snapshotFor(permission.fields, permission.fixture);
      immediateLive(permission);
      json(response, 200, {demo: true, snapshot});
      return;
    }

    fail(404);
  }

  return createServer(async (request, response) => {
    try {
      if (!request.url || request.url.includes('?') || request.url.includes('#')) fail(404);
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && STATIC_FILES.has(pathname)) {
        const [file, type] = STATIC_FILES.get(pathname);
        const content = await readFile(new URL(file, publicRoot));
        response.writeHead(200, {...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': content.length});
        response.end(content);
        return;
      }
      if (request.method === 'GET' && pathname === '/api/status') {
        await route(request, response, pathname);
        return;
      }
      if (request.method !== 'POST') {
        empty(response, 404);
        return;
      }
      requestedOrigin(request, origin);
      const body = await requestBody(request);
      await route(request, response, pathname, body);
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      json(response, error instanceof HttpError ? error.status : 503, {error: 'unavailable'});
    }
  });
}

const direct = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (direct) {
  if (process.env.VITALID_DEMO_ENABLED !== '1') {
    process.stderr.write('VitalID demo is disabled.\n');
    process.exitCode = 1;
  } else {
    try {
      const port = Number(process.env.PORT ?? 4318);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
      const server = await createDemoServer({
        adapter: DevnetAdapter.fromEnvironment(),
        issuerKeys: await issuerKey(),
        origin: process.env.DEMO_ORIGIN,
      });
      server.listen(port, '127.0.0.1', () => {
        process.stdout.write(`VitalID demo listening on loopback port ${port}.\n`);
      });
    } catch {
      process.stderr.write('VitalID demo failed to start.\n');
      process.exitCode = 1;
    }
  }
}

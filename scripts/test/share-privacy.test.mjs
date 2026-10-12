import test from 'node:test';
import assert from 'node:assert/strict';

for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) delete process.env[key];

const { GET: getShare } = await import('@/app/api/share/[id]/route');
const { POST: createShare } = await import('@/app/api/share/route');
const { POST: previewShare } = await import('@/app/api/share/preview/route');
const { isSameOrigin } = await import('@/lib/share-api');
const { NextRequest } = await import('next/server.js');
const owner = { id: '00000000-0000-4000-8000-00000000000a', email: 'owner@example.test' };
const recipient = { id: '00000000-0000-4000-8000-00000000000b', email: 'recipient@example.test' };
globalThis.__recipientAccountLookup = (id) => id === recipient.id;

test('same-origin guard preserves exact loopback host and port through real NextRequest normalization', () => {
  const request = (host, origin, urlHost = host) => new NextRequest(`http://${urlHost}/api/share/preview`, {
    method: 'POST',
    headers: {host, origin},
  });
  assert.equal(isSameOrigin(request('127.0.0.1:3001', 'http://127.0.0.1:3001')), true);
  assert.equal(isSameOrigin(request('[::1]:3001', 'http://[::1]:3001')), true);
  assert.equal(isSameOrigin(request('localhost:3001', 'http://localhost:3001')), true);
  assert.equal(isSameOrigin(request('127.0.0.1:3001', 'http://localhost:3001')), false);
  assert.equal(isSameOrigin(request('127.0.0.1:3001', 'http://127.0.0.1:3002')), false);
  assert.equal(isSameOrigin(request('evil.example', 'http://evil.example', 'localhost:3001')), false);
  assert.equal(isSameOrigin(request('example.test', 'http://example.test')), true);
  assert.equal(isSameOrigin(request('example.test', 'http://evil.example')), false);
});

function fixture(overrides = {}) {
  return {
    id: 'share-private-1234',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    revoked: false,
    purpose: 'doctor',
    selectedFields: ['identity', 'emergencyInfo', 'currentSignals', 'recentTrends', 'healthProfile'],
    sharedBy: 'Owner Name',
    sharedByLocalized: { en: 'Owner Name', ar: 'اسم المالك', secret: 'outer-localized-secret' },
    ownerKey: owner.id,
    recipientUserId: recipient.id,
    sentTo: [{ insurerId: 'etna', sentAt: '2026-01-01T00:00:00.000Z', deliveryRef: 'private-ref', consented: true }],
    snapshot: {
      identity: {
        fullName: 'Owner Name',
        localizedName: { en: 'Owner Name', ar: 'اسم المالك', secret: 'identity-secret' },
        vitalId: 'VID-123',
        dateOfBirth: '1990-01-01',
        sex: 'female',
        nationality: 'AE',
        photoUrl: 'private-photo',
        avatarUrl: 'private-avatar',
        secret: 'identity-secret',
      },
      emergencyInfo: {
        bloodType: 'O+',
        allergies: ['pollen'],
        conditions: ['asthma'],
        emergencyContact: {
          name: 'Contact Name',
          localizedName: { en: 'Contact Name', ar: 'اسم جهة الاتصال', secret: 'contact-secret' },
          relation: 'sibling',
          phone: '+971500000000',
          secret: 'contact-secret',
        },
        secret: 'emergency-secret',
      },
      currentSignals: [{
        metric: 'sleep',
        value: 7.5,
        unit: 'hours',
        timestamp: '2026-01-01T00:00:00.000Z',
        source: 'manual',
        baseline: 7,
        baselineDays: 7,
        sevenDayAverage: 7.2,
        delta: 0.5,
        deltaPercent: 7,
        status: 'stable',
        polarity: 'higherIsBetter',
        history: [{ date: '2025-12-31', value: 2 }],
        secret: 'signal-secret',
      }],
      recentTrends: [{
        id: 'trend-1',
        key: 'trend.sleep',
        params: { percent: 7.5, secretObject: { token: 'trend-secret' } },
        metric: 'sleep',
        severity: 'info',
        secret: 'trend-secret',
      }],
      healthProfile: {
        heightCm: 165,
        weightKg: 60,
        maxHeartRate: 190,
        medications: ['medication'],
        notes: 'private note',
        secret: 'profile-secret',
      },
      sources: ['private-source'],
      lastUpdated: '2026-01-01T00:00:00.000Z',
      ownerKey: 'snapshot-owner-secret',
      recipientUserId: 'snapshot-user-id-secret',
      token: 'snapshot-token-secret',
    },
    privateMetadata: 'private-record-secret',
    ...overrides,
  };
}

function seed(payload) {
  globalThis.__testShares = new Map([[payload.id, payload]]);
  globalThis.__testUser = null;
}

function get(id = 'share-private-1234') {
  return getShare(new Request(`https://example.test/api/share/${id}`), {
    params: Promise.resolve({ id }),
  });
}

test('share access denies anonymous requests with a private no-store response', async () => {
  seed(fixture());
  const response = await get();
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('share access denies a signed-in account with the wrong id even when its email matches', async () => {
  seed(fixture());
  globalThis.__testUser = { ...recipient, id: owner.id.replace('a', 'c') };
  const response = await get();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('share access allows the recipient account id and returns only the public projection', async () => {
  const payload = fixture();
  seed(payload);
  globalThis.__testUser = { ...recipient, email: 'different@example.test' };

  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), [
    'createdAt', 'expiresAt', 'id', 'purpose', 'revoked', 'selectedFields',
    'sharedBy', 'sharedByLocalized', 'snapshot',
  ].sort());
  assert.equal(result.id, payload.id);
  assert.equal(result.sharedBy, 'Owner Name');
  assert.deepEqual(Object.keys(result.sharedByLocalized).sort(), ['ar', 'en']);
  assert.deepEqual(result.snapshot.sources, ['manual']);
  assert.deepEqual(Object.keys(result.snapshot).sort(), [
    'currentSignals', 'emergencyInfo', 'healthProfile', 'identity', 'recentTrends', 'sources',
  ]);
  assert.deepEqual(Object.keys(result.snapshot.identity).sort(), [
    'dateOfBirth', 'fullName', 'localizedName', 'nationality', 'sex', 'vitalId',
  ]);
  assert.deepEqual(Object.keys(result.snapshot.currentSignals[0]).sort(), [
    'baseline', 'baselineDays', 'delta', 'deltaPercent', 'metric', 'polarity',
    'sevenDayAverage', 'source', 'status', 'timestamp', 'unit', 'value',
  ]);
  assert.deepEqual(Object.keys(result.snapshot.emergencyInfo).sort(), [
    'allergies', 'bloodType', 'conditions', 'emergencyContact',
  ]);
  assert.deepEqual(Object.keys(result.snapshot.emergencyInfo.emergencyContact).sort(), [
    'localizedName', 'name', 'phone', 'relation',
  ]);
  assert.deepEqual(Object.keys(result.snapshot.healthProfile).sort(), [
    'heightCm', 'maxHeartRate', 'medications', 'weightKg',
  ]);
  assert.deepEqual(result.snapshot.recentTrends[0].params, { percent: 7.5 });
  assert.doesNotMatch(
    JSON.stringify(result),
    /identity-secret|contact-secret|emergency-secret|signal-secret|trend-secret|profile-secret|outer-localized-secret|snapshot-owner-secret|snapshot-user-id-secret|snapshot-token-secret|private-photo|private-avatar|private note|private-source|private-ref|photoUrl|avatarUrl|history|sentTo|ownerKey|recipientUserId/i,
  );
});

test('owner may read a share, and legacy records remain owner-only without a recipient account id', async () => {
  const legacy = fixture({ recipientUserId: undefined });
  seed(legacy);
  globalThis.__testUser = recipient;
  assert.equal((await get()).status, 404);
  globalThis.__testUser = owner;
  assert.equal((await get()).status, 200);
});

test('legacy shares never disclose identity or sender names when identity was not selected', async () => {
  const legacy = fixture({
    recipientUserId: undefined,
    selectedFields: ['currentSignals'],
  });
  seed(legacy);
  globalThis.__testUser = owner;
  const result = await (await get()).json();
  assert.deepEqual(Object.keys(result).sort(), [
    'createdAt', 'expiresAt', 'id', 'purpose', 'revoked', 'selectedFields', 'snapshot',
  ]);
  assert.deepEqual(Object.keys(result.snapshot).sort(), ['currentSignals', 'sources']);
  assert.doesNotMatch(JSON.stringify(result), /Owner Name|localizedName|identity/);
});

test('create requires a valid recipient account id and returns the same safe snapshot as preview', async () => {
  globalThis.__testShares = new Map();
  globalThis.__createdShare = null;
  globalThis.__testUser = owner;

  const makeRequest = (path, body) => new Request(`https://example.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const fields = ['identity', 'currentSignals'];
  const previewResponse = await previewShare(makeRequest('/api/share/preview', { selectedFields: fields }));
  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get('cache-control'), 'no-store');
  const preview = await previewResponse.json();
  assert.equal(globalThis.__createdShare, null);

  const invalid = await createShare(makeRequest('/api/share', {
    purpose: 'doctor',
    selectedFields: fields,
    durationMinutes: 60,
    recipientUserId: 'invalid',
  }));
  assert.equal(invalid.status, 400);
  assert.equal(globalThis.__createdShare, null);

  const missingPreview = await createShare(makeRequest('/api/share', {
    purpose: 'doctor',
    selectedFields: fields,
    durationMinutes: 60,
    recipientUserId: recipient.id,
  }));
  assert.equal(missingPreview.status, 409);
  assert.equal(globalThis.__createdShare, null);

  const changedPreview = await createShare(makeRequest('/api/share', {
    purpose: 'doctor',
    selectedFields: fields,
    durationMinutes: 60,
    recipientUserId: recipient.id,
    expectedSnapshot: { ...preview.snapshot, unexpected: true },
  }));
  assert.equal(changedPreview.status, 409);
  assert.equal(globalThis.__createdShare, null);

  const response = await createShare(makeRequest('/api/share', {
    purpose: 'doctor',
    selectedFields: fields,
    durationMinutes: 60,
    recipientUserId: recipient.id.toUpperCase(),
    expectedSnapshot: preview.snapshot,
  }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.deepEqual(result.snapshot, preview.snapshot);
  assert.equal(globalThis.__createdShare.recipientUserId, recipient.id);
  assert.equal('recipientUserId' in result, false);
  assert.equal('ownerKey' in result, false);
  assert.equal('sentTo' in result, false);
});

async function createIdentityShareFor(recipientUserId) {
  globalThis.__testShares = new Map();
  globalThis.__createdShare = null;
  globalThis.__testUser = owner;
  const previewResponse = await previewShare(new Request('https://example.test/api/share/preview', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({selectedFields: ['identity']}),
  }));
  const {snapshot} = await previewResponse.json();
  return createShare(new Request('https://example.test/api/share', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      purpose: 'doctor',
      selectedFields: ['identity'],
      durationMinutes: 60,
      recipientUserId,
      expectedSnapshot: snapshot,
    }),
  }));
}

test('create rejects a valid-looking recipient id when the account does not exist', async () => {
  const response = await createIdentityShareFor('00000000-0000-4000-8000-00000000000c');
  assert.equal(response.status, 404);
  assert.equal(globalThis.__createdShare, null);
});

test('create fails closed when recipient account lookup errors', async () => {
  globalThis.__recipientAccountLookup = () => { throw new Error('lookup unavailable'); };
  const response = await createIdentityShareFor(recipient.id);
  assert.equal(response.status, 404);
  assert.equal(globalThis.__createdShare, null);
  globalThis.__recipientAccountLookup = (id) => id === recipient.id;
});

test('preview requires a signed-in member, rejects unknown fields, and never persists a share', async () => {
  globalThis.__testShares = new Map();
  globalThis.__createdShare = null;
  globalThis.__testUser = null;
  const request = (selectedFields) => new Request('https://example.test/api/share/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedFields }),
  });

  assert.equal((await previewShare(request(['identity']))).status, 401);
  globalThis.__testUser = owner;
  assert.equal((await previewShare(request(['identity', 'ownerKey']))).status, 400);
  assert.equal(globalThis.__createdShare, null);
});

// Regression: a signed-in member must never receive Fatima's demo dataset as
// their own metrics, nor forward it through a share. Synthetic users only;
// in-memory stores (Supabase env is cleared so nothing touches a real project).
import test from 'node:test';
import assert from 'node:assert/strict';

for (const k of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) delete process.env[k];

const { resolveUserData } = await import('@/lib/user-data');
const { getOnboardingStore } = await import('@/lib/onboarding/store');
const { buildSnapshot } = await import('@/lib/sharing');
const { applyPlanToConnectors } = await import('@/lib/connectors');

const SYNTHETIC_SOURCES = new Set(['circularRing', 'demoWearable']);
const A = { id: '00000000-0000-4000-8000-00000000000a', email: 'a@example.test' };
const B = { id: '00000000-0000-4000-8000-00000000000b', email: 'b@example.test' };

const store = getOnboardingStore();
await store.patch(A.id, {
  profile: { firstName: 'Test', lastName: 'A', country: 'AE' },
  baseline: { sleepHours: 8.2, restingHr: 49 },
  connectors: [{ provider: 'oura', category: 'wearables', status: 'sample_data', connectedAt: null }],
});
await store.patch(B.id, {
  profile: { firstName: 'Test', lastName: 'B', country: 'AE' },
  connectors: [{ provider: 'circular_ring', category: 'wearables', status: 'sample_data', connectedAt: null }],
});

function as(user) {
  globalThis.__testUser = user;
  return resolveUserData();
}

test('member with a sample-data provider only gets their own manual baseline', async () => {
  const d = await as(A);
  assert.equal(d.owner, 'member');
  assert.deepEqual(
    d.metrics.filter((m) => SYNTHETIC_SOURCES.has(m.source)).map((m) => m.metric),
    [],
  );
  assert.deepEqual(
    d.metrics.map((m) => [m.metric, m.source, m.value]),
    [
      ['sleep', 'manual', 8.2],
      ['restingHeartRate', 'manual', 49],
    ],
  );
});

test('member without readings gets no synthetic history', async () => {
  const d = await as(B);
  assert.equal(d.metrics.length, 0);
});

test('share snapshot from a member carries no demo data, owner key or tokens', async () => {
  const d = await as(A);
  const snap = buildSnapshot(d.snapshot, ['currentSignals', 'recentTrends', 'identity']);
  assert.ok(!(snap.sources ?? []).some((s) => SYNTHETIC_SOURCES.has(s)));
  // Member A only has manual readings; any other source means borrowed data.
  assert.deepEqual([...new Set((snap.currentSignals ?? []).map((m) => m.source))], ['manual']);
  assert.ok(!(snap.sources ?? []).some((s) => s !== 'manual' && s !== 'manualProfile'));
  assert.doesNotMatch(JSON.stringify(snap), /ownerKey|token|Fatima/i);
});

test('Fatima demo (no session) keeps the bundled sample dataset', async () => {
  const d = await as(null);
  assert.equal(d.owner, 'fatima');
  assert.ok(d.metrics.some((m) => SYNTHETIC_SOURCES.has(m.source)));
});

test('server drops Pro-only connectors for a free plan', () => {
  const kept = applyPlanToConnectors(
    [{ provider: 'medical_records', category: 'records', status: 'waiting_implementation', connectedAt: null }],
    'free',
  );
  assert.deepEqual(kept, []);
});

test('every sample provider stays outside a member profile and share', async () => {
  for (const provider of ['oura', 'fitbit', 'garmin', 'apple_health', 'strava', 'circular_ring']) {
    await store.patch(B.id, { connectors: [{ provider, category: 'wearables', status: 'sample_data', connectedAt: null }] });
    const d = await as(B);
    assert.deepEqual(d.metrics, [], provider);
    assert.deepEqual(buildSnapshot(d.snapshot, ['currentSignals', 'recentTrends']).currentSignals, []);
  }
});

test('demo previews are labelled synthetic and cannot enter a share', async () => {
  const { connectorDemo } = await import('@/lib/connector-demo');
  for (const provider of ['oura', 'fitbit', 'garmin', 'apple_health', 'strava', 'circular_ring']) {
    const preview = connectorDemo(provider);
    assert.ok(preview.length > 0);
    assert.ok(preview.every((metric) => metric.source === 'demoWearable'));
    const member = await as(A);
    assert.throws(() => buildSnapshot({ ...member.snapshot, currentSignals: preview }, ['currentSignals']), /Demo data/);
    assert.deepEqual(member.metrics.map((m) => m.source), ['manual', 'manual']);
  }
  assert.deepEqual(connectorDemo('whoop'), []);
});

test('Fatima demo cannot become a recipient snapshot', async () => {
  const d = await as(null);
  assert.throws(() => buildSnapshot(d.snapshot, ['currentSignals', 'identity']), /Demo data/);
});

test('share API rejects a demo before persistence and allows own member readings', async () => {
  const { POST } = await import('@/app/api/share/route');
  const request = () => new Request('https://example.test/api/share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'doctor', selectedFields: ['identity', 'currentSignals'], durationMinutes: 60 }),
  });
  globalThis.__createdShare = null;
  globalThis.__testUser = null;
  assert.equal((await POST(request())).status, 403);
  assert.equal(globalThis.__createdShare, null);
  globalThis.__testUser = A;
  const response = await POST(request());
  assert.equal(response.status, 201);
  assert.equal(globalThis.__createdShare.ownerKey, A.id);
  assert.deepEqual(globalThis.__createdShare.snapshot.currentSignals.map((m) => m.source), ['manual', 'manual']);
});

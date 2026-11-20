// Wearable connectors: pure mappers, ingest validation, and the push-token
// ingest route. Synthetic data only; Supabase env cleared → in-memory stores.
import test from 'node:test';
import assert from 'node:assert/strict';

for (const k of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) delete process.env[k];

const { mapOuraToDaily } = await import('@/lib/connectors/wearables/providers/oura-mapping');
const { mapStravaToDaily } = await import('@/lib/connectors/wearables/providers/strava-mapping');
const { parseIngestPayload } = await import('@/lib/connectors/wearables/ingest');
const consent = await import('@/app/api/consent/route');
const ingest = await import('@/app/api/connectors/wearables/ingest/route');
const syncRoute = await import('@/app/api/connectors/wearables/[provider]/sync/route');
const { getWearableStore, syncCooldownRemaining, SYNC_HOURLY_LIMIT } = await import('@/lib/connectors/wearables');

const U = { id: '00000000-0000-4000-8000-0000000000c1', email: 'c@example.test' };
const post = (url, body, headers = {}) =>
  new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const today = new Date().toISOString().slice(0, 10);

test('Oura mapping: main sleep only, longest wins, units converted, outliers nulled', () => {
  const days = mapOuraToDaily({
    dailySleep: [{ day: '2026-10-01', score: 82 }],
    readiness: [{ day: '2026-10-01', score: 77 }],
    activity: [{ day: '2026-10-01', steps: 8000, active_calories: 400, high_activity_time: 600, medium_activity_time: 1200, equivalent_walking_distance: 9000 }],
    sleep: [
      { day: '2026-10-01', type: 'late_nap', total_sleep_duration: 3600, average_hrv: 10 },
      { day: '2026-10-01', type: 'long_sleep', total_sleep_duration: 25200, average_hrv: 55, lowest_heart_rate: 48 },
      { day: '2026-10-01', type: 'long_sleep', total_sleep_duration: 7200, average_hrv: 99, lowest_heart_rate: 40 },
      { day: '2026-10-02', type: 'long_sleep', total_sleep_duration: 999999, average_hrv: 9999 },
    ],
    workouts: [{ day: '2026-10-01' }],
  });
  const d1 = days.find((d) => d.date === '2026-10-01');
  assert.equal(d1.sleepHours, 7);
  assert.equal(d1.hrvMs, 55);
  assert.equal(d1.restingHr, 48);
  assert.equal(d1.activeMinutes, 30);
  assert.equal(d1.workoutCount, 1);
  assert.equal(d1.sleepScore, 82);
  const d2 = days.find((d) => d.date === '2026-10-02');
  assert.equal(d2.sleepHours, null); // >24h is corrupted
  assert.equal(d2.hrvMs, null);
});

test('Strava mapping: sums per local day, weights HR by time, skips corrupt durations', () => {
  const days = mapStravaToDaily([
    { start_date_local: '2026-10-01T07:00:00Z', moving_time: 1800, distance: 5000, average_heartrate: 150 },
    { start_date_local: '2026-10-01T18:00:00Z', moving_time: 5400, distance: 20000, average_heartrate: 130 },
    { start_date_local: '2026-10-01T20:00:00Z', moving_time: 999999 },
    { start_date_local: 'garbage', moving_time: 100 },
  ]);
  assert.equal(days.length, 1);
  assert.equal(days[0].workoutCount, 2);
  assert.equal(days[0].activeMinutes, 120);
  assert.equal(days[0].distanceM, 25000);
  assert.equal(days[0].avgHeartRate, 135);
});

test('ingest payload validation', () => {
  assert.equal(parseIngestPayload(null).error, 'invalid_body');
  assert.equal(parseIngestPayload({ source: 'oura', days: [{}] }).error, 'invalid_source');
  assert.equal(parseIngestPayload({ source: 'apple_health', days: [] }).error, 'invalid_days');
  assert.equal(parseIngestPayload({ source: 'apple_health', days: [{ date: '2026-02-30' }] }).error, 'invalid_date');
  assert.equal(parseIngestPayload({ source: 'apple_health', days: [{ date: '2999-01-01' }] }).error, 'invalid_date');
  const ok = parseIngestPayload({ source: 'health_connect', days: [{ date: today, steps: 9000, restingHr: 5, hrvMs: 'x' }] });
  assert.equal(ok.days[0].steps, 9000);
  assert.equal(ok.days[0].restingHr, null); // 5 bpm is implausible
  assert.equal(ok.days[0].hrvMs, null);
});

test('ingest route: token issuance needs consent; push is bearer-only and per-user', async () => {
  globalThis.__testUser = U;
  const noConsent = await ingest.PUT(new Request('http://localhost:3000/api/connectors/wearables/ingest', { method: 'PUT' }));
  assert.equal(noConsent.status, 403);

  assert.equal((await consent.POST(post('http://localhost:3000/api/consent', { type: 'health_data' }))).status, 200);
  const issued = await ingest.PUT(new Request('http://localhost:3000/api/connectors/wearables/ingest', { method: 'PUT' }));
  assert.equal(issued.status, 200);
  const { token } = await issued.json();
  assert.match(token, /^vid_/);

  const url = 'http://localhost:3000/api/connectors/wearables/ingest';
  const body = { source: 'apple_health', days: [{ date: today, steps: 7000 }] };
  assert.equal((await ingest.POST(post(url, body))).status, 401);
  assert.equal((await ingest.POST(post(url, body, { authorization: 'Bearer vid_wrongwrongwrongwrongwrong' }))).status, 401);
  const res = await ingest.POST(post(url, body, { authorization: `Bearer ${token}` }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).days, 1);
  assert.equal((await ingest.POST(post(url, { source: 'apple_health', days: [] }, { authorization: `Bearer ${token}` }))).status, 400);

  // Rotating the token invalidates the old one.
  const rotated = await (await ingest.PUT(new Request(url, { method: 'PUT' }))).json();
  assert.notEqual(rotated.token, token);
  assert.equal((await ingest.POST(post(url, body, { authorization: `Bearer ${token}` }))).status, 401);
  globalThis.__testUser = null;
});

async function withStravaSync(userId, respond, run) {
  process.env.STRAVA_CLIENT_ID = 'synthetic-strava-id';
  process.env.STRAVA_CLIENT_SECRET = 'synthetic-strava-secret';
  await getWearableStore().upsert({
    userKey: userId, provider: 'strava', externalUserId: null, accessToken: 'synthetic-access',
    refreshToken: 'synthetic-refresh', expiresAt: '2999-01-01T00:00:00Z', scope: null,
    connectedAt: new Date().toISOString(), lastSyncedAt: null, lastSyncError: null,
  });
  const realFetch = globalThis.fetch;
  const calls = { n: 0 };
  globalThis.fetch = async () => { calls.n += 1; return respond(); };
  globalThis.__testUser = { id: userId, email: `${userId}@example.test` };
  const sync = () => syncRoute.POST(
    new Request('http://localhost:3000/api/connectors/wearables/strava/sync', { method: 'POST', headers: { origin: 'http://localhost:3000' } }),
    { params: Promise.resolve({ provider: 'strava' }) },
  );
  try {
    await run(sync, calls);
  } finally {
    globalThis.fetch = realFetch;
    globalThis.__testUser = null;
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
  }
}

test('sync route: a second sync right after a successful one is rejected without calling the provider', async () => {
  await withStravaSync('00000000-0000-4000-8000-0000000000d1', () => Response.json([]), async (sync, calls) => {
    const first = await sync();
    assert.equal(first.status, 200);
    const afterFirst = calls.n;
    assert.ok(afterFirst >= 1);
    const second = await sync();
    assert.equal(second.status, 429);
    assert.equal((await second.json()).error, 'rate_limited');
    assert.ok(Number(second.headers.get('retry-after')) > 0);
    assert.equal(calls.n, afterFirst);
  });
});

test('sync route: failed syncs count towards the hourly limit', async () => {
  const fail = () => new Response('{}', { status: 400 });
  await withStravaSync('00000000-0000-4000-8000-0000000000d2', fail, async (sync, calls) => {
    for (let i = 0; i < SYNC_HOURLY_LIMIT; i++) assert.equal((await sync()).status, 500);
    const reached = calls.n;
    assert.equal(reached, SYNC_HOURLY_LIMIT);
    const limited = await sync();
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal(calls.n, reached);
  });
});

test('sync cooldown only applies within 5 minutes of the last successful sync', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  assert.equal(syncCooldownRemaining(null, now), 0);
  assert.equal(syncCooldownRemaining('garbage', now), 0);
  assert.equal(syncCooldownRemaining('2026-11-14T11:59:00Z', now), 240);
  assert.equal(syncCooldownRemaining('2026-11-14T11:54:00Z', now), 0);
});

/**
 * Local WHOOP API + OAuth mock for end-to-end dev testing.
 *
 * Usage (in a second shell, while this runs on :4010):
 *
 *   env -u SUPABASE_URL -u SUPABASE_SECRET_KEY \
 *     WHOOP_CLIENT_ID=mock WHOOP_CLIENT_SECRET=mock \
 *     WHOOP_OAUTH_BASE=http://localhost:4010 \
 *     WHOOP_API_BASE=http://localhost:4010/developer \
 *     WHOOP_REDIRECT_URI=http://localhost:3000/api/connectors/whoop/callback \
 *     npm run dev
 *
 *   node scripts/whoop-mock-server.mjs
 *
 * Behaviour:
 *   GET  /oauth/oauth2/auth        → 302 to redirect_uri with code=mock&state=<state>
 *                                    (?deny=1 → error=access_denied)
 *   POST /oauth/oauth2/token       → rotating tokens (refresh-N), MOCK_EXPIRES_IN=N
 *                                    overrides expires_in (default 3600)
 *   GET  /developer/v2/user/profile/basic | /v2/user/measurement/body
 *   GET  /developer/v2/recovery|cycle|activity/sleep|activity/workout
 *                                  → 30 days of realistic SCORED fixtures
 *                                    (one nap sleep to test skipping)
 *   DELETE /developer/v2/user/access → 204
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const EXPIRES_IN = Number(process.env.MOCK_EXPIRES_IN ?? 3600);
const TZ = '+04:00';
let refreshCount = 0;
let tokenSeq = 0;

const HOUR = 3.6e6;
const DAY = 24 * HOUR;

function isoLocal(ms) {
  // Fake local timestamps carrying a +04:00 offset label like the real API.
  return new Date(ms).toISOString();
}

function fixtures() {
  const now = Date.now();
  const cycles = [];
  const recoveries = [];
  const sleeps = [];
  const workouts = [];
  for (let i = 30; i >= 1; i--) {
    const dayStart = now - i * DAY;
    const cycleId = 1000 + i;
    cycles.push({
      id: cycleId,
      user_id: 4242,
      created_at: isoLocal(dayStart),
      updated_at: isoLocal(dayStart + HOUR),
      start: isoLocal(dayStart),
      end: isoLocal(dayStart + DAY),
      timezone_offset: TZ,
      score_state: 'SCORED',
      score: {
        strain: 9.5 + Math.sin(i / 3) * 4,
        kilojoule: 8400 + (i % 5) * 500,
        average_heart_rate: 68 + (i % 4),
        max_heart_rate: 150 + (i % 7),
      },
    });
    recoveries.push({
      cycle_id: cycleId,
      sleep_id: `sleep-${i}`,
      user_id: 4242,
      created_at: isoLocal(dayStart + DAY),
      updated_at: isoLocal(dayStart + DAY),
      score_state: 'SCORED',
      score: {
        user_calibrating: false,
        recovery_score: 55 + ((i * 13) % 40),
        resting_heart_rate: 52 + (i % 6),
        hrv_rmssd_milli: 58 + ((i * 7) % 35),
        spo2_percentage: 97.5,
        skin_temp_celsius: 33.4,
      },
    });
    const inBed = 8 * HOUR + (i % 3) * 900000;
    sleeps.push({
      id: `sleep-${i}`,
      cycle_id: cycleId,
      user_id: 4242,
      created_at: isoLocal(dayStart + DAY),
      updated_at: isoLocal(dayStart + DAY),
      start: isoLocal(dayStart + DAY - inBed - 3600000),
      end: isoLocal(dayStart + DAY - 3600000),
      timezone_offset: TZ,
      nap: false,
      score_state: 'SCORED',
      score: {
        stage_summary: {
          total_in_bed_time_milli: inBed,
          total_awake_time_milli: 2400000,
          total_no_data_time_milli: 0,
          total_light_sleep_time_milli: inBed * 0.5,
          total_slow_wave_sleep_time_milli: inBed * 0.25,
          total_rem_sleep_time_milli: inBed * 0.2,
          sleep_cycle_count: 4,
          disturbance_count: 6,
        },
        sleep_performance_percentage: 78 + (i % 18),
        respiratory_rate: 14.2,
      },
    });
    if (i === 5) {
      // One nap — must be skipped by the daily mapping.
      sleeps.push({
        id: `nap-${i}`,
        cycle_id: cycleId,
        user_id: 4242,
        created_at: isoLocal(dayStart + 14 * HOUR),
        updated_at: isoLocal(dayStart + 15 * HOUR),
        start: isoLocal(dayStart + 14 * HOUR),
        end: isoLocal(dayStart + 15 * HOUR),
        timezone_offset: TZ,
        nap: true,
        score_state: 'SCORED',
        score: {
          stage_summary: {
            total_in_bed_time_milli: 3600000,
            total_awake_time_milli: 600000,
            total_no_data_time_milli: 0,
            total_light_sleep_time_milli: 2400000,
            total_slow_wave_sleep_time_milli: 300000,
            total_rem_sleep_time_milli: 300000,
            sleep_cycle_count: 1,
            disturbance_count: 1,
          },
          sleep_performance_percentage: 40,
        },
      });
    }
    if (i % 3 === 0) {
      workouts.push({
        id: `wo-${i}`,
        user_id: 4242,
        created_at: isoLocal(dayStart + 17 * HOUR),
        updated_at: isoLocal(dayStart + 18 * HOUR),
        start: isoLocal(dayStart + 17 * HOUR),
        end: isoLocal(dayStart + 17 * HOUR + 45 * 60000),
        timezone_offset: TZ,
        sport_name: 'running',
        score_state: 'SCORED',
        score: {
          strain: 12.4,
          average_heart_rate: 142,
          max_heart_rate: 168,
          kilojoule: 1800,
          percent_recorded: 100,
        },
      });
    }
  }
  return { cycles, recoveries, sleeps, workouts };
}

const data = fixtures();

function json(res, code, body) {
  const b = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(b);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`${req.method} ${url.pathname}${url.search}`);

  if (url.pathname === '/oauth/oauth2/auth') {
    const redirect = url.searchParams.get('redirect_uri') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const deny = url.searchParams.get('deny');
    const sep = redirect.includes('?') ? '&' : '?';
    const location = deny === '1'
      ? `${redirect}${sep}error=access_denied&state=${state}`
      : `${redirect}${sep}code=mock&state=${state}`;
    res.writeHead(302, { Location: location });
    res.end();
    return;
  }

  if (url.pathname === '/oauth/oauth2/token' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const params = new URLSearchParams(body);
      tokenSeq += 1;
      if (params.get('grant_type') === 'refresh_token') refreshCount += 1;
      console.log(`  token grant_type=${params.get('grant_type')} refreshCount=${refreshCount}`);
      json(res, 200, {
        access_token: `mock-access-${tokenSeq}`,
        refresh_token: `mock-refresh-${tokenSeq}`,
        expires_in: EXPIRES_IN,
        scope: params.get('scope') ?? 'offline read:recovery',
        token_type: 'bearer',
      });
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname === '/developer/v2/user/access') {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = url.pathname.replace(/^\/developer/, '');
  switch (path) {
    case '/v2/user/profile/basic':
      return json(res, 200, {
        user_id: 4242,
        email: 'fatima@example.com',
        first_name: 'Fatima',
        last_name: 'Al Mansoori',
      });
    case '/v2/user/measurement/body':
      return json(res, 200, { height_meter: 1.65, weight_kilogram: 58.0, max_heart_rate: 190 });
    case '/v2/recovery':
      return json(res, 200, { records: data.recoveries, next_token: null });
    case '/v2/cycle':
      return json(res, 200, { records: data.cycles, next_token: null });
    case '/v2/activity/sleep':
      return json(res, 200, { records: data.sleeps, next_token: null });
    case '/v2/activity/workout':
      return json(res, 200, { records: data.workouts, next_token: null });
    default:
      return json(res, 404, { error: 'unknown path' });
  }
});

server.listen(PORT, () => console.log(`whoop-mock listening on :${PORT}`));

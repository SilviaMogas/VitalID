# Connectors

Vital ID connectors pull real health data from external providers. The
catalogue lives in `lib/connectors.ts`; a provider with `integration: "oauth"`
gets a real connection flow.

## WHOOP

WHOOP is the first live integration (OAuth 2.0, API v2).

### Setup

1. Create an app in the [WHOOP developer dashboard](https://developer.whoop.com).
2. Register the redirect URI: `<app origin>/api/connectors/whoop/callback`
   (e.g. `https://vital-id.vercel.app/api/connectors/whoop/callback`, or
   `http://localhost:3000/api/connectors/whoop/callback` for local dev).
3. Set env vars (server-only, Vercel → Project Settings → Environment Variables):

   | Var | Notes |
   | --- | --- |
   | `WHOOP_CLIENT_ID` | from the developer dashboard |
   | `WHOOP_CLIENT_SECRET` | from the developer dashboard |
   | `WHOOP_REDIRECT_URI` | optional; defaults to `${NEXT_PUBLIC_APP_URL ?? request origin}/api/connectors/whoop/callback` |
   | `WHOOP_OAUTH_BASE` | test-only override (default `https://api.prod.whoop.com`) |
   | `WHOOP_API_BASE` | test-only override (default `https://api.prod.whoop.com/developer`) |

4. Apply `supabase/migrations/20260925_vital_id_whoop.sql` (`vital_id_whoop_connections`,
   `vital_id_whoop_daily`).

Requested scopes: `read:recovery read:sleep read:cycles read:workout
read:profile read:body_measurement offline`.

### Data mapping (WHOOP → `vital_id_whoop_daily` → dashboard)

| Dashboard metric | WHOOP source | Column |
| --- | --- | --- |
| Recovery | `recovery_score` (Recovery, joined to Cycle via `cycle_id`) | `recovery_score` |
| Sleep | `(in_bed − awake − no_data) / 3.6e6` (non-nap Sleep, day of `end`) | `sleep_hours` |
| HRV | `hrv_rmssd_milli` (Recovery) | `hrv_ms` |
| Resting HR | `resting_heart_rate` (Recovery) | `resting_hr` |
| Activity | sum of workout durations (day of `start`) | `workout_minutes` |

Days are grouped by the *local* calendar date from each record's
`timezone_offset`. Only `score_state === "SCORED"` records are used; naps are
skipped. A metric is shown with source **WHOOP** when at least one synced day
has a non-null value.

### Source priority

`real connected API (WHOOP) → provider sample (Circular Ring for Fatima) →
manual onboarding baseline → demo fallback`.

### Token lifecycle

WHOOP **rotates refresh tokens** on every refresh. `lib/connectors/whoop/client.ts`
refreshes proactively when the access token expires within 60 s (and once on a
401) and persists the new pair *before* using it. A failed refresh is recorded
as `last_sync_error = 'refresh_failed'`, which surfaces as `needsReauth` in
`GET /api/connectors/whoop/status` and shows a "Reconnect" prompt.

Existing daily rows are never deleted on sync failure.

### Fatima demo caveat

The demo account's connection is keyed by the shared `DEMO_USER_KEY`
(`fatima`), so a WHOOP connection made in demo mode is shared across all demo
visitors on the same deployment.

### Local end-to-end test with the mock

```bash
# terminal 1
node scripts/whoop-mock-server.mjs

# terminal 2 (unset Supabase to use the memory store backend)
env -u SUPABASE_URL -u SUPABASE_SECRET_KEY \
  WHOOP_CLIENT_ID=mock WHOOP_CLIENT_SECRET=mock \
  WHOOP_OAUTH_BASE=http://localhost:4010 \
  WHOOP_API_BASE=http://localhost:4010/developer \
  WHOOP_REDIRECT_URI=http://localhost:3000/api/connectors/whoop/callback \
  npm run dev
```

Then visit `/api/connectors/whoop/connect`. `MOCK_EXPIRES_IN=1` makes tokens
expire immediately to exercise refresh rotation; `?deny=1` on the mock auth URL
simulates a denied grant.

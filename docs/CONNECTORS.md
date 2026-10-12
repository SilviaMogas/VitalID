# Connectors

The catalogue in `lib/connectors.ts` contains 16 entries, but **WHOOP is the
only connector with an implemented, configurable OAuth flow**. The other 15
entries do not connect to provider accounts. Some have clearly labelled,
read-only sample demos; selectable cards can save interest without starting
OAuth; announced-only entries show that they are coming soon. Plan tiers can
affect selection eligibility or limits, but an upgrade does not implement or
enable an integration.

On `/connectors`, the WHOOP connection control appears above the catalogue
filters and search. Sample data is identified as sample data and explored
separately; it is not imported into a member's account as live provider data.

## WHOOP

WHOOP is the only implemented OAuth 2.0 / API v2 connector. A real connection
requires all of the following:

- An authenticated member account (not the Fatima demo session).
- Current, explicit health-data consent for that account.
- Server-side WHOOP client credentials.
- The WHOOP database migration applied to the target Supabase project.

The presence of the flow in source code does not mean that a particular
deployment has credentials configured or that a live provider exchange has
been verified there.

### Setup

1. Create an app in the [WHOOP developer dashboard](https://developer.whoop.com).
2. Register the redirect URI: `<app origin>/api/connectors/whoop/callback`
   (for example, `http://localhost:3000/api/connectors/whoop/callback` for
   local development).
3. Set server-only environment variables (Vercel → Project Settings →
   Environment Variables):

   | Variable | Notes |
   | --- | --- |
   | `WHOOP_CLIENT_ID` | From the developer dashboard |
   | `WHOOP_CLIENT_SECRET` | From the developer dashboard |
   | `WHOOP_REDIRECT_URI` | Optional; defaults to `${NEXT_PUBLIC_APP_URL ?? request origin}/api/connectors/whoop/callback` |
   | `WHOOP_OAUTH_BASE` | Local mock override only; default `https://api.prod.whoop.com` |
   | `WHOOP_API_BASE` | Local mock override only; default `https://api.prod.whoop.com/developer` |

4. Apply `supabase/migrations/20260925_vital_id_whoop.sql` to that Supabase
   project. It creates `vital_id_whoop_connections` and
   `vital_id_whoop_daily`.
5. Sign in as the member who will connect WHOOP, record the current
   health-data consent, and start the flow from `/connectors`.

Requested scopes: `read:recovery read:sleep read:cycles read:workout
read:profile read:body_measurement offline`.

### Data mapping (WHOOP → `vital_id_whoop_daily` → dashboard)

| Dashboard metric | WHOOP source | Column |
| --- | --- | --- |
| Recovery | `recovery_score` (Recovery, joined to Cycle via `cycle_id`) | `recovery_score` |
| Sleep | `(in_bed − awake − no_data) / 3.6e6` (non-nap Sleep, day of `end`) | `sleep_hours` |
| HRV | `hrv_rmssd_milli` (Recovery) | `hrv_ms` |
| Resting HR | `resting_heart_rate` (Recovery) | `resting_hr` |
| Activity | Sum of workout durations (day of `start`) | `workout_minutes` |

Days are grouped by the *local* calendar date from each record's
`timezone_offset`. Only `score_state === "SCORED"` records are used; naps are
skipped. A metric is shown with source **WHOOP** when at least one synced day
has a non-null value.

### Source priority

For authenticated members: connected WHOOP data → manual onboarding baseline → no data (an empty state). Synthetic provider history is restricted to the Fátima/sample-demo contexts. Saving provider interest never imports sample measurements into a member account.

### Token lifecycle

WHOOP **rotates refresh tokens** on every refresh. `lib/connectors/whoop/client.ts`
refreshes proactively when the access token expires within 60 s (and once on a
401) and persists the new pair *before* using it. A failed refresh is recorded
as `last_sync_error = 'refresh_failed'`, which surfaces as `needsReauth` in
`GET /api/connectors/whoop/status` and shows a "Reconnect" prompt.

Existing daily rows are never deleted on sync failure.

### Fatima demo boundary

Fatima is a synthetic demo persona. The demo session cannot start WHOOP OAuth;
the server requires an authenticated member and that account's current
health-data consent. Demo data is not a WHOOP connection and is never evidence
of a live provider account. No WHOOP OAuth connection is shared among demo
visitors.

### Local mock boundary

`scripts/whoop-mock-server.mjs` can simulate the provider side for local
development. Run it with local Supabase still configured and use synthetic
authenticated accounts that have recorded health-data consent; point the
`WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET` and local `WHOOP_OAUTH_BASE` /
`WHOOP_API_BASE` overrides at the mock. Do not unset Supabase: without it, the
app cannot authenticate those members or read their consent. A mock run tests
the app against a simulated provider only; it is **not** evidence of successful
WHOOP OAuth, access to a real WHOOP account, or real provider data.

## Other catalogue entries

The remaining 15 catalogue entries do not have an implemented OAuth/API
connection. Sample providers link to clearly labelled sample-data demos.
Selectable non-integrated entries can save a preference ("Save interest") but
do not read or sync the member's provider account. Announced-only cards are
labelled "Coming soon — API integration pending" and are not selectable.
Changing plan does not turn any of these entries into a live integration.

### Official availability notes (2026-10-12)

- The official [Solana ID site](https://app.solana.id/) announced that its
  Hub/API would close at the end of September 2026. No Solana ID connector has
  been added.
- The official [CUDIS API v1 documentation](https://developer.cudis.xyz/infrastructure/cudis-apis/api-v1)
  describes access as invitation-based with Client IDs obtained manually. Its
  steps and sleep data are marked **"In Development, Not Yet Available"**. No
  CUDIS connector has been added.

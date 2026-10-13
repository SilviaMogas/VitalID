# Wearable integrations

Generic connector framework in `lib/connectors/wearables/` (Oura, Strava via OAuth;
Apple Health / Health Connect via device push). WHOOP keeps its own module.

> Provider endpoints, scopes and limits below come from public developer docs and
> third-party summaries as of Oct 2026 and were **not** verified against live
> accounts from this environment. Test each flow once with a real account.

## What you can connect today (≈30 min each)

| Provider | Access | Steps |
| --- | --- | --- |
| **Oura** | Self-serve developer app (personal apps are capped at a small number of users until Oura approves — check current limit) | 1. Create app at cloud.ouraring.com/oauth/applications 2. Redirect URI `<origin>/api/connectors/wearables/oura/callback` 3. Set `OURA_CLIENT_ID/SECRET` 4. Apply migration 5. Connect from `/api/connectors/wearables/oura/connect` |
| **Strava** | Self-serve (new apps start with a single-athlete limit until approved — verify) | 1. Create app at strava.com/settings/api, callback domain = your domain 2. Set `STRAVA_CLIENT_ID/SECRET` 3. Same as above |
| **WHOOP** | Already implemented | see `docs/CONNECTORS.md` |

Apply `supabase/migrations/20261013_vital_id_wearables.sql` first.
Routes: `GET /api/connectors/wearables/{oura,strava}/connect`, `POST …/sync`,
`GET …/status`, `POST …/disconnect`.

## Not doable in 30 minutes

| Provider | Why |
| --- | --- |
| Garmin | Health API requires a partner application and approval. |
| Fitbit | Legacy Web API is being turned down (Sept 2026 per Google); replacement is the Google Health API with restricted scopes needing a security review. Do not build on the legacy API. |
| Apple Health / Health Connect | No cloud API; needs a native iOS/Android companion app. The backend half exists: `PUT /api/connectors/wearables/ingest` issues a push token, `POST` accepts `{source, days[]}`. |
| Withings, Polar | Self-serve OAuth, good next candidates (same framework: add a config in `registry.ts` + a mapper). |
| Aggregators (Terra, ROOK, Spike, Open Wearables, Thryve) | One integration for many brands. Paid plans were quoted around $399/mo in competitor-written comparisons (unverified); Open Wearables is MIT/self-hostable per its own site. |

## Not wired yet

Catalogue entries for Oura/Strava still say `integration: "none"` on purpose: the connector card and setup wizard hardcode WHOOP routes, so flipping them now would show broken links.

Synced rows land in `vital_id_wearable_daily` but `lib/user-data.ts` does not read
them yet (dashboard still shows WHOOP/manual only), and there is no connect button
UI for Oura/Strava. Next step: a `WearableConnectorCard` and a source-priority branch.

## Sources
- Open Wearables: https://openwearables.io/integrations
- Thryve guide: https://www.thryve.health/blog/wearable-api-integration-guide-for-developers
- Google Health API / Fitbit turndown: https://developers.google.com/health/about
- Google Fit migration FAQ: https://developer.android.com/health-and-fitness/guides/health-connect/migrate/migration-faq

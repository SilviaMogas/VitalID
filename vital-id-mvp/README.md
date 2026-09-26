# Vital ID

An elder-friendly, Arabic-first mobile web demo: a person sees a dashboard for today, week, month or year, then records a voice check-in, reviews synthetic wearable signals and an editable summary, then shares selected fields with a chosen recipient via an expiring, revocable QR link.

**Demo context:** presented by Silvia Mogas at **Fish Tank, Hub71 Abu Dhabi — Friday 25 September 2026**. Demo persona: **Fatima, founder preparing for an investor meeting (fictional)**. Fátima’s story, profile and year of diary trends are fictional. The dashboard uses diary entries for period summaries, and labels the single Circular reading separately. PLAUD and other apps are managed under Settings; their presence in Fátima’s profile does not mean a live account connection. The Circular panel uses a small, non-identifying numerical excerpt from a sample HAR supplied for this demo; it is not a live ring connection.

## Run

Requirements: Node 22, npm 10.

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # vitest unit tests
npm run test:e2e   # playwright e2e (needs `npm run build` + server on :3000, or it reuses a running one)
npm run lint
npm run typecheck
npm run build
```

Playwright browsers: `npx playwright install chromium` (falls back to system Chrome if downloads are blocked — set `channel: 'chrome'` in `playwright.config.ts`).

### Sharing to a phone on stage (QR over LAN)

Share URLs are built from `window.location.origin`. To let a phone scan the QR, run the server on your LAN and set an override:

```bash
NEXT_PUBLIC_SHARE_BASE_URL=http://<laptop-ip>:3000 npm run start
```

Then the QR on the issued-link page encodes the LAN URL.

## Deploy to Vercel

Import the repo into Vercel and pick a share-store backend via environment variables (`GET /api/health` reports which one is active):

- **Upstash Redis** (recommended): Vercel Storage → Upstash Redis injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`; `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work.
- **Supabase**: create the table with `supabase/schema.sql`, then set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_SHARES_TABLE=vitalid_shares`. `SUPABASE_SCHEMA` is optional for projects that expose a non-`public` schema.
- **No backend set**: the file-based store falls back to per-instance memory — shares will be unreliable on Vercel (a warning is logged).

`NEXT_PUBLIC_SHARE_BASE_URL` is not needed on Vercel — share URLs are built from the request origin.

### PLAUD import (optional)

Set `PLAUD_TOKENS_JSON` to the JSON content of `~/.plaud/tokens.json` after running `npx -y @plaud-ai/cli login`. Server-side only — tokens are never sent to the browser. If the access token expires it is refreshed automatically; on Vercel a rotated refresh token lives only in memory (not persisted back to the env var), so re-deploy with fresh tokens if auth starts failing. Without the env var, the import section simply doesn't render.

### WHOOP live signals (optional)

Set `WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET` from a WHOOP developer app (register `{origin}/api/whoop/callback` as the redirect URI; `WHOOP_REDIRECT_URI` overrides it). Once set, the signals page offers "Connect my WHOOP": a standard OAuth flow stores the tokens in an AES-256-GCM httpOnly cookie (`vitalid_whoop`, 30 days; `WHOOP_COOKIE_SECRET` overrides the encryption key, which defaults to the client secret). Signals then show live recovery/sleep data marked as live; otherwise synthetic demo data is shown. `WHOOP_MOCK=1` returns a fixed fixture for local dev only (ignored on Vercel).

## What works / what is simulated / what is pending

| Area | Status |
| --- | --- |
| Bilingual AR/EN UI with RTL/LTR toggle | ✅ Real |
| Consent gate before any data entry | ✅ Real |
| PLAUD import (recordings → transcript) | ✅ Real — Silvia's own account via the official PLAUD API; needs `PLAUD_TOKENS_JSON` |
| Check-in transcript (manual paste or sample) | ⚠️ Fallback path — no live transcription |
| Wearable signals (sleep, RHR, HRV, recovery) | ✅ Real via WHOOP OAuth when connected; ⚠️ Circular sample snapshot for Fátima, synthetic data otherwise |
| Work hours and Pomodoro | ✅ Manual work tracking, editable schedule, 25/5 timer and local overwork reminders; saved in this browser, no calendar sync |
| Rule-based summary extraction | ✅ Real (deterministic local keyword classifier, no LLM) |
| Edit / delete / restore / add note | ✅ Real (localStorage) |
| Expiring, revocable share links + QR | ✅ Real (in-memory + `.data/shares.json` on the demo server) |
| Recipient read-only view with live expiry | ✅ Real |
| Personal accounts and history | Supabase Auth and RLS-backed daily history when configured; Fátima stays a local fictional demo |

## Honesty statement

- **PLAUD Note Pro** and **WHOOP 5.0** are devices the presenter owns and personally uses. Vital ID has **no partnership or sponsorship** with either product. When configured, the check-in can import recordings from the presenter's own PLAUD account via its official API, and the signals page reads live data from her own WHOOP account via the official OAuth API; otherwise transcripts are pasted and wearable numbers are synthetic demo data, clearly labelled.
- Vital ID does not give medical advice or diagnoses.
- The persona "Fatima" is fictional. Her example 9h 20m workday is part of the demo story; actual overwork alerts use the user’s locally tracked work and chosen hours. Her Circular, PLAUD, WHOOP, Cronometer and RENPHO Health entries are demo connections. Oura Ring, Stream by Sandbar, Lumia Health and FlamAid appear only in the discovery catalogue and have no live Vital ID integration. FlamAid is a personal safety device, not a health sensor; Vital ID does not trigger its emergency alerts. The Cronometer food log and RENPHO scale change are fictional examples, not imported account data. Only non-identifying numerical values from the supplied Circular HAR are included in source; the HAR, account profile, device IDs, headers and tokens are not committed.

## Licence & attributions

**All rights reserved — Silvia Mogas.** Private repository; no licence granted.

Dependencies: Next.js (MIT), React (MIT), Tailwind CSS (MIT), qrcode (MIT), vitest (MIT), Playwright (Apache-2.0).

## Broccoli guide

The in-flow local SVG guide accompanies welcome, consent, dictation/paste, signals,
summary editing, field selection, link creation, QR and revocation in Arabic and English.
The guide never interprets health signals or offers medical advice. Sample history is disclosed once during onboarding, while sample wearable readings remain labelled at the point of use.

Speech uses the browser's existing Web Speech API only. Nothing autoplays. Listen
requires an installed/available voice matching the selected language; missing Arabic
voices leave the full text visible. Voices that load later are detected through
`voiceschanged`. Playback failure and startup timeout fall back to text. Mute is
shared with summary Read Aloud, persists in localStorage where available, and never
starts playback when turned off. Route/language changes cancel speech. Dictation
uses the existing browser recognition implementation and interrupts speech; browser
support, microphone permission and potentially browser-provider network service
are still required. There is no configured external TTS integration.

The guide stays in document flow, uses native keyboard buttons, inherits RTL/LTR
and large-text mode, and respects reduced motion. Only the guide message is a live
region; mouth animation and voice-button state do not repeat it. The QR countdown
no longer announces every second. Revocation errors remain visible and do not
trigger a success message.

Validation: `e2e/guide.spec.ts` covers mobile Arabic/English sample-data flows,
summary edits, field selection, QR/recipient access, failed and successful revocation,
mute persistence, keyboard activation, absent voices, no autoplay and reduced motion.
Speech in automated tests is mocked; actual Arabic audio quality and physical-phone
QR scanning require manual testing on the demo device. CI runs lint, typecheck,
unit tests, build and Chromium e2e with screenshots in the mobile-test-results artifact.
No real integrations, personal recordings or HAR files are used by these tests.


## Daily wellness journal

Vital ID now starts with a human question: “How are you feeling today?” The person
can speak or type, choose a mood and energy level, and optionally add movement,
exercise minutes, food and hydration. Saving the check-in feeds the existing signals,
editable summary and selective sharing flow.

The daily history is local to the current browser. It stores one entry per local
calendar day and combines the person’s own words with mood, energy, movement, food
and the current wearable source. The recap is deterministic and descriptive. It
does not diagnose, prescribe, score health risk or infer a condition. A low mood
selection shows a brief suggestion to contact a trusted person and local emergency
services if urgent help is needed.

### Data-source hub

- WHOOP: the existing OAuth connection is real when developer credentials are set.
- PLAUD: the existing server-side recording import is real when `PLAUD_TOKENS_JSON`
  is configured.
- Apple Health: a browser cannot read HealthKit. A real connection requires an iOS
  app/HealthKit bridge or a consented export importer; Vital ID never asks for an
  Apple ID password.
- Food, hydration, movement and exercise: available as manual daily entries.
  Cronometer/MyFitnessPal or other providers require separate API access and user
  consent and are presented as future connections, not as live integrations.

This browser-local history is suitable for the demo but is not a production medical
record. Multi-device sync, accounts, clinical audit trails, provider API contracts,
HealthKit entitlements and regulated-product review remain future work.


## Fatima full demo, memberships and account backend

The welcome action now opens a local demo registration for the fictional persona Fatima.
Entering the demo seeds seven synthetic days covering mood, energy, movement, food and
short diary notes. Today remains empty so the user can answer a personalised prompt
about Fatima's fictional investor meeting. The profile, demo membership and history remain in localStorage;
no account is created and no personal data is uploaded.

The membership screen supports Free, Plus and Circle demo selections without charging.
Real checkout buttons appear only when both `STRIPE_PAYMENT_LINK_PLUS` and
`STRIPE_PAYMENT_LINK_CIRCLE` are configured with HTTPS Payment Links. The browser
never receives a Stripe secret. Production subscription state still requires a
verified Stripe webhook.

`supabase/daily_wellness.sql` prepares authenticated profiles, daily entries and
membership state with row-level security. The local Fátima demo remains separate. Personal accounts now use Supabase Auth and
user-scoped history when a publishable key and the SQL schema are configured.
Secret/service-role keys must remain server-side.


## Broccoli coach and daily challenges

The broccoli guide now has a gentle idle motion, blinking, speaking motion and a
confetti celebration. Its browser voice uses a slightly quicker rate and higher pitch
for a warmer, more playful delivery; actual voice timbre still depends on the voices
installed in the browser. Nothing speaks on page load. Completing a challenge is an
explicit user action and may trigger the celebration voice unless the journey is muted.

Check-in and history offer one optional daily challenge, selected deterministically
from water, gentle stretching, an easy walk and social connection. The user can choose
another idea, mark one complete and keep completion locally for that calendar day.
Challenges are general wellbeing prompts, do not use wearable measurements, do not
diagnose, and include comfort/choice language. All animation respects
`prefers-reduced-motion`.

## Animated welcome and Fátima coaching
The three local SVG vegetables gather into a V and reveal Vital ID. Reduced motion
shows the final composition immediately. The welcome opens Log in / Sign up options,
with clear account-connection status and a working Log in as Fátima demo action.
Fátima opens straight into her check-in because all her data is fictional. Personal accounts still use the consent screen. Existing browser history is preserved when entering again.

Fátima's check-in includes a bilingual sample story: 5h 40m sleep, dinner and a glass
of wine, an investor-meeting pulse peak and a +0.3 kg sample scale change. These are
fictional illustrative observations, not live readings or causal conclusions.
The coach responds to selected mood with authored supportive copy. Topic cards,
optional browser speech and adding a response to the editable daily note work.
This is a guided demo with authored coaching responses, not a live AI conversation.

## Personal accounts via Supabase

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (or the existing
`SUPABASE_ANON_KEY`) in the deployment environment. Apply
`supabase/daily_wellness.sql` in the same Supabase project. Auth uses only the
publishable key and each user's session token; it never uses the service-role
key for personal records. Enable email/password sign-in and set the Auth site URL
and allowed redirect URLs to include `/auth/callback` on the deployed domain.
Email confirmation may be required depending on Supabase Auth settings.

Log in and Sign up use Supabase Auth. Access and refresh tokens are kept in
HTTP-only same-site cookies, with refresh on expiry. Account history is loaded
from the RLS-protected daily entries table and check-ins are saved to that table.
Signing out clears the session and local account data. Switching to Fátima clears
personal data first; Fátima has her own seven-day fictional story and remains
browser-local. Account creation/sign-in stay visibly unavailable when the public
Supabase key or URL has not been configured. Live provider access and account
email confirmation should be checked on the final deployed domain.

## Fátima's fictional profile
Entering Fátima seeds a 42-year-old founder profile with a bilingual lifestyle,
a sample vitamin and food log (D, B12 and C), and goals for more consistent sleep,
enjoyable movement and steadier meeting days. These are presented on check-in and
history; the coach references her sleep goal. They are invented, self-reported demo
details, not measured vitamin levels, diagnoses or supplement recommendations.


### Fátima’s complete app demo

The demo dashboard opens on a fully populated fictional **today**, with an illustrated portrait, profile, simulated connector settings, mood/text/voice check-in, recovery/sleep/activity rings, period averages, meals/macros, body measurements, routine and work-break prompts. The story continues into a scripted reflective exercise and a fictional tomorrow calendar with locally saved priorities. This is a deterministic demo, not an AI therapist or a live calendar integration. All ten demo source switches are local simulation controls; historical demo readings remain visible when switched off. Personal-account dashboards do not receive these fixtures.

The connected-day metrics in `lib/demoExperience.ts` are entirely fictional, including the Circular-labelled simulated values. The original supplied Circular sample remains separate at `/signals`. Reflection and planning entries persist in this browser and are cleared on account changes. Voice dictation uses the browser’s available speech recognition with a text fallback. Animations respect reduced-motion preferences.


## Vital ID onboarding and insurer information pack

Start at `/onboarding` for the five-screen English/Arabic flow. See [the implementation notes and 60-second demo](docs/onboarding-mvp.md) for data provenance, consent, link access, document limits, audit limitations and integration boundaries. The insurer demo is fictional; no insurer is integrated or contacted.

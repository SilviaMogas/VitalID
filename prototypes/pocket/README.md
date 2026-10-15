# Pocket → Vital ID: synthetic integration laboratory

**Status: isolated prototype, not a working Pocket connection.** No application
route, catalogue entry, migration, credentials, live API call or production
configuration was added. Run with Node 20+; no package installation is required:

```sh
node --test prototypes/pocket/pocket-lab.test.mjs
```

The 19 automated tests passed locally on 2026-10-15 with Node 24.19.0.
They exercise domain behavior using synthetic sessions, keys, provider responses
and webhook requests. They do not verify real Pocket schemas, Supabase/RLS,
HTTP authentication, distributed transactions, end-to-end delivery or deployment.

## Verified evidence and open assumptions

Reviewed repository tree: `c14ed297033c8d63f46689338ec7568c1968f366`.

| Evidence | Finding | Implication |
| --- | --- | --- |
| [Pocket API](https://docs.heypocketai.com/docs/api) | Personal keys use Bearer authentication | No consumer OAuth flow is assumed or implemented |
| [Recording detail](https://docs.heypocketai.com/docs/api/recordings/get-recording-details) | `include_transcript=false`, `include_summarizations=true`, optional `summarization_id`; response owner is `recorded_by.user_id` | Future adapter should request only selected summary, explicitly disable transcripts and verify ownership |
| Same detail reference | Example has `summarizations: null` | REST summary shape remains unverified; the lab's map follows the webhook example and is an explicit assumption |
| [Webhooks](https://docs.heypocketai.com/docs/api/webhooks) | Personal destinations configured in the app; separate signing secret; owner `user.id`; at-least-once; summary and deletion events | Per-user endpoint routing plus owner check; durable deduplication and deletion tombstones required |
| Same webhook reference | Hex HMAC-SHA256 over timestamp (milliseconds), dot and exact body bytes | Verify before JSON parsing; lab additionally enforces a five-minute clock window and payload bound |
| [Organization API](https://docs.heypocketai.com/docs/api/organization) | Organisation roles and scoped organisation keys | Separate capability, not used; availability is not inferred from public documentation |
| Manuel's 15 October response, supplied by Silvia | Personal key creation path; rotation/revocation invalidates old key; organisation controls Enterprise; consumer OAuth unconfirmed | No Enterprise dependency and no invented OAuth support |

The email was supplied as task context, not independently re-read. Documentation
was read directly on 2026-10-15. No real key or webhook secret was requested.

## Current Vital ID architecture

- `lib/auth/server.ts` validates member identity with Supabase. Future routes
  must derive the owner from server authentication, not request JSON, email,
  Pocket's payload alone or a demo session. Signup currently auto-confirms email;
  email matching cannot prove Pocket account ownership.
- `app/api/wellness/route.ts` applies same-origin checks, authentication, bounded
  JSON and current health-data consent. Authenticated deletion is allowed without
  current health consent. `lib/wellness/store.ts` uses server-only Supabase RPCs,
  with no in-memory fallback.
- The wellness SQL table currently constrains `kind` to `workout|supplement`.
  A Pocket note cannot be inserted there without a deliberate schema/API change.
- `lib/consent.ts` records policy acceptance but has no withdrawal operation.
  Pocket requires additional connector-specific consent, selection and withdrawal
  records. Production must fail closed without persistent consent storage.
- WHOOP has an existing flow and token store. Do not reuse its token lifecycle
  for personal Pocket API keys. Do not copy its memory fallback into production.
- README/CONNECTORS identify WHOOP as the implemented OAuth connection. The
  current tree also contains Oura/Strava wearable OAuth scaffolding/configuration;
  that source presence does not establish configured or operational integrations.
  Pocket is absent, and the open PR search returned no Pocket result.

## Recommended member flow (design, not implemented UI)

1. Sign in as an authenticated member with current health-data consent.
2. Explain that a personal key may grant broader account access than the chosen
   notes. Obtain separate, versioned consent to that access and processing.
3. Submit the personal key once over HTTPS to a same-origin server route. Never
   persist it in localStorage, cookies, browser state, analytics or application
   logs. Entry necessarily passes transiently through the browser: 'server-only
   storage' is not a claim that a typed key never touches the browser.
4. Configure a personal webhook manually in Pocket; transfer its separately
   generated signing secret once. Reject legacy unsigned webhooks. Establish a
   verified Pocket owner binding from authenticated provider data and signed
   challenge delivery, not a user-entered email or owner ID.
5. On an explicit member action, show a minimal, non-persistent recording picker,
   then selected summary preview. Require approval of the exact preview/version.
   Request metadata/list access only after its consent. Confirm with Pocket what
   listing includes: the list example does not prove summary-free responses.
6. Store only the selected note and minimal provenance in a separate private
   note table. Render as escaped plain text or sanitised Markdown. Label it as a
   personal AI-generated note, not a clinical measurement or verified diagnosis.
7. Do not include notes in Vital ID share snapshots, insurer views, community,
   Coach prompts, public proofs or analytics by default. Any later sharing or AI
   processing needs an independently specified, explicit approval flow.
8. Offer remove-note, withdraw consent, disconnect and reconnect. Explain that
   disconnect is local; it does not revoke the personal key at Pocket. The user
   must revoke the key and delete the webhook in Pocket too.

## What the executable lab does

`PocketLab` accepts injected synthetic session authentication and health-consent
lookups. It has no network transport or HTTP listener. It rejects non-synthetic
keys and live-mode providers. A caller cannot authenticate by supplying an owner
object. The injected authenticator is a test stub, not Supabase authentication.

- Separate, explicit policy consent and recording/summary selection.
- AES-256-GCM encryption for in-memory credential and selected note values;
  associated data binds ciphertext to owner, connection and purpose. Random test
  keys exist in process memory only. This demonstrates envelope boundaries, not
  a deployed vault, KMS, key rotation or database encryption policy.
- Revalidation of provider response owner, recording and summary before import.
- Single-record idempotence keyed by owner, connection, recording and summary;
  synchronous commit after awaits prevents concurrent duplicate rows in one
  process. One active connection per member avoids parallel duplicate imports.
- Raw-byte HMAC validation, strict hex/timestamp parsing, bounded body, clock
  tolerance and rejection of organisation-scoped/incorrect-owner events.
- `summary.completed` is notification-only. No webhook summary, transcript,
  email or speaker data is saved, and no automatic provider read occurs.
  The member calls `importSelected` for an approved selection.
- A signed `recording.deleted` removes every locally imported summary for that
  recording. A minimal tombstone blocks late or repeated imports, including
  after reconnect within this lab process. Deletion works after consent loss
  or a provider auth failure. Disconnect clears credentials and all notes and
  rejects future deliveries on that connection.
- 401/403 conservatively pauses sync, clears the stored API key and selections,
  and requires explicit reconnect. 403 is not claimed to prove revocation.
  Existing notes remain private until removed/disconnected; signed deletion
  remains available. No polling or silent auth retry is implemented.
- 404 conservatively removes and tombstones the recording; 429/5xx/network
  failures do not mark imports complete or discard credentials. A real provider
  may use 404 for permission loss; confirm semantics before choosing this policy.
- Consent withdrawal purges notes and API key. The webhook secret is retained
  solely to authenticate deletion until disconnect. This retention must be
  explained and time-bounded in a real deployment.
- In-flight fetches cannot commit after disconnect, withdrawal, deletion or
  selection removal. Health consent is checked again after the await.

## Why personal API keys limit a multi-user application

There is no documented consumer OAuth authorization/refresh/revocation flow in
the reviewed material. Do not invent scopes, refresh tokens, expiry or a revoke
endpoint. A personal key is a long-lived bearer credential with access not
proven to be limited to selected summaries. It cannot safely be shared across
members. Each connection needs independent encrypted credentials, webhook secret,
verified Pocket subject and owner-scoped access. A compromised server key could
expose more content than Vital ID ever intended to import.

Personal webhook setup is manual; the published creation API is organisation
scoped. Do not call that API with consumer keys or assume Enterprise access.
Webhook payloads can contain transcripts and unrelated content even if only a
summary is selected locally. Confirm Pocket supports disabling those fields and
limiting event subscriptions. If event delivery cannot be narrowed sufficiently,
prefer explicit one-time imports without summary webhooks; offer export/import
as a fallback until a suitable consumer integration contract exists.

Rotation/revocation of an API key may not revoke the independently configured
webhook secret or send an immediate event. No push revocation guarantee is
assumed. Stop on the next 401/403 and provide local disconnect immediately.
Since the lab returns duplicates without another provider call, it does not
claim immediate revocation detection. A future deployment needs an agreed,
minimised validation cadence and status freshness UX. Do not probe unrelated
recordings merely to check a key.

## Exact dependencies before real integration

1. Pocket: a disposable test account, synthetic recordings, personal test key
   and a newly signed personal webhook. Confirm consumer multi-user key custody
   is permitted; key scope/lifetime/limits, owner identity verification,
   webhook secret lifecycle, retry/delayed-delivery semantics and deletion
   coverage (trash, permanent deletion, account closure).
2. Real schema evidence: redacted/synthetic REST summary response and webhook
   fixtures. Verify `summarizations` map shape, processing status, selected IDs,
   actual error codes and whether REST subject equals webhook `user.id`.
3. Authenticated Next.js handlers with `server-only` modules, validated sessions,
   same-origin/CSRF protection, rate limits, streaming body bounds before buffering,
   generic errors, `Cache-Control: no-store`, no payload/key logging and no redirects
   for authenticated provider fetches. Hard-code the official Pocket origin; do
   not accept client URLs. Add request timeouts and bounded API responses.
4. Supabase design and migrations: separate connections, consent events,
   selections and private notes; unique owner/connection/recording/summary key;
   persistent minimal tombstones; RLS with no direct anon/authenticated grants;
   owner-scoped server RPCs and transaction locks. Multi-worker concurrency,
   retry and database permissions must be tested against a disposable database.
   No migration is included/applied by this prototype.
5. Encrypted server storage backed by a managed secret store/KMS, key versions,
   rotation and recovery policy. No production memory fallback. Do not persist
   raw webhook envelopes in queues, error tools or dead-letter stores. If jobs
   are used, queue only authenticated minimal identifiers transactionally.
6. Content preview/approval digest and immutable version, selected-note display
   and deletion UI; explicit handling of changed/regenerated summaries. The lab
   imports once and never silently overwrites an approved note.
7. Deletion reconciliation: Pocket documents only three delivery attempts, so
   webhooks alone are insufficient. Recheck selected retained recordings on a
   consented cadence; specify handling of permanently missed events, unavailable
   keys, backups and deletion completion windows. Bound tombstone retention while
   preventing replay. Disconnect should delete local notes before losing hooks.
8. Dedicated security review and authorisation for staging/live testing and any
   production activation. Verify two-account HTTP isolation and RLS, log
   redaction, crash/retry recovery, signature clock tolerance and credential
   handling with actual provider fixtures. No such approval or verification is
   claimed here.

## Decision

Proceed with this isolated lab and an explicit-selection, private-note design.
Do not advertise Pocket as connected. Do not activate an unattended consumer
sync using personal keys until scope, account binding, data minimisation,
persistent isolation and deletion/revocation behavior have been resolved.

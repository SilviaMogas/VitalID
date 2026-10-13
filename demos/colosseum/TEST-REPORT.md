# Verification report

This report separates local cryptographic/software checks, injected dependency
simulations, verified devnet receipts and revision-specific browser observations.
The browser evidence and the later code revision are identified separately.

## Current code verification — PR #80 (2026-10-13)

PR #80 merged the status-refresh fixes at `8f86010`. At that revision,
`npm test` passed **50/50** and `npm run build` passed. The tests cover bounded
sequential status refreshes and generation-aware post-mutation client refreshes.
The final targeted browser run at
`8f86010b7e6c3fee5722ce448c48694013a35e2b` passed as recorded below.

The real deployment and browser lifecycles below were verified independently.
Deployment verification records executable devnet code, exact deployed-artifact
byte equality and finalized receipts.

## Earlier local tests — 2026-10-12

This historical follow-up validates the reviewed Sonar,
account-existence, source-projection and preparation-quota fixes. The tested code
revision is `f783f36953711e04685b6aa0697a44c22aa7937d` on
`devin/1791812117-colosseum-review-fixes`, PR
https://github.com/SilviaMogas/VitalID/pull/63. PR #62 was merged externally during
the session; the follow-up is separate. These local checks are not evidence of
devnet execution or production integration.

| Area | Evidence |
|---|---|
| Dependency lock | `npm install --package-lock-only` added direct `@noble/curves@2.4.0`; all other locked versions were unchanged. npm reported four moderate transitive advisories. A nested `npm ci` had succeeded in the previous verification. |
| Portable controller and real BBS | `node --test test/crypto.test.mjs`: 9 passed, 0 failed. Includes independent native WebCrypto verification of a Noble signature and real BBS proof authorization, plus sign/derive/verify, tampering and insufficient-assertion cases. |
| HTTP/API lifecycle | Focused final-chain challenge-expiry race test: 1 passed in the prior run. `npm test`: 30 passed, 0 failed. Includes 21 failed create preparations followed by successful preparation after adapter recovery. Ephemeral Node listeners exercise session, cookie, origin, preview, permission, challenge, proof, summary and denial paths. |
| Solana CLI path | `node --test test/devnet-setup.test.mjs`: 1 passed, 0 failed; validates absolute executable resolution and rejects relative, non-executable, directory and group/other-writable paths. `npm run devnet:keys` (`--prepare-only`) passed without faucet or deployment operations. |
| Simulated Solana dependency | The server suite injects a fake adapter; the adapter suite injects a stub connection. These are negative-path/control-flow tests, not real RPC evidence. |
| Demo bundle | `npm run build`: passed. |
| Native permission program | `cargo test --manifest-path program/Cargo.toml`: 2 passed, 0 failed; doc tests 0/0. Rust unit tests only; no validator execution or deployment. The existing Solana API deprecation warnings were non-fatal. |
| SBF artifact | `cargo build-sbf --manifest-path program/Cargo.toml --sbf-out-dir .local/sbf`: passed. Artifact: 67,272 bytes, SHA-256 `e541154cc717db0673dc8c035d34e6672abf18b8c3f7f20619f537254e65712e`. The CLI kept its generated program keypair in ignored `.local/sbf/`; no keypair remained under `program/target/deploy/`. |
| Root privacy fix | Focused privacy regression: 9 passed. Root isolation suite: 29 passed, 0 failed. Covers missing recipient accounts, lookup failure, and source allowlisting. |
| Root static checks | `npm run lint`, `npx tsc --noEmit -p .` and `npm run build`: passed. |
| CI at tested revision | Four passed, none failed/pending: build, SonarCloud Code Analysis, Vercel, Vercel Preview Comments. No quality-gate rules were changed. |

## Historical browser verification — local/fail-closed paths (2026-10-12)

This earlier bounded run used Chrome 137 and three independent cookie jars at
the tested local revision above. Native Ed25519 was unsupported in this browser;
the actual Noble fallback produced enrollment signatures accepted by the server.
The run predated deployment and did not demonstrate successful chain activity;
its local/fail-closed observations are historical.

Observed passes:

- Independent holder, recipient and outsider enrollment/session isolation.
- Identity-off preview containing only the selected fictional height and weight.
- Failed preparation visibly denied without receipt or grant; retry pruned the
  previous never-submitted failure instead of accumulating quota entries.
- Recipient challenge and summary denied; outsider had no permissions.
- Recipient HTML, CSS, browser bundle, DOM and captured successful API bodies
  contained no actual hidden name, daily records or signed credential.
- Observed requests were local only, with no Analytics or third-party fetch.
  Browser storage inspection found no localStorage/sessionStorage/IndexedDB
  entries; enrollment transmitted a public key and signature, not a private key.
  This is bounded observation, not a memory-security audit.
- Holder and recipient views were usable at 390×844 without horizontal overflow.

**Historical capture gap (superseded for the cases in “Bounded denial-body
verification — 2026-10-12” below):** error-response bodies timed out after three
seconds in the initial browser observer; that run checked status and denial UI
only. A later bounded run captured complete bodies for the listed cases. Other
error cases remain untested.

After recording, the unchanged server was restarted with the exact HTTPS preview
origin. Direct server checks passed: matching Origin → 200 and a Secure,
HttpOnly, SameSite=Strict cookie; foreign Origin → 403 without a cookie.
Preview-browser enrollment remained untested because that browser reached the
Devin sign-in screen. The local recording is not preview-browser E2E evidence.
Restarting discarded all previous demo sessions as designed.

## Real local Supabase member-sharing verification

The main application (not the isolated proof lab) was exercised on local
Supabase Auth/Postgres/PostgREST with synthetic accounts and manual readings.
No production Supabase, WHOOP, Stripe or real health records were used.

At `dc06806`, independent owner, recipient, outsider and anonymous browser
sessions verified signup/onboarding, persisted readings, exact selected-field
preview, recipient-account lookup rejection, consent reset, creation and
recipient access. Identity was deselected: the recipient saw only sleep
7.2 hours, resting heart rate 61 bpm and the manual source. Its snapshot matched
the preview; internal owner/recipient metadata was absent. Anonymous access
returned 401 and outsider access 404.

At `73b3213`, a focused repeat verified creation, recipient access, revocation
and recipient denial with real local database persistence. The owner result
and past-links row both showed revoked without a manual refresh; the recipient
automatically cleared previously displayed readings. This fixes the transient
owner result/list mismatch observed during asynchronous list refresh, not a
proven server-side revocation failure.

These are local integration results, not evidence of production RLS/security
or on-chain operation. **Historical capture gap (superseded for the three
member-sharing denials in the bounded verification below):** the original run
verified statuses and visible denial but did not retain complete response
bodies. Captured browser traffic was local and no insurer-send request was
observed, but this is not an exhaustive egress or response-body privacy audit.

## Bounded denial-body verification — 2026-10-12

This follow-up used Chrome 137 at revision
`9499dd132d7c05a6dfd589835f5475450dab8ee0`, independent sessions and real local
Supabase. It supersedes the earlier incomplete-body-capture statements only
for the cases below.

The lab body **D** is exactly `{"error":"unavailable"}` (23 UTF-8 bytes);
member-sharing body **M** is exactly `{"status":"unavailable"}` (24 UTF-8
bytes). Every response had `Cache-Control: no-store`.

| Case | Activation | Status | Complete body |
|---|---|---:|---|
| Proof preparation | Native UI | 503 | D |
| Summary preparation | Native UI | 503 | D |
| Recipient challenge | Native UI | 404 | D |
| Recipient summary | Native UI | 404 | D |
| Authenticated outsider | Clearly labeled in-page fetch probe | 404 | D |
| Anonymous lab session | Clearly labeled in-page fetch probe | 401 | D |
| Different Origin | Browser-generated form from another local port; browser listener | 403 | D |
| Anonymous member sharing | Native UI | 401 | M |
| Outsider against active share | Native UI | 404 | M |
| Recipient after UI revocation | Native UI | 404 | M |

Complete bodies were read with `Response.clone().arrayBuffer()` while returning
the original response untouched. The 403 body was captured by a browser
listener on the navigation response; no CORS bypass was used. No private data
or stack details were observed in these bodies. The capture timeouts resolved
in this bounded run only; this is not an exhaustive privacy audit.

## Verified devnet deployment and smoke evidence — 2026-10-13

The program is deployed and executable on official Solana devnet
(genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`):

- Program:
  [`5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k`](https://explorer.solana.com/address/5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k?cluster=devnet).
- The deployed program bytes matched the 67,272-byte SBF artifact exactly.
  Artifact SHA-256:
  `e541154cc717db0673dc8c035d34e6672abf18b8c3f7f20619f537254e65712e`.
- Deployment signature:
  [`5azeXpbggRuVUh7Bszrh7mfesTPJVu8NVJB5PK42FmMVuE419LeaTG2Drk56HLgpSVFqD2ackUBzkzsmBbC2mSYk`](https://explorer.solana.com/tx/5azeXpbggRuVUh7Bszrh7mfesTPJVu8NVJB5PK42FmMVuE419LeaTG2Drk56HLgpSVFqD2ackUBzkzsmBbC2mSYk?cluster=devnet),
  slot `510508732`, timestamp `2026-10-13T04:44:21Z`. The signature was
  independently verified finalized with `err: null`.
- Upgrade authority is retained by disposable payer
  `8wU9Y36gQ6yx3SSZjyoM3HUyFyukbkWmoSeTNv2YuUNA`; the program is not immutable.
- Public smoke receipts and checks are in
  [`evidence/devnet.json`](evidence/devnet.json). Its create/revoke transactions,
  initially recorded as confirmed, were subsequently independently verified
  finalized. The wrong-holder signature was rejected; post-revocation access
  was denied; RPC simulation rejected same-reference recreation with
  `AccountAlreadyInitialized`. That simulation was not an extra transaction.

Private keys and local deployment receipts remain outside this repository under
ignored `.local/`; they were not copied or committed.

**Historical pre-deployment failure:** an earlier setup attempt stopped at the
devnet faucet, and a read at that time showed the disposable payer at `0 SOL`.
The CLI mentioned rate limiting as a possible cause, which was not established.
That attempt preceded funding, deployment and the evidence above; its zero
balance and “deployment blocked” conclusion are not the current state. No
faucet, RPC, deployment or smoke operation was repeated for this documentation
update.

## Final browser lifecycle — revision 8f86010

The final targeted run at
`8f86010b7e6c3fee5722ce448c48694013a35e2b` used one real permission and passed
native consent, browser-controller create, holder-side BBS preview and explicit
send, independent-recipient `verified: true` with eight claims, confirmed revoke
and post-revocation denial.

- Browser create:
  [`4Kg1jGuuzP66HwDUUJtjHGXxJYPP3mZyeG9Z8NRXz7LuRW5dUVAc6MaQbQNxzJQKDhzzaTjpcCEuXaTYHe7FDgbR`](https://explorer.solana.com/tx/4Kg1jGuuzP66HwDUUJtjHGXxJYPP3mZyeG9Z8NRXz7LuRW5dUVAc6MaQbQNxzJQKDhzzaTjpcCEuXaTYHe7FDgbR?cluster=devnet).
- Browser revoke:
  [`56HcRcSbuQ3C8y8uZ1hP2bczaRRB7ieuGDi4obqWSTQCTH4pCFcvgeMk3mjr5c8LzKW51Di8SxJHoKnH8h18PXVT`](https://explorer.solana.com/tx/56HcRcSbuQ3C8y8uZ1hP2bczaRRB7ieuGDi4obqWSTQCTH4pCFcvgeMk3mjr5c8LzKW51Di8SxJHoKnH8h18PXVT?cluster=devnet).

The race regression was exercised with the real UI. An unchanged status snapshot
was held at `06:00:56.241Z` with `localRevoked: false`; real revoke submission
returned `200` at `06:01:36.757Z`, immediately clearing cards. The old response
was released at `06:02:09.155Z`; while the fresh request remained held, the UI
stayed on “Refreshing current permission state…”. The fresh response had
`localRevoked: true`, retained both receipt links and displayed chain revocation
confirmed. Active pollers remained at maximum one status request per page.

A native post-revocation challenge returned `404` at `06:02:46.139Z` with the
exact 23-byte `{"error":"unavailable"}` body and `Cache-Control: no-store`.
No genuine dependency `503` occurred. A status-only injected `503` cleared the
cards from the DOM, but its transient message was not retained visually; this is
not video proof of that error-message branch. This run did not repeat 65 real
permissions, tamper or expiry; the older bounded evidence below remains scoped
to its original revisions.

After recording, the runtime was restarted with exact origin
`https://4318--909906b9dabb453194a2f113c670ab76.preview.devinapps.com`, resetting
sessions. Matching-origin transport returned `200` with a Secure, HttpOnly,
SameSite=Strict cookie; a foreign-origin probe returned `403`. Preview-browser
E2E was blocked at Devin login, not by an application failure. The preview is
private, requires Silvia to sign in and depends on an awake VM; it is not a
public reviewer URL.

## Browser lifecycle evidence — revision 1d42ec5

The following results were observed in a real browser run at
`1d42ec5e48b41206ad8c28435f99a5eb01a2d05b`, using the deployed devnet program,
independent holder/recipient sessions and synthetic data:

1. The holder explicitly consented to the minimal proof and authorized create
   with the browser controller.
2. An independent recipient issued a one-time challenge. The holder derived a
   real BBS proof in-browser, inspected the preview and explicitly sent it.
   The recipient returned `verified: true` with eight disclosed fields and
   verification metadata; name and daily records were not disclosed.
3. The holder revoked the permission, the chain revocation was confirmed, and
   the recipient was denied.

Browser create:
[`3uhWZCvnzfQjbB2ByXYeTUGZ8BvXZD5ofP8rsbHbGDjWEpkN98bvh1cTSWYWEQSnnDe44xvK3CXLoZjWXjoA2uD5`](https://explorer.solana.com/tx/3uhWZCvnzfQjbB2ByXYeTUGZ8BvXZD5ofP8rsbHbGDjWEpkN98bvh1cTSWYWEQSnnDe44xvK3CXLoZjWXjoA2uD5?cluster=devnet);
browser revoke:
[`5mWLPWCpRYw7LKpHCQ2tH8xEpdVyBYiVrhJXkjJ8xoXM4oTedW1w2R5ZaAHRaDNPd5GYg8QBfCxgoMBJVtDmk12N`](https://explorer.solana.com/tx/5mWLPWCpRYw7LKpHCQ2tH8xEpdVyBYiVrhJXkjJ8xoXM4oTedW1w2R5ZaAHRaDNPd5GYg8QBfCxgoMBJVtDmk12N?cluster=devnet).

Additional bounded browser observations at this revision:

- A browser-originated replay probe returned `404` at `05:33:34.420Z`;
  a native post-revocation challenge returned `404` at `05:34:48.987Z`.
- A tampered presentation submission returned HTTP `200`, but native recipient
  verification returned `404` at `05:37:08.108Z`. Submission acceptance is
  not verification success.
- Deliberately response-corrupted issuer-signature encodings/scalars were
  rejected during holder derivation/send. The server did not issue invalid
  credentials.
- An untampered presentation was explicitly submitted with HTTP `200` and
  `{"submitted":true}` at `05:44:32.594Z`; no verification had occurred. The
  unused challenge expired at `05:46:17.588Z`; the first native verification
  returned `404` at `05:46:41.057Z` while the permission remained
  confirmed/unrevoked/unexpired. The expired challenge credential returned
  `404` at `05:47:08.626Z`.
- The same permission expired at `05:50:53Z`. A native challenge then returned
  `404` at `05:51:33.929Z` while `localRevoked` was false.
- All three expiry denials returned exactly
  `{"error":"unavailable"}` (23 bytes) with `Cache-Control: no-store`.
  These observations demonstrate application-level expiry while using real
  devnet permission state; they do not demonstrate execution of an expired
  on-chain instruction.
- Ordinary status polling was active. A bounded sanitized observation recorded
  maximum one status request per page and no RPC `429` or fetch errors during
  that observation window; it is not a general RPC availability guarantee.

At earlier revision `3d6bf98`, the primary browser lifecycle worked but a
secondary challenge/presentation attempt returned `503`. Later instrumentation
observed HTTP `429` for `getSignatureStatuses` amid multiple RPC reads. This
does not establish that the observed `429` caused every earlier `503`.

## Limits

- The final lifecycle evidence applies to `8f86010`; replay, tamper and expiry
  details retained below apply to the older `1d42ec5` run unless stated otherwise.
- Native WebCrypto Ed25519 in the tested browser, successful separate-summary
  access, production Supabase sharing configuration, and error cases outside
  bounded coverage remain untested by these demo runs.
- Synthetic assertion semantics and issuer computation are not independently
  audited. The issuer computes and signs the synthetic claim; the holder derives
  the BBS proof in-browser. Neither proves clinical truth or privately evaluates
  the seven-day condition.
- In-memory server state is single-process and is not durable across restarts.
- The isolated demo is not connected to CUDIS, Muse, real wearable readings,
  production wallets, issuers, insurers or the main VitalID website. No real
  health records, clinical truth, actual benefit credential or validated buyer
  demand are claimed.
- The BBS proof and Solana permission are distinct layers coordinated by the
  isolated browser demo. Solana stores only a random reference, controller,
  expiry and revocation state; it stores no health data or BBS credential.
- `npm audit --omit=dev` reported moderate advisories in transitive packages
  beneath the pinned `@solana/web3.js@1.98.4`; the available automatic upgrade
  is a major version change and was not applied.

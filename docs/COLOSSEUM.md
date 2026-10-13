# VitalID — Colosseum Crypto World's Fair 2026

## Scope and claims

This is an isolated research extension of an existing product, not a new build of
the entire VitalID app. It uses only bundled fictional Fátima data. No real WHOOP
account, health record, mainnet transaction, real money, production deployment or
application submission is part of this work.

The implementation separates:

1. A **BBS selective-disclosure presentation**, checked off-chain.
2. A **Solana devnet permission state**, checked through RPC.
3. A separate **Ed25519 controller authorization**, binding that presentation to
   an authenticated holder, recipient, one-time challenge and permission.

This is not clinical validation, proof that a wearable produced authentic data,
insurance eligibility, WHOOP certification, a private computation of seven days,
or complete anonymity. A hash, JWT, encrypted JSON blob or conventional signature
is not presented as a substitute for the BBS proof.

## Separate member-app follow-up (2026-10-12)

Community, private wellness records and PWA web-install metadata were added
separately to the Vital ID member application. They are not part of the
isolated Colosseum BBS/devnet demonstration described here, do not change its
cryptographic provenance or audit baseline, and do not imply that all of the
application's code was written during the contest period.

The community and wellness flows were exercised locally against real local
Supabase with two synthetic accounts. This is not production verification. For
insurer-oriented work, a minimum privacy design is narrowly scoped,
issuer-attested claims rather than raw records; this is a design criterion, not
an insurer integration or an insurance decision. The existing BBS work remains
an isolated synthetic lab: it is not in the member app and does not provide KYC,
eligibility decisions, claims or payouts. This separate member-app follow-up
makes no devnet transaction claims; the public receipts below belong only to the
isolated Colosseum demo.

The member app has standalone web-manifest and icon metadata only. It is not a
native iOS/Android app and has no offline cache; end-to-end installation has not
been verified in a fresh/incognito browser. For feature use and setup, see the
[community and wellness guide](COMMUNITY-WELLNESS.md).

## Existing code and provenance

The audit baseline and branch parent is
[`677086bd472ac0613886e388ceedcb7b9e400c57`](https://github.com/SilviaMogas/VitalID/commit/677086bd472ac0613886e388ceedcb7b9e400c57).
All code in that commit predates this extension. Existing PRs #60 and #61 concern
billing and are not incorporated or overwritten here.

Existing work includes:

- Next.js/React app, English/Arabic UI, Fátima profile/avatar and demo dataset.
- Dashboard, trend engine, health identity card and member sharing.
- Supabase account/storage abstractions, Stripe membership work, WHOOP connector
  scaffolding and previously committed consent/isolation improvements.
- Prior work by other agents and authors; authorship and dates are preserved.

Useful historical references:

- [`1e04144`](https://github.com/SilviaMogas/VitalID/commit/1e04144): core app/demo/trend scaffold.
- [`9fa85b9`](https://github.com/SilviaMogas/VitalID/commit/9fa85b9): Circular Ring sample-data adaptation.
- [`8c61d0a`](https://github.com/SilviaMogas/VitalID/commit/8c61d0a): per-user resolution and synthetic/member isolation.
- [`codex/vital-id-mvp-transfer`](https://github.com/SilviaMogas/VitalID/tree/codex/vital-id-mvp-transfer):
  retained transfer branch. The supplied project history identifies `vitalID-Test`
  as its origin; this statement is provenance supplied by the project owner, not
  a claim that every external source repository was independently audited.

The Colosseum work is limited to the diff from that baseline: recipient-account
authorization, allowlisted output/preview and wording/analytics fixes, plus the
isolated BBS/devnet demonstration, tests and these documents. The demo imports
`lib/demo-data.ts` and reuses the existing avatar; it does not duplicate the main
dashboard, replace account/billing systems or connect to production databases.

The official [FAQ](https://colosseum.com/hackathon) permits pre-existing code but
requires disclosure and judges work during the contest period. The
[official rules](https://colosseum.com/legal/Crypto%20World's%20Fair%20Hackathon%20Rules.pdf)
state September 14, 2026 06:00 PT through October 12, 2026 23:59 PT.
The latter corresponds to **October 13, 2026 06:59 UTC / 10:59 Dubai**.
The organizer's clock and current portal remain authoritative. Eligibility,
individual/team registration, intellectual-property permissions and acceptance
of terms require the human entrant's review. Nothing here guarantees eligibility,
admission, a prize or investment.

## Data and credential model

The issuer is **VitalID Demo**. Each permission receives an isolated copy of the
existing synthetic dataset. The issuer counts distinct dates in a UTC 30-day
window and signs whether at least seven exist. Duplicate days do not count twice.

The signed BBS message vector has a fixed v1 schema:

| Index | Field | Disclosure |
|---|---|---|
| 0 | `demo = true` | Revealed |
| 1 | Exact requested claim type | Revealed |
| 2 | `qualifies = true` | Revealed |
| 3–4 | Window start/end | Revealed |
| 5 | Credential/permission expiry | Revealed |
| 6 | Random permission reference | Revealed |
| 7 | Controller public key | Revealed |
| 8 | Fictional full name | Hidden |
| 9 | Fictional daily records/measurements | Hidden |

The issuer calculates the condition outside ZK. **BBS proves knowledge of a valid
issuer signature covering the revealed assertion and hidden messages. It does not
privately evaluate or validate the medical records.** The verifier checks the
expected claim type, `qualifies === true`, dates, expiry, fixed field schema and
trusted issuer key rather than accepting any validly signed statement.

Library: Digital Bazaar `@digitalbazaar/bbs-signatures` **3.1.0**, BSD-3-Clause,
SHA-256/BLS12-381 ciphersuite. This uses its BBS primitives, not JSON-LD
`bbs-2023-cryptosuite`, W3C VC interoperability or on-chain BBS verification.
The dependency is pinned; this implementation does not claim an independent
cryptographic audit.

The full signed credential is delivered only to its authenticated **holder** so
the holder browser can derive the presentation. The recipient response contains
only revealed claims and presentation/authorization bytes. “Hidden from the
recipient” is not “hidden from the issuer or holder.” Browser bundles must not
contain the source fixture or issuer secret.

## Binding and replay model

Each browser creates an Ed25519 private key and authenticates by signing an
enrollment challenge. Native WebCrypto uses a non-extractable key when supported.
Browsers without native Ed25519 use the already-depended-on Noble curves library
(directly pinned to 2.4.0), with private bytes held only in a page-memory closure.
This portable key is not hardware-backed or non-extractable; compromised page
JavaScript remains a threat. Neither path persists or transmits the private key.
A separate random HttpOnly cookie identifies the
authenticated session. The public recipient ID is not that cookie and grants no
access on its own. This proves possession of a demo key, not a verified real-world
person, doctor, insurer or email address.

A presentation header binds:

- Random challenge ID and nonce.
- Expected recipient session and public key.
- Holder session.
- Permission reference, program and devnet genesis hash.
- Short expiry.

The controller signs that context plus a SHA-256 digest of the BBS proof.
The verifier requires the controller in the issuer-signed attribute to match the
on-chain permission controller. This external signature is not called a BBS
holder-binding primitive. The server uses its stored context, not a caller's
suggested context, and consumes the challenge before asynchronous verification.

An altered proof/attribute, other issuer, other controller, permission, recipient,
session, expired credential/challenge or replay must fail. A successful proof
does not authorize a medical summary.

## Solana permission model

Devnet genesis hash: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
RPC is pinned to the official devnet endpoint; runtime checks genesis rather than
trusting a UI network label.

A PDA derives from `["vitalid-permit", random_32_byte_reference]`.
The program stores a version byte and only:

- The random permission reference (not the legacy share token).
- Controller public key.
- Expiry.
- Revocation flag.

No recipient, name, clinical value, WHOOP identifier, full credential, document,
access token, or health-data hash is stored on-chain. Controller keys and
references are public and correlatable, so the demo is not unlinkable.

Create requires the controller signature even when a separate payer sponsors rent
and fees. Revoke requires that same controller signature. There is no update,
reset, close or un-revoke instruction. Maximum on-chain lifetime is one hour;
the UI requests fifteen minutes.

The application checks confirmed transaction success, program ownership, PDA,
reference, controller, expiry and revocation. Missing/failed/pending transactions,
wrong program/network, missing/expired/revoked accounts and RPC errors deny access.
RPC providers and the configured deployment are trust dependencies; this is not
a trustless light client. Deployment/upgrade-authority status and actual receipts
must be reported separately; source code alone is not evidence of a devnet run.

### Verified deployment and browser evidence

The permission program is executable on official Solana devnet, genesis
`EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`:

- Program:
  [`5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k`](https://explorer.solana.com/address/5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k?cluster=devnet).
- The deployed code matched the 67,272-byte SBF artifact byte for byte,
  including zero trailing allocation; SHA-256
  `e541154cc717db0673dc8c035d34e6672abf18b8c3f7f20619f537254e65712e`.
- Deployment transaction
  [`5azeXpbggRuVUh7Bszrh7mfesTPJVu8NVJB5PK42FmMVuE419LeaTG2Drk56HLgpSVFqD2ackUBzkzsmBbC2mSYk`](https://explorer.solana.com/tx/5azeXpbggRuVUh7Bszrh7mfesTPJVu8NVJB5PK42FmMVuE419LeaTG2Drk56HLgpSVFqD2ackUBzkzsmBbC2mSYk?cluster=devnet)
  finalized with `err: null` at slot `510508732`, timestamp
  `2026-10-13T04:44:21Z`. Its upgrade authority remains the disposable payer
  `8wU9Y36gQ6yx3SSZjyoM3HUyFyukbkWmoSeTNv2YuUNA`; the program is not immutable.
- The exact public smoke evidence is
  [`demos/colosseum/evidence/devnet.json`](../demos/colosseum/evidence/devnet.json).
  The create/revoke receipts were independently verified finalized; the wrong
  holder signature was rejected, post-revocation access denied, and same-reference
  recreation rejected by RPC simulation as `AccountAlreadyInitialized` (not an
  extra transaction).

The primary real browser lifecycle was demonstrated at revision
`1d42ec5e48b41206ad8c28435f99a5eb01a2d05b`: minimal explicit consent, holder
controller-authorized create, independent recipient challenge, real BBS proof
derivation in the holder browser, preview and explicit send, recipient
`verified: true`, confirmed browser revoke and subsequent denial. The primary
browser create and revoke transactions are
[`3uhWZCvnzfQjbB2ByXYeTUGZ8BvXZD5ofP8rsbHbGDjWEpkN98bvh1cTSWYWEQSnnDe44xvK3CXLoZjWXjoA2uD5`](https://explorer.solana.com/tx/3uhWZCvnzfQjbB2ByXYeTUGZ8BvXZD5ofP8rsbHbGDjWEpkN98bvh1cTSWYWEQSnnDe44xvK3CXLoZjWXjoA2uD5?cluster=devnet)
and
[`5mWLPWCpRYw7LKpHCQ2tH8xEpdVyBYiVrhJXkjJ8xoXM4oTedW1w2R5ZaAHRaDNPd5GYg8QBfCxgoMBJVtDmk12N`](https://explorer.solana.com/tx/5mWLPWCpRYw7LKpHCQ2tH8xEpdVyBYiVrhJXkjJ8xoXM4oTedW1w2R5ZaAHRaDNPd5GYg8QBfCxgoMBJVtDmk12N?cluster=devnet).
The test report records bounded replay, tampered-presentation and application
expiry observations with their exact limits and timestamps. These browser
results apply to `1d42ec5`, not the later PR #80 code revision `8f86010`; its
targeted browser retest is in progress and has no result claimed here.

An earlier deployment attempt failed at the devnet faucet and recorded `0 SOL`
for the payer at that time. That historical pre-deployment observation was
superseded by the funded deployment and receipts above; the faucet error's cause
was not established. See the
[revision-aware verification report](../demos/colosseum/TEST-REPORT.md) for
browser, RPC and historical details.

Local revocation denies new reads **before** submitting the chain transaction.
The UI distinguishes local blocked access from pending/confirmed/failed chain
revocation. Denial is rechecked after asynchronous verification to prevent a
concurrent revocation from releasing data. A local flag is never reset, including
when RPC submission fails. Restarting the demo discards all grants and sessions,
so a restart cannot revive application access.

## Two distinct disclosure modes

**Proof only:** reveals the fixed assertion and verification metadata above.
No summary is returned after success.

**Private summary:** a different permission with explicit fields and recipient
authorization. Only fictional name and/or height and weight can be selected in
this narrow demo. Preview and actual output use the same field allowlist.
Identity deselected means no name in the summary response. Daily records are not
part of this mode. The recipient must be authenticated and the permission must
still be valid; a bearer URL or proof from the other mode cannot grant access.

In the main member app, existing sharing now targets an explicit account ID.
The sender should verify that ID through a trusted independent channel; names,
emails and professional identities are not verified by this flow.
This is intentional because the existing demo-oriented signup code uses
`email_confirm: true` without an email verification round trip. Email equality
would therefore be an unsafe authorization boundary. The sender must obtain the
account ID directly from the intended recipient. Legacy shares without an
assignment are owner-only.

## Privacy and limits

- Both demos are synthetic. No inference of clinical accuracy or data authenticity.
- No raw hidden fields in recipient JSON, bundles, DOM, telemetry or URL parameters.
- No Vercel Analytics in the app root; the isolated demo has no telemetry.
- All share and demo responses are `no-store`; no remote context loading.
- Insurer selections are metadata only, not transmission or insurance integration.
- Withdrawing consent, disconnecting WHOOP, revoking access and deleting stored
  data are different actions. None retrieves previously downloaded copies.
- Supabase/service-side storage is not described as an application-encrypted vault.
  The issuer/server can see the synthetic source data.
- In-memory sessions, challenges and local blocks are **single-process** only.
  Production needs durable transactional replay storage, audited authentication,
  rate limiting, issuer-key lifecycle, wallet recovery, access review and deployment
  hardening. This process must not be horizontally scaled.
- Browser keys are intentionally page-lifetime keys. Reloading loses the private
  key; use short-lived demo permissions. This is not a production recovery design.
- Local tests and mocked RPC failures are not proof of production security.
  Devnet execution is supported only by the public receipts and bounded browser
  observations in the test report, not by local tests.

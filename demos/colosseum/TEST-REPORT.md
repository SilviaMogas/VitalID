# Verification report

This report separates local cryptographic/software evidence from injected
dependency simulations and any independently checkable devnet evidence. A local
test passing is not an on-chain deployment or browser demonstration.

## Local tests

Verification completed 2026-10-12. This follow-up validates the reviewed Sonar,
account-existence, source-projection and preparation-quota fixes. The tested code
revision is `f783f36953711e04685b6aa0697a44c22aa7937d` on
`devin/1791812117-colosseum-review-fixes`, PR
https://github.com/SilviaMogas/VitalID/pull/63. PR #62 was merged externally during
the session; the follow-up is separate. This report does not claim a full
positive devnet or production-authenticated end-to-end pass.

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

## Browser verification — real local adapter, blocked devnet

The final bounded run used Chrome 137 and three independent cookie jars at the
tested revision above. Native Ed25519 was unsupported in this browser; the actual
Noble fallback produced enrollment signatures accepted by the server. No fake
adapter was substituted for successful chain activity.

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

**Incomplete capture:** error-response bodies timed out after three seconds in
the browser observer. Their 503/404 statuses and denial UI were checked, but
complete browser response-body privacy coverage is not claimed.

After recording, the unchanged server was restarted with the exact HTTPS preview
origin. Direct server checks passed: matching Origin → 200 and a Secure,
HttpOnly, SameSite=Strict cookie; foreign Origin → 403 without a cookie.
Preview-browser enrollment remained untested because that browser reached the
Devin sign-in screen. The local recording is not preview-browser E2E evidence.
Restarting discarded all previous demo sessions as designed.

## Real devnet evidence

No devnet success is implied by the source, local tests, SBF build, or injected
adapter. The setup script verifies the official devnet genesis before requesting
funds or deploying. The smoke script requires a deployment receipt, an executable
program account and confirmed create/revoke transactions. Public IDs and
signatures are recorded in `evidence/devnet.json` only if the complete smoke
sequence succeeds. Private keys and local-only receipts remain in ignored
`.local/`.

**Attempt result: blocked before deployment.** `npm run devnet:setup` checked the
configured official devnet genesis, then the free faucet request failed:

```text
Devnet setup blocked: Solana CLI airdrop failed (exit 1): Error: airdrop request failed. This can happen when the rate limit is reached.
```

A subsequent read-only balance check for the disposable payer returned `0 SOL`.
The CLI message says rate limiting *can* cause this error; the cause was not
established. No retry, paid endpoint, deployment, transaction, or smoke run was
attempted.
`npm run devnet:smoke` was not run because there is no deployment receipt; no
`evidence/devnet.json` was created. Consequently there is no deployed program ID
or chain receipt to report. Both generated private key files are mode `600` and
remain under the ignored `.local/` directory.

## Limits

- Positive browser BBS derivation/verification, transaction signing, successful
  authorized summary access and on-chain revocation remain untested without a
  deployed program and funded devnet sponsor. There are no confirmed receipts.
- The native-browser Ed25519 path, complete browser error-body audit and real
  Supabase-authenticated member-sharing paths remain untested.
- Synthetic assertion semantics and issuer computation are not independently
  audited; BBS proves a signed statement, not the truth of the data.
- In-memory server state is single-process and is not durable across restarts.
- An intended deployment retains its upgrade authority; no program was deployed
  during this attempt.
- The demo intentionally does not use real WHOOP, Supabase, user health records,
  paid RPC, production or mainnet.
- `npm audit --omit=dev` reported moderate advisories in transitive packages
  beneath the pinned `@solana/web3.js@1.98.4`; the available automatic upgrade
  is a major version change and was not applied.

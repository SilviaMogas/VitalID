# Verification report

This report separates local cryptographic/software evidence from injected
dependency simulations and any independently checkable devnet evidence. A local
test passing is not an on-chain deployment or browser demonstration.

## Local tests

Verification completed 2026-10-12. This follow-up validates the reviewed Sonar,
account-existence, source-projection and preparation-quota fixes. Browser-flow
verification remains pending; this report does not claim a full UI pass.

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

- Browser testing found Chrome 137 lacked native Ed25519, prompting the Noble
  fallback. The independent native-verification/BBS test now passes locally;
  full browser-flow retest after this change remains pending.
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

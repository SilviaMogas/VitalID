# Private proof lab

This is an isolated, synthetic research demo. It does not replace the VitalID
application and does not connect to its production services, WHOOP, Supabase or
mainnet. It uses the fictional Fátima fixture only. The demo has an executable
program on official Solana devnet, and its primary browser lifecycle was
demonstrated at revision `1d42ec5e48b41206ad8c28435f99a5eb01a2d05b`. The main
VitalID website is a separate surface and does not host this live BBS flow.
See the revision-aware [verification report](TEST-REPORT.md).

## Requirements and local verification

Use Node.js 22.12 or newer. From this directory:

```bash
npm ci
node --test test/crypto.test.mjs
npm test
npm run build
cargo test --manifest-path program/Cargo.toml
```

The focused crypto test uses the pinned `@digitalbazaar/bbs-signatures` library;
it signs, derives and verifies a selective BBS presentation and rejects tampering
and insufficient assertions. The demo suite starts real ephemeral HTTP listeners,
uses real browser-style Ed25519 keys and BBS proofs, and injects an explicit fake
Solana adapter for API lifecycle/error tests. The separate adapter suite exercises
Solana transaction serialization and signatures against an injected connection.
Those injected-RPC tests are simulations, not evidence of a chain transaction.

The browser controller uses native WebCrypto Ed25519 with a non-extractable key
when supported. Chrome 137 used the portable fallback from pinned
`@noble/curves@2.4.0`; it keeps private bytes in a page-memory closure without
persisting or transmitting them. This fallback is not a non-extractable
WebCrypto or hardware-backed key; page compromise remains a risk.

At PR80 revision `8f86010`, the demo suite passed 50/50 and the demo build
passed. Those are local checks, not browser evidence for that revision; its
targeted browser retest is in progress and no result is claimed here. The browser
lifecycle recorded below ran at `1d42ec5`; do not attribute it to `8f86010`.

## Build and verified devnet deployment

Read the [official Solana installation](https://solana.com/docs/cli/install),
[dependency](https://solana.com/docs/intro/installation/dependencies) and
[deployment](https://solana.com/docs/programs/deploying) documentation first.
The installer below keeps the CLI under the home directory and does not edit
shell profiles or the existing Solana CLI configuration:

```bash
curl -sSfL https://release.anza.xyz/stable/install -o "$HOME/anza-install.sh"
sh "$HOME/anza-install.sh" --no-modify-path -d "$HOME/.local/share/solana/install" stable
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

The setup script does not trust `PATH` to locate Solana. It resolves the
default executable at
`$HOME/.local/share/solana/install/active_release/bin/solana` and validates
that it is an absolute, executable regular file that is not group- or
other-writable. An alternative may be supplied only as an absolute path:

```bash
export SOLANA_CLI_PATH="/absolute/path/to/solana"
```

Prepare a new disposable fee payer under the ignored `.local/` directory, then
build into that same private directory. `cargo build-sbf` creates the program
keypair there; no default CLI keypair or config is used:

```bash
npm run devnet:keys
cargo build-sbf --manifest-path program/Cargo.toml --sbf-out-dir .local/sbf
```

The deployment script is pinned to official devnet and its expected genesis.
It refuses to overwrite unfamiliar local keys or upgrade an existing program
and retains the upgrade authority. Local key material and the private deployment
receipt stay under ignored `.local/`; neither is included here.

```bash
npm run devnet:setup
npm run devnet:smoke
```

The verified program is
[`5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k`](https://explorer.solana.com/address/5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k?cluster=devnet).
Deployment and smoke receipts are documented in
[`evidence/devnet.json`](evidence/devnet.json) and the
[verification report](TEST-REPORT.md). Do not rerun setup or smoke simply to
recheck these settled receipts. Do not upload `.local/`, share its files, or
commit private keys. The upgrade authority is retained; this program is not
immutable.

## Run an authorized local server

An independently authorized local process can be configured with the public
program ID and its own local sponsor key path:

```bash
npm run build
VITALID_DEMO_ENABLED=1 \
DEMO_PROGRAM_ID="5saLMUki5g345gSDuiFjaf5LNBDaxW5N4yMR4sSZEu4k" \
DEMO_FEE_PAYER_FILE=".local/payer.json" \
npm start
```

The server binds to `127.0.0.1:4318` by default and refuses to start unless
`VITALID_DEMO_ENABLED=1`. It does not require devnet at startup and does not
silently use a mock. Open `/` for the holder and `/receiver` in a separate
browser profile for the recipient; each role needs a different cookie jar.
Optional `DEMO_ORIGIN` must be an exact HTTP(S) origin and enables `Secure`
cookies when it uses HTTPS.

The API uses short-lived authenticated browser sessions, same-origin JSON POSTs,
bounded request bodies, a fixed static-file allowlist, strict no-store/security
headers and generic error responses. All session, challenge, permission and
local-revocation state is in process memory. Restarting loses it; do not scale
this server across processes.

## What the proof means

The demo issuer computes the assertion that the synthetic fixture has at least
seven distinct days in a thirty-day window, then signs the credential. The
holder receives that signed credential and derives the off-chain BBS
selective-disclosure proof in the browser. The recipient receives only the
allowlisted revealed presentation. BBS does not prove that the issuer counted
correctly, that a wearable generated the records, or that the claim is
medically meaningful.

Proof-only authorization and private-summary authorization are separate modes.
Summary mode supports only the fictional name and/or height/weight fields. The
holder must authorize the exact fresh preview; deselected identity returns no
name. A proof never grants summary access. No health data or health-data hash is
stored on-chain.

See [`../../docs/COLOSSEUM.md`](../../docs/COLOSSEUM.md) for provenance, trust
assumptions, limits and the broader security model, and
[`../../docs/COLOSSEUM-SCRIPTS.md`](../../docs/COLOSSEUM-SCRIPTS.md) for
application and recording copy.

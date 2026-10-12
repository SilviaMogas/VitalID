# Private proof lab

This is an isolated, synthetic research demo. It does not replace the VitalID
application and does not connect to its production services, WHOOP, Supabase or
mainnet. It uses the fictional Fátima fixture only.

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
when supported. Browser testing found Chrome 137 lacked native Ed25519; the
portable fallback uses pinned `@noble/curves@2.4.0` and keeps the private bytes
in a page-memory closure without persisting or transmitting them. This fallback
is not a non-extractable WebCrypto or hardware-backed key; page compromise
remains a risk. The full browser flow still needs a post-change retest.

Latest local verification (2026-10-12): the focused crypto test passed 9/9, the
demo suite passed 28/28, the demo build passed, and root lint passed. These
results do not imply devnet deployment or end-to-end browser success.

## Build and attempt the devnet deployment

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

The intended deployment is explicitly pinned to the official devnet RPC and
expected genesis. It requests one free 2 SOL devnet airdrop only if the fresh
payer balance is below its deployment floor, passes URL and keypair arguments on
each CLI command, refuses to overwrite unfamiliar local keys or upgrade an
existing program, and retains the upgrade authority. It writes local key
material and a private local deployment receipt only under `.local/`:

```bash
npm run devnet:setup
npm run devnet:smoke
```

The smoke script uses a fresh Ed25519 holder distinct from the fee payer. It
attempts a confirmed create and check, rejects a wrong holder signature, revokes
and verifies on-chain denial, then verifies that the same reference cannot be
created again. It writes public-only evidence to `evidence/devnet.json` only if
the full smoke sequence succeeds. A failed faucet, build, RPC or deployment is
reported as blocked; no local fake is substituted for chain success.

No deployment or receipt should be claimed unless it appears in the
[test report](TEST-REPORT.md). Do not upload `.local/`, share its files, or commit
private keys. An intended deployment retains an upgrade authority and would not
be immutable. No devnet deployment succeeded in this attempt; see the test report.

## Run the local server

After a successful deployment, build the HTTP bundle and set its public program
ID and local sponsor key path from `.local/deployment.json`:

```bash
npm run build
VITALID_DEMO_ENABLED=1 \
DEMO_PROGRAM_ID="<program from .local/deployment.json>" \
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

The issuer signs the assertion that the synthetic fixture has at least seven
distinct days in a thirty-day window. BBS proves possession of that issuer
signature while revealing only the fixed assertion and its context. It does not
prove that the issuer counted correctly, that a wearable generated the records,
or that the claim is medically meaningful. The issuer sees the synthetic source
records; the holder receives the full synthetic credential to derive the proof.
The recipient receives only the allowlisted revealed presentation.

Proof-only authorization and private-summary authorization are separate modes.
Summary mode supports only the fictional name and/or height/weight fields. The
holder must authorize the exact fresh preview; deselected identity returns no
name. A proof never grants summary access. No health data or health-data hash is
stored on-chain.

See [`../../docs/COLOSSEUM.md`](../../docs/COLOSSEUM.md) for provenance, trust
assumptions, limits and the broader security model, and
[`../../docs/COLOSSEUM-SCRIPTS.md`](../../docs/COLOSSEUM-SCRIPTS.md) for draft
presentation/application wording.

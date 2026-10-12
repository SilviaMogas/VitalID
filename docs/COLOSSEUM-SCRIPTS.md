# VitalID — English application and demo drafts

**Human review required.** These are drafts, not a submitted application. Replace
execution claims with the final verification report. Never call a mocked run a
devnet transaction. Do not imply clinical, WHOOP or insurer certification.

**Current execution status:** the bounded official devnet setup attempt stopped
after the free faucet request failed; its CLI mentioned rate limiting as one
possible cause, which was not established. The disposable payer remained at
`0 SOL`. No program was deployed, no chain receipt exists, and no browser demo
was run. Until a later attempt is confirmed and recorded in
[`demos/colosseum/TEST-REPORT.md`](../demos/colosseum/TEST-REPORT.md), present
the Solana component as designed/built, not as live devnet state. Do not show a
mocked successful chain flow.

## Short presentation script (about 90 seconds)

“People often disclose an entire health screenshot when a service only needs one
specific fact. VitalID explores a narrower alternative: show a verifiable
assertion and keep the underlying details private.

We built this research extension on our existing VitalID product and fictional
demo persona. We are not claiming the dashboard, connectors or previous product
work as new for this competition.

In this demo, VitalID Demo signs an assertion that at least seven distinct days
of fictional records exist inside a thirty-day window. The holder derives a real
BBS selective-disclosure proof in the browser. The recipient can verify that
signed assertion without receiving the full name or daily measurements.

BBS does not prove the calculation itself or prove that the records are medically
accurate. The issuer is trusted for that assertion.

The included Solana program is designed to record a short-lived permission
controlled by the holder's key, with an expiry and an irreversible revoke
operation. It stores no health data or health-data hashes. The code checks both
the off-chain proof and current devnet permission state, but this run did not
deploy the program: the official free faucet request failed, and its cause was
not established. There is no live chain state or transaction to show.

A one-time challenge binds the proof to this recipient and session. Revocation
blocks new access locally even while chain confirmation is pending. It cannot
retrieve copies someone has already downloaded.

Our next validation is whether a wellness service actually needs this minimal
assertion and will pay for its verification. This is a synthetic, local research
prototype, not a production health or insurance decision system.”

For this run, say “the included program is designed to record,” state that the
faucet request failed and the payer remained at `0 SOL`, and show only verified
local BBS/software results. Do not splice
simulated successful chain screens into the main demo.

## Demo script (about three minutes)

### Before recording

- Use the final branch/commit and the exact reproducible instructions.
- Do not present a live browser flow for this run: no devnet program was
  deployed. Start the isolated server only after a later deployment is confirmed
  and its public receipt is recorded.
- Open the holder page in one browser profile and `/receiver` in a separate
  browser/incognito profile. Tabs in the same cookie jar are not independent.
- Confirm no real account, wearable, data or funds are used.
- Keep the actual program and transaction explorer links available.

### Recorded sequence

1. **Boundary:** “This is a fictional person and synthetic records. The existing
   VitalID product predates this extension.”
2. **Recipient:** Start its own key-authenticated session. Give its public
   recipient ID to the holder. Explain that it is not a bearer access token.
3. **Holder:** Start the holder session, enter the recipient ID and choose
   “Minimal proof only.” Show the disclosure fields; no full name or daily
   measurements will be sent.
4. **Permission:** Do not show a live permission until a real deployment exists.
   On a later verified run, authorize and sign creation; show pending status and
   then the actual confirmed receipt and program address.
5. **Credential and proof:** Only after that confirmed permission, have the
   recipient generate a one-time challenge and the holder derive the synthetic
   BBS proof locally. Explain issuer-computed condition versus proof of a signed
   claim.
6. **Verification and replay:** On a live run, show revealed claims and
   controller authorization, then show same-challenge replay rejected. Never
   imply that BBS alone authorizes a summary.
7. **Revoke:** On a live run, distinguish immediate local denial from chain
   pending/confirmed status and show the real transaction only if confirmed.
8. **After revoke:** Show denial of new access without implying prior receipts or
   downloaded copies are erased.
9. **Optional summary mode:** On a live run, use a different permission with
   identity deselected and only height/weight selected. Show its exact preview,
   receiver authentication and field-limited response.

End by showing the verification report: real library tests, simulated dependency
negative tests, actual devnet/browser evidence if later obtained, and every
remaining gap. For the current run, state that devnet and browser evidence are
absent.

## Draft application answers

### What problem are you solving?

People frequently disclose more health-related data than a specific interaction
requires. Screenshots and full reports are hard to limit and easy to retain.
VitalID is exploring user-authorized, minimal disclosure of issuer-attested
facts with explicit recipients, expiry and revocation of future access.
This demo tests a narrow protocol, not clinical truth or insurer eligibility.

### Who is the user?

Initially, an individual who wants to prove a limited participation condition to
a service without sharing the underlying wearable history. Our demonstration
uses a fictional persona only. The recipient is authenticated for the specific
permission; this does not verify its real-world professional identity.

### Who is the buyer?

A wellness or benefits service that needs a narrow, consented verification could
be a buyer to validate. Willingness to pay, procurement, regulatory suitability
and the usefulness of this particular condition remain hypotheses. We have not
established a paying insurer integration, clinical use case or commercial demand
through this demo.

### Why blockchain? What does Solana do?

A successful Solana devnet deployment would provide a public, independently
queryable permission state: random reference, holder controller, expiry and
revocation. A distinct payer can sponsor fees without becoming the controller.
The recipient code checks this state alongside off-chain proof verification.
This attempt was blocked at the official faucet, so no deployed state or
transaction is claimed. Blockchain does not store health data, send reports,
compute the assertion or verify BBS on-chain in this MVP. Any later deployment,
RPC and the upgrade authority of any future deployment remain explicit trust
dependencies.

### What exactly is zero knowledge?

The BBS presentation proves knowledge of a valid VitalID Demo issuer signature
over a fixed message vector while selectively revealing the synthetic
seven-distinct-days assertion, window, expiry and permission/controller binding.
Name and daily measurements remain undisclosed to the recipient. The issuer
counts and signs the condition outside ZK; there is no private seven-day
computation or proof of medical accuracy. An independent Ed25519 signature binds
the BBS proof and one-time challenge context to the holder's controller key.

### What was built during this effort?

Starting from audit commit `677086bd472ac0613886e388ceedcb7b9e400c57`, this effort
hardens recipient authorization and output projection in the existing member
sharing flow, removes analytics from private routes, clarifies insurer metadata,
and adds an isolated BBS selective-disclosure/devnet permission demo with tests
and reproducible instructions. No devnet program was deployed in this run. The
dashboard, Fátima dataset/avatar, identity
card, account/billing work and earlier connector code are pre-existing work.
See the linked provenance document and final PR diff for exact boundaries.

### What remains unvalidated?

Production identity and issuer governance; authenticity of device records;
clinical and regulatory suitability; buyer demand; durable multi-process replay
protection; production wallets/recovery and deployment hardening. The BBS library
and this integration are not claimed independently audited. Controllers and
permission references are public, so no complete anonymity is claimed.
Use the final report to state exactly whether devnet deployment and the
separate-browser demonstration succeeded or remain blocked.

## What Silvia must do herself

1. Review the final test report, actual demo and pre-existing-work disclosure.
2. Review official eligibility, team membership and submission requirements.
3. Register/join the event and ensure each team member is registered, if required.
4. Choose final answers, video/repository links and any personal/business facts.
5. Accept terms and submit herself before the official deadline.

No term acceptance, submission, fundraising claim or automatic merge/deployment
is performed on Silvia's behalf.

# VitalID — current pitch and demo scripts

**Draft for human review.** This copy has not been submitted. Review current
eligibility and portal questions before use; it does not guarantee eligibility,
admission or a prize.

## Evidence status and boundaries

- The executable Solana devnet program and public smoke receipts are documented
  in [`demos/colosseum/TEST-REPORT.md`](../demos/colosseum/TEST-REPORT.md) and
  [`demos/colosseum/evidence/devnet.json`](../demos/colosseum/evidence/devnet.json).
- The primary real-browser lifecycle—including holder consent, create,
  independent challenge, BBS derivation, verification, revoke and denial—was
  demonstrated at revision `1d42ec5e48b41206ad8c28435f99a5eb01a2d05b`.
- PR #80 status-refresh code is at `8f86010`; its targeted browser retest is
  in progress, with no result claimed here. Do not attribute the `1d42ec5`
  browser results to `8f86010`.
- The issuer computes and signs the synthetic credential. **The holder derives
  the BBS proof in the browser.** The recipient verifies it. BBS is off-chain;
  Solana stores only a random permission reference, controller, expiry and
  revocation state.
- The demo uses synthetic records, not clinical truth, an actual benefit
  credential or private computation. CUDIS and Muse are not connected; there
  are no real wearable readings or production wallet, issuer or insurer
  integrations. The main VitalID website does not host this isolated flow.
- The initial buyer and B2B verification API are hypotheses, not validated
  customer demand. Existing VitalID product work predates this isolated demo
  and should be disclosed.

## Two-minute introduction

**Timing note:** about two minutes is a rehearsal target, not a measured duration.
Rehearse with a timer; do not speed through evidence or confirmations.

> Hi, I’m Silvia Mogas, founder of VitalID.
>
> When an organisation needs one fact about your wellbeing, why should you have
> to share your entire health history?
>
> VitalID is built around one principle: prove what matters, and share only
> what’s necessary.
>
> We’re building a portable health-credential layer that lets people present
> specific, verifiable claims while keeping unnecessary personal information
> private.
>
> Our first commercial use case is helping someone demonstrate access to a
> wellness benefit they already have. Our potential customers are benefits
> administrators, employee-benefits platforms and insurers. We aim to complement
> their eligibility systems, not become an insurance company.
>
> For this prototype, we built on the existing VitalID application and created
> a working demonstration using BBS selective-disclosure proofs and real
> permissions on Solana devnet.
>
> The holder reviews the disclosure and authorizes a specific recipient. That
> recipient can verify an issuer-signed assertion without receiving the person’s
> name or daily measurements.
>
> Solana records only the permission reference, controller, expiration and
> revocation state. Health records stay off-chain. When the holder revokes
> permission, future access is blocked.
>
> Our demonstration uses synthetic data: an issuer attests to seven distinct
> days of records within a thirty-day window. The proof verifies that signed
> assertion—not medical truth or the authenticity of wearable readings.
>
> CUDIS and Muse are future integrations, not connected today.
>
> Our business-model hypothesis is a B2B verification API. Next, we’ll validate
> one narrow benefits workflow with prospective customers and an authorised
> issuer.
>
> VitalID isn’t about collecting more health data. It’s about making a smaller
> disclosure useful and verifiable.
>
> Prove what matters. Share only what’s necessary.

## Browser demo

**Target:** under three minutes as a rehearsal goal, not a verified duration.
Narration is English; screen directions are Spanish. Public-RPC confirmation
latency may exceed the target. Wait for actual confirmation and preserve the
real state; never simulate, skip or narrate success before it occurs.

| Target | Instrucción en pantalla (español) | Narration (English) |
|---|---|---|
| 0:00–0:15 | Abre primero el destinatario en un perfil de navegador realmente independiente. Inicia su sesión, deja la pantalla lista y explica que usas datos sintéticos y estado efímero. | “This is an isolated prototype with synthetic data. I’m opening the recipient in an independent session before the holder approves anything.” |
| 0:15–0:35 | Cambia al titular. Muestra el destinatario concreto y la opción de prueba mínima; deja visibles los campos que se compartirían. | “The holder reviews the recipient and the exact disclosure. This demo uses synthetic records, not a real benefit credential.” |
| 0:35–0:50 | El titular acepta explícitamente el consentimiento mínimo. No habilites resumen ni otros campos. | “The holder explicitly consents to this minimal proof. The recipient will not receive the name or daily records.” |
| 0:50–1:10 | Autoriza el create real con el controlador del navegador. Espera el estado confirmado y enseña el recibo/enlace público solo cuando exista. | “The holder’s browser controller authorizes a real permission on Solana devnet. I’m waiting for the network confirmation.” |
| 1:10–1:30 | Vuelve al perfil independiente; solicita el reto de un solo uso y pásalo al titular mediante el flujo real de la app. | “The independent recipient issues a one-time challenge bound to this session and request.” |
| 1:30–1:55 | En el titular, deriva la prueba BBS real en el navegador. Revisa la vista previa y pulsa **Send** explícitamente. | “The issuer signs the synthetic credential; the holder derives the BBS proof in the browser. I can inspect the preview before explicitly sending it.” |
| 1:55–2:10 | Regresa al destinatario y muestra el resultado real `verified: true` y solo los campos revelados. | “The recipient verifies the issuer-signed assertion and current permission. The proof does not establish medical truth.” |
| 2:10–2:40 | Vuelve al titular, revoca y espera confirmación de cadena. Regresa al destinatario e intenta el acceso de nuevo; muestra la denegación real. | “The holder revokes future access. After confirmation, the recipient can no longer verify this permission. Revocation cannot retrieve copies already received.” |
| 2:40–2:55 | Cierra con los límites: “synthetic data / BBS off-chain / devnet permission / no wearable readings”. | “This demonstrates a narrow technical flow, not a clinical outcome or an actual benefit credential. CUDIS and Muse are not connected.” |

If the real confirmation takes longer than the target, keep waiting and keep the
screen truthful. Trim explanatory narration only if necessary; do not fake a
receipt, suppress a failure or present a pending state as confirmed. Expiry and
tamper evidence are supplemental report results, not a reason to stage a
three-minute expiry sequence.

## Recording and submission checklist

- Use truly separate holder and recipient browser profiles; tabs sharing a
  cookie jar are not independent.
- Do not show `.local/`, private keys, environment variables, tokens or real
  health data.
- Show the actual confirmation and result; do not claim all later code revisions
  have browser coverage when the report identifies another revision.
- Do not describe Solana as storing health data, calculating the seven-day
  condition or verifying BBS on-chain.
- Do not claim a production wallet, issuer, insurer, CUDIS, Muse or wearable
  integration, customer, pilot, funding, traction or validated buyer.
- Do not imply that revocation deletes data already received.
- Silvia reviews eligibility, final wording and portal terms and submits the
  application herself. No application or acceptance is performed on her behalf.

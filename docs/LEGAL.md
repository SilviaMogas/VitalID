# Vital ID — legal pack (DRAFT)

**This is a working draft, not legal advice and not "GDPR compliance".**
Every `TODO-LEGAL` marker in `lib/legal.ts` needs a human lawyer's review, and
both documents carry a visible "Draft — not approved for production use"
banner until that review lands.

## What exists

| Piece | Where | Notes |
|---|---|---|
| Privacy Policy (draft) | `/privacy` (single `app/[doc]` route, `dynamicParams=false`) | EN + AR, follows the app's locale toggle. |
| Terms of Service (draft) | `/terms` | EN + AR. |
| Terms/privacy acceptance | `TermsConsent` checkbox at `/signup` | Unchecked by default; records `privacy_policy` + `terms_of_service`. |
| Explicit health-data consent | `HealthDataConsent` checkbox at `/signup` and before the first WHOOP connect | Separate act from terms acceptance; never pre-ticked. |
| Consent audit | `vital_id_consents` table + `/api/consent` | Append-only rows stamped with the **server-owned** current version per type (`CONSENT_POLICY_VERSIONS` in `lib/legal.ts`). RLS on, no public policies — server-only. |
| Wearable gate | `/api/connectors/whoop/connect` + `/callback` | Connect requires member + current `health_data` consent; anonymous/demo sessions never reach the provider. Callback re-checks member+consent **before** `exchangeCode` and the OAuth state is bound to the initiating user id. |
| Signup audit integrity | `app/api/auth/signup` | Returns `503 consent_audit_failed` when the audit write fails — success is never announced without a consent record. Recovery: sign in again → WHOOP asks for consent before connecting (the account is NOT deleted). Other health-data endpoints still require the launch-gate work below. |
| Demo labeling | `DemoBadge` when the Fatima demo session is active; "DEMO" chip on the welcome CTA | Demo keeps synthetic data and cannot connect a real wearable. |
| Medical disclaimer | `insight.disclaimer` on every insight card; `coach.notMedical` on the coach page | |

## NEXT_PUBLIC_DEMO_LOGIN

`NEXT_PUBLIC_DEMO_LOGIN=0` only **hides the demo CTA on the welcome screen**.
It does not disable the demo session mechanics or any API. A hardened
deployment needs server-side gating as well.

## Migration

`supabase/migrations/20261008_vital_id_consents.sql` — apply via the Supabase
dashboard SQL editor or `supabase db push`. Until applied, signups answer
`503 consent_audit_failed` and wearable connects are denied.

## Pending launch gates (not done here)

- Real controller entity + registered address; verified DPO/contact
  (`hello@vitalid.site` is provisional).
- Consent withdrawal workflow (contact-only today).
- Consent gates for users created **before** this pack and for other
  health-data endpoints (not just the WHOOP connect path).
- Professional legal review of both documents.
- Migration applied to production Supabase.
- Self-service export/delete flow.

## TODO-LEGAL checklist (for a human lawyer)

- Controller entity + registered address (privacy §1).
- DPO / privacy contact (§1).
- Data residency, international-transfer mechanism (SCCs), UAE PDPL alignment (§9).
- Exact retention periods per category + deletion schedule (§7).
- Minimum age per market and any age-assurance flow (§11, terms §3).
- DPIA for Art. 9 processing.
- Refund/invoicing terms once real subscriptions replace the $1 demo charge (terms §6).
- Governing law and venue (terms §12).
- Sub-processor list + DPAs (Supabase, Vercel, Stripe, WHOOP) (§5).

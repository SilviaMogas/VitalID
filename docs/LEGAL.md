# Vital ID — legal pack

Minimum legal surface added for the health-data product. **This is an honest
template, not legal advice** — every `TODO-LEGAL` marker in `lib/legal.ts`
needs a human lawyer's review before a real commercial launch.

## What exists

| Piece | Where | Notes |
|---|---|---|
| Privacy Policy | `/privacy` (`app/privacy`, content in `lib/legal.ts`) | EN + AR, follows the app's locale toggle. |
| Terms of Service | `/terms` (`app/terms`) | EN + AR. |
| Explicit consent | `HealthDataConsent` checkbox at `/signup` and before the first WHOOP connect (`WhoopConnectorCard`) | Never pre-ticked; required. |
| Consent audit | `vital_id_consents` table + `/api/consent` | Append-only rows: `privacy_policy`, `terms_of_service`, `health_data` with `policy_version` + `consented_at` (server timestamp). RLS on, no public policies — same model as the other `vital_id_*` tables. |
| Demo labeling | `DemoBadge` in `AppShell` when the Fatima demo session is active; "DEMO" chip on the welcome CTA | `NEXT_PUBLIC_DEMO_LOGIN=0` hides the demo login button entirely (production). |
| Medical disclaimer | `insight.disclaimer` on every insight card (including the compact Trends variant) and `coach.notMedical` on the coach page | "Not medical advice" copy already existed on the coach page. |

## Migration

`supabase/migrations/20261008_vital_id_consents.sql` — apply via the Supabase
dashboard SQL editor or `supabase db push`, like the other `vital_id_*`
migrations. Until it is applied, signups still work (consent is enforced by
the checkbox + server-side validation) but the audit write logs a
`[signup] consent audit write failed` error server-side.

## TODO-LEGAL checklist (for a human lawyer)

- Real controller entity name + registered address (privacy §1).
- DPO / privacy contact — `hello@vitalid.site` is a placeholder.
- Data residency, international transfer mechanism (SCCs), UAE PDPL alignment (§9).
- Exact retention periods per data category + deletion schedule (§7).
- Minimum age per market and any age-assurance flow (§11, terms §3).
- DPIA for Art. 9 processing before launch.
- Refund/invoicing terms once real subscriptions replace the $1 demo charge (terms §6).
- Governing law and venue (terms §12).
- Sub-processor list + DPAs (Supabase, Vercel, Stripe, WHOOP) (§5).

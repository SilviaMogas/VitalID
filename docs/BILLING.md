# Billing / Membership

Stripe **LIVE** membership flow for Vital ID. Three plans (Free $0, Plus $10/month,
Pro $25/month displayed) — during the hackathon, Plus/Pro charge a **one-time $1 USD**
via Stripe Checkout (`mode: "payment"`). No subscriptions are ever created.

## Architecture

- `lib/plans.ts` — single source of truth: plan definitions, feature lists, connector
  limits, pricing-card bullets, `hasFeature()` / `requiredPlanFor()`. Client-safe.
- `lib/membership/` — `MembershipStore` (`memory` + `supabase` backends) and
  cookie session (`vitalid_uid`, httpOnly, 1y). No cookie → demo user `"fatima"`.
- `lib/stripe/server.ts` — cached `Stripe` client, `isStripeConfigured()`,
  `getDemoPriceId(plan)`.
- `lib/stripe/verify.ts` — server-side verification + activation + `assertDemoPrice`.
- API routes: `app/api/membership/*` (GET / signup / reset), `app/api/stripe/checkout`,
  `app/api/stripe/webhook`.
- UI: `/signup`, `/pricing`, `/checkout/success`, `/checkout/cancel`;
  `MembershipProvider` + `useMembership()`, `PlanBadge`, `UpgradeChip`,
  `LockedFeature`, `PremiumShowcase`.
- Persistence: `public.vital_id_memberships` (migration `20260925_vital_id_memberships.sql`,
  RLS on, no policies — server secret key only).

## Exact flow

1. User signs up at `/signup` → `POST /api/membership/signup` sets the `vitalid_uid`
   cookie and creates a free membership row; client sets `localStorage
   vitalid.session="member"` (for Chat A's session gate) and routes to `/pricing`.
2. On `/pricing` the user picks Plus/Pro → `POST /api/stripe/checkout {plan}`:
   validates plan, requires `STRIPE_SECRET_KEY` (else `503 stripe_not_configured`),
   reads the demo Price ID from env, calls `assertDemoPrice` (must be an active
   one-time $1 USD price — refuses otherwise), then creates a Checkout Session
   with `mode:"payment"`, metadata `{plan, userKey}` and `client_reference_id`.
   Returns `{url}`; client redirects.
3. `checkout.session.completed` / `checkout.session.async_payment_succeeded` webhook
   verifies the signature, then calls `verifyAndActivate(session.id)` — it
   **re-retrieves the session from Stripe** (never trusts payload fields).
4. `/checkout/success?session_id=...` calls `verifyAndActivate` again with
   `expectedUserKey` — activation is idempotent (same session id = no-op).

## Verification guards (`verifyCheckoutSession`)

Checked in order: `mode === "payment"` (`bad_mode`) → `payment_status === "paid"`
(`not_paid`) → `amount_total === 100` (`bad_amount`) → `currency === "usd"`
(`bad_currency`) → `metadata.plan ∈ {plus,pro}` (`bad_plan`) → exactly one line item
with the env-configured Price ID and quantity 1 (`bad_price`) → `metadata.userKey`
present, and `user_mismatch` if it differs from the cookie user. `not_found` when the
session cannot be retrieved.

## Env vars (Vercel names — same as `.env.example`)

- `STRIPE_SECRET_KEY` — live secret key (server-only, never logged).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key (client-safe; reserved).
- `STRIPE_WEBHOOK_SECRET` — printed once by `stripe-webhook-setup.mjs`.
- `STRIPE_PLUS_DEMO_PRICE_ID` / `STRIPE_PRO_DEMO_PRICE_ID` — one-time $1 prices.
  Each value may be a `price_…` id **or** a `prod_…` product id; a `prod_…`
  value is resolved at request time via the product's `default_price`
  (`resolveDemoPriceId`, cached per process). Known live ids:
  Plus `prod_VKDczLrBC2JdYD`, Pro `prod_VKDdoPnKPmF18a`.
- `NEXT_PUBLIC_APP_URL` — optional public origin for Checkout return URLs
  (defaults to the request origin).
- `MEMBERSHIP_STORE` — `"supabase" | "memory"` (empty = auto).
- `DEMO_DEFAULT_PLAN` — plan for the Fatima demo user on first visit (default `free`).

## Scripts

```bash
STRIPE_SECRET_KEY=... node scripts/stripe-setup.mjs                  # products + $1 prices, prints env lines
STRIPE_SECRET_KEY=... node scripts/stripe-webhook-setup.mjs https://app.example.com   # webhook endpoint + secret
SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/membership-smoke.mjs            # table smoke test
```

## Fatima / demo semantics

- No `vitalid_uid` cookie → `user_key = "fatima"` (demo user). `DEMO_DEFAULT_PLAN`
  controls Fatima's plan on first row creation.
- `POST /api/membership/reset` → back to free, clears Stripe fields (mirrors
  `/api/share/reset`).
- Free plan never calls Stripe.

## Security

- All Stripe/Supabase access is `server-only`; client components only use
  `lib/plans.ts` + `useMembership()`.
- Webhook requires a valid signature; entitlement is decided only after
  re-fetching the session from Stripe.
- `assertDemoPrice` blocks misconfigured Price IDs (wrong amount, recurring, inactive)
  before a checkout can be created.
- `vital_id_memberships` has RLS enabled with no policies — service_role only.

## Demo sign-in (no real auth)

`POST /api/membership/signin {email}` looks up a membership row by email
(case-insensitive, `lower(email)` index) and sets the `vitalid_uid` cookie —
there is no password or verification; it is a demo-grade shortcut for the
hackathon, not authentication. Unknown email → `404 {error:"not_found"}`.

Routing state is tracked on the membership row: `plan_chosen_at` (set by
`POST /api/membership/choose-free` or any paid activation) and
`onboarding_completed_at` (set by `POST /api/membership/onboarding/complete`).
`GET /api/membership` exposes them as `planChosen` / `onboardingComplete`
(always `true` for the Fatima demo user). AppShell redirects `member` sessions
on shell routes to `/pricing` or `/onboarding` until both are done.

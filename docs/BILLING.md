# Billing / Membership

Stripe **LIVE** membership flow for Vital ID. Three plans (Free $0, Plus $10/month or
$96/year, Pro $25/month or $240/year) charged as **real recurring subscriptions**
via Stripe Checkout (`mode: "subscription"`). Annual billing saves ~20% (2 months free).

## Architecture

- `lib/plans.ts` — single source of truth: plan definitions, feature lists, connector
  limits, pricing-card bullets, `hasFeature()` / `requiredPlanFor()`, plus
  `BillingInterval` (`"monthly" | "annual"`) and the per-interval price env var names.
  Client-safe.
- `lib/membership/` — `MembershipStore` (`memory` + `supabase` backends) and
  cookie session (`vitalid_uid`, httpOnly, 1y). No cookie → demo user `"fatima"`.
- `lib/stripe/server.ts` — cached `Stripe` client, `isStripeConfigured()`,
  `getPriceId(plan, interval)` / `resolvePriceId(plan, interval)`,
  `getConfiguredPriceRefs(plan)`.
- `lib/stripe/verify.ts` — server-side verification + activation
  (`verifyCheckoutSession` / `verifyAndActivate`), subscription-state sync
  (`syncSubscriptionFromStripe`) and `assertSubscriptionPrice`.
- API routes: `app/api/membership/*` (GET / choose-free / reset),
  `app/api/stripe/checkout`, `app/api/stripe/webhook`, `app/api/stripe/portal`.
- UI: `/signup`, `/pricing` (with the Monthly/Yearly toggle and *Manage billing*),
  `/checkout/success`, `/checkout/cancel`; `MembershipProvider` + `useMembership()`,
  `PlanBadge`, `UpgradeChip`, `LockedFeature`, `PremiumShowcase`.
- Persistence: `public.vital_id_memberships` (migrations
  `20260925_vital_id_memberships.sql` + `20261011_vital_id_memberships_subscriptions.sql`,
  RLS on, no policies — server secret key only).

## Exact flow

1. User signs up at `/signup` → `POST /api/auth/signup` sets the session cookies and
   creates a free membership row; client routes to `/pricing`.
2. On `/pricing` the user picks a billing interval (Monthly/Yearly toggle) and a
   paid plan → `POST /api/stripe/checkout {plan, interval}`:
   validates both, requires `STRIPE_SECRET_KEY` (else `503 stripe_not_configured`),
   resolves the configured Price ID for that interval from env, calls
   `assertSubscriptionPrice` (must be an active recurring USD price with the right
   interval — refuses otherwise), then creates a Checkout Session with
   `mode:"subscription"`, metadata `{plan, interval, userKey}` on both the session
   and `subscription_data`, and `client_reference_id`. Returns `{url}`; client redirects.
3. `checkout.session.completed` / `checkout.session.async_payment_succeeded` webhook
   verifies the signature, then calls `verifyAndActivate(session.id)` — it
   **re-retrieves the session (and the subscription) from Stripe** (never trusts
   payload fields).
4. `/checkout/success?session_id=...` calls `verifyAndActivate` again with
   `expectedUserKey` — activation is idempotent (same session id = no-op).
5. `customer.subscription.updated` / `customer.subscription.deleted` webhook events
   call `syncSubscriptionFromStripe(subscription.id)`, which re-retrieves the
   subscription and calls `MembershipStore.syncSubscription`:
   - `active` / `trialing` / `past_due` → plan = `subscription.metadata.plan`
     (lookup order: `stripe_subscription_id` → `metadata.userKey` → `stripe_customer_id`)
   - `canceled` / `unpaid` / `incomplete_expired` / `paused` / `incomplete` → plan = `free`
   - `cancel_at_period_end` keeps the subscription `active` until period end, so the
     plan stays paid until Stripe fires `customer.subscription.deleted`.
6. `/pricing` shows **Manage billing** to paying members → `POST /api/stripe/portal`
   creates a Stripe Billing Portal session (`return_url` → `/pricing`). Requires a
   `stripe_customer_id` on the membership row and a signed-in member (the Fatima demo
   user gets `403 demo_not_allowed`).

## Verification guards (`verifyCheckoutSession`)

Checked in order: `mode === "subscription"` (`bad_mode`) → `payment_status === "paid"`
(`not_paid`) → `metadata.plan ∈ {plus,pro}` (`bad_plan`) → exactly one line item of
quantity 1 whose price is **recurring USD** and either equals a configured `price_…`
id or belongs to a configured `prod_…` product for that plan (`bad_price`) →
`metadata.userKey` present, and `user_mismatch` if it differs from the cookie user →
the session's subscription exists and is `active`/`trialing`/`past_due`
(`subscription_inactive`). `not_found` when the session cannot be retrieved.

## Env vars (Vercel names — same as `.env.example`)

- `STRIPE_SECRET_KEY` — live secret key (server-only, never logged).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key (client-safe; reserved).
- `STRIPE_WEBHOOK_SECRET` — printed once by `stripe-webhook-setup.mjs`.
- `STRIPE_PRICE_PLUS_MONTHLY` / `STRIPE_PRICE_PLUS_ANNUAL` /
  `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_ANNUAL` — recurring subscription
  prices. Each value may be a `price_…` id **or** a `prod_…` product id; a
  `prod_…` value is resolved at request time via the product's `default_price`
  (fetched per call — never cached). `STRIPE_PRODUCT_{PLUS|PRO}_{MONTHLY|ANNUAL}`
  are also accepted.
- `NEXT_PUBLIC_APP_URL` — optional public origin for Checkout/Portal return URLs
  (defaults to the request origin).
- `MEMBERSHIP_STORE` — `"supabase" | "memory"` (empty = auto).
- `DEMO_DEFAULT_PLAN` — plan for the Fatima demo user on first visit (default `free`).
- `NEXT_PUBLIC_DEMO_LOGIN` — set to `1` to show the "Login as Fatima" instant demo.
  **OFF by default** — it gates both the welcome-screen entry point and the
  client-side demo session flag. Build-time variable: it is inlined into the client
  bundle, so change it before deploying.

## Creating the prices in Stripe (dashboard or script)

Recommended: run the setup script — it is idempotent and prints the exact env lines.

```bash
# 1) TEST MODE FIRST: verify the whole flow with test clocks / 4242 cards
STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
# 2) then run it again with the live key for production env vars
STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs
```

Manual alternative — Stripe Dashboard → Product catalog → create product
"Vital ID Plus" → add two **Recurring** USD prices: monthly $10.00 and yearly
$96.00. Repeat for "Vital ID Pro": monthly $25.00, yearly $240.00. Copy each
`price_…` id into the matching `STRIPE_PRICE_*` env var.

The webhook endpoint needs these events: `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `customer.subscription.updated`,
`customer.subscription.deleted`. The script creates all four:

```bash
STRIPE_SECRET_KEY=... node scripts/stripe-webhook-setup.mjs https://app.example.com
SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/membership-smoke.mjs
```

**Billing Portal:** to let members cancel/update their subscription, activate the
customer portal in the Stripe dashboard (Settings → Billing → Customer portal).
Without it `POST /api/stripe/portal` still returns a URL only when the portal is
enabled — until then members can be cancelled from the Stripe dashboard directly.

## Solana Pay (one-time SOL)

Besides Stripe subscriptions, paid plans can be bought with a **one-time SOL
transfer** via the Solana Pay protocol — no payment provider account needed.

- `lib/solpay/` — config (`SOL_TREASURY_ADDRESS`, `SOL_PAY_CLUSTER`,
  `SOL_PAY_LAMPORTS_*`), a fetch-based JSON-RPC client (no SDK dependency), the
  `vital_id_sol_payments` store (Supabase + memory backends), and verification
  in `service.ts`.
- `POST /api/sol/checkout {plan, interval}` → creates a payment request: a fresh
  **reference** public key, the expected lamports, and a `solana:` URL shown as
  a QR on `/pricing` (works with any Solana wallet; no in-browser wallet needed).
- `GET /api/sol/status?reference=…` → the UI polls it; the server calls
  `getSignaturesForAddress(reference)` + `getParsedTransaction` on the configured
  RPC and accepts the first confirmed transaction that transfers **≥ expected
  lamports** to the treasury (inner instructions included). Underpaid and
  unrelated transactions are ignored; a claimed signature can never settle two
  requests (unique index + atomic claim).
- On settlement `MembershipStore.activatePlan` runs with
  `stripeCheckoutSessionId = "sol:<signature>"`, `subscriptionStatus =
  "sol_one_time"` and `subscriptionPeriodEnd = +30d (monthly) / +365d (annual)`.
  **No auto-renewal**: reads (`applySolReadExpiry`) treat the plan as `free`
  once the period ends — there is no webhook to downgrade later.
- Payment requests expire after `SOL_PAY_EXPIRY_MINUTES` (default 60).
- Migration: `supabase/migrations/20261013_vital_id_sol_payments.sql` (RLS on,
  no policies — server secret only, same as `vital_id_memberships`).

Defaults target **devnet** for demos; for real SOL set `SOL_PAY_CLUSTER=
mainnet-beta` and the `SOL_PAY_LAMPORTS_*` prices — there is no USD conversion.

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
  re-fetching the session/subscription from Stripe.
- `assertSubscriptionPrice` blocks misconfigured Price IDs (one-time, wrong
  interval, wrong currency, inactive) before a checkout can be created.
- `vital_id_memberships` has RLS enabled with no policies — service_role only.

## Sign-in

Real authentication is Supabase Auth (email + password, `POST /api/auth/signin`).
The old email-only demo sign-in is gone; the only demo entry point is the Fatima
instant demo, gated behind `NEXT_PUBLIC_DEMO_LOGIN=1` (OFF by default).

Routing state is tracked on the membership row: `plan_chosen_at` (set by
`POST /api/membership/choose-free` or any paid activation) and
`onboarding_completed_at` (set by `POST /api/onboarding`).
`GET /api/membership` exposes them as `planChosen` / `onboardingComplete`
(always `true` for the Fatima demo user), plus `subscriptionStatus` and
`subscriptionPeriodEnd` for paid members. AppShell redirects `member` sessions
on shell routes to `/pricing` or `/onboarding` until both are done.

---
name: fishtank-ui-testing
description: Run Supabase-backed signup/onboarding UI checks in an isolated Next.js checkout, including mobile and Arabic.
---

# Vital ID UI testing

Use a detached worktree pinned to the requested commit when another session may
change the main checkout. Install with `npm ci`, then run
`npm run dev -- -p 3001`. Do not run a build alongside a dev server sharing the
same `.next` directory. If Webpack chunks become stale after changing commits,
stop the server, remove only generated `.next`, restart, and hard-refresh.

## Devin Secrets Needed

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- Paid checkout additionally needs `STRIPE_SECRET_KEY` and
  `STRIPE_PLUS_DEMO_PRICE_ID` / `STRIPE_PRO_DEMO_PRICE_ID`; consult
  `docs/BILLING.md` for webhook configuration before claiming paid activation.

## Real UI journey

- Signup uses unique test email addresses and passwords of at least 8 characters.
- Signup leads to pricing; Free starts six-step onboarding.
- Step 1 requires birth date and gender in addition to signup profile fields.
- Step 4 accepts manual sleep hours and resting heart rate.
- Step 5 connectors remain pending; UAE is announced-only.
- Finish step 6, then verify manual values and source labels on the dashboard.
- Test completed and incomplete accounts separately: completed goes home;
  incomplete resumes its persisted step. Keep the test email and last completed
  step in the handoff so subsequent sessions need not recreate accounts.
- Welcome can initially show a Get started splash; click it to expose Sign in,
  Sign up, and Login as Fatima.
- Fatima demo bypasses the member journey. Check source labels per metric;
  do not assume all demo metrics have the same source.
- Without Stripe configuration, verify Plus/Pro visibly report unavailable
  payments and mark full paid activation untested.

## Visual checks

Use Chrome device mode around 390x844 and the app's language toggle for Arabic.
Inspect the mirrored cards and source labels, not just translated DOM strings.
When typing into responsive-mode forms, verify the entered value before submit;
separate focus, select-all, and typing into separate tool calls if keys are lost.
Capture English/Arabic screenshots at the same scroll position.

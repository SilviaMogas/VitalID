---
name: fishtank-sharing-ui-testing
description: Test Vital ID sharing and insurer recipient flows locally with Fatima demo access, Supabase persistence, and English/Arabic UI.
---

# Vital ID sharing UI testing

Working directory: repository root. Use the existing environment blueprint for Node/dependency setup and `npm run dev` startup. Reuse a healthy local server when it already serves the intended branch.

## Devin Secrets Needed

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (server-side only)

Shares use Supabase when both variables are present and `SHARE_STORE` is not `memory`. Inspect presence without printing values. `SHARE_STORE=memory` exercises a different persistence path; do not describe that run as Supabase-backed.

## Demo access and navigation

- Open `/share/` (a trailing slash avoids browser autocomplete to a previously visited `/shared/<token>`).
- When gated, click Get started, then Login as Fatima. No password is needed. The demo user may have Free membership; that does not block insurer sending.
- Choose Doctor visit (or another purpose), then Generate secure link. Purpose presets select information categories. The Free default is one-hour expiry; QR sharing can be gated independently.
- Scroll beneath the generated URL to reach the insurer grid. Sending records recipients; do not assert email delivery.
- Do not use Reset Demo to clean up: the demo list may include other sessions' shares. Revoke only tokens created during your test.

## State and locale

- Owner result state is ephemeral. Reload preserves list badges but loses the generated result/picker.
- The shell keys its content by locale, so switching English/Arabic can reset the owner form. Switch locale before generating a share when testing localized picker actions.
- To retain owner result state while testing recipients, Copy the URL and explicitly open it in another browser tab. Confirm tab preservation rather than assuming target-blank navigation preserves the owner.
- Recipient pages expose their own locale button and can be refreshed independently. Their poll interval is approximately ten seconds.

## High-value assertions

- Selection and deselection change the count; zero disables sending.
- Sending two recipients marks both Sent and resets selection; adding a third preserves previous Sent recipients.
- Owner list badges survive reload, and recipient Sent to names match the merged recipients exactly.
- An unsent share omits Sent to entirely.
- Revoking from the current result removes insurer controls. Recipient refresh shows localized expired/revoked messaging with no report data.

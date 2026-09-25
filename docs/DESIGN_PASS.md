# Vital ID — look & feel pass

Scope: presentation only. No changes to analytics, demo data, share API/store, routes, or types.

## Visual concept
"Health credential, not dashboard." Warm off-white canvas (`#f6f4ef`), deep teal brand
(`#0f6e66`) with a sand accent (`#c9a86a`) for identity/credential moments, near-black ink.
One elevated hero per screen (insight hero, credential card, QR result); everything else is
quieter layered surfaces (`.surface` flat tint vs `.card` lifted) so white cards stop repeating.
Type: tight tracking on headings, tabular numerals, small-caps eyebrow labels.

## Splash flow
`/` (and any core route) is gated client-side by `vitalid.session` in localStorage.
Without it, `Onboarding` renders full-screen: Splash (brand, tagline, produce crew dancing,
"Get started"; auto-advances after ~4.5s) → Welcome. `/welcome` always shows the flow so it can
be replayed in a demo. "Sign out" in the shell clears the flag.

## Auth flow
Welcome: brand, "Welcome to Vital ID", "Access your health identity securely", Sign in /
Sign up (demo-only — show a small note, no real auth), primary "Login as Fatima" which sets
the session flag and enters the existing dashboard. Desktop = split screen with a live preview
of the credential card; mobile = stacked.

## Mascot system
`components/mascot/Broccoli.tsx` — inline SVG, `state: neutral|happy|alert|encouraging|success`,
`size`. Eyes/mouth/arms change per state; idle blink + float via CSS. `MascotNote` pairs the
mascot with one line of microcopy. Used in: Today's insight hero, unusual-metric detail on
Trends, Share step header, QR result (success), revoked state, recipient page. Supporting crew
(apple, banana, orange, avocado, strawberry, carrot) in `Crew.tsx`, splash + welcome only.

## Motion approach
Pure CSS keyframes in `globals.css` (`float`, `sway`, `bounce`, `blink`, `rise`, `pop`), staggered
via `--i`/`animation-delay`. `.rise` page-entrance utility; card hover lift; button press scale.
Everything inside `@media (prefers-reduced-motion: no-preference)`; reduced motion = static.

## Components modified
- `app/globals.css`, `app/layout.tsx` (theme color), `app/welcome/page.tsx` (new)
- `components/layout/AppShell.tsx` (gate, sign out, nav polish)
- `components/onboarding/{Splash,Welcome,Onboarding}.tsx` (new)
- `components/mascot/{Broccoli,Crew,MascotNote}.tsx` (new)
- `components/dashboard/{Dashboard,InsightCard,MetricCard,StatusBadge}.tsx`
- `components/trends/TrendsView.tsx`
- `components/vital-id/{VitalIdView,VitalIdSections}.tsx`
- `components/share/{ShareClient,SharedViewClient}.tsx` (markup/classes only; fetch/state untouched)
- `lib/i18n.ts` (new `onboarding.*`, `mascot.*` strings, EN + AR)

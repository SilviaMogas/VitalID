# Vital ID — current visual design

## Visual direction

The web experience is Apple-inspired, but Vital ID is not affiliated with Apple.
It uses the system font stack; no proprietary fonts are bundled. The canvas is
`#f5f5f7`, ink is `#1d1d1f`, and the Vital ID brand green `#0e7a5f` is retained.
White grouped cards use 24px corners. Segmented controls are grey with a white
selected state; the selected sidebar item uses soft green. Mobile navigation is
translucent. Shared design tokens apply across the screens.

The section label is **Health** in English and **الصحة** in Arabic.

## Core screens

- Welcome uses a split layout with a health-identity preview explicitly marked
  **DEMO**. Sign-up and sign-in use real Supabase authentication, not a
  demo-only `localStorage` session.
- The dashboard has a compact heading rather than a painted hero.
- Settings use grouped rows. Wellness uses private forms for personal records.
- The Vital ID card has a calmer gradient. Self-reported profile information
  carries no verification badge.
- Coach guidance is rule-based; it is not AI and is not a doctor or medical
  advice.

## Scope

This visual pass does not change authentication or API behavior. The design
describes the web experience only: it does not claim a native app or offline
capabilities.

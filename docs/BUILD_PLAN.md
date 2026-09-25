# Vital ID — 3 Hour Hackathon Build Plan

## Goal
Build a reliable end-to-end MVP in 3 hours.

Golden path:
Dashboard → Trends → Insight → Vital ID → Share → Temporary Link/QR → Recipient View → Revoke

## Product rule
Every feature must answer one of:
1. What is happening?
2. How is it changing?
3. What does it mean?
4. What do I want to share?

Anything else is out of scope for the MVP.

## Work split

### Devin Chat A — Core Product Experience
Own:
- Next.js/TypeScript/Tailwind app foundation
- Global layout and navigation
- English/Arabic language architecture
- RTL/LTR
- Dashboard
- deterministic demo health dataset
- Trends 7D/30D
- baseline calculations
- deterministic insights
- Vital ID card/profile
- mobile polish

Do not own:
- token creation
- recipient access
- revocation
- QR generation

Primary files/directories:
- app/(core)/*
- components/dashboard/*
- components/trends/*
- components/vital-id/*
- lib/demo-data.ts
- lib/analytics.ts
- lib/i18n.ts
- types/*

### Devin Chat B — Secure Sharing + Integration
Own:
- Share flow
- field-level selective disclosure
- temporary access token
- expiry
- QR generation
- recipient read-only page
- revoke
- demo reset
- integration checks
- deployment readiness

Do not redesign Dashboard/Trends/Vital ID components owned by Chat A.

Primary files/directories:
- app/share/*
- app/shared/[token]/*
- app/api/share/*
- components/share/*
- lib/sharing.ts
- lib/share-store.ts

## Shared contracts

### HealthMetric
- metric
- value
- unit
- timestamp
- source
- baseline
- delta
- status

### SharePayload
- id
- createdAt
- expiresAt
- revoked
- selectedFields
- snapshot

## MVP screens
1. Home / Dashboard
2. Trends
3. Vital ID
4. Share
5. Shared recipient view

## Explicitly out of scope
- ElevenLabs
- voice
- PLAUD
- live wearable OAuth
- Stripe/memberships
- Pomodoro/work hours
- challenges
- complex onboarding
- medical diagnosis
- complex AI agent
- production-grade auth

## Demo persona
Use fictional demo data only. Keep it deterministic and clearly labeled where appropriate.

## Integration cadence
- First running app ASAP
- First deployable version within 30 minutes
- Integrate at ~60 min
- Integrate again at ~120 min
- Final 30 minutes: no new features, only QA and demo hardening

## Definition of done
A phone can complete:
Open → Dashboard → Trends → Insight → Vital ID → Share → QR/link → Recipient → Revoke

Both English and Arabic must remain usable.

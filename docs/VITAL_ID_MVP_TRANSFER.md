# Vital ID MVP transfer

Transferred at the owner's request from SilviaMogas/vitalID-Test, commit 838abd1e3c748af8bd6c3ec306f8029b2dfc837e. The complete 121-file source snapshot is in `vital-id-mvp/`. The existing FISHTANK application remains intact. This is a standalone runnable snapshot, not yet integrated into the root app.

## Run the transferred version

```sh
cd vital-id-mvp
npm ci
npm run dev -- --port 3060
```

Open http://localhost:3060/onboarding. Read `vital-id-mvp/docs/onboarding-mvp.md` for the consent model, actual/synthetic/planned capabilities, assumptions and 60-second demo script. Existing root environment variables are not automatically inherited; configure this version separately using its README. No credentials, personal runtime records, dependencies or build outputs were transferred.

## Work preserved

Animated welcome and Fátima demo dashboard, data-focused views, check-in and coach, work breaks, profiles and connectors; consent-first bilingual English/Arabic RTL onboarding; selective insurer information packs with source/date/verification metadata, manual edits, supporting documents, exact recipient preview, expiry, revocation and access history. WHOOP is configuration-dependent; the demo is fictional and no insurer partnership or acceptance is asserted.

## Prior validation

Source version: 75 unit tests, production build, five onboarding browser tests and three account browser tests passed locally. Lint passed with two pre-existing warnings. These are source-version results, not tests of integration into the root FISHTANK app. No live insurer or WHOOP account was exercised.

# Vital ID native mobile

This directory is an independent Expo SDK 54 package for the Vital ID native
Android and iPhone clients. It contains genuine native React Native screens and
does not wrap the web application in a WebView.

## Local commands

From the repository root:

```sh
npm run test:mobile
```

From `mobile/`:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run bundle:android
npm run bundle:ios
```

The bundle commands validate the JavaScript export for each native platform.
They do not compile an Android APK or an iOS app. `npx expo prebuild` generates
the ignored CNG `android/` and `ios/` directories when a local native build is
needed.

## Product boundary

The app supports English and Arabic, and signs in existing Vital ID accounts
with email and password. Signup, onboarding, and native wallet login are not
implemented here; those flows remain on the existing web application. The
client requires the current API routes to be merged and deployed before a
production APK can sign in.

Health information and sharing are gated by explicit, current consent. Share
previews show the selected fields before authorization, and shares enforce
expiry and revocation. The app displays sample/provenance information and
does not make clinical claims; it is not a medical device or a source of
clinical truth.

CUDIS, Muse, Apple HealthKit, Android Health Connect, wallet payments, and
SOL/USDC payments are not connected. The native app is separate from the
synthetic Solana/BBS demonstration.

## Session security

Access tokens are held only in memory. Only the refresh token is stored in
Expo SecureStore with device-only, unlock-required accessibility. Requests use
the HTTPS production origin, omit cookies, send no credentials in URLs, and
use no-store caching with a bounded timeout. Refresh is single-flight and
generation-aware so logout or a newer sign-in cannot be undone by late
requests. Sign-out always attempts to clear local storage; a SecureStore
failure is shown as an error requiring another local-clear attempt rather than
being reported as a successful local logout.

The API applies current consent separately to identity and health-sharing
operations. Revocation remains available without renewed health consent so an
expired consent cannot trap an existing permission.

## Release status

No paid EAS jobs, store publication, or production signing has been performed.
Any locally assembled APK is for testing only and must not be treated as a
production release. Store signing, publishing, and Apple/Google release
compliance review—including account-deletion requirements—are still pending.
An iOS JavaScript bundle is not an iOS/Xcode compilation or App Store build.

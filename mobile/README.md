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

The app supports English and Arabic. Existing members can sign in with email
and password, or use the Solana wallet tied to their Vital ID account on
Android. Signup and onboarding remain on the website. Deploy the mobile API
routes before testing with the production backend.

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

### Seeker / Solana dApp Store

On Android, **Sign in with a Solana wallet** opens the device's selected
Mobile Wallet Adapter wallet, including Seed Vault Wallet on Seeker. The app
requests a mainnet message signature, never a transaction or seed phrase.
The server verifies a short-lived, single-use challenge before returning a
native session; neither wallet sign-in nor selective sharing writes health
data on-chain. This is not device attestation and does not require a Seeker
NFT or an SKR balance.

For a local test APK, from `mobile/` with the Android SDK and JDK 17 installed:

```sh
npx expo prebuild --platform android --no-install
./android/gradlew -p android :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The result is `android/app/build/outputs/apk/release/app-release.apk`. The
local Expo build uses development signing; use test accounts and test data
only. Expo Go cannot run this native wallet module.

Before testing and submitting the dApp Store build:

1. Ensure Vercel can deploy Vital ID to `https://www.vitalid.site`.
2. Link the Vital ID Expo project and create a **non-default** remote Android
   credential named `dapp-store`, separate from Google Play's. Keep the same
   signing key for future dApp Store updates. Build the signed APK with
   `eas build --platform android --profile dapp-store`. Increment the local
   Android version code for subsequent releases.
3. Run `apksigner verify --print-certs <release.apk>`. Set
   `SEEKER_ANDROID_CERT_SHA256` on Vercel to the **Signer #1 certificate SHA-256
   digest** from the signed dApp Store APK (not the APK file hash or preview
   certificate), then deploy. The server publishes the association for
   `site.vitalid.app` at
   `https://www.vitalid.site/.well-known/assetlinks.json`; verify it returns
   `200 application/json` without redirects and contains the same fingerprint.
   Without a valid fingerprint the route returns `404`. Confirm that an
   unauthenticated `GET /api/mobile/v1/account` returns `401` JSON.
4. Test the release APK on a physical Seeker with an existing Vital ID Solana
   test account and synthetic data only. Cancel one wallet prompt, then sign
   in with the same wallet, verify consent gating, preview and revoke a test
   share, and sign out. If the local debug-signed APK is already installed,
   uninstall it before installing the release APK; the signing keys differ.
5. Before submitting to the [Solana dApp Store](https://docs.solanamobile.com/dapp-store/submit-new-app),
   verify public `/terms` and `/privacy` pages and confirm that the published
   privacy contact can handle account deletion requests. Prepare an opaque
   512×512 icon, a 1200×600 banner, and 4–8 screenshots
   or videos using only synthetic test data. The publisher completes identity
   verification and signs submissions with their publisher wallet.

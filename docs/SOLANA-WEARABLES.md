# Featured Solana wearables

Reviewed 2026-10-13. The `/connectors` discovery section is editorial, not an
integration directory or an exhaustive registry. Entries do not enter
`PROVIDERS`, onboarding selection, plan limits, ingestion or dashboard attribution.
No wallets, health data, accounts or tokens are connected by visiting a project.

## Included projects and primary evidence

| Project | Evidence of Solana relationship / features | Status represented |
| --- | --- | --- |
| CUDIS Ring (product family) | [Manufacturer](https://www.cudis.xyz/), [CUDIS whitepaper](https://static.cudis.xyz/Cudis_MiCAR_Whitepaper__Updated.docx.pdf), [API v1](https://developer.cudis.xyz/infrastructure/cudis-apis/api-v1) | Health ring offered for sale. API invitation-only; sleep/steps still unavailable in public v1 docs. No Vital ID connector. |
| Showtime Watch | [Project website](https://show.watch/) explicitly describes Solana, heart-rate and SpO₂ sensors. | Preorder site; delivery not independently verified. Its FAQ still cites Q1 2025, not proof of shipping. No confirmed health-data API. |
| SolWear | [Project](https://solwear.tech/), [public prototype](https://github.com/solwear/solwear) | Solana wrist signer prototype. Secure element/audited firmware are roadmap items. Not a health source. |
| Solana Glasses | [Project](https://solanaglasses.com/) | Announced QR/NFC/payment/DeFi glasses with a waitlist. Shipping and capabilities unverified. Not a health source. |
| Franck Muller × Solana | [Collection website](https://solanaxfranckmuller.com/) | Limited-edition mechanical watch with a wallet-address QR. Reservation page; not a health tracker or on-device signer. |

Device features are manufacturer claims, not tested capabilities or available
API fields. Listing is not a partnership, investment recommendation or security
endorsement. Each card exposes its primary project URL and a technical source
where distinct. Update the review date only after rechecking the evidence.

## Excluded or not promoted

- WatchX: [IoTeX's own ecosystem report](https://iotex.io/blog/iotex-ecosystem-deep-dive/)
  identifies its ioID integration; no direct primary-source Solana relationship
  was established. A bridge or generic Web3 label is not enough.
- Apple Watch/Health, Garmin, Oura: compatibility with another app does not make
  these Solana devices.
- Saga/Seeker: phones, not wearables.
- SleepFi and move-to-earn apps: software using existing wearables, not new devices.
- Unverified tokens, generic repository-only concepts and duplicate product names
  are not presented as commercially available hardware.

## CUDIS integration gate

An actual connector is blocked on official partner access and a confirmed
contract: Client-ID, API/OAuth base URLs, token placement and headers, redirect
handling, state support, date parameters, metric availability, expiry/revocation,
rate limits and sandbox access. The public docs specify `response_type=token`,
`scope=daily`, 30-day expiry and session-expired code `20007`; they do not justify
guessing the missing details. Never derive resting heart rate from daily minimum
heartbeat without a documented metric definition.

When access is granted, preserve member authentication, current health consent,
server-side tokens, user-bound anti-CSRF state and demo isolation. Do not claim a
working connection until real authorized data has been read. This PR adds no
CUDIS routes, credentials, migrations, simulated CUDIS data or live connection.

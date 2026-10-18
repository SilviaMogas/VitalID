# Wallet sign-in

Vital ID supports account-ownership sign-in from the Solflare and Phantom Solana browser providers and MetaMask's injected Ethereum provider. MetaMask discovery prefers EIP-6963 and falls back to the browser's legacy injected provider. Ethereum sign-in verifies an EOA `personal_sign` signature for the requested chain; it does not make an RPC call or initiate a payment.

The wallet signs a short-lived, single-use message bound to the site origin and account. Wallet sign-in creates or resumes a Vital ID account; it does not link a separate email/password account or another wallet identity. Terms and explicit health-data consent are still required.

WalletConnect, native mobile-wallet handshakes, smart-contract wallet signatures, KYC, W3C credentials and on-chain Digital ID credentials are not supported or claimed by this flow. A successful wallet sign-in proves control of the signing key only.

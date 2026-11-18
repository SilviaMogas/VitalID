import { transact, SolanaMobileWalletAdapterErrorCode, SolanaMobileWalletAdapterProtocolErrorCode } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { encode } from "js-base64";
import { seekerIdentity } from "../../lib/solpay/seeker-identity";
import { ApiError, api } from "./api";
import { isSeekerChallenge, readWalletAddress, readWalletSignature } from "./seeker-proof";

export const seekerAvailable: boolean = true;

export async function signInWithSeeker(): Promise<void> {
  let proof;
  try {
    proof = await transact(async (wallet) => {
      const { accounts } = await wallet.authorize({ identity: seekerIdentity, chain: "solana:mainnet" });
      const address = accounts[0]?.address;
      if (!address) throw new ApiError(0, "wallet_failed");
      const publicKey = readWalletAddress(address);
      if (!publicKey) throw new ApiError(0, "wallet_failed");
      const message = await api.walletChallenge(publicKey);
      if (!isSeekerChallenge(message, publicKey)) throw new ApiError(0, "wallet_failed");
      const payload = encode(message);
      const { signed_payloads } = await wallet.signMessages({ addresses: [address], payloads: [payload] });
      const signature = signed_payloads[0] && readWalletSignature(signed_payloads[0], payload);
      if (!signature) throw new ApiError(0, "wallet_failed");
      return { publicKey, message, signature };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND) {
      throw new ApiError(0, "wallet_missing");
    }
    if (code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_NOT_SIGNED ||
      code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_AUTHORIZATION_FAILED) {
      throw new ApiError(0, "wallet_declined");
    }
    throw new ApiError(0, "wallet_failed");
  }
  await api.signInWithWallet(proof);
}

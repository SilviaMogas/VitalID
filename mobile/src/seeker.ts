import { ApiError } from "./api";

export const seekerAvailable: boolean = false;
export async function signInWithSeeker(): Promise<void> {
  throw new ApiError(0, "wallet_missing");
}

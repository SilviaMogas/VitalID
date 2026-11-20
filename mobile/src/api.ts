import * as SecureStore from "expo-secure-store";
import { seekerIdentity } from "../../lib/solpay/seeker-identity";
import { ApiError, createApiTransport, REFRESH_STORAGE_KEY, validateApiOrigin } from "./api-core";

export { ApiError };

const development = typeof __DEV__ !== "undefined" && __DEV__;
const configuredOrigin = process.env.EXPO_PUBLIC_API_ORIGIN ?? seekerIdentity.uri;
export const API_ORIGIN = validateApiOrigin(configuredOrigin, development);

const storage = {
  get: () => SecureStore.getItemAsync(REFRESH_STORAGE_KEY),
  set: (value: string) => SecureStore.setItemAsync(REFRESH_STORAGE_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  clear: () => SecureStore.deleteItemAsync(REFRESH_STORAGE_KEY),
};

const transport = createApiTransport({
  origin: API_ORIGIN,
  development,
  storage,
});

export const api = transport;

export function publicShareUrl(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("invalid_share_id");
  return `${API_ORIGIN}/shared/${id}`;
}

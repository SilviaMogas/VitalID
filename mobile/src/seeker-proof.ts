import { isValid, toUint8Array } from "js-base64";
import { base58Encode } from "../../lib/solpay/base58";
import { mobileWalletMessageHeading, seekerIdentity } from "../../lib/solpay/seeker-identity";

export function readWalletAddress(encoded: string): string | null {
  if (encoded.length > 44 || !isValid(encoded)) return null;
  const bytes = toUint8Array(encoded);
  return bytes.length === 32 ? base58Encode(bytes) : null;
}

export function isSeekerChallenge(message: string, publicKey: string): boolean {
  const host = new URL(seekerIdentity.uri).host;
  const lines = message.split("\n");
  return lines.length === 6 &&
    lines[0] === mobileWalletMessageHeading(host) &&
    lines[1] === publicKey && lines[2] === "" && lines[3] === `URI: ${seekerIdentity.uri}` &&
    /^Nonce: \d{13}\.[a-f0-9]{16}\.[a-f0-9]{32}$/.test(lines[4]) &&
    /^Issued At: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(lines[5]);
}

export function readWalletSignature(encoded: string, payload: string): string | null {
  if (encoded.length > (payload.length + 88) || !isValid(encoded)) return null;
  const signed = toUint8Array(encoded);
  if (signed.length === 64) return base58Encode(signed);
  const message = toUint8Array(payload);
  if (signed.length !== message.length + 64 ||
    !message.every((byte, index) => signed[index] === byte)) return null;
  return base58Encode(signed.subarray(message.length));
}

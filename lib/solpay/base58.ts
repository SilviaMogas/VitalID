// Minimal base58 codec (Bitcoin/Solana alphabet) — enough for Solana Pay
// addresses and signatures without pulling in @solana/web3.js.
// Client-safe: pure functions, no Node APIs.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(58);

const DECODE_MAP = (() => {
  const map = new Map<string, number>();
  for (let i = 0; i < ALPHABET.length; i += 1) map.set(ALPHABET[i], i);
  return map;
})();

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  let value = BigInt(0);
  for (const byte of bytes) value = (value << BigInt(8)) | BigInt(byte);
  let encoded = "";
  while (value > BigInt(0)) {
    const mod = Number(value % BASE);
    encoded = ALPHABET[mod] + encoded;
    value /= BASE;
  }
  return "1".repeat(zeros) + encoded;
}

export function base58Decode(text: string): Uint8Array {
  let zeros = 0;
  while (zeros < text.length && text[zeros] === "1") zeros += 1;
  let value = BigInt(0);
  for (const char of text) {
    const digit = DECODE_MAP.get(char);
    if (digit === undefined) throw new Error("Invalid base58 character");
    value = value * BASE + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > BigInt(0)) {
    bytes.unshift(Number(value & BigInt(255)));
    value >>= BigInt(8);
  }
  return Uint8Array.from([...new Array(zeros).fill(0), ...bytes]);
}

/** Base58-encoded 32-byte Ed25519 public key (typical Solana address). */
export function isSolanaAddress(text: unknown): text is string {
  if (typeof text !== "string" || text.length < 32 || text.length > 44) return false;
  try {
    return base58Decode(text).length === 32;
  } catch {
    return false;
  }
}

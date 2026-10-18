import { base58Encode } from "@/lib/solpay/base58";

export type WalletId = "solflare" | "phantom" | "metamask";
export type VerifiedWallet = { chain: "solana" | "ethereum"; address: string };

type SolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey?: { toBase58(): string } }>;
  publicKey?: { toBase58(): string } | null;
  signMessage: (message: Uint8Array) => Promise<{ signature?: Uint8Array } | Uint8Array>;
};

export type EthereumProvider = {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: EthereumProvider[];
  request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    solflare?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    ethereum?: EthereumProvider;
  }
}

export class WalletLoginError extends Error {
  readonly reason: "notFound" | "rejected" | "unavailable" | "failed";

  constructor(reason: "notFound" | "rejected" | "unavailable" | "failed") {
    super(reason);
    this.reason = reason;
  }
}

export function discoverMetaMask(onProvider: (provider: EthereumProvider) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.info?.rdns === "io.metamask" && typeof detail.provider?.request === "function") {
      onProvider(detail.provider);
    }
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", listener);
}

function metaMaskProvider(announced?: EthereumProvider | null): EthereumProvider | undefined {
  if (announced) return announced;
  const candidates = window.ethereum?.providers ?? (window.ethereum ? [window.ethereum] : []);
  return candidates.find((p) => p.isMetaMask && !p.isPhantom);
}

async function post(path: string, body: object): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new WalletLoginError(res.status === 503 ? "unavailable" : "failed");
  return res.json();
}

async function signEthereum(provider?: EthereumProvider) {
  if (!provider) throw new WalletLoginError("notFound");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  const rawChain = await provider.request({ method: "eth_chainId" });
  const chainId = typeof rawChain === "string" ? Number(rawChain) : NaN;
  if (!/^0x[0-9a-f]{40}$/i.test(address) || !Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new WalletLoginError("failed");
  }
  const { message } = await post("/api/auth/eth/message", { address, chainId });
  if (typeof message !== "string") throw new WalletLoginError("failed");
  const hex = Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("");
  const signature = await provider.request({ method: "personal_sign", params: [`0x${hex}`, address] });
  const current = await provider.request({ method: "eth_accounts" });
  if (typeof signature !== "string" || !Array.isArray(current) || typeof current[0] !== "string" ||
      current[0].toLowerCase() !== address.toLowerCase() ||
      Number(await provider.request({ method: "eth_chainId" })) !== chainId) {
    throw new WalletLoginError("failed");
  }
  return { address, chainId, message, signature };
}

async function signSolana(walletId: "solflare" | "phantom") {
  const provider = walletId === "solflare"
    ? window.solflare ?? (window.solana?.isSolflare ? window.solana : null)
    : window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
  if (!provider?.signMessage) throw new WalletLoginError("notFound");
  const connected = await provider.connect();
  const publicKey = connected.publicKey?.toBase58() ?? provider.publicKey?.toBase58();
  if (!publicKey) throw new WalletLoginError("failed");
  const { message } = await post("/api/auth/sol/message", { publicKey });
  if (typeof message !== "string") throw new WalletLoginError("failed");
  const signed = await provider.signMessage(new TextEncoder().encode(message));
  const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
  if (!signatureBytes || (provider.publicKey && provider.publicKey.toBase58() !== publicKey)) {
    throw new WalletLoginError("failed");
  }
  return { publicKey, message, signature: base58Encode(signatureBytes) };
}

export async function loginWithWallet(
  walletId: WalletId,
  consents: { consentTerms: boolean; consentHealthData: boolean },
  announced?: EthereumProvider | null,
): Promise<void> {
  if (!consents.consentTerms || !consents.consentHealthData) throw new WalletLoginError("failed");
  try {
    const signed = walletId === "metamask"
      ? await signEthereum(metaMaskProvider(announced)) : await signSolana(walletId);
    await post(`/api/auth/${walletId === "metamask" ? "eth" : "sol"}/verify`, { ...signed, ...consents });
  } catch (error) {
    if (error instanceof WalletLoginError) throw error;
    const code = (error as { code?: number } | null)?.code;
    throw new WalletLoginError(code === 4001 ? "rejected" : "failed");
  }
}

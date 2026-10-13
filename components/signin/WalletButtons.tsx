"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { base58Encode } from "@/lib/solpay/base58";

type SolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey?: { toBase58(): string } }>;
  publicKey?: { toBase58(): string } | null;
  signMessage: (message: Uint8Array) => Promise<{ signature?: Uint8Array } | Uint8Array>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    solflare?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  }
}

const WALLETS: { id: "solflare" | "phantom"; detect: () => SolanaProvider | null }[] = [
  {
    id: "solflare",
    detect: () => window.solflare ?? (window.solana?.isSolflare ? window.solana : null),
  },
  {
    id: "phantom",
    detect: () => window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null),
  },
];

export function WalletButtons() {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshMembership } = useMembership();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(walletId: string) {
    setError(null);
    const provider = WALLETS.find((w) => w.id === walletId)?.detect();
    if (!provider?.signMessage) {
      setError(t("auth.wallet.notFound"));
      return;
    }
    setBusy(walletId);
    try {
      await provider.connect();
      const publicKey = provider.publicKey?.toBase58();
      if (!publicKey) throw new Error("no public key");
      const messageRes = await fetch("/api/auth/sol/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });
      if (!messageRes.ok) throw new Error(`HTTP ${messageRes.status}`);
      const { message } = (await messageRes.json()) as { message: string };
      const signed = await provider.signMessage(new TextEncoder().encode(message));
      const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
      if (!signatureBytes) throw new Error("no signature");
      const verifyRes = await fetch("/api/auth/sol/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, signature: base58Encode(signatureBytes), message }),
      });
      if (!verifyRes.ok) throw new Error(`HTTP ${verifyRes.status}`);
      await Promise.all([refreshAuth(), refreshMembership()]);
      router.push("/");
    } catch {
      setError(t("auth.wallet.failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-soft">
        <span className="h-px flex-1 bg-line" />
        {t("auth.wallet.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            type="button"
            onClick={() => void login(wallet.id)}
            disabled={busy !== null}
            className="press rounded-2xl border border-line py-3 text-sm font-semibold transition hover:border-brand disabled:opacity-50"
          >
            {busy === wallet.id ? t("common.loading") : t(`auth.wallet.${wallet.id}`)}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}

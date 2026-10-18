"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "@/components/providers/LocaleProvider";

export function WalletIdentity() {
  const { account, status } = useAuth();
  const { t } = useLocale();
  const [copyState, setCopyState] = useState<"copied" | "copyFailed" | null>(null);
  if (status !== "member" && status !== "fatima") return null;
  const wallet = account?.wallet;

  async function copyId() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.userId);
      setCopyState("copied");
    } catch {
      setCopyState("copyFailed");
    }
  }

  return (
    <section className="surface space-y-4 p-5" aria-labelledby="digital-id-title">
      <h2 id="digital-id-title" className="text-lg font-semibold">{t("digitalId.title")}</h2>
      {status === "member" && account ? (
        <>
          <div>
            <p className="text-xs text-muted">{t("digitalId.account")}</p>
            <p className="mt-1 break-all font-mono text-sm" dir="ltr">{account.userId}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{t(wallet ? "digitalId.wallet" : "digitalId.email")}</p>
            {wallet && (
              <>
                <p className="mt-1 text-xs text-muted">{wallet.chain === "solana" ? "Solana" : "Ethereum (EVM)"}</p>
                <p className="mt-1 break-all font-mono text-sm" dir="ltr">{wallet.address}</p>
              </>
            )}
          </div>
          <button type="button" onClick={() => void copyId()} className="press rounded-xl border border-line px-3 py-2 text-sm font-semibold">
            {t("digitalId.copy")}
          </button>
          {copyState && <p role="status" className="text-xs text-muted">{t(`digitalId.${copyState}`)}</p>}
        </>
      ) : <p className="text-sm text-muted">{t("digitalId.demo")}</p>}
      <p className="text-xs leading-relaxed text-muted">{t("digitalId.notice")}</p>
    </section>
  );
}

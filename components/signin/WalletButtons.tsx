"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { HealthDataConsent, TermsConsent } from "@/components/legal/HealthDataConsent";
import { discoverMetaMask, loginWithWallet, WalletLoginError, type EthereumProvider, type WalletId } from "@/lib/auth/wallet-client";

const WALLETS = ["solflare", "phantom", "metamask"] as const;

export function WalletButtons() {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshMembership } = useMembership();
  const [busy, setBusy] = useState<WalletId | null>(null);
  const [error, setError] = useState<WalletLoginError["reason"] | null>(null);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
  const metaMask = useRef<EthereumProvider | null>(null);
  const pending = useRef(false);

  useEffect(() => discoverMetaMask((provider) => { metaMask.current = provider; }), []);

  async function login(walletId: WalletId) {
    if (pending.current || !consentTerms || !consentHealth) return;
    pending.current = true;
    setError(null);
    setBusy(walletId);
    try {
      await loginWithWallet(walletId, { consentTerms, consentHealthData: consentHealth }, metaMask.current);
      const account = await refreshAuth();
      if (!account) throw new WalletLoginError("failed");
      await refreshMembership();
      router.push(account.next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof WalletLoginError ? cause.reason : "failed");
    } finally {
      pending.current = false;
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
      <p className="text-xs text-muted">{t("auth.wallet.explainer")}</p>
      <TermsConsent id="wal-terms" checked={consentTerms} onChange={setConsentTerms} />
      <HealthDataConsent id="wal-consent" checked={consentHealth} onChange={setConsentHealth} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy={busy !== null}>
        {WALLETS.map((wallet) => (
          <button
            key={wallet}
            type="button"
            onClick={() => void login(wallet)}
            disabled={busy !== null || !consentTerms || !consentHealth}
            className="press rounded-2xl border border-line py-3 text-sm font-semibold transition hover:border-brand disabled:opacity-50"
          >
            {busy === wallet ? t("common.loading") : t(`auth.wallet.${wallet}`)}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-bad">{t(`auth.wallet.${error}`)}</p>}
    </div>
  );
}

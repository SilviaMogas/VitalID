"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { AuthFrame, Field, inputClass } from "@/components/auth/AuthFrame";

export function SigninForm() {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshMembership } = useMembership();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (res.status === 401) {
        setError(t("auth.error.invalidCredentials"));
        return;
      }
      if (res.status === 503) {
        setError(t("auth.error.notConfigured"));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([refreshAuth(), refreshMembership()]);
      router.push(data.next ?? "/");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={t("signin.title")}
      subtitle={t("signin.subtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-brand">
            {t("onboarding.signUp")}
          </Link>
          <span className="mx-2 text-line">·</span>
          <Link href="/welcome" className="font-medium text-brand">
            {t("signup.exploreDemo")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="card space-y-4 p-5">
        <Field id="si-email" label={t("signup.email")}>
          <input id="si-email" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />
        </Field>
        <Field id="si-password" label={t("auth.password")}>
          <input id="si-password" type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="current-password" />
        </Field>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="press w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-deep disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("signin.cta")}
        </button>
      </form>
    </AuthFrame>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { AuthFrame, Field, inputClass } from "@/components/auth/AuthFrame";
import { HealthDataConsent } from "@/components/legal/HealthDataConsent";
import { PRIVACY_VERSION } from "@/lib/legal";
import type { TranslationKey } from "@/lib/i18n";

const ERROR_KEYS: Record<string, TranslationKey> = {
  email_taken: "auth.error.emailTaken",
  weak_password: "auth.error.weakPassword",
  invalid_email: "auth.error.invalidEmail",
  not_configured: "auth.error.notConfigured",
  consent_required: "consent.error",
};

export function SignupForm() {
  const { t } = useLocale();
  const router = useRouter();
  const { status, account, refresh: refreshAuth } = useAuth();
  const { refresh: refreshMembership } = useMembership();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "",
    city: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Required, never pre-ticked: explicit consent to health-data processing.
  const [consent, setConsent] = useState(false);

  // Already signed in: hand off to the routing rules instead of showing the form.
  useEffect(() => {
    if (status === "member" && account) router.replace(account.next);
  }, [status, account, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          consentPrivacy: consent,
          consentHealthData: consent,
          privacyVersion: PRIVACY_VERSION,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok) {
        setError(t(ERROR_KEYS[data.error ?? ""] ?? "common.error"));
        return;
      }
      await Promise.all([refreshAuth(), refreshMembership()]);
      router.push(data.next ?? "/pricing");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/signin" className="font-medium text-brand">
            {t("onboarding.signIn")}
          </Link>
          <span className="mx-2 text-line">·</span>
          <Link href="/welcome" className="font-medium text-brand">
            {t("signup.exploreDemo")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field id="su-first" label={t("auth.firstName")}>
            <input id="su-first" required value={form.firstName} onChange={set("firstName")} className={inputClass} autoComplete="given-name" />
          </Field>
          <Field id="su-last" label={t("auth.lastName")}>
            <input id="su-last" required value={form.lastName} onChange={set("lastName")} className={inputClass} autoComplete="family-name" />
          </Field>
        </div>
        <Field id="su-email" label={t("signup.email")}>
          <input id="su-email" type="email" required dir="ltr" value={form.email} onChange={set("email")} className={inputClass} autoComplete="email" />
        </Field>
        <Field id="su-password" label={t("auth.password")} hint={t("auth.passwordHint")}>
          <input id="su-password" type="password" required minLength={8} dir="ltr" value={form.password} onChange={set("password")} className={inputClass} autoComplete="new-password" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="su-country" label={t("auth.country")}>
            <input id="su-country" required value={form.country} onChange={set("country")} className={inputClass} autoComplete="country-name" />
          </Field>
          <Field id="su-city" label={t("auth.city")}>
            <input id="su-city" required value={form.city} onChange={set("city")} className={inputClass} autoComplete="address-level2" />
          </Field>
        </div>
        <HealthDataConsent id="su-consent" checked={consent} onChange={setConsent} />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy || !consent}
          className="press w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-deep disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("signup.continue")}
        </button>
      </form>
    </AuthFrame>
  );
}

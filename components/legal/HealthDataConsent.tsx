"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

interface ConsentProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Shared unchecked-by-default checkbox shell (GDPR Art. 9 explicit consent). */
function LegalCheckbox({ id, checked, onChange, children }: ConsentProps & { children: ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand,#0f9d58)]"
        aria-describedby={`${id}-text`}
      />
      <span id={`${id}-text`} className="text-xs leading-relaxed text-ink-2">
        {children}
      </span>
    </label>
  );
}

/** Accept the privacy policy + terms of service (no health-data consent). */
export function TermsConsent(props: ConsentProps) {
  const { t } = useLocale();
  return (
    <LegalCheckbox {...props}>
      {t("consent.accept.pre")}{" "}
      <Link href="/privacy" className="font-semibold text-brand underline">
        {t("legal.privacy")}
      </Link>{" "}
      {t("consent.accept.mid")}{" "}
      <Link href="/terms" className="font-semibold text-brand underline">
        {t("legal.terms")}
      </Link>
      {t("consent.accept.post")}
    </LegalCheckbox>
  );
}

/**
 * Explicit health-data consent only — links to the privacy policy, records
 * `health_data` server-side. Used at signup and before the first real wearable
 * connect; it never implies acceptance of terms.
 */
export function HealthDataConsent(props: ConsentProps) {
  const { t } = useLocale();
  return (
    <LegalCheckbox {...props}>
      {t("consent.health.pre")}{" "}
      <Link href="/privacy" className="font-semibold text-brand underline">
        {t("legal.privacy")}
      </Link>
      {t("consent.health.post")}
    </LegalCheckbox>
  );
}

"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

/**
 * Explicit, un-checked-by-default consent checkbox (GDPR Art. 9):
 * privacy policy + terms acceptance and explicit consent to health-data
 * processing. Reused at signup and before the first real wearable connect.
 */
export function HealthDataConsent({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useLocale();
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
        {t("consent.label.pre")}{" "}
        <Link href="/privacy" className="font-semibold text-brand underline">
          {t("legal.privacy")}
        </Link>{" "}
        {t("consent.label.mid")}{" "}
        <Link href="/terms" className="font-semibold text-brand underline">
          {t("legal.terms")}
        </Link>
        {t("consent.label.post")}
      </span>
    </label>
  );
}

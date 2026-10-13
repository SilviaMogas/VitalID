"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

/** Privacy, Terms and Brand kit links rendered in every public footer and auth surface. */
export function LegalLinks() {
  const { t } = useLocale();
  return (
    <>
      <Link href="/privacy" className="font-medium text-ink-2 hover:text-brand">
        {t("legal.privacy")}
      </Link>
      <span className="mx-2 text-line" aria-hidden>·</span>
      <Link href="/terms" className="font-medium text-ink-2 hover:text-brand">
        {t("legal.terms")}
      </Link>
      <span className="mx-2 text-line" aria-hidden>·</span>
      <Link href="/brand" className="font-medium text-ink-2 hover:text-brand">
        {t("legal.brand")}
      </Link>
    </>
  );
}

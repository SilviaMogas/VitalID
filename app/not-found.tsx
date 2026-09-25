"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="card p-8 text-center">
      <p className="text-lg font-semibold">{t("common.notFound")}</p>
      <Link href="/" className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-medium text-white">
        {t("common.goHome")}
      </Link>
    </div>
  );
}

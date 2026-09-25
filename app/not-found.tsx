"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Broccoli } from "@/components/mascot/Broccoli";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="card p-8 text-center">
      <Broccoli state="neutral" size={96} className="anim-float mx-auto" />
      <p className="mt-4 text-lg font-semibold">{t("common.notFound")}</p>
      <Link href="/" className="press mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-deep">
        {t("common.goHome")}
      </Link>
    </div>
  );
}

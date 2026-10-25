"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Apple, Avocado, Banana, Orange, Strawberry } from "@/components/mascot/Crew";
import { FruitTune } from "@/components/mascot/FruitTune";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="card overflow-hidden p-8 text-center">
      {/* "4 0 4" with the orange standing in for the zero */}
      <div dir="ltr" className="flex items-center justify-center gap-1" aria-label="404">
        <span aria-hidden className="text-7xl font-extrabold tracking-tight text-brand sm:text-8xl">4</span>
        <Orange size={84} className="anim-float" />
        <span aria-hidden className="text-7xl font-extrabold tracking-tight text-brand sm:text-8xl">4</span>
      </div>

      <div className="mt-2 flex items-end justify-center gap-2" aria-hidden>
        <Apple size={56} className="anim-dance" style={{ ["--i" as string]: 0 }} />
        <Banana size={56} className="anim-dance" style={{ ["--i" as string]: 1 }} />
        <Strawberry size={56} className="anim-dance" style={{ ["--i" as string]: 2 }} />
        <Avocado size={56} className="anim-dance" style={{ ["--i" as string]: 3 }} />
      </div>

      <p className="mt-4 text-lg font-semibold">{t("common.notFound")}</p>
      <p className="mt-1 text-sm text-muted">{t("common.notFoundHint")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className="press inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-deep">
          {t("common.goHome")}
        </Link>
        <FruitTune />
      </div>
    </div>
  );
}

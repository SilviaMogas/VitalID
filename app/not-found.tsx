"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Apple, Avocado, Banana, Orange, Strawberry } from "@/components/mascot/Crew";
import { FruitTune } from "@/components/mascot/FruitTune";

const DANCERS = [Apple, Banana, Strawberry, Avocado];
const DIGIT = "text-7xl font-extrabold tracking-tight text-brand sm:text-8xl";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="card overflow-hidden p-8 text-center">
      {/* "4 0 4" with the orange standing in for the zero */}
      <div dir="ltr" className="flex items-center justify-center gap-1" aria-label="404">
        <span aria-hidden className={DIGIT}>4</span>
        <Orange size={84} className="anim-float" />
        <span aria-hidden className={DIGIT}>4</span>
      </div>

      <div className="mt-2 flex items-end justify-center gap-2" aria-hidden>
        {DANCERS.map((Fruit, i) => (
          <Fruit key={i} size={56} className="anim-dance" style={{ ["--i" as string]: i }} />
        ))}
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

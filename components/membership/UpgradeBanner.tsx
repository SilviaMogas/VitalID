"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { Companion } from "@/components/companions/Companion";

/** Dashboard call-to-action for free members; hidden for paid plans and while loading. */
export function UpgradeBanner({ index = 7 }: { index?: number }) {
  const { t } = useLocale();
  const { plan, loading } = useMembership();

  if (loading || plan !== "free") return null;

  return (
    <Link
      href="/pricing"
      className="rise lift card flex items-center justify-between gap-4 rounded-[1.75rem] p-5 ring-2 ring-brand/30 md:p-6"
      style={{ ["--i" as string]: index }}
    >
      <div className="flex items-center gap-4">
        <Companion name="heart" mood="cheer" size={56} />
        <div>
          <p className="text-xs font-medium text-muted">{t("membership.banner.eyebrow")}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{t("membership.banner.title")}</p>
          <p className="mt-0.5 text-sm text-ink-2">{t("membership.banner.body")}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-hero">
        {t("pricing.upgrade")}
      </span>
    </Link>
  );
}

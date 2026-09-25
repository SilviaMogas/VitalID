"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import type { TranslationKey } from "@/lib/i18n";
import type { EmergencyInfo, Identity } from "@/types";

function Field({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-sm font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

/**
 * Wallet-pass style identity credential. `compact` drops the detail row for previews.
 */
export function CredentialCard({
  identity,
  emergencyInfo,
  compact = false,
  className = "",
}: {
  identity: Identity;
  emergencyInfo: EmergencyInfo;
  compact?: boolean;
  className?: string;
}) {
  const { t, d, locale } = useLocale();
  const name = identity.localizedName?.[locale] ?? identity.fullName;
  const nationalityKey = `vitalId.nationality.${identity.nationality}` as TranslationKey;
  const translatedNationality = t(nationalityKey);
  const nationalityLabel =
    translatedNationality === nationalityKey ? identity.nationality || "—" : translatedNationality;
  const initials = identity.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className={`hero-green shimmer relative overflow-hidden rounded-[1.75rem] ${compact ? "p-5" : "p-6 md:p-8"} ${className}`}
    >
      {/* organic shapes */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 220">
        <ellipse cx="350" cy="30" rx="120" ry="90" fill="#b7e4c7" opacity="0.14" />
        <path d="M-20 190 C 80 130, 160 230, 260 170 S 380 120, 440 180 L 440 240 L -20 240 Z" fill="#0a5c48" opacity="0.5" />
        <path d="M-20 175 C 80 120, 170 215, 270 160 S 380 110, 440 170" fill="none" stroke="#b7e4c7" strokeWidth="1.2" opacity="0.45" />
      </svg>

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <LogoMark size={22} tone="light" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">{t("app.name")}</span>
              <span className="block text-[10px] uppercase tracking-widest text-white/60">{t("vitalId.cardLabel")}</span>
            </span>
          </div>
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold tracking-wide ring-1 ring-white/25" dir="ltr">
            {emergencyInfo.bloodType}
          </span>
        </div>

        <div className={`flex items-end justify-between gap-4 ${compact ? "mt-5" : "mt-7"}`}>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/55">{t("vitalId.holder")}</p>
            <p className={`mt-0.5 font-semibold leading-tight tracking-tight ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>{name}</p>
            <p className="tabular mt-1.5 font-mono text-[13px] tracking-[0.2em] text-mint" dir="ltr">
              {identity.vitalId}
            </p>
          </div>
          {identity.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={identity.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-white/25"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-base font-semibold ring-1 ring-white/25" dir="ltr">
              {initials}
            </span>
          )}
        </div>

        {!compact && (
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-4">
            <Field label={t("vitalId.dob")} value={d(identity.dateOfBirth, { year: "numeric" })} ltr />
            <Field label={t("vitalId.sex")} value={t(`vitalId.sex.${identity.sex}` as TranslationKey)} />
            <Field label={t("vitalId.nationality")} value={nationalityLabel} />
          </div>
        )}

        <div className={`flex flex-wrap gap-2 ${compact ? "mt-4" : "mt-5"}`}>
          {(["verified", "private", "portable"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              {t(`onboarding.pill.${k}` as TranslationKey)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

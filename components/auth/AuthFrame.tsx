"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import { LegalLinks } from "@/components/legal/LegalLinks";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

export function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Shared chrome for the sign-up / sign-in screens (brand header, language toggle, mascot). */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t, toggleLocale, locale } = useLocale();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/welcome" className="pop flex items-center gap-2.5" style={{ ["--i" as string]: 0 }}>
          <LogoMark size={36} />
          <span className="text-base font-semibold tracking-tight text-brand">{t("app.name")}</span>
        </Link>
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={t("lang.label")}
          lang={locale === "en" ? "ar" : "en"}
          className="press rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-sm font-medium text-ink-2"
        >
          {t("lang.switch")}
        </button>
      </header>

      <main className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="rise text-3xl font-semibold tracking-tight" style={{ ["--i" as string]: 1 }}>
              {title}
            </h1>
            <p className="rise mt-1.5 text-sm text-ink-2" style={{ ["--i" as string]: 2 }}>
              {subtitle}
            </p>
          </div>
          <Broccoli state="happy" size={64} className="anim-float shrink-0" />
        </div>
        <div className="rise mt-6" style={{ ["--i" as string]: 3 }}>
          {children}
        </div>
        {footer && (
          <div className="rise mt-6 text-center text-sm text-muted" style={{ ["--i" as string]: 4 }}>
            {footer}
          </div>
        )}
        <div className="rise mt-4 text-center text-xs text-muted" style={{ ["--i" as string]: 5 }}>
          <LegalLinks />
        </div>
      </main>
    </div>
  );
}

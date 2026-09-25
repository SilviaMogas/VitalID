"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";

const NAV: { href: string; key: TranslationKey; icon: ReactNode }[] = [
  {
    href: "/",
    key: "nav.home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 10v9.5h13V10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/trends",
    key: "nav.trends",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4 17l5-6 4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 6h5v5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/vital-id",
    key: "nav.vitalId",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="8.5" cy="12" r="2" />
        <path d="M13.5 10h4M13.5 14h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/share",
    key: "nav.share",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="18" cy="5.5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="18.5" r="2.5" />
        <path d="M8.2 10.8 15.8 6.7M8.2 13.2l7.6 4.1" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, locale } = useLocale();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (pathname.startsWith("/shared")) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-2xl">
        <header className="flex items-center justify-between px-5 pt-5">
          <Brand compact />
          <LangButton />
        </header>
        <main className="flex-1 px-5 pb-12 pt-4" key={locale}>{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-5xl md:flex-row md:gap-8 md:px-8">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-56 md:shrink-0 md:flex-col md:py-8">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-ink text-white"
                  : "text-ink-2 hover:bg-white"
              }`}
            >
              {item.icon}
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <LangButton />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between px-5 pt-5 md:hidden">
          <Brand compact />
          <LangButton />
        </header>

        <main className="flex-1 px-5 pb-28 pt-4 md:px-0 md:pb-12 md:pt-8" key={locale}>
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                      active ? "text-brand" : "text-muted"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{t(item.key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold tracking-tight">{t("app.name")}</span>
        {!compact && <span className="block text-xs text-muted">{t("app.tagline")}</span>}
      </span>
    </Link>
  );
}

function LangButton() {
  const { t, toggleLocale, locale } = useLocale();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t("lang.label")}
      lang={locale === "en" ? "ar" : "en"}
      className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-2 shadow-sm transition hover:bg-canvas"
    >
      {t("lang.switch")}
    </button>
  );
}

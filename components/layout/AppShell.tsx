"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PlanBadge } from "@/components/membership/PlanBadge";
import type { TranslationKey } from "@/lib/i18n";
import { LogoMark } from "@/components/layout/Logo";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { CONNECTORS_STORAGE_KEY } from "@/lib/connectors-state";
import { HEALTH_CONSENT_STORAGE_KEY } from "@/lib/legal";
import { DEMO_IDENTITY } from "@/lib/demo-data";
import { TabIntro } from "@/components/layout/TabIntro";
import { DemoBadge } from "@/components/layout/DemoBadge";
import { LegalLinks } from "@/components/legal/LegalLinks";

/** Routes rendered without the app navigation (auth + setup journey, public share view, legal pages). */
const BARE_PREFIXES = ["/shared", "/signup", "/signin", "/checkout", "/pricing", "/onboarding", "/privacy", "/terms"];

/** Bare routes that get the brand + language header. */
const BARE_HEADER_PREFIXES = ["/shared", "/pricing", "/onboarding", "/privacy", "/terms"];

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
    href: "/connectors",
    key: "nav.connectors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M9 7V3.5M15 7V3.5" strokeLinecap="round" />
        <path d="M7 7h10v4a5 5 0 0 1-10 0V7z" strokeLinejoin="round" />
        <path d="M12 16v4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/coach",
    key: "nav.coach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4 6.5h16v9a2 2 0 0 1-2 2H9l-5 4v-13a2 2 0 0 1 2-2z" strokeLinejoin="round" />
        <path d="M12 9.5l.9 1.8 1.8.9-1.8.9-.9 1.8-.9-1.8-1.8-.9 1.8-.9.9-1.8z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/community",
    key: "nav.community",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" strokeLinecap="round" />
        <circle cx="17" cy="9.5" r="2.4" />
        <path d="M16.2 14.3c2.4.2 4 1.9 4.3 4.2" strokeLinecap="round" />
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
  {
    href: "/more",
    key: "nav.more",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <circle cx="5.5" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="18.5" cy="12" r="1.9" />
      </svg>
    ),
  },
];

/** Mobile floating pill (Thine-style): four tabs + a separate round chat button for the coach. */
const MOBILE_TABS = ["/", "/trends", "/vital-id", "/more"] as const;
/** Routes reached from the More hub keep "More" highlighted in the pill. */
const MORE_CHILDREN = ["/more", "/connectors", "/community", "/share", "/focus", "/wellness"];

export function openTabIntro() {
  window.dispatchEvent(new Event("vitalid:intro"));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { status, account, enterAsFatima, signOut: authSignOut } = useAuth();
  const { refresh: refreshMembership } = useMembership();

  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));
  const isCore = !isBare && pathname !== "/welcome";

  // The intro (splash → welcome) plays on every full page load that lands on the home,
  // regardless of session. It is dismissed for the rest of the SPA session once the user
  // continues, or as soon as they navigate anywhere else inside the app.
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (pathname !== "/" && pathname !== "/welcome") setIntroDone(true);
  }, [pathname]);
  const showIntro = pathname === "/welcome" || (pathname === "/" && !introDone);

  // Members who have not finished the journey are steered to the right step;
  // finished members / Fatima / guests are never redirected away from core routes here.
  useEffect(() => {
    if (!isCore || showIntro || status !== "member" || !account) return;
    if (account.next !== "/") router.replace(account.next);
  }, [isCore, showIntro, status, account, router]);

  const enter = () => {
    void enterAsFatima().then(() => {
      void refreshMembership();
      if (pathname === "/welcome") {
        setIntroDone(true);
        router.push("/");
      } else {
        // Keep the intro on screen until the refreshed (Fatima) server payload has landed.
        startTransition(() => {
          router.refresh();
          setIntroDone(true);
        });
      }
    });
  };

  const continueSession =
    status === "fatima" || (status === "member" && account)
      ? () => {
          setIntroDone(true);
          if (status === "member" && account && account.next !== "/") {
            router.push(account.next);
          } else if (pathname === "/welcome") {
            router.push("/");
          }
        }
      : undefined;

  const continueName =
    status === "member"
      ? account?.firstName || t("profile.you")
      : DEMO_IDENTITY.localizedName?.[locale] ?? DEMO_IDENTITY.fullName;

  const signOut = () => {
    window.localStorage.removeItem(CONNECTORS_STORAGE_KEY);
    window.localStorage.removeItem(HEALTH_CONSENT_STORAGE_KEY);
    router.push("/welcome");
    void authSignOut().then(() => void refreshMembership());
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isMobileActive = (href: string) =>
    href === "/more" ? MORE_CHILDREN.some((p) => pathname.startsWith(p)) : isActive(href);

  const avatarName =
    status === "member"
      ? account?.firstName || t("profile.you")
      : DEMO_IDENTITY.localizedName?.[locale] ?? DEMO_IDENTITY.fullName;
  const avatarPhoto = status === "member" ? account?.photoUrl : DEMO_IDENTITY.photoUrl;

  if (isBare) {
    return (
      <div
        className={`mx-auto flex min-h-dvh w-full max-w-md flex-col ${
          pathname.startsWith("/pricing")
            ? "md:max-w-5xl"
            : pathname === "/privacy" || pathname === "/terms"
              ? "md:max-w-3xl"
              : "md:max-w-2xl"
        }`}
      >
        {BARE_HEADER_PREFIXES.some((p) => pathname.startsWith(p)) && (
          <header className="flex items-center justify-between px-5 pt-5">
            <Brand compact />
            <div className="flex items-center gap-2">
              {pathname.startsWith("/onboarding") && <PlanBadge />}
              <LangButton />
              {status === "member" && pathname.startsWith("/onboarding") && (
                <button
                  type="button"
                  onClick={signOut}
                  className="press rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-sm font-medium text-ink-2"
                >
                  {t("auth.signOut")}
                </button>
              )}
            </div>
          </header>
        )}
        <main className="flex-1 px-5 pb-12 pt-4" key={locale}>{children}</main>
        <footer className="px-5 pb-8 text-center text-xs text-muted">
          <LegalLinks />
        </footer>
      </div>
    );
  }

  if (showIntro) {
    return (
      <Onboarding
        onEnter={enter}
        onContinue={continueSession}
        continueName={continueName}
        onAuthLink={() => setIntroDone(true)}
      />
    );
  }

  if (status === "loading") {
    return <div className="min-h-dvh" aria-busy />;
  }

  if (status === "guest") {
    return <Onboarding onEnter={enter} skipSplash />;
  }

  if (status === "member" && account && account.next !== "/") {
    return <div className="min-h-dvh" aria-busy />;
  }

  return (
    <div className="app-shell mx-auto flex min-h-dvh w-full flex-col md:max-w-[1440px] md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="app-sidebar hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:overflow-y-auto md:px-5 md:py-8">
        <Brand />
        <nav className="mt-10 flex flex-col gap-1.5" aria-label={t("app.name")}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`press flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand-soft text-brand"
                  : "text-ink-2 hover:bg-black/[0.035]"
              }`}
            >
              {item.icon}
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge />
            {status === "fatima" && <DemoBadge />}
            <LangButton />
            <button
              type="button"
              onClick={signOut}
              className="press rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink-2"
            >
              {t("onboarding.signOut")}
            </button>
          </div>
          <div className="hidden border-t border-line pt-4 [@media(min-height:860px)]:block">
            <p className="text-xs leading-relaxed text-muted">
              {t("mascot.vitalId")}
            </p>
          </div>
          <Link
            href="/vital-id"
            className={`press surface flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
              pathname.startsWith("/vital-id") ? "ring-2 ring-brand/40" : ""
            }`}
          >
            <UserAvatar name={avatarName} photoUrl={avatarPhoto} size={40} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{avatarName}</span>
              <span className="block text-xs text-muted">{t("profile.viewData")}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) — logo + help, like Thine */}
        <header className="app-mobile-header flex items-center justify-between px-5 py-4 md:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            {status === "fatima" && <DemoBadge />}
            <Link href="/vital-id" aria-label={t("profile.viewData")}>
              <UserAvatar name={avatarName} photoUrl={avatarPhoto} size={40} />
            </Link>
            <HelpButton />
          </div>
        </header>

        <main className="app-content mx-auto w-full max-w-[1120px] flex-1 px-5 pb-36 pt-6 md:px-8 md:pb-16 md:pt-10 lg:px-12" key={locale}>
          {children}
        </main>
        <TabIntro />

        {/* Floating pill nav + chat bubble (mobile) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 px-4 md:hidden"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
          aria-label={t("app.name")}
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <ul className="float-pill grid flex-1 grid-cols-4 rounded-full p-1.5">
              {MOBILE_TABS.map((href) => {
                const item = NAV.find((n) => n.href === href)!;
                const active = isMobileActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`press flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition ${
                        active ? "bg-sage text-brand" : "text-ink"
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
            <Link
              href="/coach"
              aria-label={t("nav.chat")}
              className={`press float-pill grid h-[4.1rem] w-[4.1rem] shrink-0 place-items-center rounded-full ${
                pathname.startsWith("/coach") ? "text-brand ring-2 ring-brand/30" : "text-ink"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 rtl:-scale-x-100">
                <path d="M12 4.5c4.7 0 8.5 3 8.5 6.8S16.7 18 12 18c-.9 0-1.8-.1-2.6-.3L5 19.5l1.3-3.3C4.5 15 3.5 13.2 3.5 11.3 3.5 7.5 7.3 4.5 12 4.5z" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <LogoMark size={34} />
      <span className="leading-tight">
        <span className="block text-base font-semibold tracking-tight text-brand">{t("app.name")}</span>
        {!compact && <span className="block text-xs text-muted">{t("app.tagline")}</span>}
      </span>
    </Link>
  );
}

export function LangButton() {
  const { t, toggleLocale, locale } = useLocale();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t("lang.label")}
      lang={locale === "en" ? "ar" : "en"}
      className="press rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-2 shadow-sm hover:bg-sage"
    >
      {t("lang.switch")}
    </button>
  );
}

export function HelpButton({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={openTabIntro}
      aria-label={t("nav.help")}
      className={`press grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-card ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" strokeDasharray="3 2.4" />
        <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" strokeLinecap="round" />
        <path d="M12 16.9h.01" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    </button>
  );
}

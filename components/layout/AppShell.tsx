"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PlanBadge } from "@/components/membership/PlanBadge";
import type { TranslationKey } from "@/lib/i18n";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { CONNECTORS_STORAGE_KEY } from "@/lib/connectors-state";
import { DEMO_IDENTITY } from "@/lib/demo-data";

/** Routes rendered without the app navigation (auth + setup journey, public share view). */
const BARE_PREFIXES = ["/shared", "/signup", "/signin", "/checkout", "/pricing", "/onboarding"];

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
];

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
      setIntroDone(true);
      if (pathname === "/welcome") router.push("/");
      else router.refresh();
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
    router.push("/welcome");
    void authSignOut().then(() => void refreshMembership());
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const avatarName =
    status === "member"
      ? account?.firstName || t("profile.you")
      : DEMO_IDENTITY.localizedName?.[locale] ?? DEMO_IDENTITY.fullName;
  const avatarPhoto = status === "member" ? account?.photoUrl : DEMO_IDENTITY.photoUrl;

  if (isBare) {
    return (
      <div
        className={`mx-auto flex min-h-dvh w-full max-w-md flex-col ${
          pathname.startsWith("/pricing") ? "md:max-w-5xl" : "md:max-w-2xl"
        }`}
      >
        {["/shared", "/pricing", "/onboarding"].some((p) => pathname.startsWith(p)) && (
          <header className="flex items-center justify-between px-5 pt-5">
            <Brand compact />
            <div className="flex items-center gap-2">
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-6xl md:flex-row md:gap-8 md:px-8">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-56 md:shrink-0 md:flex-col md:py-8">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand text-white shadow-hero"
                  : "text-ink-2 hover:bg-white/80"
              }`}
            >
              {item.icon}
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="relative ps-1">
            <Broccoli state="encouraging" size={72} className="anim-float" />
            <p className="surface -mt-2 inline-block rounded-2xl px-3 py-1.5 text-xs font-medium text-ink-2">
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
          <div className="flex items-center gap-2">
            <PlanBadge />
            <LangButton />
            <button
              type="button"
              onClick={signOut}
              className="press rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink-2"
            >
              {t("onboarding.signOut")}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between px-5 pt-5 md:hidden">
          <Brand compact />
          <div className="flex items-center gap-1.5">
            <Link href="/vital-id" aria-label={t("profile.viewData")}>
              <UserAvatar name={avatarName} photoUrl={avatarPhoto} size={36} />
            </Link>
            <PlanBadge />
            <LangButton />
            <button
              type="button"
              onClick={signOut}
              aria-label={t("onboarding.signOut")}
              className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-muted"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 rtl:-scale-x-100">
                <path d="M10 17l5-5-5-5M15 12H3M13 4h6v16h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pb-28 pt-4 md:px-0 md:pb-12 md:pt-8" key={locale}>
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/92 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul
            className="mx-auto grid max-w-md"
            style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
          >
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`press flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                      active ? "text-brand" : "text-muted"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-brand-soft" : ""}`}>
                      {item.icon}
                    </span>
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ProviderMark } from "@/components/connectors/ConnectorBadge";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { PROVIDERS, type ProviderId } from "@/lib/connectors";
import type { WhoopConnectionPublic } from "@/lib/connectors/whoop/types";
import type { Identity } from "@/types";

/* ------------------------------------------------------------------ */
/* Sync toggle — Thine's "Tap to start listening", mapped to wearables */
/* ------------------------------------------------------------------ */

export function SyncToggleCard({ whoop, hasData }: { whoop: WhoopConnectionPublic; hasData: boolean }) {
  const { t, d } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const live = whoop.connected || hasData;
  const label = busy
    ? t("home.sync.syncing")
    : whoop.connected
      ? t("home.sync.tapStart")
      : hasData
        ? t("home.sync.live")
        : t("home.sync.connectFirst");

  async function sync() {
    setBusy(true);
    try {
      await fetch("/api/connectors/whoop/sync", { method: "POST" });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-snug text-ink">{label}</span>
        {whoop.lastSyncedAt && (
          <span className="mt-1.5 block text-xs text-muted">
            {t("home.sync.lastSynced", {
              when: d(whoop.lastSyncedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
            })}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`relative flex h-9 w-16 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          live ? "bg-brand" : "bg-line"
        } ${busy ? "anim-glow" : ""}`}
      >
        <span
          className={`grid h-8 w-8 place-items-center rounded-full bg-white shadow-card transition-all duration-300 ${
            live ? "ms-auto" : ""
          }`}
        >
          <WaveIcon muted={!live} busy={busy} />
        </span>
      </span>
    </>
  );

  const cls = "press soft-card flex w-full items-center justify-between gap-4 px-5 py-4 text-start";

  if (whoop.connected) {
    return (
      <button type="button" onClick={sync} disabled={busy} className={cls} aria-busy={busy}>
        {body}
      </button>
    );
  }
  if (hasData) return <div className={cls.replace("press ", "")}>{body}</div>;
  return (
    <Link href="/connectors" className={cls}>
      {body}
    </Link>
  );
}

function WaveIcon({ muted, busy }: { muted: boolean; busy: boolean }) {
  const color = muted ? "#e0664f" : "#0e7a5f";
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${busy ? "anim-pulse-dot" : ""}`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
      {muted && <path d="M3.5 3.5l17 17" strokeWidth="2" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Greeting + painted illustration + lede + speech-bubble CTA          */
/* ------------------------------------------------------------------ */

export function HeyGreeting({ firstName, dateLabel }: { firstName: string; dateLabel: string }) {
  const { t } = useLocale();
  return (
    <section className="relative">
      <p className="mb-2 text-sm text-muted">{dateLabel}</p>
      <h1 className="display text-3xl leading-tight md:text-4xl">
        {t("home.hey", { name: firstName })}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">{t("home.lede")}</p>
      <Link
        href="/more"
        className="press mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 rtl:-scale-x-100">
          <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z" strokeLinejoin="round" />
        </svg>
        {t("home.seeWhat")}
      </Link>
    </section>
  );
}

/** Hand-built "painted" sunset path — two-page sketchbook feel, no external asset. */
export function PaintedPath({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 228" className={className} aria-hidden style={{ direction: "ltr" }}>
      <defs>
        <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6fb3" />
          <stop offset="0.35" stopColor="#e9807a" />
          <stop offset="0.7" stopColor="#f7b267" />
          <stop offset="1" stopColor="#fcd9a0" />
        </linearGradient>
        <linearGradient id="pp-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a27a" />
          <stop offset="1" stopColor="#7d6aa8" />
        </linearGradient>
        <linearGradient id="pp-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5aa0" />
          <stop offset="1" stopColor="#23285a" />
        </linearGradient>
        <linearGradient id="pp-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd08a" />
          <stop offset="1" stopColor="#f08a5d" />
        </linearGradient>
        <filter id="pp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="320" height="228" fill="url(#pp-sky)" />
      {/* clouds */}
      <g fill="#f6b08a" opacity="0.75">
        <ellipse cx="70" cy="40" rx="60" ry="10" />
        <ellipse cx="230" cy="30" rx="80" ry="12" />
        <ellipse cx="270" cy="62" rx="50" ry="8" fill="#c77aa0" />
        <ellipse cx="50" cy="75" rx="45" ry="6" fill="#c77aa0" />
      </g>
      {/* sun + sea */}
      <circle cx="88" cy="124" r="11" fill="#fff4d6" />
      <rect y="126" width="320" height="40" fill="url(#pp-sea)" />
      <g stroke="#ffe7b3" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M76 133h24M80 140h16M83 147h10" />
      </g>
      <path d="M0 122c20-6 40-4 58 2L0 130z" fill="#6c5b95" />
      {/* hills */}
      <path d="M0 170c50-28 110-40 170-44 60-4 110 6 150 18v84H0z" fill="url(#pp-hill)" />
      <path d="M150 228c20-30 60-58 110-70 25-6 45-8 60-8v78z" fill="#2c3570" />
      {/* path */}
      <path d="M150 228c12-22 34-42 64-56 18-8 30-14 40-24l6 2c-8 12-22 20-38 28-26 14-44 30-54 50z" fill="url(#pp-path)" />
      {/* fence */}
      <g stroke="#1b1f45" strokeWidth="1.6">
        <path d="M40 188l110-40M40 194l110-40" />
        {[46, 62, 78, 94, 110, 126, 142].map((x, i) => (
          <path key={x} d={`M${x} ${186 - i * 5.8}v10`} />
        ))}
      </g>
      {/* house */}
      <g>
        <path d="M226 128l18-16 18 16v18h-36z" fill="#f4ead8" />
        <path d="M222 130l22-22 24 22" fill="none" stroke="#1d1f3b" strokeWidth="6" strokeLinejoin="round" />
        <rect x="241" y="134" width="6" height="12" fill="#2b2d52" />
        <rect x="251" y="116" width="4" height="10" fill="#1d1f3b" />
        <path d="M253 112c2-6 8-6 6-12" stroke="#d9cbe7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      {/* flowers */}
      <g fill="#f5b6d8">
        {[[30, 210], [60, 200], [96, 214], [120, 196], [200, 214], [280, 190], [300, 210], [262, 206]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
        ))}
      </g>
      {/* sketchbook fold */}
      <rect x="159.5" y="0" width="1" height="228" fill="#000" opacity="0.08" />
      <rect width="320" height="228" filter="url(#pp-grain)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* "OTHER" cards                                                       */
/* ------------------------------------------------------------------ */

export function SectionRule({ children }: { children: React.ReactNode }) {
  return <h2 className="section-rule text-xl font-semibold tracking-tight text-ink">{children}</h2>;
}

function PillCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand"
    >
      {children}
      <span aria-hidden className="text-base rtl:-scale-x-100">›</span>
    </Link>
  );
}

const FEATURED: ProviderId[] = ["whoop", "oura", "apple_health"];

export function ConnectToolsCard() {
  const { t, n } = useLocale();
  const others = Object.keys(PROVIDERS).length - FEATURED.length;
  return (
    <div className="soft-card p-6">
      <p className="text-lg leading-snug text-ink md:text-xl">{t("home.connectCard")}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center" dir="ltr">
          {FEATURED.map((p, i) => (
            <span key={p} className={`rounded-2xl bg-white p-1 ring-1 ring-line ${i ? "-ms-3" : ""}`}>
              <ProviderMark provider={p} size={42} />
            </span>
          ))}
          <span className="-ms-3 grid h-[50px] w-[50px] place-items-center rounded-full bg-white text-sm font-semibold text-muted ring-1 ring-line">
            +{n(others)}
          </span>
        </div>
        <PillCta href="/connectors">{t("home.connect")}</PillCta>
      </div>
    </div>
  );
}

export function CommunityCard({ identity }: { identity: Identity }) {
  const { t, locale } = useLocale();
  const name = identity.localizedName?.[locale] ?? identity.fullName;
  return (
    <div className="soft-card p-6">
      <p className="text-lg leading-snug text-ink md:text-xl">{t("home.communityCard")}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center" dir="ltr">
          <UserAvatar name={name} photoUrl={identity.photoUrl} size={52} className="ring-2 ring-white" />
          <span className="-ms-3 grid h-[52px] w-[52px] place-items-center rounded-full bg-white text-xl text-muted ring-1 ring-line">
            –
          </span>
        </div>
        <PillCta href="/community">{t("home.seePeople")}</PillCta>
      </div>
    </div>
  );
}

export function ShareCard() {
  const { t } = useLocale();
  return (
    <div className="soft-card p-6">
      <p className="text-lg leading-snug text-ink md:text-xl">{t("home.shareCard")}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-sage text-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <path d="M14 14h2v2M20 14v6h-6M17 17h.01" strokeLinecap="round" />
          </svg>
        </span>
        <PillCta href="/share">{t("home.shareCta")}</PillCta>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import type { TranslationKey } from "@/lib/i18n";

type TabId = "home" | "trends" | "vitalId" | "more" | "coach";

const TABS: { id: TabId; match: (p: string) => boolean; tint: string; center: string }[] = [
  { id: "home", match: (p) => p === "/", tint: "#5ba4c7", center: "Today" },
  { id: "trends", match: (p) => p.startsWith("/trends"), tint: "#6aa58c", center: "7D · 30D" },
  { id: "vitalId", match: (p) => p.startsWith("/vital-id"), tint: "#0e7a5f", center: "YOU" },
  { id: "more", match: (p) => p.startsWith("/more"), tint: "#c28b5c", center: "•••" },
  { id: "coach", match: (p) => p.startsWith("/coach"), tint: "#e39a5b", center: "Hi!" },
];

const storageKey = (id: TabId) => `vitalid.intro.${id}`;

function seen(id: TabId): boolean {
  try {
    return window.localStorage.getItem(storageKey(id)) === "1";
  } catch {
    return true; // no storage (private mode, previews): never nag
  }
}

function markSeen(id: TabId) {
  try {
    window.localStorage.setItem(storageKey(id), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Thine-style first-visit intro card: one per main tab, shown once, dismissed with "Done!".
 * The header "?" button re-opens it on demand (window event `vitalid:intro`).
 */
export function TabIntro() {
  const pathname = usePathname();
  const { t } = useLocale();
  const tab = TABS.find((x) => x.match(pathname));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (!tab) return;
    const timer = window.setTimeout(() => {
      if (!seen(tab.id)) setOpen(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [tab]);

  useEffect(() => {
    const onAsk = () => tab && setOpen(true);
    window.addEventListener("vitalid:intro", onAsk);
    return () => window.removeEventListener("vitalid:intro", onAsk);
  }, [tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!tab || !open) return null;

  function close() {
    if (tab) markSeen(tab.id);
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/35 p-4 pb-28 backdrop-blur-[2px] md:items-center md:pb-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tab-intro-title"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet w-full max-w-md overflow-hidden rounded-[2.25rem] p-6 text-white shadow-lift"
        style={{ background: tab.tint }}
      >
        <div
          className="relative grid h-48 place-items-center overflow-hidden rounded-[1.25rem]"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.5))" }}
        >
          <Wave />
          <div className="relative flex items-center gap-2" dir="ltr">
            <Bubble size={38} tint={tab.tint} />
            <Bubble size={50} tint={tab.tint} />
            <span className="grid h-28 w-28 place-items-center rounded-full border-2 border-white/80 bg-white/25 text-center text-xl font-bold tracking-tight backdrop-blur">
              {tab.center}
            </span>
            <Bubble size={62} tint={tab.tint} />
            <Bubble size={38} tint={tab.tint} />
          </div>
        </div>
        <h2 id="tab-intro-title" className="mt-7 text-3xl font-semibold tracking-tight">
          {t(`intro.${tab.id}.title` as TranslationKey)}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-white/95">
          {t(`intro.${tab.id}.body` as TranslationKey)}
        </p>
        <button
          type="button"
          onClick={close}
          autoFocus
          className="press mt-8 w-full rounded-full bg-sky-soft py-4 text-base font-bold text-ink outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          {t("intro.done")}
        </button>
      </div>
    </div>
  );
}

function Bubble({ size, tint }: { size: number; tint: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: tint }}
    >
      <LogoMark size={size * 0.55} tone="light" />
    </span>
  );
}

function Wave() {
  const bars = [10, 22, 14, 30, 18, 26, 12, 20, 34, 16, 24, 12, 28, 18, 10];
  return (
    <svg aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-40" height="40" width="100%" preserveAspectRatio="none" viewBox="0 0 300 40">
      {bars.map((h, i) => (
        <rect key={i} x={i * 20 + 4} y={20 - h / 2} width="4" height={h} rx="2" fill="#fff" />
      ))}
    </svg>
  );
}

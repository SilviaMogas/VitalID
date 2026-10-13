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
 * First-visit help sheet, shown once per main tab.
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
        className="anim-sheet w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-7 text-ink shadow-lift"
      >
        <div
          className="relative grid h-32 place-items-center overflow-hidden rounded-[1.25rem] bg-canvas"
        >
          <Wave />
          <div className="relative flex items-center gap-2" dir="ltr">
            <Bubble size={40} tint={tab.tint} />
            <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white text-center text-base font-semibold tracking-tight shadow-card">
              {tab.center}
            </span>
            <Bubble size={40} tint={tab.tint} />
          </div>
        </div>
        <h2 id="tab-intro-title" className="mt-6 text-2xl font-semibold tracking-tight">
          {t(`intro.${tab.id}.title` as TranslationKey)}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {t(`intro.${tab.id}.body` as TranslationKey)}
        </p>
        <button
          type="button"
          onClick={close}
          autoFocus
          className="press mt-7 w-full rounded-full bg-brand py-3.5 text-base font-semibold text-white"
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

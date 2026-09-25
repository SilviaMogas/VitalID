"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Apple, Avocado, Banana, Carrot, Orange, Strawberry } from "@/components/mascot/Crew";

const AUTO_ADVANCE_MS = 3600;

export function Splash({ onLeaving, onDone }: { onLeaving: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    onLeaving();
    setTimeout(onDone, 500);
  };

  useEffect(() => {
    const id = setTimeout(finish, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-canvas px-6 pb-8 pt-14 ${leaving ? "anim-fadeout" : ""}`}
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      {/* organic backdrop */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 800">
        <ellipse cx="60" cy="120" rx="160" ry="120" fill="#e8f5ec" />
        <ellipse cx="380" cy="640" rx="200" ry="160" fill="#f6f3e9" />
        <path d="M340 60 c 30 -40 90 -30 80 30 c -40 10 -70 0 -80 -30 z" fill="#b7e4c7" opacity="0.6" className="anim-leaf o-bottom" />
        <path d="M20 700 c 40 -30 90 -10 70 40 c -40 5 -60 -10 -70 -40 z" fill="#b7e4c7" opacity="0.5" className="anim-leaf o-bottom" style={{ ["--i" as string]: 2 }} />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        <div className="pop" style={{ ["--i" as string]: 0 }}>
          <LogoMark size={64} />
        </div>
        <h1 className="rise mt-3 text-4xl font-semibold tracking-tight text-brand" style={{ ["--i" as string]: 1 }}>
          {t("app.name")}
        </h1>
        <p className="rise mt-1 text-sm text-ink-2" style={{ ["--i" as string]: 2 }}>
          {t("app.tagline")}
        </p>
        <p className="rise mt-8 text-2xl font-semibold tracking-tight text-brand-deep md:text-3xl" style={{ ["--i" as string]: 4 }}>
          {t("onboarding.splashLine")}
        </p>
      </div>

      {/* the crew */}
      <div className="relative flex w-full max-w-lg items-end justify-center md:max-w-2xl md:scale-[1.35] md:origin-bottom" style={{ height: 220 }}>
        <div className="pop absolute bottom-6 start-[2%]" style={{ ["--i" as string]: 3 }}>
          <Apple className="anim-dance" size={80} />
        </div>
        <div className="pop absolute bottom-0 start-[16%]" style={{ ["--i" as string]: 5 }}>
          <Orange className="anim-dance" size={74} />
        </div>
        <div className="pop absolute bottom-2" style={{ ["--i" as string]: 2 }}>
          <Broccoli className="anim-dance" size={130} state="happy" />
        </div>
        <div className="pop absolute bottom-8 end-[14%]" style={{ ["--i" as string]: 4 }}>
          <Banana className="anim-dance" size={82} />
        </div>
        <div className="pop absolute bottom-0 end-[1%]" style={{ ["--i" as string]: 6 }}>
          <Avocado className="anim-dance" size={72} />
        </div>
        <div className="pop absolute bottom-0 start-[34%] hidden sm:block" style={{ ["--i" as string]: 7 }}>
          <Strawberry className="anim-dance" size={56} />
        </div>
        <div className="pop absolute bottom-1 end-[33%] hidden sm:block" style={{ ["--i" as string]: 8 }}>
          <Carrot className="anim-dance" size={58} />
        </div>
        <span className="pop absolute start-[28%] top-2 text-lg text-warn" style={{ ["--i" as string]: 6 }}>✦</span>
        <span className="pop absolute end-[26%] top-6 text-base text-brand" style={{ ["--i" as string]: 8 }}>♪</span>
      </div>

      <div className="relative flex w-full max-w-xs flex-col items-center gap-3">
        <p className="rise text-xs text-muted" style={{ ["--i" as string]: 6 }}>
          {t("onboarding.splashFoot")}
        </p>
        <button
          type="button"
          onClick={finish}
          className="rise press flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-semibold text-white shadow-hero hover:bg-brand-deep"
          style={{ ["--i" as string]: 7 }}
        >
          {t("onboarding.getStarted")}
          <span className="inline-block rtl:-scale-x-100">→</span>
        </button>
        <div className="rise h-1 w-24 overflow-hidden rounded-full bg-line" style={{ ["--i" as string]: 8 }}>
          <div
            className="h-full rounded-full bg-brand"
            style={{ animation: `progress ${AUTO_ADVANCE_MS}ms linear forwards` }}
          />
        </div>
      </div>
      <style>{`@keyframes progress { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  );
}

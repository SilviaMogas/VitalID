"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import { Companion } from "@/components/companions/Companion";
import { WellnessArt } from "@/components/mascot/WellnessArt";

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

      <div className="relative my-8 flex flex-wrap items-center justify-center gap-3">
        <div className="rounded-3xl border border-orange-100 bg-orange-50 p-3 shadow-card">
          <WellnessArt kind="nutrition" size={56} />
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
          <Companion name="heart" size={64} />
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
          <Companion name="dumbbell" size={64} />
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-3 shadow-card">
          <WellnessArt kind="sleep" size={56} />
        </div>
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

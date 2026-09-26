"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useWorkFocus } from "@/lib/work-focus-state";
import { workedMilliseconds } from "@/lib/work-focus";
import { inputClass } from "@/components/onboarding/setup/ui";
import type { Identity } from "@/types";
import type { TranslationKey } from "@/lib/i18n";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusView({ identity }: { identity: Identity }) {
  const { t } = useLocale();
  const { state, now, startWork, stopWork, startTimer, pauseTimer, resetTimer, setSchedule } = useWorkFocus(
    identity.vitalId,
  );

  const running = state.timerEndsAt !== null;
  const remaining = running ? Math.max(0, Math.ceil((state.timerEndsAt! - now) / 1000)) : state.remainingSeconds;
  const modeKey: TranslationKey =
    state.mode === "focus" ? "focus.mode.focus" : state.mode === "shortBreak" ? "focus.mode.shortBreak" : "focus.mode.longBreak";
  const loggedMinutes = Math.floor(workedMilliseconds(state, now) / 60_000);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("focus.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("focus.subtitle")}</p>
      </section>

      <section className="card flex flex-col items-center gap-4 rounded-[1.75rem] p-6 text-center md:p-8">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep">
          {t(modeKey)}
        </span>
        <p className="tabular text-6xl font-semibold tracking-tight" dir="ltr">
          {formatClock(remaining)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {running ? (
            <button type="button" onClick={pauseTimer} className="press rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-2">
              {t("focus.pause")}
            </button>
          ) : (
            <button type="button" onClick={startTimer} className="press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-hero">
              {t("focus.start")}
            </button>
          )}
          <button type="button" onClick={resetTimer} className="press rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-2">
            {t("focus.reset")}
          </button>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        {state.workingSince !== null ? (
          <>
            <p className="tabular text-sm text-ink-2" dir="ltr">
              {t("focus.workSession.active", {
                time: new Date(state.workingSince).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
              })}
            </p>
            <button type="button" onClick={stopWork} className="press w-full rounded-full border border-line bg-white py-2.5 text-sm font-semibold text-ink-2">
              {t("focus.workSession.stop")}
            </button>
          </>
        ) : (
          <button type="button" onClick={startWork} className="press w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white shadow-hero">
            {t("focus.workSession.start")}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">{t("focus.today.logged")}</p>
            <p className="tabular mt-0.5 text-sm font-semibold">{loggedMinutes} min</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">{t("focus.completedSessions")}</p>
            <p className="tabular mt-0.5 text-sm font-semibold">{state.completedFocus}</p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold">{t("focus.settings.title")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="focus-start" className="mb-1 block text-xs font-medium text-ink-2">
              {t("focus.settings.start")}
            </label>
            <input
              id="focus-start"
              type="time"
              dir="ltr"
              value={state.workStart}
              onChange={(e) => setSchedule({ workStart: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="focus-end" className="mb-1 block text-xs font-medium text-ink-2">
              {t("focus.settings.end")}
            </label>
            <input
              id="focus-end"
              type="time"
              dir="ltr"
              value={state.workEnd}
              onChange={(e) => setSchedule({ workEnd: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="focus-limit" className="mb-1 block text-xs font-medium text-ink-2">
            {t("focus.settings.limit")}
          </label>
          <input
            id="focus-limit"
            type="number"
            inputMode="numeric"
            dir="ltr"
            min={60}
            max={720}
            step={15}
            value={state.dailyLimitMinutes}
            onChange={(e) => setSchedule({ dailyLimitMinutes: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      </section>

      <p className="text-xs text-muted">{t("focus.disclaimer")}</p>
    </div>
  );
}

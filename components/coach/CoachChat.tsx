"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { METRIC_META } from "@/lib/demo-data";
import type { Recommendation } from "@/lib/coach";
import type { TranslationKey } from "@/lib/i18n";
import type { HealthMetric } from "@/types";
import { WellnessArt } from "@/components/mascot/WellnessArt";

type Intent = "today" | "sleep" | "goals" | "share" | "fallback";
type Msg = { id: number; from: "me" | "coach"; text?: string; intent?: Intent };

const SUGGESTIONS: { intent: Exclude<Intent, "fallback">; key: TranslationKey }[] = [
  { intent: "today", key: "chat.q.today" },
  { intent: "sleep", key: "chat.q.sleep" },
  { intent: "goals", key: "chat.q.goals" },
  { intent: "share", key: "chat.q.share" },
];

/** Deterministic keyword routing (EN + AR) — no model call, answers come only from the user's data. */
function detectIntent(text: string): Intent {
  const s = text.toLowerCase();
  if (/(sleep|slept|bed|نوم|نمت)/.test(s)) return "sleep";
  if (/(share|doctor|qr|link|insur|مشارك|طبيب|رابط|تأمين)/.test(s)) return "share";
  if (/(goal|plan|should|recommend|هدف|أهداف|خطة|توصي|ماذا أفعل)/.test(s)) return "goals";
  if (/(today|attention|recover|hrv|heart|now|اليوم|انتباه|تعافي|نبض)/.test(s)) return "today";
  return "fallback";
}

export function CoachChat({
  firstName,
  metrics,
  recommendations,
  translateParams,
}: {
  firstName: string;
  metrics: HealthMetric[];
  recommendations: Recommendation[];
  translateParams: (p: Record<string, string | number>) => Record<string, string | number>;
}) {
  const { t, n } = useLocale();
  const [draft, setDraft] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  function ask(text: string, intent: Intent = detectIntent(text)) {
    const id = nextId.current;
    nextId.current += 2;
    setMsgs((m) => [...m, { id, from: "me", text }, { id: id + 1, from: "coach", intent }]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    ask(text);
    setDraft("");
  }

  const metricLine = (m: HealthMetric) =>
    t("chat.a.metric", {
      metric: t(`metric.${m.metric}` as TranslationKey),
      value: `${n(m.value, METRIC_META[m.metric].decimals)} ${t(`unit.${m.unit}` as TranslationKey)}`,
      status: t(`status.${m.status}` as TranslationKey),
    });

  function answer(intent: Intent): ReactNode {
    if (intent === "share") {
      return (
        <>
          <p>{t("chat.a.share")}</p>
          <ChipLink href="/share">{t("chat.a.openShare")}</ChipLink>
        </>
      );
    }
    if (intent === "fallback") return <p>{t("chat.a.fallback")}</p>;
    if (metrics.length === 0 && intent !== "goals") {
      return (
        <>
          <p>{t("chat.a.noData")}</p>
          <ChipLink href="/connectors">{t("home.connect")}</ChipLink>
        </>
      );
    }
    if (intent === "sleep") {
      const sleep = metrics.find((m) => m.metric === "sleep");
      if (!sleep) return <p>{t("chat.a.noData")}</p>;
      return (
        <>
          <p>{metricLine(sleep)}</p>
          <p className="text-sm text-muted">
            {n(sleep.deltaPercent, 0)}% {t("baseline.vsBaseline")}
          </p>
          <ChipLink href="/trends?metric=sleep">{t("chat.a.seeTrend")}</ChipLink>
        </>
      );
    }
    if (intent === "today") {
      const flagged = metrics.filter((m) => m.status === "unusual" || m.status === "declining");
      if (flagged.length === 0) return <p>{t("chat.a.allGood")}</p>;
      return (
        <>
          <p>{t("chat.a.today")}</p>
          <ul className="list-disc space-y-1 ps-5">
            {flagged.map((m) => (
              <li key={m.metric}>
                <Link href={`/trends?metric=${m.metric}`} className="underline decoration-line underline-offset-4">
                  {metricLine(m)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      );
    }
    // goals
    return (
      <>
        <p>{t("chat.a.goals")}</p>
        <ul className="list-disc space-y-1 ps-5">
          {recommendations.slice(0, 3).map((r) => (
            <li key={r.id}>{t(r.key as TranslationKey, translateParams(r.params))}</li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("nav.coach")}</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{t("coach.subtitle")}</p>
        </div>
        <span className="rounded-2xl bg-fuchsia-50 p-3">
          <WellnessArt kind="meditation" size={44} />
        </span>
      </div>

      <Bubble>{t("chat.hey", { name: firstName })}</Bubble>
      <Bubble>
        <p>{t("chat.intro")}</p>
        <div className="mt-3 space-y-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.intent}
              type="button"
              onClick={() => ask(t(s.key), s.intent)}
              className="press block text-start text-ink hover:text-brand"
            >
              “{t(s.key)}”
            </button>
          ))}
        </div>
      </Bubble>
      <Bubble tail>{t("chat.tip")}</Bubble>

      {msgs.map((m) =>
        m.from === "me" ? (
          <div key={m.id} className="flex justify-end">
            <p className="max-w-[85%] rounded-[1.5rem] rounded-ee-md bg-brand px-4 py-3 text-base text-white">{m.text}</p>
          </div>
        ) : (
          <Bubble key={m.id}>
            <div className="space-y-2">{answer(m.intent ?? "fallback")}</div>
          </Bubble>
        ),
      )}
      <div ref={endRef} />

      <form
        onSubmit={onSubmit}
        className="sticky bottom-28 z-10 flex items-center gap-3 pt-3 md:bottom-4"
      >
        <label className="float-pill flex flex-1 items-center gap-3 rounded-full px-5 py-3.5">
          <span className="sr-only">{t("chat.placeholder")}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chat.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t("chat.send")}
          className="press grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white shadow-card disabled:bg-muted/50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
            <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </section>
  );
}

function Bubble({ children, tail = false }: { children: ReactNode; tail?: boolean }) {
  return (
    <div
      className={`rise w-fit max-w-[92%] rounded-[1.5rem] bg-white px-5 py-4 text-base leading-relaxed text-ink shadow-card ${
        tail ? "rounded-es-md" : ""
      }`}
    >
      {children}
    </div>
  );
}

function ChipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="press mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand ring-1 ring-line"
    >
      {children} <span aria-hidden className="rtl:-scale-x-100">→</span>
    </Link>
  );
}

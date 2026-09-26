"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/providers";
import { challengeIndexForDate, nextChallengeIndex, wellnessChallenges } from "@/lib/challenges";
import { localDateKey } from "@/lib/daily";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

type CompletedChallenges = Record<string, string>;

export default function DailyChallenge() {
  const { lang } = useLang();
  const date = localDateKey();
  const [index, setIndex] = useState(() => challengeIndexForDate(date));
  const [completed, setCompleted] = useState(false);
  const challenge = wellnessChallenges[index];

  useEffect(() => {
    const saved = getItem<CompletedChallenges>(STORAGE_KEYS.challenges) ?? {};
    const savedIndex = wellnessChallenges.findIndex(item => item.id === saved[date]);
    if (savedIndex >= 0) {
      setIndex(savedIndex);
      setCompleted(true);
    }
  }, [date]);

  const chooseAnother = () => {
    setIndex(value => nextChallengeIndex(value));
    setCompleted(false);
  };

  const complete = () => {
    const saved = getItem<CompletedChallenges>(STORAGE_KEYS.challenges) ?? {};
    setItem(STORAGE_KEYS.challenges, { ...saved, [date]: challenge.id });
    setCompleted(true);
    window.dispatchEvent(new CustomEvent("vitalid:celebrate"));
  };

  return <section className="card challenge-card" data-testid="daily-challenge" data-completed={completed}>
    <div className="challenge-heading">
      <span className="challenge-icon" aria-hidden="true">{challenge.icon}</span>
      <div>
        <p className="eyebrow">{lang === "ar" ? "تحدّي اليوم الصغير" : "Today’s small challenge"}</p>
        <h2 className="font-bold text-xl">{challenge.title[lang]}</h2>
      </div>
    </div>
    <p>{challenge.description[lang]}</p>
    {completed ? (
      <p className="challenge-complete" role="status" data-testid="challenge-complete">
        <span aria-hidden="true">🎉</span> {lang === "ar" ? "أحسنت يا فاطمة! خطوة صغيرة تستحق الاحتفال." : "Nice one, Fatima! That small step deserves a celebration."}
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={complete}>{lang === "ar" ? "أنجزته!" : "I did it!"}</button>
        <button type="button" className="btn btn-outline" onClick={chooseAnother}>{lang === "ar" ? "فكرة أخرى" : "Another idea"}</button>
      </div>
    )}
    <p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "اختياري تماماً. اختر فقط ما يناسبك اليوم." : "Completely optional. Choose only what feels right today."}</p>
  </section>;
}

// Daily wellness challenge pick + completion — client-side only, personal and
// non-medical, so it lives in localStorage rather than the account record.
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WELLNESS_CHALLENGES,
  challengeIndexForDate,
  localDateKey,
  nextChallengeIndex,
  type ChallengeId,
} from "@/lib/challenges";

const STORAGE_KEY = "vitalid.challenges";
const EVENT = "vitalid:challenge";

type CompletedByDate = Record<string, ChallengeId>;

function readCompleted(): CompletedByDate {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: CompletedByDate = {};
    for (const [date, id] of Object.entries(parsed)) {
      if (typeof id === "string" && WELLNESS_CHALLENGES.some((c) => c.id === id)) out[date] = id as ChallengeId;
    }
    return out;
  } catch {
    return {};
  }
}

function writeCompleted(next: CompletedByDate) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function useDailyChallenge() {
  const date = localDateKey();
  const [index, setIndex] = useState(() => challengeIndexForDate(date));
  const [completed, setCompleted] = useState(false);

  const sync = useCallback(() => {
    const saved = readCompleted()[date];
    const savedIndex = saved ? WELLNESS_CHALLENGES.findIndex((c) => c.id === saved) : -1;
    if (savedIndex >= 0) {
      setIndex(savedIndex);
      setCompleted(true);
    } else {
      setCompleted(false);
    }
  }, [date]);

  useEffect(() => {
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const chooseAnother = useCallback(() => {
    setIndex((v) => nextChallengeIndex(v));
    setCompleted(false);
  }, []);

  const complete = useCallback(() => {
    const saved = readCompleted();
    writeCompleted({ ...saved, [date]: WELLNESS_CHALLENGES[index].id });
    setCompleted(true);
  }, [date, index]);

  return { challenge: WELLNESS_CHALLENGES[index], completed, chooseAnother, complete };
}

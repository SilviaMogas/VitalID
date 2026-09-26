// Daily wellness challenge pick + completion — client-side only, personal and
// non-medical, so it lives in localStorage rather than the account record.
"use client";

import { useCallback, useState } from "react";
import { readJSON, useStorageSync, writeJSON } from "@/lib/local-store";
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
  const parsed = readJSON<Record<string, unknown>>(STORAGE_KEY, {});
  const out: CompletedByDate = {};
  for (const [date, id] of Object.entries(parsed)) {
    if (typeof id === "string" && WELLNESS_CHALLENGES.some((c) => c.id === id)) out[date] = id as ChallengeId;
  }
  return out;
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

  useStorageSync(EVENT, sync);

  const chooseAnother = useCallback(() => {
    setIndex((v) => nextChallengeIndex(v));
    setCompleted(false);
  }, []);

  const complete = useCallback(() => {
    const saved = readCompleted();
    writeJSON(STORAGE_KEY, { ...saved, [date]: WELLNESS_CHALLENGES[index].id }, EVENT);
    setCompleted(true);
  }, [date, index]);

  return { challenge: WELLNESS_CHALLENGES[index], completed, chooseAnother, complete };
}

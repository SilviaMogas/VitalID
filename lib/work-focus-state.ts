// Personal Pomodoro-style work/break timer — client-side only, scoped per
// Vital ID so it never crosses accounts on a shared device.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readJSON, useStorageSync, writeJSON } from "@/lib/local-store";
import {
  advanceTimer,
  loadWorkFocus,
  pauseTimer,
  resetTimer,
  startTimer,
  startWork,
  stopWork,
  type WorkFocusState,
} from "@/lib/work-focus";

const EVENT = "vitalid:workFocus";

function storageKey(ownerId: string): string {
  return `vitalid.workFocus.${ownerId}`;
}

function read(ownerId: string): WorkFocusState {
  return loadWorkFocus(readJSON<WorkFocusState | null>(storageKey(ownerId), null));
}

function write(ownerId: string, state: WorkFocusState) {
  writeJSON(storageKey(ownerId), state, EVENT);
}

/** Live state (re-derives `now` every tick) plus persisted actions, scoped to `ownerId`. */
export function useWorkFocus(ownerId: string) {
  const [state, setState] = useState<WorkFocusState>(() => read(ownerId));
  const [now, setNow] = useState(() => Date.now());

  useStorageSync(EVENT, useCallback(() => setState(read(ownerId)), [ownerId]));

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      setState((prev) => {
        const advanced = advanceTimer(prev, current);
        if (advanced !== prev) write(ownerId, advanced);
        return advanced;
      });
    };
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [ownerId]);

  const apply = useCallback(
    (fn: (s: WorkFocusState, now: number) => WorkFocusState) => {
      const current = Date.now();
      setState((prev) => {
        const next = fn(prev, current);
        write(ownerId, next);
        return next;
      });
    },
    [ownerId],
  );

  const setSchedule = useCallback(
    (patch: Partial<Pick<WorkFocusState, "workStart" | "workEnd" | "dailyLimitMinutes">>) => {
      apply((s) => ({ ...s, ...patch }));
    },
    [apply],
  );

  return useMemo(
    () => ({
      state,
      now,
      startWork: () => apply(startWork),
      stopWork: () => apply(stopWork),
      startTimer: () => apply(startTimer),
      pauseTimer: () => apply(pauseTimer),
      resetTimer: () => apply(resetTimer),
      setSchedule,
    }),
    [state, now, apply, setSchedule],
  );
}

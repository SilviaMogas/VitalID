import { localDateKey } from "./daily";

export type FocusMode = "focus" | "shortBreak" | "longBreak";

export interface WorkFocusState {
  date: string;
  workStart: string;
  workEnd: string;
  dailyLimitMinutes: number;
  workedMs: number;
  workingSince: number | null;
  mode: FocusMode;
  remainingSeconds: number;
  timerEndsAt: number | null;
  completedFocus: number;
}

export const FOCUS_SECONDS = 25 * 60;
export const SHORT_BREAK_SECONDS = 5 * 60;
export const LONG_BREAK_SECONDS = 15 * 60;

const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function freshWorkFocus(now = Date.now()): WorkFocusState {
  return {
    date: localDateKey(new Date(now)),
    workStart: "09:00",
    workEnd: "18:00",
    dailyLimitMinutes: 8 * 60,
    workedMs: 0,
    workingSince: null,
    mode: "focus",
    remainingSeconds: FOCUS_SECONDS,
    timerEndsAt: null,
    completedFocus: 0,
  };
}

export function loadWorkFocus(raw: WorkFocusState | null, now = Date.now()): WorkFocusState {
  const base = freshWorkFocus(now);
  if (!raw || typeof raw !== "object") return base;
  const requestedStart = validTime(raw.workStart) ? raw.workStart : base.workStart;
  const requestedEnd = validTime(raw.workEnd) ? raw.workEnd : base.workEnd;
  const workStart = requestedEnd > requestedStart ? requestedStart : base.workStart;
  const workEnd = requestedEnd > requestedStart ? requestedEnd : base.workEnd;
  const dailyLimitMinutes = Number.isFinite(raw.dailyLimitMinutes)
    ? Math.min(12 * 60, Math.max(60, Math.round(raw.dailyLimitMinutes)))
    : base.dailyLimitMinutes;
  if (raw.date !== base.date) return { ...base, workStart, workEnd, dailyLimitMinutes };
  const mode: FocusMode = raw.mode === "shortBreak" || raw.mode === "longBreak" ? raw.mode : "focus";
  const maxSeconds = mode === "focus" ? FOCUS_SECONDS : mode === "shortBreak" ? SHORT_BREAK_SECONDS : LONG_BREAK_SECONDS;
  return {
    ...base,
    workStart,
    workEnd,
    dailyLimitMinutes,
    workedMs: Number.isFinite(raw.workedMs) ? Math.max(0, raw.workedMs) : 0,
    workingSince: typeof raw.workingSince === "number" && Number.isFinite(raw.workingSince) && raw.workingSince <= now ? raw.workingSince : null,
    mode,
    remainingSeconds: Number.isFinite(raw.remainingSeconds) ? Math.min(maxSeconds, Math.max(0, Math.round(raw.remainingSeconds))) : maxSeconds,
    timerEndsAt: typeof raw.timerEndsAt === "number" && Number.isFinite(raw.timerEndsAt) ? raw.timerEndsAt : null,
    completedFocus: Number.isFinite(raw.completedFocus) ? Math.max(0, Math.floor(raw.completedFocus)) : 0,
  };
}

export function workedMilliseconds(state: WorkFocusState, now = Date.now()): number {
  return state.workedMs + (state.workingSince === null ? 0 : Math.max(0, now - state.workingSince));
}

export function overworkReason(state: WorkFocusState, now = Date.now()): "limit" | "schedule" | null {
  if (workedMilliseconds(state, now) >= state.dailyLimitMinutes * 60_000) return "limit";
  if (state.workEnd <= state.workStart) return null;
  const [hours, minutes] = state.workEnd.split(":").map(Number);
  const end = new Date(now);
  end.setHours(hours, minutes, 0, 0);
  if (state.workingSince !== null && now >= end.getTime()) return "schedule";
  return null;
}

export function startWork(state: WorkFocusState, now = Date.now()): WorkFocusState {
  return state.workingSince === null ? { ...state, workingSince: now } : state;
}

export function stopWork(state: WorkFocusState, now = Date.now()): WorkFocusState {
  if (state.workingSince === null) return state;
  const timerActive = state.mode === "focus" && state.timerEndsAt !== null;
  return {
    ...state,
    workedMs: workedMilliseconds(state, now),
    workingSince: null,
    remainingSeconds: timerActive ? Math.max(0, Math.ceil((state.timerEndsAt! - now) / 1000)) : state.remainingSeconds,
    timerEndsAt: timerActive ? null : state.timerEndsAt,
  };
}

export function startTimer(state: WorkFocusState, now = Date.now()): WorkFocusState {
  if (state.timerEndsAt !== null) return state;
  const prepared = state.mode === "focus" ? startWork(state, now) : stopWork(state, now);
  return { ...prepared, timerEndsAt: now + prepared.remainingSeconds * 1000 };
}

export function pauseTimer(state: WorkFocusState, now = Date.now()): WorkFocusState {
  if (state.timerEndsAt === null) return state;
  const remainingSeconds = Math.max(0, Math.ceil((state.timerEndsAt - now) / 1000));
  const paused = { ...state, timerEndsAt: null, remainingSeconds };
  return state.mode === "focus" ? stopWork(paused, now) : paused;
}

export function resetTimer(state: WorkFocusState, now = Date.now()): WorkFocusState {
  const stopped = state.mode === "focus" ? stopWork(state, now) : state;
  return { ...stopped, mode: "focus", remainingSeconds: FOCUS_SECONDS, timerEndsAt: null };
}

export function advanceTimer(state: WorkFocusState, now = Date.now()): WorkFocusState {
  if (state.timerEndsAt === null || now < state.timerEndsAt) return state;
  if (state.mode !== "focus") {
    return { ...state, mode: "focus", remainingSeconds: FOCUS_SECONDS, timerEndsAt: null };
  }
  const finishedAt = state.timerEndsAt;
  const stopped = state.workingSince === null
    ? state
    : { ...state, workedMs: state.workedMs + Math.max(0, finishedAt - state.workingSince), workingSince: null };
  const completedFocus = stopped.completedFocus + 1;
  const longBreak = completedFocus % 4 === 0;
  return {
    ...stopped,
    completedFocus,
    mode: longBreak ? "longBreak" : "shortBreak",
    remainingSeconds: longBreak ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS,
    timerEndsAt: null,
  };
}

import { describe, expect, it } from "vitest";
import {
  advanceTimer, freshWorkFocus, loadWorkFocus, overworkReason, startTimer,
  startWork, workedMilliseconds,
} from "./workFocus";

describe("work hours and Pomodoro", () => {
  const morning = new Date("2026-09-24T09:00:00").getTime();

  it("warns when the user's daily limit is reached", () => {
    const state = startWork(freshWorkFocus(morning), morning);
    expect(overworkReason(state, morning + 7 * 60 * 60_000)).toBeNull();
    expect(overworkReason(state, morning + 8 * 60 * 60_000)).toBe("limit");
  });

  it("warns after the planned finish while work is still active", () => {
    const state = { ...startWork(freshWorkFocus(morning), morning + 8 * 60 * 60_000), dailyLimitMinutes: 12 * 60 };
    expect(overworkReason(state, morning + 9 * 60 * 60_000)).toBe("schedule");
  });

  it("ends a focus session at 25 minutes without counting time after expiry", () => {
    const running = startTimer(freshWorkFocus(morning), morning);
    const finished = advanceTimer(running, morning + 40 * 60_000);
    expect(finished.mode).toBe("shortBreak");
    expect(finished.timerEndsAt).toBeNull();
    expect(finished.workingSince).toBeNull();
    expect(workedMilliseconds(finished, morning + 40 * 60_000)).toBe(25 * 60_000);
  });

  it("offers a long break after four focus sessions", () => {
    const state = { ...freshWorkFocus(morning), completedFocus: 3 };
    const finished = advanceTimer(startTimer(state, morning), morning + 25 * 60_000);
    expect(finished.mode).toBe("longBreak");
    expect(finished.remainingSeconds).toBe(15 * 60);
  });

  it("keeps the chosen hours while resetting yesterday's work", () => {
    const yesterday = { ...freshWorkFocus(morning), workStart: "08:30", workEnd: "17:30", workedMs: 9 * 60 * 60_000 };
    const today = loadWorkFocus(yesterday, morning + 24 * 60 * 60_000);
    expect(today.workStart).toBe("08:30");
    expect(today.workEnd).toBe("17:30");
    expect(today.workedMs).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { createFatimaHistory } from "./demo";
import { entriesForPeriod, moodBuckets, summarizeDashboard } from "./dashboard";

describe("dashboard periods", () => {
  const now = new Date("2026-09-24T12:00:00");
  const history = createFatimaHistory("en", now);

  it("filters today, seven days, calendar month and calendar year", () => {
    expect(entriesForPeriod(history, "today", now)).toHaveLength(0);
    expect(entriesForPeriod(history, "week", now)).toHaveLength(6);
    expect(entriesForPeriod(history, "month", now).length).toBeGreaterThan(10);
    expect(entriesForPeriod(history, "year", now).length).toBeGreaterThan(180);
  });

  it("aggregates recorded diary data and leaves absent days blank in chart", () => {
    const weekly = entriesForPeriod(history, "week", now);
    const summary = summarizeDashboard(weekly);
    expect(summary.daysLogged).toBe(6);
    expect(summary.movementMinutes).toBeGreaterThan(100);
    expect(summary.averageMood).toBeGreaterThan(3);
    expect(moodBuckets(weekly, "week", now)).toHaveLength(7);
    expect(moodBuckets(weekly, "week", now)[6].average).toBeNull();
    expect(moodBuckets(history, "year", now)).toHaveLength(12);
  });
});

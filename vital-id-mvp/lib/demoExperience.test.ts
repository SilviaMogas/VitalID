import { describe, expect, it } from "vitest";
import { demoDays, demoPeriod } from "./demoExperience";

describe("fictional connected day", () => {
  const now = new Date("2026-09-24T12:00:00");
  const days = demoDays(now);
  it("includes today and changes period averages without mixing the Circular sample", () => {
    expect(days).toHaveLength(365);
    expect(days.every(day => day.calories === day.protein * 4 + day.carbs * 4 + day.fat * 9)).toBe(true);
    expect(days[0].weight - days[1].weight).toBeCloseTo(0.3);
    expect(days[0]).toMatchObject({date:"2026-09-24",sleepMinutes:382,recovery:68,steps:6842});
    expect(new Set(days.map(day=>day.date)).size).toBe(365);
    expect(demoPeriod(days,"today",now).average("calories")).toBe(1740);
    expect(demoPeriod(days,"week",now).days).toHaveLength(7);
    expect(demoPeriod(days,"week",now).average("sleepMinutes")).not.toBe(382);
    expect(demoPeriod(days,"month",now).days).toHaveLength(24);
    expect(demoPeriod(days,"year",now).days.every(day=>day.date.startsWith("2026"))).toBe(true);
  });
  it("handles calendar boundaries and empty data", () => {
    const january = new Date("2027-01-01T12:00:00");
    expect(demoPeriod(demoDays(january),"year",january).days).toHaveLength(1);
    expect(demoPeriod([],"today",now).average("recovery")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { buildDailyRecap, upsertDaily, type DailyEntry } from "./daily";

const entry: DailyEntry = {
  id: "day-2026-09-24", date: "2026-09-24", createdAt: 2,
  mood: 4, energy: "steady", note: "I slept well", movement: "Walk",
  movementMinutes: 30, food: "Breakfast and water", source: "manual",
};

describe("daily wellness history", () => {
  it("keeps one entry per local day and preserves newest first", () => {
    const old = { ...entry, id: "old", date: "2026-09-23", createdAt: 1 };
    const replacement = { ...entry, note: "Updated" };
    expect(upsertDaily([old, entry], replacement)).toEqual([replacement, old]);
  });

  it("builds a descriptive bilingual recap without diagnosis language", () => {
    const english = buildDailyRecap(entry, "en");
    const arabic = buildDailyRecap(entry, "ar");
    expect(english.lines.join(" ")).toContain("30 minutes");
    expect(arabic.lines.join(" ")).toContain("30 دقيقة");
    expect(english.disclaimer).toContain("not a diagnosis");
  });

  it("adds supportive escalation copy for a difficult day", () => {
    const recap = buildDailyRecap({ ...entry, mood: 1 }, "en");
    expect(recap.watch).toContain("someone you trust");
    expect(recap.watch).toContain("emergency services");
  });
});

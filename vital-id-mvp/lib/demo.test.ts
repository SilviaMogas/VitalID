import { describe, expect, it } from "vitest";
import { createFatimaHistory, createFatimaProfile } from "./demo";

describe("Fatima demo", () => {
  it("creates a clearly fictional year of diary history before today", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const history = createFatimaHistory("en", now);
    expect(history.length).toBeGreaterThan(260);
    expect(new Set(history.map(entry => entry.date)).size).toBe(history.length);
    expect(history.every(entry => entry.demo && entry.source === "sample")).toBe(true);
    expect(history[0].date).toBe("2026-09-23");
    expect(history[0].note).toContain("investor");
  });

  it("creates Fatima as a demo profile", () => {
    const profile = createFatimaProfile(123);
    expect(profile).toMatchObject({ id: "demo-fatima", name: "Fatima", isDemo: true, joinedAt: 123, age: 42 });
    expect(profile.vitamins.map(vitamin => vitamin.id)).toEqual(["d", "b12", "c"]);
    expect(profile.goals.map(goal => goal.id)).toEqual(["sleep", "movement", "balance"]);
    expect(profile.lifestyle.en).toContain("Founder");
    expect(profile.connectedApps).toEqual(["circular", "plaud", "whoop", "cronometer", "renpho"]);
  });
});

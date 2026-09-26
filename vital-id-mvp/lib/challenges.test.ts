import { describe, expect, it } from "vitest";
import { challengeIndexForDate, nextChallengeIndex, wellnessChallenges } from "./challenges";

describe("daily challenges", () => {
  it("keeps the same challenge for the same day", () => {
    expect(challengeIndexForDate("2026-09-24")).toBe(challengeIndexForDate("2026-09-24"));
    expect(challengeIndexForDate("2026-09-24")).toBeLessThan(wellnessChallenges.length);
  });

  it("cycles safely through every challenge", () => {
    expect(nextChallengeIndex(wellnessChallenges.length - 1)).toBe(0);
  });
});

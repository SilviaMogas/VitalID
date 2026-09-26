import { describe, expect, it } from "vitest";
import { summarize, splitSentences } from "./summarize";
import { sampleTranscript } from "@/data/sampleTranscript";

describe("summarize", () => {
  it("produces verbatim sentences for the EN sample", () => {
    const items = summarize(sampleTranscript.en);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(6);
    const sentences = splitSentences(sampleTranscript.en);
    for (const item of items) {
      expect(sentences).toContain(item.text);
    }
  });

  it("produces verbatim sentences for the AR sample", () => {
    const items = summarize(sampleTranscript.ar);
    expect(items.length).toBeGreaterThan(0);
    const sentences = splitSentences(sampleTranscript.ar);
    for (const item of items) {
      expect(sentences).toContain(item.text);
    }
  });

  it("assigns topics by keywords (en)", () => {
    const items = summarize(sampleTranscript.en);
    const topics = items.map((i) => i.topic);
    expect(topics).toContain("sleep");
    expect(topics).toContain("pain");
    expect(topics).toContain("medication");
    expect(topics).toContain("activity");
    expect(topics).toContain("mood");
  });

  it("assigns topics by keywords (ar)", () => {
    const items = summarize(sampleTranscript.ar);
    const topics = items.map((i) => i.topic);
    expect(topics).toContain("sleep");
    expect(topics).toContain("pain");
    expect(topics).toContain("medication");
  });

  it("never exceeds 6 items and never exceeds source", () => {
    const items = summarize(sampleTranscript.en);
    expect(items.length).toBeLessThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(splitSentences(sampleTranscript.en).length);
  });

  it("returns empty for empty transcript", () => {
    expect(summarize("")).toEqual([]);
  });
});

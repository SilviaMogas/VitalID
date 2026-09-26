import { describe, expect, it } from "vitest";
import { guideStepForPath, selectVoice } from "./guide";

describe("browser voice selection", () => {
  it("never substitutes an English voice for Arabic", () => {
    expect(selectVoice([{ lang: "en-GB" }], "ar")).toBeUndefined();
    expect(selectVoice([], "ar")).toBeUndefined();
  });
  it("accepts regional Arabic and normalized language tags", () => {
    expect(selectVoice([{ lang: "en-US" }, { lang: "ar_AE" }], "ar")?.lang).toBe("ar_AE");
  });
});
it("does not expose owner guidance on recipient links", () => {
  expect(guideStepForPath("/share/private-link")).toBeNull();
  expect(guideStepForPath("/judges")).toBeNull();
  expect(guideStepForPath("/checkin")).toBe("checkin");
});

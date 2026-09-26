import { describe, expect, it } from "vitest";
import { translate, viewsLabel, type DictKey } from "./i18n";

const t = (lang: "ar" | "en") => (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars);

describe("viewsLabel", () => {
  it("english: none / one / many", () => {
    expect(viewsLabel(0, "en", t("en"))).toBe("Not opened yet");
    expect(viewsLabel(1, "en", t("en"))).toBe("Opened 1 time");
    expect(viewsLabel(2, "en", t("en"))).toBe("Opened 2 times");
    expect(viewsLabel(37, "en", t("en"))).toBe("Opened 37 times");
  });

  it("arabic pluralization: 1, 2, 3–10, ≥11", () => {
    expect(viewsLabel(0, "ar", t("ar"))).toBe("لم يُفتح بعد");
    expect(viewsLabel(1, "ar", t("ar"))).toBe("فُتح مرة واحدة");
    expect(viewsLabel(2, "ar", t("ar"))).toBe("فُتح مرتين");
    expect(viewsLabel(5, "ar", t("ar"))).toBe("فُتح 5 مرات");
    expect(viewsLabel(10, "ar", t("ar"))).toBe("فُتح 10 مرات");
    expect(viewsLabel(11, "ar", t("ar"))).toBe("فُتح 11 مرة");
    expect(viewsLabel(37, "ar", t("ar"))).toBe("فُتح 37 مرة");
  });
});

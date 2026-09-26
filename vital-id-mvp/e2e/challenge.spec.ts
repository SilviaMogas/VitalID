import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("Fatima completes an optional challenge and broccoli celebrates", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("vitalid.lang", JSON.stringify("en"));
    localStorage.setItem("vitalid.consent", JSON.stringify({ at: Date.now() }));
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { getVoices: () => [], cancel() {}, addEventListener() {}, removeEventListener() {} },
    });
  });
  await page.goto("/checkin");
  const challenge = page.getByTestId("daily-challenge");
  await expect(challenge).toContainText("Today’s small challenge");
  await challenge.getByRole("button", { name: "I did it!" }).click();
  await expect(page.getByTestId("challenge-complete")).toContainText("Nice one, Fatima");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("vitalid.challenges") || "{}"));
  expect(Object.keys(saved)).toHaveLength(1);
});

test("challenge and celebration respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("vitalid.lang", JSON.stringify("en"));
    localStorage.setItem("vitalid.consent", JSON.stringify({ at: Date.now() }));
  });
  await page.goto("/history");
  await page.getByTestId("daily-challenge").getByRole("button", { name: "I did it!" }).click();
  await expect(page.getByTestId("challenge-complete")).toHaveCSS("animation-name", "none");
});

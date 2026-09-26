import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("work hours and Pomodoro remind Fátima to take a break", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.goto("/register");
  await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
  await page.getByTestId("dashboard-checkin").click();
  await expect(page.getByTestId("workday-nudge")).toBeVisible();
  await page.getByRole("link", { name: "Open focus timer" }).click();
  await expect(page.getByTestId("pomodoro")).toContainText("25:00");
  await page.getByTestId("timer-toggle").click();
  await expect(page.getByTestId("timer-toggle")).toHaveText("Pause timer");
  await page.getByTestId("timer-toggle").click();
  await expect(page.getByTestId("timer-toggle")).toHaveText("Start timer");

  await page.evaluate(() => {
    const key = "vitalid.workFocus.demo-fatima";
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.workedMs = 8 * 60 * 60_000;
    state.workingSince = null;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByTestId("overwork-alert")).toContainText("work limit");
  await page.getByRole("link", { name: "Back to my day" }).click();
  await expect(page.getByTestId("workday-warning")).toContainText("Take a break");
});

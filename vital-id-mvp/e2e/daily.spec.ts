import { expect, test, type Page } from "@playwright/test";

async function consent(page: Page) {
  await page.goto("/consent");
  await page.getByTestId("understand").click();
  await page.getByTestId("agree").click();
  await page.getByRole("button", { name: /أوافق|I agree/ }).click();
  await page.waitForURL(/\/dashboard/);
  await page.getByTestId("dashboard-checkin").click();
  await page.waitForURL(/\/checkin/);
}

test.use({ viewport: { width: 390, height: 844 } });

test("human daily check-in combines voice, mood, movement and food into history", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await consent(page);
  await page.locator(".mood-button").nth(3).click();
  await page.getByRole("textbox", { name: "How are you feeling today?" }).fill("I slept well and feel ready for the day.");
  await page.getByRole("button", { name: "Steady" }).click();
  await page.getByPlaceholder("Walk, yoga, gym, physio…").fill("Morning walk");
  await page.getByLabel("Minutes (optional)").fill("25");
  await page.getByPlaceholder(/light breakfast/).fill("Breakfast, fruit and water");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/signals/);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/summary/);
  await expect(page.getByRole("heading", { name: "Your day at a glance" })).toBeVisible();
  await expect(page.getByText(/Morning walk for 25 minutes/)).toBeVisible();
  await expect(page.getByText(/Breakfast, fruit and water/)).toBeVisible();
  await expect(page.getByText(/not a diagnosis or medical advice/)).toBeVisible();
  await page.getByRole("button", { name: "View my daily history" }).click();
  await expect(page.getByRole("heading", { name: "Your daily history" })).toBeVisible();
  await expect(page.locator(".metric-card").first()).toContainText("1");
  await expect(page.locator(".metric-card").first()).toContainText("days logged");
});

test("connections explain real availability and Apple Health web limitation", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("vitalid.lang", JSON.stringify("en"));
    localStorage.setItem("vitalid.consent", JSON.stringify({ at: Date.now() }));
  });
  await page.route("**/api/plaud/recordings", route => route.fulfill({ json: { configured: false } }));
  await page.route("**/api/whoop/signals", route => route.fulfill({ json: { configured: false, connected: false } }));
  await page.goto("/connections");
  await expect(page.getByTestId("source-plaud")).toContainText("Needs developer setup");
  await expect(page.getByTestId("source-whoop")).toContainText("Needs developer setup");
  await expect(page.getByTestId("source-apple")).toContainText("A website cannot read HealthKit directly");
  await expect(page.getByText(/never ask for your Apple ID password/i)).toBeVisible();
});

import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("Fatima history personalises today's question", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.goto("/register");
  await expect(page.getByTestId("enter-demo")).toContainText("Log in as Fátima (Demo)");
  await expect(page.getByTestId("demo-consent")).toBeVisible();
  await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
  await expect(page.getByTestId("dashboard")).toContainText("Hey Fátima");
  await page.getByTestId("dashboard-checkin").click();
  await expect(page.getByRole("heading", { name: "Hi Fatima, how are you today?" })).toBeVisible();
  await expect(page.getByTestId("personal-prompt")).toContainText("How did the meeting with the investor go?");
  await page.getByRole("link", { name: "View daily history" }).click();
  expect(Number(await page.locator(".metric-card").first().locator("strong").innerText())).toBeGreaterThan(260);
  await expect(page.getByText(/Fictional demo data/)).toHaveCount(0);
});

test("membership works as a demo while integrations stay explicit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.route("**/api/integrations/status", route => route.fulfill({ json: { stripe: { configured: false }, supabase: { configured: false } } }));
  await page.goto("/membership");
  await expect(page.getByText("Selected plan")).toBeVisible();
  await expect(page.getByText("Setup pending")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Secure Stripe checkout" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try this plan" }).last().click();
  await expect(page.getByText("Circle").first()).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";

async function consent(page: Page) {
  await page.locator('a[href="/register"]').click();
  await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
  await page.getByTestId("dashboard-checkin").click();
  await page.waitForURL(/checkin/);
}

test.use({ viewport: { width: 390, height: 844 } });
for (const lang of ["ar", "en"] as const) {
  test(`mobile ${lang}: synthetic check-in, QR and revocation`, async ({ page }, info) => {
    await page.addInitScript((language) => {
      localStorage.setItem("vitalid.lang", JSON.stringify(language));
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true, value: { getVoices: () => [], cancel() {}, addEventListener() {}, removeEventListener() {} },
      });
    }, lang);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await consent(page);
    await page.getByRole("button", { name: /استخدم النص النموذجي|Use sample transcript/ }).click();
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    const first = page.locator("[data-testid^='said-said-']").first();
    await first.getByRole("button", { name: /تعديل|Edit/ }).click();
    await first.locator("textarea").fill(lang === "ar" ? "هذا نص تجريبي." : "This is a test sentence.");
    await first.getByRole("button", { name: /حفظ|Save/ }).click();
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    await page.locator("[data-testid^='field-']").first().click();
    await page.getByRole("button", { name: /أنشئ رابطاً آمناً|Create secure link/ }).click();
    await expect(page.getByTestId("qr")).toBeVisible();
    await expect(page.getByTestId("broccoli-guide")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`qr-${lang}.png`), fullPage: true });
    const url = await page.locator(".card p.break-all").innerText();
    const recipient = await page.context().newPage();
    await recipient.goto(url);
    await expect(recipient.getByTestId("recipient-active")).toBeVisible();
    await page.route("**/revoke", route => route.fulfill({ status: 500, body: "{}" }));
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: /إلغاء الوصول الآن|Revoke access now/ }).click();
    await expect(page.locator("p[role='alert']")).toBeVisible();
    await expect(page.getByTestId("issued-status")).toContainText(/نشط|Active/);
    await page.unroute("**/revoke");
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: /إلغاء الوصول الآن|Revoke access now/ }).click();
    await expect(recipient.getByTestId("state-revoked")).toBeVisible({ timeout: 10_000 });
    await page.reload();
  });
}

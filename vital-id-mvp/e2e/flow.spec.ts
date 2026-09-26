import { expect, test, type Page } from "@playwright/test";

async function grantConsent(page: Page) {
  await page.goto("/consent");
  await page.getByTestId("understand").click();
  await page.getByTestId("agree").click();
  await page.getByRole("button", { name: /أوافق|I agree/ }).click();
  await page.waitForURL(/\/dashboard/);
  await page.getByTestId("dashboard-checkin").click();
  await page.waitForURL(/\/checkin/);
}

async function goThroughFlow(page: Page) {
  // checkin
  await page.getByRole("button", { name: /استخدم النص النموذجي|Use sample transcript/ }).click();
  await page.getByRole("button", { name: /متابعة|Continue/ }).click();
  await page.waitForURL(/\/signals/);
  // signals
  await page.getByRole("button", { name: /متابعة|Continue/ }).click();
  await page.waitForURL(/\/summary/);
}

test.describe("Vital ID flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.request.post("/api/shares/reset");
  });

  test("visiting /checkin without consent redirects to /consent", async ({ page }) => {
    await page.goto("/checkin");
    await page.waitForURL(/\/consent/);
  });

  test("consent requires both checkboxes", async ({ page }) => {
    await page.goto("/consent");
    const agreeBtn = page.getByRole("button", { name: /أوافق|I agree/ });
    await expect(agreeBtn).toBeDisabled();
    await page.getByTestId("understand").click();
    await expect(agreeBtn).toBeDisabled();
    await page.getByTestId("agree").click();
    await expect(agreeBtn).toBeEnabled();
  });

  test("sample transcript → signals → summary shows both sections; edit/delete persist", async ({ page }) => {
    await grantConsent(page);
    await goThroughFlow(page);
    // both sections present
    await expect(page.getByText(/ما قالته فاطمة|What Fatima said/)).toBeVisible();
    await expect(page.getByText(/إشارات الجهاز الاصطناعية|Synthetic wearable signals/)).toBeVisible();
    // edit one said item
    const first = page.locator("[data-testid^='said-said-']").first();
    await first.getByRole("button", { name: /تعديل|Edit/ }).click();
    await first.locator("textarea").fill("Edited sentence for e2e test.");
    await first.getByRole("button", { name: /حفظ|Save/ }).click();
    await expect(first).toContainText("Edited sentence for e2e test.");
    // delete another said item
    const second = page.locator("[data-testid^='said-said-']").nth(1);
    await second.getByRole("button", { name: /حذف|Delete/ }).click();
    const countAfterDelete = await page.locator("[data-testid^='said-said-']").count();
    // reload and verify persisted
    await page.reload();
    await expect(page.locator("[data-testid^='said-said-']").first()).toContainText("Edited sentence for e2e test.");
    expect(await page.locator("[data-testid^='said-said-']").count()).toBe(countAfterDelete);
  });

  test("select fields + doctor + demo TTL → QR, countdown, recipient shows only selected fields", async ({ page }) => {
    await grantConsent(page);
    await goThroughFlow(page);
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    await page.waitForURL(/\/share$/);
    // select two fields
    const boxes = page.locator("[data-testid^='field-']");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    // doctor is default recipient; demo TTL is default select value (2)
    await page.getByRole("button", { name: /أنشئ رابطاً آمناً|Create secure link/ }).click();
    await page.waitForURL(/\/share\/issued\//);
    await expect(page.getByTestId("qr")).toBeVisible();
    await expect(page.getByTestId("countdown")).toBeVisible();
    // recipient view shows exactly the selected fields
    const url = await page.locator(".card p.break-all").innerText();
    const recip = await page.context().newPage();
    await recip.goto(url);
    const fields = recip.locator("[data-testid^='field-']");
    await expect(fields).toHaveCount(2);
  });

  test("revoke → recipient page shows revoked within poll interval", async ({ page, context }) => {
    await grantConsent(page);
    await goThroughFlow(page);
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    await page.waitForURL(/\/share$/);
    await page.locator("[data-testid^='field-']").first().click();
    await page.getByRole("button", { name: /أنشئ رابطاً آمناً|Create secure link/ }).click();
    await page.waitForURL(/\/share\/issued\//);
    const url = await page.locator(".card p.break-all").innerText();
    const recip = await context.newPage();
    await recip.goto(url);
    await expect(recip.getByTestId("recipient-active")).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /إلغاء الوصول الآن|Revoke access now/ }).click();
    await expect(page.getByTestId("issued-status")).toContainText(/ملغى|Revoked/);
    await expect(recip.getByTestId("state-revoked")).toBeVisible({ timeout: 10_000 });
  });

  test("API: ttlMinutes 0.02 expires within seconds → 410 and page shows expired", async ({ page, request }) => {
    const res = await request.post("/api/shares", {
      data: { fields: { x: "y" }, recipientLabel: "Doc", ttlMinutes: 0.02 },
    });
    expect(res.ok()).toBeTruthy();
    const { id, token, url } = await res.json();
    await page.waitForTimeout(2000);
    const get = await request.get(`/api/shares/${id}?t=${token}`);
    expect(get.status()).toBe(410);
    await page.goto(url);
    await expect(page.getByTestId("state-expired")).toBeVisible();
  });

  test("language toggle switches html[dir] and heading text", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("link", { name: "ابدأ" })).toBeVisible();
    await page.getByLabel("Toggle language").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("link", { name: "Start" })).toBeVisible();
    await page.getByLabel("Toggle language").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("voice dictation appends final results to the transcript", async ({ page }) => {
    await page.addInitScript(() => {
      class FakeRecognition {
        lang = "";
        continuous = false;
        interimResults = false;
        onstart: (() => void) | null = null;
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          this.onstart?.();
          setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: [{ isFinal: true, 0: { transcript: "I slept well last night" } }],
            });
            this.onend?.();
          }, 50);
        }
        stop() {
          this.onend?.();
        }
      }
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition;
    });
    await grantConsent(page);
    await page.getByTestId("dictate-btn").click();
    await expect(page.getByRole("textbox", { name: /كيف تشعر اليوم|How are you feeling today/ })).toHaveValue(/I slept well last night/, { timeout: 5000 });
  });
});

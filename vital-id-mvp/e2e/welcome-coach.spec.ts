import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
for (const lang of ["en", "ar"] as const) {
  test(`animated welcome and responsive Fatima coach in ${lang}`, async ({ page }, info) => {
    await page.addInitScript(language => localStorage.setItem("vitalid.lang", JSON.stringify(language)), lang);
    await page.goto("/");
    await expect(page.locator(".garden-veg")).toHaveCount(3);
    await page.getByRole("link",{name:lang==="en"?"Sign in / Sign up / Fátima demo":"تسجيل الدخول / إنشاء حساب / مثال فاطمة"}).click();
    await page.getByRole("button", { name: lang === "en" ? "Sign up" : "إنشاء حساب", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: lang === "en" ? "Supabase project setup" : "مشروع Supabase" })).toBeVisible();
    await expect(page.getByTestId("enter-demo")).toContainText(lang === "en" ? "Fátima (Demo)" : "فاطمة (تجريبي)");
    await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
    await page.getByTestId("dashboard-checkin").click();
    await expect(page.getByTestId("fatima-coach")).toContainText(lang === "en" ? "Hello Fátima" : "مرحباً فاطمة");
    await expect(page.getByTestId("fatima-coach")).toContainText(lang === "en" ? "more consistent sleep" : "نوم أكثر انتظاماً");
    await expect(page.getByTestId("fatima-profile")).toContainText("42");
    await expect(page.getByTestId("fatima-profile")).toContainText("Circular Ring");
    await expect(page.getByTestId("fatima-profile")).toContainText("Cronometer");
    await expect(page.getByTestId("fatima-profile")).toContainText("RENPHO Health");
    await expect(page.getByTestId("fatima-profile")).toContainText(lang === "en" ? "Vitamin D" : "فيتامين د");
    await expect(page.getByTestId("fatima-profile")).toContainText(lang === "en" ? "Her goals right now" : "ما يهمّها الآن");
    await expect(page.getByTestId("coach-moment")).toContainText(lang === "en" ? "glass of wine" : "كأس نبيذ");
    await page.locator(".coach-topics button").nth(1).click();
    await expect(page.getByTestId("coach-moment")).toContainText(lang === "en" ? "investor meeting" : "اجتماع المستثمر");
    await page.locator(".coach-topics button").nth(2).click();
    await expect(page.getByTestId("coach-moment")).toContainText(lang === "en" ? "doesn’t define your day" : "لا يحدد يومك");
    await page.locator(".coach-topics button").nth(3).click();
    await expect(page.getByTestId("coach-moment")).toContainText("Cronometer");
    await page.getByRole("button", { name: lang === "en" ? "Good" : "جيد", exact: true }).click();
    await expect(page.locator(".coach-response")).toContainText(lang === "en" ? "What has felt good" : "ما الذي كان جميلاً");
    await page.locator(".coach-answer textarea").fill("I felt supported in the meeting.");
    await page.getByRole("button", {name: lang === "en" ? "Add to today’s note" : "أضيفي إلى ملاحظة اليوم"}).click();
    await expect(page.getByRole("textbox", {name: lang === "en" ? "How are you feeling today?" : "كيف تشعر اليوم؟", exact:true})).toHaveValue("I felt supported in the meeting.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`coach-${lang}.png`),fullPage:true});
    await page.getByRole("button", {name:/^(Continue|متابعة)$/}).click();
    await page.waitForURL(/signals/);
    await expect(page.getByTestId("circular-sample")).toContainText("80/100");
    await expect(page.getByTestId("circular-sample")).toContainText(lang === "en" ? "not a live reading" : "ليست قراءة مباشرة");
    await page.goto("/connections");
    await expect(page.getByTestId("demo-connections")).toContainText("Circular Ring");
    await expect(page.getByTestId("demo-connections")).toContainText("PLAUD");
    await expect(page.getByTestId("demo-connections")).toContainText("WHOOP");
    await expect(page.getByTestId("demo-cronometer")).toContainText("Cronometer");
    await expect(page.getByTestId("demo-renpho")).toContainText("RENPHO Health");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vitalid.currentDaily") || "{}").note)).toBe("I felt supported in the meeting.");
  });
}
test("reduced motion reveals the brand without an animation delay", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator(".garden-broccoli")).toHaveCSS("animation-name","none");
  await expect(page.locator(".garden-wordmark")).toHaveCSS("opacity","1");
});

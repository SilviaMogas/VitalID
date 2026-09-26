import { expect, test } from "@playwright/test";

test("personal sign in loads its own Supabase history, separate from Fátima", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.route("**/api/auth/session", async route => {
    if (route.request().method() === "GET") await route.fulfill({ json: { configured: true, user: null } });
    else await route.fulfill({ json: { signedOut: true } });
  });
  await page.route("**/api/auth", route => route.fulfill({ json: { user: { id: "account-123" } } }));
  await page.route("**/api/account", route => route.fulfill({ json: {
    profile: { id: "account-123", name: "Maya", isDemo: false, joinedAt: 1 },
    entries: [{ id: "day-one", date: "2026-09-23", createdAt: 1790184000000, mood: 4, energy: "steady", note: "My own day", movement: "Walk", movementMinutes: 20, food: "Lunch", source: "manual" }],
  } }));
  await page.goto("/register");
  await expect(page.getByRole("textbox",{name:"Email"})).toBeDisabled();
  await page.getByTestId("account-consent").check();
  await page.getByRole("textbox", { name: "Email" }).fill("maya@example.com");
  await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/consent/);
  expect(await page.evaluate(() => localStorage.getItem("vitalid.dailyHistory"))).toBeNull();
  await page.getByTestId("understand").click();
  await page.getByTestId("agree").click();
  await page.getByRole("button",{name:/I agree/}).click();
  await page.waitForURL(/dashboard/);
  const values = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("vitalid.profile") || "{}"),
    history: JSON.parse(localStorage.getItem("vitalid.dailyHistory") || "[]"),
  }));
  expect(values.profile.name).toBe("Maya");
  expect(values.profile.isDemo).toBe(false);
  expect(values.history).toHaveLength(1);
  expect(values.history[0].note).toBe("My own day");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/register/);
  expect(await page.evaluate(() => localStorage.getItem("vitalid.dailyHistory"))).toBeNull();
});

test("sign up waits for email confirmation when Supabase does", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.route("**/api/auth/session", route => route.fulfill({ json: { configured: true, user: null } }));
  await page.route("**/api/auth", route => route.fulfill({ json: { confirmationRequired: true } }));
  await page.goto("/register");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByTestId("account-consent").check();
  await page.getByRole("textbox", { name: "Your name" }).fill("Maya");
  await page.getByRole("textbox", { name: "Email" }).fill("maya@example.com");
  await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Check your email" })).toBeVisible();
  await expect(page).toHaveURL(/register/);
});

test("email confirmation defers health history until consent",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("vitalid.lang",JSON.stringify("en")));
  let loaded=0;
  await page.route("**/api/auth/session",r=>r.fulfill({json:{signedIn:true}}));
  await page.route("**/api/account",r=>{loaded++;return r.fulfill({json:{profile:{id:"confirmed-user",name:"Maya",isDemo:false,joinedAt:1},entries:[]}});});
  await page.goto("/auth/callback#access_token=fictional-token&refresh_token=fictional-refresh");
  await page.waitForURL(/consent/);expect(loaded).toBe(0);
  await page.getByTestId("understand").click();await page.getByTestId("agree").click();
  await page.getByRole("button",{name:"I agree",exact:true}).click();
  await page.waitForURL(/dashboard/);expect(loaded).toBe(1);
});

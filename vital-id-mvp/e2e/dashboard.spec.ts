import { expect, test } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 } });

test("Fátima's complete day: feeling, trends, apps and tomorrow persist", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("vitalid.lang", JSON.stringify("en")));
  await page.goto("/register");
  await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hey Fátima/ })).toBeVisible();
  await expect(page.getByTestId("performance-dashboard")).toContainText("68%");
  await expect(page.getByTestId("performance-dashboard")).toContainText("6h 22m");
  await expect(page.getByText("Connected · demo")).toHaveCount(0);
  await page.locator(".vl-ring-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("Previous seven days");
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await page.getByRole("button",{name:"Journal",exact:true}).click();
  await page.getByTestId("feeling-box").getByRole("button", {name:"Tired",exact:true}).click();
  await page.getByRole("textbox", {name:"Tell me about your day"}).fill("The meeting went well, but I need a quiet evening.");
  await page.getByRole("button",{name:"Tell Vita",exact:true}).click();
  await expect(page.getByTestId("care-space")).toContainText("What felt hardest today");
  await page.getByRole("textbox",{name:"What’s on your mind?"}).fill("I want to stop working and call a friend.");
  await page.getByRole("button",{name:"Save my reflection",exact:true}).click();
  await expect(page.getByTestId("care-space").getByRole("status")).toContainText("Saved for you");
  await page.getByRole("button",{name:"Data",exact:true}).click();
  await page.getByTestId("period-week").click();
  await expect(page.getByTestId("period-summary")).toContainText("7 days");
  await page.getByTestId("period-month").click();
  await expect(page.getByTestId("period-month")).toHaveAttribute("aria-pressed","true");
  await page.getByTestId("period-year").click();
  await expect(page.locator(".vl-trend-bars > span").first()).toBeVisible();
  await page.getByTestId("period-today").click();
  await page.getByRole("button",{name:"Tomorrow",exact:true}).click();
  await page.getByTestId("tomorrow-goal").fill("Send the deck and finish work at six.");
  await page.getByRole("button",{name:"A real lunch break",exact:true}).click();
  await page.getByRole("button",{name:"Save my plan for tomorrow",exact:true}).click();
  await page.getByRole("button",{name:"Settings & apps",exact:true}).click();
  await expect(page.getByTestId("experience-settings")).toContainText("PLAUD");
  await expect(page.getByRole("switch")).toHaveCount(10);
  await page.getByRole("switch",{name:"PLAUD demo connection"}).click();
  await expect(page.getByRole("switch",{name:"PLAUD demo connection"})).toHaveAttribute("aria-checked","false");
  await page.getByRole("button",{name:"Back to my day",exact:true}).click();
  await page.reload();
  await page.getByRole("button",{name:"Journal",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Tell me about your day"})).toHaveValue("The meeting went well, but I need a quiet evening.");
  await page.getByRole("button",{name:"Tomorrow",exact:true}).click();
  await expect(page.getByTestId("tomorrow-goal")).toHaveValue("Send the deck and finish work at six.");
  await expect(page.getByRole("button",{name:"A real lunch break",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Open Fátima’s profile",exact:true}).click();
  await expect(page.getByTestId("experience-profile")).toContainText("42");
  await page.getByRole("button",{name:"Back to my day",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Data",exact:true}).click();
  await expect(page.getByTestId("broccoli-guide")).toHaveCount(0);
  await expect(page.getByTestId("vital-id-card")).toBeVisible();
  await page.screenshot({path:info.outputPath("fatima-complete-day-mobile.png"),fullPage:true});
});

test("Arabic dashboard, reduced motion and demo voice input", async ({ page }, info) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(() => {
    localStorage.setItem("vitalid.lang", JSON.stringify("ar"));
    class Recognition {
      lang=""; continuous=false; interimResults=false;
      onstart:(()=>void)|null=null; onend:(()=>void)|null=null;
      onerror:((e:unknown)=>void)|null=null; onresult:((e:unknown)=>void)|null=null;
      start(){this.onstart?.();this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:"أنا بخير اليوم"}}]});this.onend?.();}
      stop(){this.onend?.();}
    }
    Object.defineProperty(window,"SpeechRecognition",{value:Recognition,configurable:true});
  });
  await page.goto("/register");
  await expect(page.getByTestId("enter-demo")).toBeDisabled();
  await page.getByTestId("demo-consent").check();
  await page.getByTestId("enter-demo").click();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await page.getByRole("button",{name:"اليوميات",exact:true}).click();
  await page.getByTestId("dictate-btn").click();
  await expect(page.getByRole("textbox",{name:"احكي لي عن يومك"})).toHaveValue("أنا بخير اليوم");
  await expect(page.locator(".vl-broccoli").first()).toHaveCSS("animation-name","none");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath("fatima-arabic-mobile.png"),fullPage:true});
});

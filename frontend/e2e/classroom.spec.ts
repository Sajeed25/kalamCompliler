import { expect, test } from "@playwright/test";
import { setCode } from "./helpers";

test("teacher sets an assignment, student logs in with a PIN and passes it", async ({ page, request }) => {
  // Teacher account + class + student through the API (the UI is covered below).
  const email = `t${Date.now()}@school.test`;
  const reg = await request.post("/api/auth/teacher/register", { data: { name: "Ms Rao", email, password: "password123", invite_code: process.env.E2E_INVITE ?? "E2E-INVITE" } });
  const { token } = await reg.json();
  const auth = { Authorization: `Bearer ${token}` };

  // Teacher UI: log in and create a class.
  await page.goto("/#/login");
  await page.getByRole("tab", { name: /teacher/i }).click();
  await page.locator("#t-email").fill(email);
  await page.locator("#t-pass").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#class-name").fill("Grade 5 A");
  await page.getByRole("button", { name: "Create" }).click();
  const code = (await page.getByTestId("class-code-display").textContent())!.trim();

  await page.getByRole("tab", { name: /Students/ }).click();
  await page.locator("#names").fill("Asha");
  await page.getByRole("button", { name: "Add and make PINs" }).click();
  const pin = (await page.getByTestId("new-pin").first().textContent())!.trim();
  await page.keyboard.press("Escape");

  const classes = await (await request.get("/api/classes", { headers: auth })).json();
  await request.post(`/api/classes/${classes[0].id}/assignments`, {
    headers: auth,
    data: {
      title: "Double it",
      instructions: "Read a number and print double.",
      language: "python",
      starter_code: "n = int(input())\n",
      tests: [{ input: "4", expected: "8" }, { input: "10", expected: "20", hidden: true }],
      match_mode: "exact",
    },
  });

  // Student: class code -> tap name -> PIN keypad.
  await page.getByRole("button", { name: /Log out/ }).click();
  await page.goto("/#/login");
  await page.getByTestId("class-code").fill(code);
  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByRole("button", { name: "Asha" }).click();
  for (const d of pin) await page.getByTestId(`pin-${d}`).click();
  await expect(page.getByText("Double it")).toBeVisible();
  await page.getByText("Double it").click();

  await setCode(page, "n = int(input())\nprint(n * 2)\n");
  await page.getByTestId("check-button").click();
  await expect(page.getByText("All tests passed! Amazing work!")).toBeVisible();
});

test("share a program and make a copy", async ({ page }) => {
  await page.goto("/#/code/python");
  await setCode(page, 'print("shared!")\n');
  await page.getByRole("button", { name: /Share/ }).click();
  await page.getByRole("button", { name: "Make a link" }).click();
  const link = await page.getByTestId("share-link").inputValue();
  await page.goto(link);
  await expect(page.locator(".cm-content")).toContainText('print("shared!")');
  await page.getByTestId("make-copy").click();
  await expect(page).toHaveURL(/#\/code\/python/);
});

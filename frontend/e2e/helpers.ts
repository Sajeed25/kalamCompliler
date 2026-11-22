import { expect, type Page } from "@playwright/test";

export async function setCode(page: Page, code: string) {
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

export async function run(page: Page) {
  await page.getByTestId("run-button").click();
}

export async function expectStatus(page: Page, re: RegExp) {
  await expect(page.getByTestId("run-status")).toHaveText(re);
}

export async function typeInput(page: Page, text: string) {
  const box = page.getByTestId("program-input");
  await expect(box).toBeVisible();
  await box.fill(text);
  await box.press("Enter");
}

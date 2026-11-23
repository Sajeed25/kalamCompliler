import { expect, test } from "@playwright/test";
import { expectStatus, run, setCode } from "./helpers";

// Simulates web hosting that doesn't send the COOP/COEP headers (and no service worker yet):
// the page is not cross-origin isolated, so SharedArrayBuffer doesn't exist.
// Regression test for "selecting Python shows a blank screen".
test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["cross-origin-opener-policy"];
    delete headers["cross-origin-embedder-policy"];
    await route.fulfill({ response, headers });
  });
});

test("Python still works without cross-origin isolation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(false);
  await page.getByTestId("lang-card-python").click();
  await run(page);
  await expectStatus(page, /Finished/);
  await expect(page.getByTestId("output-text")).toContainText("Hello, World!");

  await setCode(page, 'name = input("Name? ")\n');
  await run(page);
  await expect(page.getByTestId("error-simple")).toContainText("reload the page");
  expect(errors).toEqual([]);
});

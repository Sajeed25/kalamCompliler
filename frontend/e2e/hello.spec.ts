import { expect, test } from "@playwright/test";
import { expectStatus, run, setCode, typeInput } from "./helpers";

// The core promise: open, pick a language, press Run, see Hello World.
for (const [lang, text] of [
  ["python", "Hello, World!"],
  ["c", "Hello, World!"],
  ["cpp", "Hello, World!"],
] as const) {
  test(`Hello World runs in ${lang} @tablet`, async ({ page }) => {
    await page.goto("/");
    await page.getByTestId(`lang-card-${lang}`).click();
    await run(page);
    await expectStatus(page, /Finished/);
    await expect(page.getByTestId("output-text")).toContainText(text);
  });
}

test("C program asks for input inside the output screen", async ({ page }) => {
  await page.goto("/#/code/c");
  await setCode(page, '#include <stdio.h>\nint main() {\n    int a;\n    printf("Number? ");\n    scanf("%d", &a);\n    printf("Double: %d\\n", a * 2);\n    return 0;\n}\n');
  await run(page);
  await expect(page.getByTestId("output-text")).toContainText("Number?");
  await typeInput(page, "21");
  await expectStatus(page, /Finished/);
  await expect(page.getByTestId("output-text")).toContainText("Double: 42");
});

test("Python input() and friendly errors", async ({ page }) => {
  await page.goto("/#/code/python");
  await setCode(page, 'age = int(input("Age? "))\nprint("Next year:", age + 1)\n');
  await run(page);
  await typeInput(page, "nine");
  await expect(page.getByTestId("error-simple")).toContainText("whole number");
  await setCode(page, 'pritn("hello")\n');
  await run(page);
  await expect(page.getByTestId("error-simple")).toContainText("Did you mean 'print'?");
  await expect(page.locator(".cm-error-line")).toHaveCount(1);
});

test("C compile error is explained simply with the full error collapsible", async ({ page }) => {
  await page.goto("/#/code/c");
  await setCode(page, '#include <stdio.h>\nint main() {\n    printf("hi")\n    return 0;\n}\n');
  await run(page);
  await expect(page.getByTestId("error-simple")).toContainText("semicolon");
  await expect(page.getByText("Full error (for experts)")).toBeVisible();
});

test("infinite loop in C hits the time limit with the spec message", async ({ page }) => {
  await page.goto("/#/code/c");
  await setCode(page, "int main() {\n    while (1) { }\n}\n");
  await run(page);
  await expect(page.getByTestId("error-simple")).toHaveText("Your program ran for too long — maybe a loop never stops? 🔁", { timeout: 40_000 });
});

test("examples library opens and loads an example", async ({ page }) => {
  await page.goto("/#/code/python");
  await page.getByTestId("examples-button").click();
  await page.getByTestId("example-turtle_star").click();
  const confirm = page.getByTestId("confirm-replace");
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect(page.locator(".cm-content")).toContainText("begin_fill");
  await run(page);
  await expectStatus(page, /Finished/);
});

test("UI switches to Telugu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Settings/ }).click();
  await page.locator("#ui-lang").selectOption("te");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ఈరోజు ఏం కోడ్ చేద్దాం?");
});

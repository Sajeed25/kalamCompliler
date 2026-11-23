import { expect, test } from "@playwright/test";
import { expectStatus, run, setCode, typeInput } from "./helpers";

// Hosting without a Kalam backend (e.g. Hostinger web apps): /api doesn't exist, so
// C and C++ must be compiled in the browser (Clang → WebAssembly).
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 404, contentType: "text/html", body: "<h1>Not found</h1>" }));
});

test("C runs in the browser without a backend: hello, input, friendly error", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/#/code/c");
  await run(page);
  await expectStatus(page, /Finished/);
  await expect(page.getByTestId("output-text")).toContainText("Hello, World!");

  await setCode(page, '#include <stdio.h>\nint main() {\n    int a;\n    printf("Number? ");\n    scanf("%d", &a);\n    printf("Double: %d\\n", a * 2);\n    return 0;\n}\n');
  await run(page);
  await typeInput(page, "21");
  await expectStatus(page, /Finished/);
  await expect(page.getByTestId("output-text")).toHaveText("Number? 21\nDouble: 42\n");

  await setCode(page, '#include <stdio.h>\nint main() {\n    printf("hi")\n    return 0;\n}\n');
  await run(page);
  await expect(page.getByTestId("error-simple")).toContainText("semicolon");
  await expect(page.locator(".cm-error-line")).toHaveCount(1);

  await setCode(page, "int main() {\n    while (1) { }\n}\n");
  await run(page);
  await expect(page.getByTestId("error-simple")).toHaveText("Your program ran for too long — maybe a loop never stops? 🔁", { timeout: 30_000 });
});

test("C++ runs in the browser without a backend @tablet", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/#/code/cpp");
  await setCode(page, '#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string name;\n    cout << "Name? ";\n    cin >> name;\n    cout << "Hi " << name << endl;\n}\n');
  await run(page);
  await typeInput(page, "Asha");
  await expectStatus(page, /Finished/);
  await expect(page.getByTestId("output-text")).toHaveText("Name? Asha\nHi Asha\n");
});

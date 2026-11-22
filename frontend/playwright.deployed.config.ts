import { defineConfig } from "@playwright/test";

// Smoke-test a running deployment (e.g. after `docker compose up`):
//   KALAM_URL=http://localhost E2E_INVITE=<your invite code> npx playwright test -c playwright.deployed.config.ts
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: {
    baseURL: process.env.KALAM_URL ?? "http://localhost",
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ["--headless", "--no-sandbox"] } : {},
  },
});

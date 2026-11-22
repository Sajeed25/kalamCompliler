import { defineConfig, devices } from "@playwright/test";
import { chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// End-to-end tests start the real backend (local sandbox executor, throwaway
// SQLite DB) and the built frontend. Run with: npm run e2e
const dataDir = mkdtempSync(join(tmpdir(), "kalam-e2e-"));
chmodSync(dataDir, 0o755); // the sandboxed "nobody" user must be able to reach compiled programs
const backendCmd = process.env.KALAM_BACKEND_CMD ?? "../backend/.venv/bin/uvicorn app.main:app --port 8000 --app-dir ../backend";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "off",
    // Optional: use an already-installed Chromium (e.g. PW_CHROMIUM=/opt/pw-browsers/chromium).
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ["--headless", "--no-sandbox"] } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "tablet", use: { ...devices["Galaxy Tab S4"] }, grep: /@tablet/ },
  ],
  webServer: [
    {
      command: backendCmd,
      port: 8000,
      reuseExistingServer: !process.env.CI,
      env: {
        KALAM_ENV: "test",
        KALAM_SECRET_KEY: "e2e-secret",
        KALAM_DATABASE_URL: `sqlite+aiosqlite:///${dataDir}/e2e.db`,
        KALAM_EXECUTOR: process.env.KALAM_EXECUTOR ?? "local",
        KALAM_TEACHER_INVITE_CODE: "E2E-INVITE",
        KALAM_WORK_DIR: dataDir,
      },
    },
    { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: !process.env.CI },
  ],
});

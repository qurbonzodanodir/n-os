import { defineConfig, devices } from "@playwright/test";

// Runs the real FastAPI backend (throw-away SQLite file) behind the Vite dev
// proxy, which injects the development identity.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "en-US",
    timezoneId: "Asia/Dushanbe",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "rm -f .local/e2e.db && python3 -m uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/v1/health",
      env: { N_OS_DATABASE_URL: "sqlite+aiosqlite:///./.local/e2e.db" },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});

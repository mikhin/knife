import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";

export default defineConfig({
  expect: { timeout: 15000 },
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  testDir: "./tests",
  timeout: 90000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @knife/api dev",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: `${API_URL}/api/projects`,
    },
    {
      command: "pnpm --filter @knife/web dev",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: WEB_URL,
    },
  ],
  workers: 1,
});

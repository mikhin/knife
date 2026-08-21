import { defineConfig, devices } from "@playwright/test";

/**
 * The suite runs on its own ports and its own database, so it neither collides
 * with a dev session nor leaves chunks behind in a real universe.
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? "5273";
const API_PORT = process.env.E2E_API_PORT ?? "3100";
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://knife:knife@localhost:5433/knife_e2e";

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
      command:
        "node tests/prepare-database.mts && pnpm --filter @knife/api dev",
      env: { DATABASE_URL, PORT: API_PORT },
      reuseExistingServer: false,
      timeout: 120000,
      url: `${API_URL}/api/projects`,
    },
    {
      command: "pnpm --filter @knife/web dev",
      env: { API_URL, WEB_PORT },
      reuseExistingServer: false,
      timeout: 120000,
      url: WEB_URL,
    },
  ],
  workers: 1,
});

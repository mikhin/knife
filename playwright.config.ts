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
  // Short on purpose: a broken test should say so in seconds, not sit out a
  // minute and a half. The one scenario that needs longer asks for it itself.
  expect: { timeout: 5000 },
  fullyParallel: true,
  projects: [
    { name: "empty", testMatch: /clean-database\.setup\.ts/ },
    {
      dependencies: ["empty"],
      name: "knife",
      testIgnore: /clean-database\.setup\.ts/,
      use: devices["Desktop Chrome"],
    },
  ],
  reporter: process.env.CI ? "github" : "list",
  testDir: "./tests",
  timeout: 20000,
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
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: `${API_URL}/api/projects`,
    },
    {
      command: "pnpm --filter @knife/web dev",
      env: { API_URL, WEB_PORT },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: WEB_URL,
    },
  ],
  workers: 4,
});

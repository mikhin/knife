import { execFileSync } from "node:child_process";
import { test as setup } from "@playwright/test";

/**
 * Every run starts from an empty universe. This is a setup project rather
 * than part of the server command, because the servers are reused between
 * runs and their command does not run again — the emptying has to.
 *
 * Guarded by the name: pointing E2E_DATABASE_URL at a real database must
 * never wipe it.
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://knife:knife@localhost:5433/knife_e2e";

const database = new URL(DATABASE_URL).pathname.slice(1);

setup("вселенная пуста перед прогоном", () => {
  if (!database.endsWith("_e2e") || process.env.CI) {
    return;
  }

  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "knife",
      "-d",
      database,
      "-c",
      "truncate table projects cascade",
    ],
    { stdio: "ignore" },
  );
});

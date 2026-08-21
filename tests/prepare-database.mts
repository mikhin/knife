import { execFileSync } from "node:child_process";

/**
 * A database of its own, so a run never lands in the universe someone is
 * actually working in — and never has to be cleaned out by hand afterwards.
 *
 * This runs as part of the API server command rather than as a Playwright
 * global setup: the runner starts its web servers first, and by then the
 * database has to be up already.
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://knife:knife@localhost:5433/knife_e2e";

const run = (
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): void => {
  execFileSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
};

const startPostgres = (): void => {
  try {
    run("docker", ["compose", "up", "-d", "--wait", "db"]);
  } catch {
    throw new Error(
      "Postgres did not start — is Docker running? Point E2E_DATABASE_URL at a database of your own to skip the container.",
    );
  }
};

const createDatabase = (name: string): void => {
  const exists = execFileSync(
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
      "postgres",
      "-tAc",
      `select 1 from pg_database where datname = '${name}'`,
    ],
    { encoding: "utf8" },
  ).trim();

  if (exists !== "1") {
    run("docker", [
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "knife",
      "-d",
      "postgres",
      "-c",
      `create database ${name}`,
    ]);
  }
};

if (!process.env.CI) {
  startPostgres();
  createDatabase(new URL(DATABASE_URL).pathname.slice(1));
}

run("pnpm", ["--filter", "@knife/api", "exec", "prisma", "migrate", "deploy"], {
  DATABASE_URL,
});

const database = new URL(DATABASE_URL).pathname.slice(1);

// Each run starts from an empty universe. Guarded by the name: pointing
// E2E_DATABASE_URL at a real database must never wipe it.
if (database.endsWith("_e2e") && !process.env.CI) {
  run("docker", [
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
  ]);
}

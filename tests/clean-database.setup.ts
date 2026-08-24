import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";

/**
 * Every run starts from an empty universe, and from one team that the whole
 * run is signed in as. This is a setup project rather than part of the server
 * command, because the servers are reused between runs and their command does
 * not run again — the emptying has to.
 *
 * Guarded by the name: pointing E2E_DATABASE_URL at a real database must
 * never wipe it.
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://knife:knife@localhost:5433/knife_e2e";

const database = new URL(DATABASE_URL).pathname.slice(1);
const API_URL = `http://localhost:${process.env.E2E_API_PORT ?? "3100"}`;

/** Matches SESSION_SECRET handed to the API in playwright.config.ts. */
const SECRET = "an-e2e-secret";
const TEAM = "00000000-0000-4000-8000-0000000000e2";
const MEMBER = "00000000-0000-4000-8000-0000000000e3";

export const STORAGE_STATE = path.join(__dirname, ".auth", "team.json");

const psql = (sql: string): string =>
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
      sql,
    ],
    { encoding: "utf8" },
  );

/**
 * The session cookie the API would have set after Google answered. Signing it
 * here keeps Google out of the suite: what these scenarios are about is the
 * universe, and a real sign-in would make every run depend on somebody else's
 * uptime.
 */
const sessionCookie = (): string => {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + 86_400_000, value: MEMBER }),
  ).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
};

setup("вселенная пуста перед прогоном", async () => {
  if (!database.endsWith("_e2e") || process.env.CI) {
    return;
  }

  psql(
    "truncate table organizations, oauth_clients, oauth_codes, oauth_tokens cascade",
  );
  psql(
    `insert into organizations (id, name) values ('${TEAM}', 'E2E team');
     insert into members (id, organization_id, email, google_sub, role)
     values ('${MEMBER}', '${TEAM}', 'e2e@knife.test', 'e2e-sub', 'OWNER')`,
  );

  mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [
        {
          domain: "localhost",
          expires: Math.floor(Date.now() / 1000) + 86_400,
          httpOnly: true,
          name: "knife_session",
          path: "/",
          sameSite: "Lax",
          secure: false,
          value: sessionCookie(),
        },
      ],
      origins: [],
    }),
  );

  await assertApiSharesThisDatabase();
});

/**
 * The suite empties one database and the API writes to another only if
 * something went wrong — a server started by hand on this port, an env that
 * did not reach it. That mistake is silent and expensive: a run then fills
 * somebody's real universe with projects named after a process id.
 *
 * So the suite plants a row and asks the API to read it back. If the answer
 * comes from anywhere else, the run stops before a single test writes.
 */
const assertApiSharesThisDatabase = async (): Promise<void> => {
  const canary = `canary-${Date.now()}`;
  psql(
    `insert into projects (id, organization_id, name)
     values (gen_random_uuid(), '${TEAM}', '${canary}')`,
  );

  const response = await fetch(`${API_URL}/api/projects`, {
    headers: { cookie: `knife_session=${sessionCookie()}` },
  });
  const projects = (await response.json()) as Array<{ name: string }>;
  psql(`delete from projects where name = '${canary}'`);

  if (!projects.some((project) => project.name === canary)) {
    throw new Error(
      `The API on ${API_URL} is not reading ${database}. Something else is holding that port — stop it and run again, or the suite would write into whatever database that server is using.`,
    );
  }
};

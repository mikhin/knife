import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import {
  API_URL,
  DATABASE,
  OTHER,
  OWNER,
  psql,
  sessionCookie,
  signedInAs,
} from "./people";

/**
 * Every run starts from an empty database and from two people: the one the
 * suite is signed in as, and one to share a project with. This is a setup
 * project rather than part of the server command, because the servers are
 * reused between runs and their command does not run again — the emptying
 * has to.
 *
 * Guarded by the name: pointing E2E_DATABASE_URL at a real database must
 * never wipe it.
 */
export const STORAGE_STATE = path.join(__dirname, ".auth", "owner.json");

setup("вселенная пуста перед прогоном", async () => {
  if (!DATABASE.endsWith("_e2e") || process.env.CI) {
    return;
  }

  psql(
    "truncate table users, oauth_clients, oauth_codes, oauth_tokens cascade",
  );
  psql(
    `insert into users (id, email, google_sub) values
       ('${OWNER.id}', '${OWNER.email}', 'e2e-sub'),
       ('${OTHER.id}', '${OTHER.email}', 'other-sub')`,
  );

  mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify(signedInAs(OWNER.id)));

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
    `insert into projects (id, owner_id, name)
     values (gen_random_uuid(), '${OWNER.id}', '${canary}')`,
  );

  const response = await fetch(`${API_URL}/api/projects`, {
    headers: { cookie: `knife_session=${sessionCookie(OWNER.id)}` },
  });
  const projects = (await response.json()) as Array<{ name: string }>;
  psql(`delete from projects where name = '${canary}'`);

  if (!projects.some((project) => project.name === canary)) {
    throw new Error(
      `The API on ${API_URL} is not reading ${DATABASE}. Something else is holding that port — stop it and run again, or the suite would write into whatever database that server is using.`,
    );
  }
};

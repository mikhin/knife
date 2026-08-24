import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";

/**
 * Two people the whole suite borrows: one signed in by default, one to hand
 * a project to. Both exist in the database from the first setup step, so a
 * scenario about sharing does not begin by inventing accounts.
 */
export const OWNER = {
  email: "e2e@knife.test",
  id: "00000000-0000-4000-8000-0000000000e3",
} as const;

export const OTHER = {
  email: "other@knife.test",
  id: "00000000-0000-4000-8000-0000000000e4",
} as const;

/** Matches SESSION_SECRET handed to the API in playwright.config.ts. */
const SECRET = "an-e2e-secret";

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://knife:knife@localhost:5433/knife_e2e";

export const DATABASE = new URL(DATABASE_URL).pathname.slice(1);

export const API_URL = `http://localhost:${process.env.E2E_API_PORT ?? "3100"}`;

export const psql = (sql: string): string =>
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
      DATABASE,
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
export const sessionCookie = (userId: string): string => {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + 86_400_000, value: userId }),
  ).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
};

export const signedInAs = (
  userId: string,
): { cookies: unknown[]; origins: unknown[] } => ({
  cookies: [
    {
      domain: "localhost",
      expires: Math.floor(Date.now() / 1000) + 86_400,
      httpOnly: true,
      name: "knife_session",
      path: "/",
      sameSite: "Lax",
      secure: false,
      value: sessionCookie(userId),
    },
  ],
  origins: [],
});

import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * The same default the running service uses, so migrations and tooling work
 * on a fresh checkout without anyone exporting anything first.
 */
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://knife:knife@localhost:5433/knife";

export default defineConfig({
  datasource: {
    url: DATABASE_URL,
  },
  schema: "prisma/schema.prisma",
});

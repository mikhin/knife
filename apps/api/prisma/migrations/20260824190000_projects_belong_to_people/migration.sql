-- Teams turned out to be the wrong shape: everyone in one saw everything.
-- A project belongs to the person who made it, and guests are invited to one
-- project at a time. Nobody loses a project: every one of them goes to the
-- owner of the team it was in.

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "google_sub" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- Everyone who was a member becomes a person, keeping their id: a session
-- cookie signed before this migration still names somebody real.
INSERT INTO "users" ("id", "email", "google_sub", "created_at")
SELECT DISTINCT ON ("email") "id", "email", "google_sub", "created_at"
FROM "members"
ORDER BY "email", "created_at";

CREATE TABLE "project_access" (
    "project_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_access_pkey" PRIMARY KEY ("project_id", "email")
);

CREATE INDEX "project_access_email_idx" ON "project_access"("email");

ALTER TABLE "projects" ADD COLUMN "owner_id" UUID;

-- The owner of the team takes the projects; if a team somehow had none, its
-- oldest member does, so no project is left without a person.
UPDATE "projects" p
SET "owner_id" = (
    SELECT m."id" FROM "members" m
    WHERE m."organization_id" = p."organization_id"
    ORDER BY (m."role" = 'OWNER') DESC, m."created_at"
    LIMIT 1
);

DELETE FROM "projects" WHERE "owner_id" IS NULL;

ALTER TABLE "projects" ALTER COLUMN "owner_id" SET NOT NULL;

-- Whoever else was in that team keeps what they could already see, now as a
-- guest of each project rather than as a member of everything.
INSERT INTO "project_access" ("project_id", "email")
SELECT p."id", m."email"
FROM "projects" p
JOIN "members" m ON m."organization_id" = (
    SELECT m2."organization_id" FROM "members" m2 WHERE m2."id" = p."owner_id"
)
WHERE m."id" <> p."owner_id"
ON CONFLICT DO NOTHING;

ALTER TABLE "projects" DROP CONSTRAINT "projects_organization_id_fkey";
DROP INDEX "projects_organization_id_name_key";
DROP INDEX "projects_organization_id_idx";
ALTER TABLE "projects" DROP COLUMN "organization_id";

CREATE UNIQUE INDEX "projects_owner_id_name_key" ON "projects"("owner_id", "name");
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_access" ADD CONSTRAINT "project_access_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "members";
DROP TABLE "organizations";
DROP TYPE "MemberRole";

-- Teams take ownership of what used to belong to whoever knew the address,
-- and agents get a door of their own. No text moves: chunks are untouched,
-- and every project keeps its id, its name and its universe.

CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "TokenKind" AS ENUM ('ACCESS', 'REFRESH');

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "google_sub" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "members_google_sub_key" ON "members"("google_sub");
CREATE INDEX "members_email_idx" ON "members"("email");
CREATE UNIQUE INDEX "members_organization_id_email_key" ON "members"("organization_id", "email");

ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The projects that already exist predate the idea of an owner. They are kept
-- together in one team rather than deleted or split: whoever signs in first
-- inherits them, which is the same person who has been using this database.
ALTER TABLE "projects" ADD COLUMN "organization_id" UUID;

INSERT INTO "organizations" ("id", "name")
SELECT '00000000-0000-4000-8000-000000000001', 'Personal'
WHERE EXISTS (SELECT 1 FROM "projects");

UPDATE "projects"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;

ALTER TABLE "projects" ALTER COLUMN "organization_id" SET NOT NULL;

-- A name is unique inside a team, not across the world: two teams may each
-- have a project called "handbook" without ever knowing about each other.
DROP INDEX "projects_name_key";
CREATE UNIQUE INDEX "projects_organization_id_name_key" ON "projects"("organization_id", "name");
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "oauth_clients" (
    "client_id" TEXT NOT NULL,
    "secret_hash" TEXT,
    "name" TEXT NOT NULL,
    "redirect_uris" TEXT[],
    "scopes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("client_id")
);

CREATE TABLE "oauth_codes" (
    "code_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "member_id" UUID NOT NULL,
    "scopes" TEXT[],
    "code_challenge" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "resource" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_codes_pkey" PRIMARY KEY ("code_hash")
);

CREATE INDEX "oauth_codes_expires_at_idx" ON "oauth_codes"("expires_at");

CREATE TABLE "oauth_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "kind" "TokenKind" NOT NULL,
    "client_id" TEXT NOT NULL,
    "member_id" UUID NOT NULL,
    "scopes" TEXT[],
    "resource" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_tokens_token_hash_key" ON "oauth_tokens"("token_hash");
CREATE INDEX "oauth_tokens_member_id_idx" ON "oauth_tokens"("member_id");
CREATE INDEX "oauth_tokens_expires_at_idx" ON "oauth_tokens"("expires_at");

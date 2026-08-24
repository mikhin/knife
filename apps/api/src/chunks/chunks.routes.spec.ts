import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Chunk } from "@knife/contract";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SessionGuard } from "@/auth/session.guard";
import { ChunksController } from "@/chunks/chunks.controller";
import { ChunksService } from "@/chunks/chunks.service";
import { PrismaService } from "@/db/prisma.service";
import type { ExecutionContext } from "@nestjs/common";
import type { SignedInRequest } from "@/auth/session.guard";
import type { Member } from "@/generated/prisma/client";

const chunks = {
  create:
    vi.fn<(team: string, projectId: string, text: string) => Promise<Chunk>>(),
  createMany:
    vi.fn<
      (team: string, projectId: string, texts: string[]) => Promise<Chunk[]>
    >(),
  listByProject: vi
    .fn<(team: string, projectId: string) => Promise<Chunk[]>>()
    .mockResolvedValue([]),
  remove:
    vi.fn<(team: string, projectId: string, id: string) => Promise<void>>(),
};

const TEAM_ID = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const PROJECT_ID = "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f";

/** Signed in as somebody: whose team it is has a test of its own. */
const signedIn = {
  canActivate: (context: ExecutionContext): boolean => {
    const incoming = context.switchToHttp().getRequest<SignedInRequest>();
    incoming.member = { organizationId: TEAM_ID } as Member;
    return true;
  },
};
const CHUNK_ID = "1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("chunk routes", () => {
  let app: INestApplication;

  const call = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChunksController],
      providers: [
        { provide: ChunksService, useValue: chunks },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue(signedIn)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("offers no way to edit a chunk in place", async () => {
    const patched = await call()
      .patch(`/api/projects/${PROJECT_ID}/chunks/${CHUNK_ID}`)
      .send({ text: "rewritten" });
    const replaced = await call()
      .put(`/api/projects/${PROJECT_ID}/chunks/${CHUNK_ID}`)
      .send({ text: "rewritten" });

    expect(patched.status).toBe(404);
    expect(replaced.status).toBe(404);
  });

  it("takes a whole sheet already cut into chunks", async () => {
    chunks.createMany.mockResolvedValue([]);

    const response = await call()
      .post(`/api/projects/${PROJECT_ID}/chunks/bulk`)
      .send({ texts: ["A rule.", "Another rule."] });

    expect(response.status).toBe(201);
    expect(chunks.createMany).toHaveBeenCalledWith(TEAM_ID, PROJECT_ID, [
      "A rule.",
      "Another rule.",
    ]);
  });

  it("deletes a chunk for good", async () => {
    chunks.remove.mockResolvedValue(undefined);

    const response = await call().delete(
      `/api/projects/${PROJECT_ID}/chunks/${CHUNK_ID}`,
    );

    expect(response.status).toBe(204);
    expect(chunks.remove).toHaveBeenCalledWith(TEAM_ID, PROJECT_ID, CHUNK_ID);
  });
});

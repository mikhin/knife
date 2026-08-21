import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Chunk } from "@knife/contract";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ChunksController } from "@/chunks/chunks.controller";
import { ChunksService } from "@/chunks/chunks.service";
import { PrismaService } from "@/db/prisma.service";

const chunks = {
  create: vi.fn<(projectId: string, text: string) => Promise<Chunk>>(),
  createMany: vi.fn<(projectId: string, texts: string[]) => Promise<Chunk[]>>(),
  listByProject: vi
    .fn<(projectId: string) => Promise<Chunk[]>>()
    .mockResolvedValue([]),
  remove: vi.fn<(projectId: string, id: string) => Promise<void>>(),
};

const PROJECT_ID = "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f";
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
    }).compile();

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
    expect(chunks.createMany).toHaveBeenCalledWith(PROJECT_ID, [
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
    expect(chunks.remove).toHaveBeenCalledWith(PROJECT_ID, CHUNK_ID);
  });
});

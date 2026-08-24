import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunksService } from "@/chunks/chunks.service";
import { PrismaService } from "@/db/prisma.service";
import { ProjectsService } from "@/projects/projects.service";
import type { Chunk as ChunkRecord } from "@/generated/prisma/client";

type Args = Record<string, unknown>;

const prisma = {
  chunk: {
    createManyAndReturn: vi.fn<(args: Args) => Promise<ChunkRecord[]>>(),
    deleteMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
    findMany: vi.fn<(args: Args) => Promise<ChunkRecord[]>>(),
  },
};

const projects = {
  assertReachable: vi.fn<(viewer: unknown, id: string) => Promise<void>>(),
};

const VIEWER = {
  createdAt: new Date("2026-08-21T10:00:00.000Z"),
  email: "reader@knife.test",
  googleSub: "a-sub",
  id: "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
};

const record = (id: string, text: string): ChunkRecord => ({
  createdAt: new Date("2026-08-21T10:00:00.000Z"),
  id,
  projectId: "universe",
  text,
});

describe("ChunksService", () => {
  let chunks: ChunksService;

  beforeEach(async () => {
    vi.clearAllMocks();
    projects.assertReachable.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChunksService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: projects },
      ],
    }).compile();

    chunks = moduleRef.get(ChunksService);
  });

  it("drops blank pieces instead of storing empty chunks", async () => {
    prisma.chunk.createManyAndReturn.mockResolvedValue([
      record("1", "A rule."),
    ]);

    await chunks.createMany(VIEWER, "universe", ["  ", "A rule.", "\n"]);

    expect(prisma.chunk.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ projectId: "universe", text: "A rule." }],
    });
  });

  it("writes nothing when a sheet cut down to nothing", async () => {
    const created = await chunks.createMany(VIEWER, "universe", ["   ", ""]);

    expect(created).toEqual([]);
    expect(prisma.chunk.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("refuses to attach chunks to a project that is gone", async () => {
    projects.assertReachable.mockRejectedValue(
      new NotFoundException("No such project"),
    );

    await expect(
      chunks.createMany(VIEWER, "gone", ["A rule."]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("reports a delete that matched nothing", async () => {
    prisma.chunk.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      chunks.remove(VIEWER, "universe", "gone"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses a universe this person cannot reach", async () => {
    projects.assertReachable.mockRejectedValue(
      new NotFoundException("No such project"),
    );

    await expect(
      chunks.listByProject(VIEWER, "universe"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses to delete a chunk that belongs to another project", async () => {
    prisma.chunk.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      chunks.remove(VIEWER, "other-universe", "chunk-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.chunk.deleteMany).toHaveBeenCalledWith({
      where: { id: "chunk-1", projectId: "other-universe" },
    });
  });

  it("hands the universe over as plain text with its arrival date", async () => {
    prisma.chunk.findMany.mockResolvedValue([record("1", "A rule.")]);

    await expect(chunks.listByProject(VIEWER, "universe")).resolves.toEqual([
      {
        createdAt: "2026-08-21T10:00:00.000Z",
        id: "1",
        projectId: "universe",
        text: "A rule.",
      },
    ]);
  });
});

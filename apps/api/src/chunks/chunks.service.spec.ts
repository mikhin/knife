import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunksService } from "@/chunks/chunks.service";
import { PrismaService } from "@/db/prisma.service";
import type { Chunk as ChunkRecord } from "@/generated/prisma/client";

type Args = Record<string, unknown>;

const prisma = {
  chunk: {
    createManyAndReturn: vi.fn<(args: Args) => Promise<ChunkRecord[]>>(),
    findMany: vi.fn<(args: Args) => Promise<ChunkRecord[]>>(),
  },
  project: {
    findUnique: vi.fn<(args: Args) => Promise<null | { id: string }>>(),
  },
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
    prisma.project.findUnique.mockResolvedValue({ id: "universe" });

    const moduleRef = await Test.createTestingModule({
      providers: [ChunksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    chunks = moduleRef.get(ChunksService);
  });

  it("drops blank pieces instead of storing empty chunks", async () => {
    prisma.chunk.createManyAndReturn.mockResolvedValue([
      record("1", "A rule."),
    ]);

    await chunks.createMany("universe", ["  ", "A rule.", "\n"]);

    expect(prisma.chunk.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ projectId: "universe", text: "A rule." }],
    });
  });

  it("writes nothing when a sheet cut down to nothing", async () => {
    const created = await chunks.createMany("universe", ["   ", ""]);

    expect(created).toEqual([]);
    expect(prisma.chunk.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("refuses to attach chunks to a project that is gone", async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(chunks.createMany("gone", ["A rule."])).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("hands the universe over as plain text with its arrival date", async () => {
    prisma.chunk.findMany.mockResolvedValue([record("1", "A rule.")]);

    await expect(chunks.listByProject("universe")).resolves.toEqual([
      {
        createdAt: "2026-08-21T10:00:00.000Z",
        id: "1",
        projectId: "universe",
        text: "A rule.",
      },
    ]);
  });
});

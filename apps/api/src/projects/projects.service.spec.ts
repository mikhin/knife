import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "@/db/prisma.service";
import type { Project as ProjectRecord } from "@/generated/prisma/client";
import { ProjectsService } from "@/projects/projects.service";

type Args = Record<string, unknown>;
const prisma = {
  project: {
    create: vi.fn<(args: Args) => Promise<ProjectRecord>>(),
    deleteMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
    findFirst: vi.fn<(args: Args) => Promise<null | ProjectRecord>>(),
    findMany: vi.fn<(args: Args) => Promise<ProjectRecord[]>>(),
    findUnique: vi.fn<(args: Args) => Promise<null | ProjectRecord>>(),
    updateMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
  },
};

const record = (name: string): ProjectRecord => ({
  createdAt: new Date("2026-08-21T10:00:00.000Z"),
  id: "universe",
  name,
});

describe("ProjectsService", () => {
  let projects: ProjectsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.project.findFirst.mockResolvedValue(null);
    prisma.project.findUnique.mockResolvedValue(record("Handbook"));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    projects = moduleRef.get(ProjectsService);
  });

  it("lists the projects it has", async () => {
    prisma.project.findMany.mockResolvedValue([record("Handbook")]);

    await expect(projects.list()).resolves.toEqual([
      {
        createdAt: "2026-08-21T10:00:00.000Z",
        id: "universe",
        name: "Handbook",
      },
    ]);
  });

  it("refuses a name that is already taken", async () => {
    prisma.project.findUnique.mockResolvedValue(record("Handbook"));

    await expect(projects.create("Handbook")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("renames a project", async () => {
    prisma.project.updateMany.mockResolvedValue({ count: 1 });
    prisma.project.findUnique.mockResolvedValue(record("Night audit"));

    await expect(
      projects.rename("universe", "  Night audit  "),
    ).resolves.toMatchObject({ name: "Night audit" });
    expect(prisma.project.updateMany).toHaveBeenCalledWith({
      data: { name: "Night audit" },
      where: { id: "universe" },
    });
  });

  it("refuses to rename onto a name another project holds", async () => {
    prisma.project.findFirst.mockResolvedValue(record("Handbook"));

    await expect(
      projects.rename("universe", "Handbook"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.project.updateMany).not.toHaveBeenCalled();
  });

  it("lets a project keep its own name", async () => {
    prisma.project.updateMany.mockResolvedValue({ count: 1 });

    await projects.rename("universe", "Handbook");

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: { not: "universe" }, name: "Handbook" },
    });
  });

  it("reports a rename of a project that is gone", async () => {
    prisma.project.updateMany.mockResolvedValue({ count: 0 });

    await expect(projects.rename("gone", "Anything")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("reports a delete that matched nothing", async () => {
    prisma.project.deleteMany.mockResolvedValue({ count: 0 });

    await expect(projects.remove("gone")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

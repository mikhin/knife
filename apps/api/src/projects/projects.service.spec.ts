import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "@/db/prisma.service";
import { ProjectsService } from "@/projects/projects.service";
import type { Project as ProjectRecord, User } from "@/generated/prisma/client";

type Args = Record<string, unknown>;
type WithOwner = ProjectRecord & { owner: { email: string } };

const prisma = {
  project: {
    create: vi.fn<(args: Args) => Promise<WithOwner>>(),
    delete: vi.fn<(args: Args) => Promise<WithOwner>>(),
    findFirst: vi.fn<(args: Args) => Promise<null | WithOwner>>(),
    findMany: vi.fn<(args: Args) => Promise<WithOwner[]>>(),
    update: vi.fn<(args: Args) => Promise<WithOwner>>(),
  },
  projectAccess: {
    deleteMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
    findMany: vi.fn<(args: Args) => Promise<Array<Args>>>(),
    upsert:
      vi.fn<(args: Args) => Promise<{ createdAt: Date; email: string }>>(),
  },
};

const OWNER: User = {
  createdAt: new Date("2026-08-21T10:00:00.000Z"),
  email: "owner@knife.test",
  googleSub: "owner-sub",
  id: "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f",
};

const GUEST: User = {
  createdAt: new Date("2026-08-21T10:00:00.000Z"),
  email: "guest@knife.test",
  googleSub: "guest-sub",
  id: "1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
};

const record = (name: string, ownerId = OWNER.id): WithOwner =>
  ({
    createdAt: new Date("2026-08-21T10:00:00.000Z"),
    id: "universe",
    name,
    owner: { email: OWNER.email },
    ownerId,
  }) as WithOwner;

describe("ProjectsService", () => {
  let projects: ProjectsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.project.findFirst.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    projects = moduleRef.get(ProjectsService);
  });

  describe("what a person can see", () => {
    /**
     * The whole point of the model: a list is never "every project there is",
     * it is what this person owns plus what they were let into by name.
     */
    it("asks only for projects owned or shared with the asker", async () => {
      prisma.project.findMany.mockResolvedValue([]);

      await projects.list(GUEST);

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { ownerId: GUEST.id },
              { access: { some: { email: GUEST.email } } },
            ],
          },
        }),
      );
    });

    it("marks somebody else's project as not mine and names its owner", async () => {
      prisma.project.findMany.mockResolvedValue([record("Handbook")]);

      await expect(projects.list(GUEST)).resolves.toEqual([
        {
          createdAt: "2026-08-21T10:00:00.000Z",
          id: "universe",
          mine: false,
          name: "Handbook",
          owner: "owner@knife.test",
        },
      ]);
    });

    it("says there is no such project when it belongs to a stranger", async () => {
      await expect(projects.get(GUEST, "universe")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("what only the owner may do", () => {
    it("refuses a rename by a guest, without pretending the project is gone", async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(record("Handbook"));

      await expect(
        projects.rename(GUEST, "universe", "Something else"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it("refuses a delete by a guest", async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(record("Handbook"));

      await expect(projects.remove(GUEST, "universe")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });

    it("hides a stranger's project behind the same answer as a missing one", async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(projects.remove(GUEST, "universe")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("renames a project of its owner", async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce(record("Handbook"))
        .mockResolvedValueOnce(null)
        .mockResolvedValue(record("Night audit"));
      prisma.project.update.mockResolvedValue(record("Night audit"));

      await expect(
        projects.rename(OWNER, "universe", "  Night audit  "),
      ).resolves.toMatchObject({ mine: true, name: "Night audit" });
      expect(prisma.project.update).toHaveBeenCalledWith({
        data: { name: "Night audit" },
        where: { id: "universe" },
      });
    });

    it("refuses a name the owner already used", async () => {
      prisma.project.findFirst.mockResolvedValue(record("Handbook"));

      await expect(projects.create(OWNER, "Handbook")).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("guests", () => {
    it("invites by address, lowercased, and says nothing about accounts", async () => {
      prisma.project.findFirst.mockResolvedValue(record("Handbook"));
      prisma.projectAccess.upsert.mockResolvedValue({
        createdAt: new Date("2026-08-24T10:00:00.000Z"),
        email: "guest@knife.test",
      });

      await expect(
        projects.invite(OWNER, "universe", "  GUEST@knife.test "),
      ).resolves.toEqual({
        email: "guest@knife.test",
        since: "2026-08-24T10:00:00.000Z",
      });
    });

    it("refuses to invite the owner into their own project", async () => {
      prisma.project.findFirst.mockResolvedValue(record("Handbook"));

      await expect(
        projects.invite(OWNER, "universe", OWNER.email),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("refuses to let a guest invite anybody", async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(record("Handbook"));

      await expect(
        projects.invite(GUEST, "universe", "third@knife.test"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.projectAccess.upsert).not.toHaveBeenCalled();
    });

    it("reports a revoke that matched nobody", async () => {
      prisma.project.findFirst.mockResolvedValue(record("Handbook"));
      prisma.projectAccess.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        projects.revoke(OWNER, "universe", "nobody@knife.test"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

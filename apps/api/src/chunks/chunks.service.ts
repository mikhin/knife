import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import { ProjectsService } from "@/projects/projects.service";
import type { Chunk as ChunkRecord, User } from "@/generated/prisma/client";
import type { Chunk } from "@knife/contract";

export type UniverseSurvey = {
  count: number;
  /** ISO date of the newest chunk, empty when the universe holds none. */
  newest: string;
};

const toView = (chunk: ChunkRecord): Chunk => ({
  createdAt: chunk.createdAt.toISOString(),
  id: chunk.id,
  projectId: chunk.projectId,
  text: chunk.text,
});

@Injectable()
export class ChunksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async listByProject(viewer: User, projectId: string): Promise<Chunk[]> {
    await this.assertProjectExists(viewer, projectId);
    const chunks = await this.prisma.chunk.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { projectId },
    });
    return chunks.map(toView);
  }

  async create(viewer: User, projectId: string, text: string): Promise<Chunk> {
    const [created] = await this.createMany(viewer, projectId, [text]);
    if (!created) {
      throw new BadRequestException("A chunk needs text");
    }
    return created;
  }

  async createMany(
    viewer: User,
    projectId: string,
    texts: string[],
  ): Promise<Chunk[]> {
    await this.assertProjectExists(viewer, projectId);
    const cleaned = texts.map((text) => text.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return [];
    }

    const chunks = await this.prisma.chunk.createManyAndReturn({
      data: cleaned.map((text) => ({ projectId, text })),
    });
    return chunks.map(toView);
  }

  /**
   * How the universe stands, without reading it: how many chunks and when the
   * last one arrived. A caller that holds a calculation over tens of thousands
   * of chunks asks this before every answer to learn whether anything moved,
   * and downloading the universe to find out that nothing did would cost more
   * than the answer.
   */
  async survey(viewer: User, projectId: string): Promise<UniverseSurvey> {
    await this.assertProjectExists(viewer, projectId);
    const [count, newest] = await Promise.all([
      this.prisma.chunk.count({ where: { projectId } }),
      this.prisma.chunk.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
        where: { projectId },
      }),
    ]);

    return { count, newest: newest?.createdAt.toISOString() ?? "" };
  }

  /**
   * Scoped to the project the caller believes the chunk belongs to. Deletion
   * has no undo, so a stale screen must fail rather than take a chunk out of
   * a universe nobody was looking at.
   *
   * What went is read before it goes and handed back: an id alone would say
   * a deletion happened without saying what is now missing, and there is
   * nowhere left to look it up afterwards.
   */
  async remove(viewer: User, projectId: string, id: string): Promise<Chunk> {
    await this.assertProjectExists(viewer, projectId);
    const doomed = await this.prisma.chunk.findFirst({
      where: { id, projectId },
    });
    const deleted = await this.prisma.chunk.deleteMany({
      where: { id, projectId },
    });
    if (!doomed || deleted.count === 0) {
      throw new NotFoundException("No such chunk in this project");
    }
    return toView(doomed);
  }

  /** Owner or guest: inside a universe the two do the same work. */
  private async assertProjectExists(
    viewer: User,
    projectId: string,
  ): Promise<void> {
    await this.projects.assertReachable(viewer, projectId);
  }
}

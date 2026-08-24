import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { Chunk as ChunkRecord } from "@/generated/prisma/client";
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
  constructor(private readonly prisma: PrismaService) {}

  async listByProject(
    organizationId: string,
    projectId: string,
  ): Promise<Chunk[]> {
    await this.assertProjectExists(organizationId, projectId);
    const chunks = await this.prisma.chunk.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { projectId },
    });
    return chunks.map(toView);
  }

  async create(
    organizationId: string,
    projectId: string,
    text: string,
  ): Promise<Chunk> {
    const [created] = await this.createMany(organizationId, projectId, [text]);
    if (!created) {
      throw new BadRequestException("A chunk needs text");
    }
    return created;
  }

  async createMany(
    organizationId: string,
    projectId: string,
    texts: string[],
  ): Promise<Chunk[]> {
    await this.assertProjectExists(organizationId, projectId);
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
  async survey(
    organizationId: string,
    projectId: string,
  ): Promise<UniverseSurvey> {
    await this.assertProjectExists(organizationId, projectId);
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
   */
  async remove(
    organizationId: string,
    projectId: string,
    id: string,
  ): Promise<void> {
    await this.assertProjectExists(organizationId, projectId);
    const deleted = await this.prisma.chunk.deleteMany({
      where: { id, projectId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException("No such chunk in this project");
    }
  }

  private async assertProjectExists(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      select: { id: true },
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
  }
}

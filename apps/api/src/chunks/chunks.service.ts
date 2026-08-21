import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { Chunk as ChunkRecord } from "@/generated/prisma/client";
import type { Chunk } from "@knife/contract";

const toView = (chunk: ChunkRecord): Chunk => ({
  createdAt: chunk.createdAt.toISOString(),
  id: chunk.id,
  projectId: chunk.projectId,
  text: chunk.text,
});

@Injectable()
export class ChunksService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProject(projectId: string): Promise<Chunk[]> {
    await this.assertProjectExists(projectId);
    const chunks = await this.prisma.chunk.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { projectId },
    });
    return chunks.map(toView);
  }

  async create(projectId: string, text: string): Promise<Chunk> {
    const [created] = await this.createMany(projectId, [text]);
    if (!created) {
      throw new BadRequestException("A chunk needs text");
    }
    return created;
  }

  async createMany(projectId: string, texts: string[]): Promise<Chunk[]> {
    await this.assertProjectExists(projectId);
    const cleaned = texts.map((text) => text.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return [];
    }

    const chunks = await this.prisma.chunk.createManyAndReturn({
      data: cleaned.map((text) => ({ projectId, text })),
    });
    return chunks.map(toView);
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      select: { id: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
  }
}

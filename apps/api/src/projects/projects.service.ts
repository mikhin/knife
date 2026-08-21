import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { Project as ProjectRecord } from "@/generated/prisma/client";
import type { Project } from "@knife/contract";

type ProjectWithCount = ProjectRecord & {
  _count: { chunks: number };
};

const toView = (project: ProjectWithCount): Project => ({
  chunkCount: project._count.chunks,
  createdAt: project.createdAt.toISOString(),
  id: project.id,
  name: project.name,
});

const WITH_COUNT = { _count: { select: { chunks: true } } } as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      include: WITH_COUNT,
      orderBy: { createdAt: "desc" },
    });
    return projects.map(toView);
  }

  async create(name: string): Promise<Project> {
    const trimmed = name.trim();
    const taken = await this.prisma.project.findUnique({
      where: { name: trimmed },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    const project = await this.prisma.project.create({
      data: { name: trimmed },
      include: WITH_COUNT,
    });
    return toView(project);
  }

  async get(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      include: WITH_COUNT,
      where: { id },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
    return toView(project);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.prisma.project.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException("No such project");
    }
  }
}

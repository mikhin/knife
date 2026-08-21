import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { Project as ProjectRecord } from "@/generated/prisma/client";
import type { Project } from "@knife/contract";

const toView = (project: ProjectRecord): Project => ({
  createdAt: project.createdAt.toISOString(),
  id: project.id,
  name: project.name,
});

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
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
    });
    return toView(project);
  }

  async get(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
    return toView(project);
  }

  async rename(id: string, name: string): Promise<Project> {
    const trimmed = name.trim();
    const taken = await this.prisma.project.findFirst({
      where: { id: { not: id }, name: trimmed },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    const renamed = await this.prisma.project.updateMany({
      data: { name: trimmed },
      where: { id },
    });
    if (renamed.count === 0) {
      throw new NotFoundException("No such project");
    }

    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.prisma.project.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException("No such project");
    }
  }
}

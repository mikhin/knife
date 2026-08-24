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

/**
 * Every method takes the team asking. A project is only ever found inside one,
 * so a stray id from another universe reads as "no such project" rather than
 * as a way in.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      where: { organizationId },
    });
    return projects.map(toView);
  }

  async create(organizationId: string, name: string): Promise<Project> {
    const trimmed = name.trim();
    const taken = await this.prisma.project.findFirst({
      where: { name: trimmed, organizationId },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    const project = await this.prisma.project.create({
      data: { name: trimmed, organizationId },
    });
    return toView(project);
  }

  async get(organizationId: string, id: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
    return toView(project);
  }

  async byName(organizationId: string, name: string): Promise<null | Project> {
    const project = await this.prisma.project.findFirst({
      where: { name: name.trim(), organizationId },
    });
    return project ? toView(project) : null;
  }

  async rename(
    organizationId: string,
    id: string,
    name: string,
  ): Promise<Project> {
    const trimmed = name.trim();
    const taken = await this.prisma.project.findFirst({
      where: { id: { not: id }, name: trimmed, organizationId },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    const renamed = await this.prisma.project.updateMany({
      data: { name: trimmed },
      where: { id, organizationId },
    });
    if (renamed.count === 0) {
      throw new NotFoundException("No such project");
    }

    return this.get(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const deleted = await this.prisma.project.deleteMany({
      where: { id, organizationId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException("No such project");
    }
  }
}

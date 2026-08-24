import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { Project as ProjectRecord, User } from "@/generated/prisma/client";
import type { Guest, Project } from "@knife/contract";

type WithOwner = ProjectRecord & { owner: { email: string } };

const toView = (project: WithOwner, viewer: User): Project => ({
  createdAt: project.createdAt.toISOString(),
  id: project.id,
  mine: project.ownerId === viewer.id,
  name: project.name,
  owner: project.owner.email,
});

/**
 * A project belongs to the person who made it. Everybody else sees it only
 * because that person named their address on this one project — being let
 * into a universe says nothing about the others next to it.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(viewer: User): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      include: { owner: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      where: this.reachableBy(viewer),
    });
    return projects.map((project) => toView(project, viewer));
  }

  async create(viewer: User, name: string): Promise<Project> {
    const trimmed = name.trim();
    const taken = await this.prisma.project.findFirst({
      where: { name: trimmed, ownerId: viewer.id },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    const project = await this.prisma.project.create({
      data: { name: trimmed, ownerId: viewer.id },
      include: { owner: { select: { email: true } } },
    });
    return toView(project, viewer);
  }

  async get(viewer: User, id: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      include: { owner: { select: { email: true } } },
      where: { id, ...this.reachableBy(viewer) },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
    return toView(project, viewer);
  }

  async byName(viewer: User, name: string): Promise<null | Project> {
    const project = await this.prisma.project.findFirst({
      include: { owner: { select: { email: true } } },
      where: { name: name.trim(), ...this.reachableBy(viewer) },
    });
    return project ? toView(project, viewer) : null;
  }

  /**
   * Whether this person may work in the universe at all — owner or guest.
   * Answered here so chunks and linters ask the same question this does.
   */
  async assertReachable(viewer: User, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      select: { id: true },
      where: { id: projectId, ...this.reachableBy(viewer) },
    });
    if (!project) {
      throw new NotFoundException("No such project");
    }
  }

  async rename(viewer: User, id: string, name: string): Promise<Project> {
    await this.assertOwned(viewer, id);
    const trimmed = name.trim();

    const taken = await this.prisma.project.findFirst({
      where: { id: { not: id }, name: trimmed, ownerId: viewer.id },
    });
    if (taken) {
      throw new ConflictException(`Project "${trimmed}" already exists`);
    }

    await this.prisma.project.update({
      data: { name: trimmed },
      where: { id },
    });
    return this.get(viewer, id);
  }

  async remove(viewer: User, id: string): Promise<void> {
    await this.assertOwned(viewer, id);
    await this.prisma.project.delete({ where: { id } });
  }

  async guests(viewer: User, projectId: string): Promise<Guest[]> {
    await this.assertOwned(viewer, projectId);
    const access = await this.prisma.projectAccess.findMany({
      orderBy: { createdAt: "asc" },
      where: { projectId },
    });

    return access.map((guest) => ({
      email: guest.email,
      since: guest.createdAt.toISOString(),
    }));
  }

  async invite(viewer: User, projectId: string, email: string): Promise<Guest> {
    await this.assertOwned(viewer, projectId);
    const address = email.trim().toLowerCase();

    if (address === viewer.email) {
      throw new ConflictException("This project is already yours");
    }

    const guest = await this.prisma.projectAccess.upsert({
      create: { email: address, projectId },
      update: {},
      where: { projectId_email: { email: address, projectId } },
    });

    return { email: guest.email, since: guest.createdAt.toISOString() };
  }

  /** Immediate: the guest's next request finds the project gone. */
  async revoke(viewer: User, projectId: string, email: string): Promise<void> {
    await this.assertOwned(viewer, projectId);
    const removed = await this.prisma.projectAccess.deleteMany({
      where: { email: email.trim().toLowerCase(), projectId },
    });
    if (removed.count === 0) {
      throw new NotFoundException("Nobody here by that address");
    }
  }

  /** Owned outright, or reachable as a guest — the two are not the same. */
  private reachableBy(viewer: User): {
    OR: [{ ownerId: string }, { access: { some: { email: string } } }];
  } {
    return {
      OR: [
        { ownerId: viewer.id },
        { access: { some: { email: viewer.email } } },
      ],
    };
  }

  private async assertOwned(viewer: User, id: string): Promise<void> {
    const owned = await this.prisma.project.findFirst({
      select: { id: true },
      where: { id, ownerId: viewer.id },
    });

    if (owned) {
      return;
    }

    /** A guest is told the difference; a stranger is told nothing at all. */
    const reachable = await this.prisma.project.findFirst({
      select: { id: true },
      where: { id, ...this.reachableBy(viewer) },
    });
    if (reachable) {
      throw new ForbiddenException("Only the owner of a project changes it");
    }
    throw new NotFoundException("No such project");
  }
}

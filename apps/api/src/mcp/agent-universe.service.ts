import { Injectable } from "@nestjs/common";
import { UsersService } from "@/auth/users.service";
import { ChunksService } from "@/chunks/chunks.service";
import { UniverseIndexService } from "@/mcp/universe-index.service";
import { ProjectsService } from "@/projects/projects.service";
import type { User } from "@/generated/prisma/client";
import type { Chunk, Project } from "@knife/contract";
import type { UniverseIndex } from "@knife/universe";

/** A person named by the pass and one universe they are allowed to work in. */
export type Reached = {
  project: Project;
  viewer: User;
};

/**
 * Where every tool starts. The person comes from the pass and the project by
 * the name a person says it — an agent that had to carry a uuid around would
 * spend a call learning one, and a miss answers with the names that do exist
 * so the next call is right rather than another guess.
 *
 * Asked in one place because six tools asking it six ways would drift apart
 * one wording at a time, and the drift would only show as an agent being
 * told something different depending on which tool it happened to call.
 */
@Injectable()
export class AgentUniverseService {
  constructor(
    private readonly chunks: ChunksService,
    private readonly projects: ProjectsService,
    private readonly universe: UniverseIndexService,
    private readonly users: UsersService,
  ) {}

  async reach(userId: string, project: string): Promise<Reached> {
    const viewer = await this.person(userId);
    return { project: await this.projectNamed(viewer, project), viewer };
  }

  /** The calculation over a universe, kept alive while nothing in it moves. */
  index(reached: Reached): Promise<UniverseIndex> {
    return this.universe.of(reached.viewer, reached.project.id);
  }

  /**
   * The universe as plain chunks, for the tools that want the text rather
   * than the calculation over it — the same read the browser does, so the
   * two doors never page through a universe in two different orders.
   */
  chunksOf(reached: Reached): Promise<Chunk[]> {
    return this.chunks.listByProject(reached.viewer, reached.project.id);
  }

  private async person(userId: string): Promise<User> {
    const viewer = await this.users.byId(userId);
    if (!viewer) {
      throw new Error("The person this pass names is gone");
    }
    return viewer;
  }

  private async projectNamed(viewer: User, name: string): Promise<Project> {
    const wanted = name.trim();
    const found = await this.projects.byName(viewer, wanted);

    if (!found) {
      const projects = await this.projects.list(viewer);
      const known = projects.map((project) => project.name).join(", ");
      throw new Error(
        `No project named "${wanted}". ${known ? `You can reach: ${known}` : "You have no projects yet"}`,
      );
    }

    return found;
  }
}

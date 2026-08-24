import { Injectable } from "@nestjs/common";
import { UsersService } from "@/auth/users.service";
import { renderDuplicates } from "@/mcp/render-duplicates";
import { UniverseIndexService } from "@/mcp/universe-index.service";
import { ProjectsService } from "@/projects/projects.service";
import { findDuplicatePairs, pairsAtLevel, repeatLevel } from "@knife/universe";
import type { User } from "@/generated/prisma/client";
import type { Project } from "@knife/contract";
import type { RepeatLevelId, UniverseIndex } from "@knife/universe";

/** Long enough to judge a batch, short enough to stay readable in one answer. */
export const PAIRS_SHOWN = 20;

@Injectable()
export class FindDuplicatesTool {
  constructor(
    private readonly projects: ProjectsService,
    private readonly universe: UniverseIndexService,
    private readonly users: UsersService,
  ) {}

  async run(
    userId: string,
    project: string,
    level: RepeatLevelId,
    limit: number,
  ): Promise<string> {
    const viewer = await this.person(userId);
    const found = await this.projectNamed(viewer, project);
    const index = await this.universe.of(viewer, found.id);
    const report = findDuplicatePairs(index);
    const chosen = repeatLevel(level);
    const matched = pairsAtLevel(report.pairs, chosen.from);

    return renderDuplicates({
      level: chosen,
      listed: matched.slice(0, limit).map((pair) => ({
        first: { id: pair.firstId, text: textOf(index, pair.firstId) },
        polarityDiffers: pair.polarityDiffers,
        second: { id: pair.secondId, text: textOf(index, pair.secondId) },
        sharedWords: pair.sharedWords,
        similarity: pair.similarity,
      })),
      matched: matched.length,
      project: found.name,
      size: index.size,
      unreachable: report.truncatedPairs,
    });
  }

  /**
   * By name, the way a person says it — an agent that had to carry a uuid
   * around would spend a call learning one. A miss answers with the names
   * that do exist, so the next call is right rather than another guess.
   */
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

const textOf = (index: UniverseIndex, id: string): string =>
  index.byId.get(id)?.text ?? "";

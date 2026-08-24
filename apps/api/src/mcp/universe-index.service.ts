import { Injectable } from "@nestjs/common";
import { ChunksService } from "@/chunks/chunks.service";
import { buildUniverseIndex } from "@knife/universe";
import type { User } from "@/generated/prisma/client";
import type { UniverseIndex } from "@knife/universe";

/**
 * The index an agent asks questions of. It lives in memory and nowhere else,
 * exactly as the one in the browser worker does: a verdict written down would
 * outlive the wording it judged, and a restart is meant to forget everything.
 *
 * One universe is held at a time — an agent works through a project rather
 * than hopping between them, and holding several would keep the largest one
 * alive long after the conversation moved on.
 */
@Injectable()
export class UniverseIndexService {
  private held: undefined | { index: UniverseIndex; mark: string };

  constructor(private readonly chunks: ChunksService) {}

  async of(viewer: User, projectId: string): Promise<UniverseIndex> {
    const survey = await this.chunks.survey(viewer, projectId);
    const mark = `${projectId}:${survey.count}:${survey.newest}`;

    if (this.held?.mark === mark) {
      return this.held.index;
    }

    const chunks = await this.chunks.listByProject(viewer, projectId);
    const index = buildUniverseIndex(chunks);
    this.held = { index, mark };
    return index;
  }
}

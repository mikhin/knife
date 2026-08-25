import { Injectable } from "@nestjs/common";
import { ChunksService } from "@/chunks/chunks.service";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderAdded } from "@/mcp/render-added";
import { chunkSource, detectPastedFormat } from "@knife/universe";
import type { SourceFormat } from "@knife/universe";

/** Enough new ids to work with straight away; the rest are counted. */
export const ADDED_SHOWN = 20;

@Injectable()
export class AddChunksTool {
  constructor(
    private readonly agent: AgentUniverseService,
    private readonly chunks: ChunksService,
  ) {}

  /**
   * The same cut the browser makes, from the same package: text that arrives
   * through an agent has to land as the chunks a person would have got from
   * pasting it, or the two doors would fill one universe with two shapes.
   */
  async run(
    userId: string,
    project: string,
    text: string,
    format: SourceFormat | undefined,
    limit: number,
  ): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const cut = chunkSource(text, format ?? detectPastedFormat(text));
    const added = await this.chunks.createMany(
      reached.viewer,
      reached.project.id,
      cut,
    );

    return renderAdded({
      added: added.length,
      listed: added
        .slice(0, limit)
        .map((chunk) => ({ id: chunk.id, text: chunk.text })),
      project: reached.project.name,
    });
  }
}

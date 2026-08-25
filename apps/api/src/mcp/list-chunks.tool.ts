import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderChunks } from "@/mcp/render-chunks";
import { pageOf } from "@/mcp/render-window";
import type { WindowAsk } from "@/mcp/render-window";

/** One screenful of a universe: enough to judge, short enough to read. */
export const CHUNKS_SHOWN = 50;

@Injectable()
export class ListChunksTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(userId: string, project: string, ask: WindowAsk): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const universe = await this.agent.chunksOf(reached);

    return renderChunks({
      from: ask.from,
      listed: pageOf(universe, ask).map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
      })),
      project: reached.project.name,
      size: universe.length,
    });
  }
}

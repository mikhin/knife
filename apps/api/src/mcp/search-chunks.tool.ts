import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderSearch } from "@/mcp/render-search";
import { searchUniverse } from "@knife/universe";

/** As many hits as a person reads before narrowing the query instead. */
export const HITS_SHOWN = 20;

@Injectable()
export class SearchChunksTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(
    userId: string,
    project: string,
    query: string,
    limit: number,
  ): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
    const hits = searchUniverse(index, query);

    return renderSearch({
      listed: hits.slice(0, limit).map((hit) => ({
        id: hit.chunkId,
        text: index.byId.get(hit.chunkId)?.text ?? "",
      })),
      matched: hits.length,
      project: reached.project.name,
      query,
      size: index.size,
    });
  }
}

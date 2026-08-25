import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderChunkProfile } from "@/mcp/render-chunk-profile";
import { describeChunk } from "@knife/universe";

/** A long chunk would otherwise bury the answer under its own vocabulary. */
export const WORDS_IN_CHUNK = 40;

@Injectable()
export class GetChunkTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(
    userId: string,
    project: string,
    id: string,
    limit: number,
  ): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
    const chunk = index.byId.get(id);

    if (!chunk) {
      return `No chunk ${id} in "${reached.project.name}". Ids come from list_chunks, search_chunks and find_duplicates.`;
    }

    const profile = describeChunk(index, id);

    return renderChunkProfile({
      arrived: chunk.createdAt.slice(0, 10),
      hangs: profile.words.every((word) => word.elsewhere === 0),
      id,
      listed: profile.words.slice(0, limit).map((word) => ({
        elsewhere: word.elsewhere,
        label: word.label,
      })),
      project: reached.project.name,
      text: chunk.text,
      words: profile.words.length,
    });
  }
}

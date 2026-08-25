import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { pageOf } from "@/mcp/render-window";
import { renderWords } from "@/mcp/render-words";
import { listWords } from "@knife/universe";
import type { WindowAsk } from "@/mcp/render-window";

/** Enough of the vocabulary to see what a universe talks about. */
export const WORDS_SHOWN = 50;

@Injectable()
export class ListWordsTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(userId: string, project: string, ask: WindowAsk): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
    const vocabulary = listWords(index);

    return renderWords({
      from: ask.from,
      listed: pageOf(vocabulary, ask),
      project: reached.project.name,
      size: index.size,
      words: vocabulary.length,
    });
  }
}

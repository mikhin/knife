import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderDuplicates } from "@/mcp/render-duplicates";
import { findDuplicatePairs, pairsAtLevel, repeatLevel } from "@knife/universe";
import type { RepeatLevelId, UniverseIndex } from "@knife/universe";

/** Long enough to judge a batch, short enough to stay readable in one answer. */
export const PAIRS_SHOWN = 20;

@Injectable()
export class FindDuplicatesTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(
    userId: string,
    project: string,
    level: RepeatLevelId,
    limit: number,
  ): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
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
      project: reached.project.name,
      size: index.size,
      unreachable: report.truncatedPairs,
    });
  }
}

const textOf = (index: UniverseIndex, id: string): string =>
  index.byId.get(id)?.text ?? "";

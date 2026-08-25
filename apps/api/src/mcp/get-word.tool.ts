import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderWordProfile } from "@/mcp/render-word-profile";
import { describeWord, tokenizeText } from "@knife/universe";
import type { UniverseIndex } from "@knife/universe";

/** Chunks printed under a word before the rest are counted. */
export const OCCURRENCES_SHOWN = 20;

const NEAREST_SHOWN = 5;

/**
 * A miss answers with the words that do exist, the same way a wrong project
 * name does: an agent that only learns "no" spends its next call guessing.
 */
const nearest = (index: UniverseIndex, word: string): string => {
  const fragment = word.toLowerCase();
  const near = [...index.surfaceForms]
    .filter(
      ([stem, label]) => stem.includes(fragment) || label.includes(fragment),
    )
    .slice(0, NEAREST_SHOWN)
    .map(([, label]) => label);

  return near.length > 0 ? ` Nearest: ${near.join(", ")}.` : "";
};

@Injectable()
export class GetWordTool {
  constructor(private readonly agent: AgentUniverseService) {}

  /**
   * The word arrives however a person would write it and is cut to a stem by
   * the same tokenizer the index was built with: "refunds" has to reach the
   * word the universe actually holds, or the two doors disagree about what a
   * word is.
   */
  async run(
    userId: string,
    project: string,
    word: string,
    limit: number,
  ): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
    const tokens = tokenizeText(word);
    const wanted = tokens.find((token) => !token.isStop);

    if (tokens.length === 0) {
      return `"${word}" is not a word this universe could hold.`;
    }
    if (!wanted) {
      return `"${word}" is a service word: it carries no meaning of its own and is not indexed.`;
    }
    if (!index.postings.has(wanted.stem)) {
      return `No word like "${word}" in "${reached.project.name}".${nearest(index, word)}`;
    }

    const profile = describeWord(index, wanted.stem);

    return renderWordProfile({
      companions: profile.companions.map((companion) => ({
        chunkCount: companion.chunkCount,
        label: companion.label,
      })),
      label: profile.label,
      listed: profile.occurrences.slice(0, limit).map((occurrence) => ({
        id: occurrence.chunkId,
        text: index.byId.get(occurrence.chunkId)?.text ?? "",
      })),
      occurrences: profile.occurrences.length,
      project: reached.project.name,
      stem: profile.stem,
    });
  }
}

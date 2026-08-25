import { Injectable } from "@nestjs/common";
import { LintService } from "@/lint/lint.service";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderLint } from "@/mcp/render-lint";
import type { LintedChunk } from "@/mcp/render-lint";
import type { Chunk, LintFinding } from "@knife/contract";

/** The most chunks one request to the linters carries, as the API allows. */
const BATCH = 500;

/** Chunks printed with what was written on them; the rest are counted. */
export const FLAGGED_SHOWN = 20;

type Pass = {
  available: boolean;
  checked: number;
  findings: LintFinding[];
  reason?: string;
  tools: string[];
};

const noteOf = (finding: LintFinding) => ({
  message: finding.message,
  rule: finding.rule,
  severity: finding.severity,
  tool: finding.tool,
});

/**
 * Remarks gathered under the chunk they were written on, in the order the
 * chunks arrived: an agent reads a sentence and everything said about it at
 * once, rather than meeting the same sentence four times down a flat list.
 */
const byChunk = (chunks: Chunk[], findings: LintFinding[]): LintedChunk[] => {
  const notes = new Map<string, LintedChunk["notes"]>();

  for (const finding of findings) {
    const written = notes.get(finding.chunkId) ?? [];
    written.push(noteOf(finding));
    notes.set(finding.chunkId, written);
  }

  return chunks
    .filter((chunk) => notes.has(chunk.id))
    .map((chunk) => ({
      id: chunk.id,
      notes: notes.get(chunk.id) ?? [],
      text: chunk.text,
    }));
};

@Injectable()
export class LintUniverseTool {
  constructor(
    private readonly agent: AgentUniverseService,
    private readonly lint: LintService,
  ) {}

  async run(userId: string, project: string, limit: number): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const universe = await this.agent.chunksOf(reached);
    const pass = await this.readAll(universe);
    const flagged = byChunk(universe, pass.findings);

    return renderLint({
      available: pass.available,
      checked: pass.checked,
      flagged: flagged.length,
      listed: flagged.slice(0, limit),
      project: reached.project.name,
      remarks: pass.findings.length,
      size: universe.length,
      tools: pass.tools,
      ...(pass.reason === undefined ? {} : { reason: pass.reason }),
    });
  }

  /**
   * A pass reads the whole universe, one batch per request — the point is to
   * stay under the request limit, not to open a connection per thousand
   * chunks. A batch that comes back offline stops the pass: the rest would
   * fail the same way, and the answer says how far it got.
   */
  private async readAll(universe: Chunk[]): Promise<Pass> {
    const findings: LintFinding[] = [];
    const tools = new Set<string>();
    let available = false;
    let checked = 0;
    let reason: string | undefined;

    for (let from = 0; from < universe.length; from += BATCH) {
      // oxlint-disable-next-line no-await-in-loop
      const batch = await this.lint.lint(
        universe
          .slice(from, from + BATCH)
          .map((chunk) => ({ id: chunk.id, text: chunk.text })),
      );

      available ||= batch.available;
      reason = batch.reason;
      if (!batch.available) {
        break;
      }

      findings.push(...batch.findings);
      for (const tool of batch.tools) {
        tools.add(tool);
      }
      checked = Math.min(from + BATCH, universe.length);
    }

    return {
      available,
      checked,
      findings,
      tools: [...tools],
      ...(reason === undefined ? {} : { reason }),
    };
  }
}

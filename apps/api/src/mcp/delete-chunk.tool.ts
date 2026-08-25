import { Injectable } from "@nestjs/common";
import { ChunksService } from "@/chunks/chunks.service";
import { AgentUniverseService } from "@/mcp/agent-universe.service";

/**
 * The one tool that takes something away, and the only one behind the second
 * grant. It removes a single chunk per call on purpose: a repeat is judged
 * one pair at a time, and a list of ids would let a wrong id travel with
 * nineteen right ones into a deletion nobody can undo.
 */
@Injectable()
export class DeleteChunkTool {
  constructor(
    private readonly agent: AgentUniverseService,
    private readonly chunks: ChunksService,
  ) {}

  async run(userId: string, project: string, id: string): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const gone = await this.chunks.remove(
      reached.viewer,
      reached.project.id,
      id,
    );

    return [
      `Deleted from "${reached.project.name}". This cannot be undone.`,
      `${gone.id}  ${gone.text}`,
    ].join("\n");
  }
}

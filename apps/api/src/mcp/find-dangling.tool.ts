import { Injectable } from "@nestjs/common";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { renderDangling } from "@/mcp/render-dangling";
import { findDanglingChunks } from "@knife/universe";

/** As many as a person would look through in one sitting before deciding. */
export const HANGING_SHOWN = 20;

@Injectable()
export class FindDanglingTool {
  constructor(private readonly agent: AgentUniverseService) {}

  async run(userId: string, project: string, limit: number): Promise<string> {
    const reached = await this.agent.reach(userId, project);
    const index = await this.agent.index(reached);
    const hanging = findDanglingChunks(index);

    return renderDangling({
      hanging: hanging.length,
      listed: hanging.slice(0, limit).map((id) => ({
        id,
        text: index.byId.get(id)?.text ?? "",
      })),
      project: reached.project.name,
      size: index.size,
    });
  }
}

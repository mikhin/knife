import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FindDuplicatesTool, PAIRS_SHOWN } from "@/mcp/find-duplicates.tool";
import { READ_SCOPE } from "@/mcp/oauth/knife-scopes";
import { REPEAT_LEVELS } from "@knife/universe";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RepeatLevelId } from "@knife/universe";

const LEVEL_IDS = REPEAT_LEVELS.map((level) => level.id) as [
  RepeatLevelId,
  ...RepeatLevelId[],
];

const LEVELS_SAID = REPEAT_LEVELS.map(
  (level) => `${level.id} — ${level.label}, similarity ${level.from} and up`,
).join("; ");

/**
 * Which team is asking comes from the pass the agent carried in, never from
 * the call itself. An agent that could name its own team would only need to
 * guess one to read somebody else's universe.
 */
const teamOf = (auth: AuthInfo | undefined, needs: string): string => {
  const organizationId = auth?.extra?.["organizationId"];

  if (typeof organizationId !== "string") {
    throw new Error("This pass names no team");
  }
  if (!auth?.scopes.includes(needs)) {
    throw new Error(`This pass does not allow ${needs}`);
  }

  return organizationId;
};

/**
 * A server per request. Nothing here remembers a caller between calls, so a
 * machine can be stopped and replaced mid-conversation without an agent
 * noticing; what is expensive to compute is held by UniverseIndexService,
 * which outlives the request but never the process.
 */
@Injectable()
export class McpService {
  constructor(private readonly duplicates: FindDuplicatesTool) {}

  create(): McpServer {
    const server = new McpServer({ name: "knife", version: "0.0.0" });

    server.registerTool(
      "find_duplicates",
      {
        description:
          "Pairs of chunks in a project's universe that say the same thing, strongest first. " +
          `Levels: ${LEVELS_SAID}. ` +
          "A pair marked as a disagreement is not a repeat: one of the two denies the other, " +
          "and deleting either would silently flip a rule.",
        inputSchema: {
          level: z
            .enum(LEVEL_IDS)
            .default("almost")
            .describe("How alike two chunks must be to count as a repeat"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(PAIRS_SHOWN)
            .describe(
              "How many pairs to list; the rest are counted, not hidden",
            ),
          project: z
            .string()
            .min(1)
            .describe("Project name, as a person says it"),
        },
        title: "Find repeats in a universe",
      },
      async ({ level, limit, project }, extra) => ({
        content: [
          {
            text: await this.duplicates.run(
              teamOf(extra.authInfo, READ_SCOPE),
              project,
              level,
              limit,
            ),
            type: "text" as const,
          },
        ],
      }),
    );

    return server;
  }
}

import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { AuthModule } from "@/auth/auth.module";
import { ChunksModule } from "@/chunks/chunks.module";
import { LintModule } from "@/lint/lint.module";
import { AddChunksTool } from "@/mcp/add-chunks.tool";
import { AgentUniverseService } from "@/mcp/agent-universe.service";
import { DeleteChunkTool } from "@/mcp/delete-chunk.tool";
import { FindDanglingTool } from "@/mcp/find-dangling.tool";
import { FindDuplicatesTool } from "@/mcp/find-duplicates.tool";
import { GetChunkTool } from "@/mcp/get-chunk.tool";
import { GetWordTool } from "@/mcp/get-word.tool";
import { LintUniverseTool } from "@/mcp/lint-universe.tool";
import { ListChunksTool } from "@/mcp/list-chunks.tool";
import { ListWordsTool } from "@/mcp/list-words.tool";
import { SearchChunksTool } from "@/mcp/search-chunks.tool";
import { KnifeOAuthProvider } from "@/mcp/oauth/knife-oauth.provider";
import { ConsentController } from "@/mcp/oauth/consent.controller";
import { OAuthClientsStore } from "@/mcp/oauth/oauth-clients.store";
import { McpController } from "@/mcp/mcp.controller";
import { McpService } from "@/mcp/mcp.service";
import { UniverseIndexService } from "@/mcp/universe-index.service";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  controllers: [ConsentController, McpController],
  exports: [KnifeOAuthProvider],
  imports: [AuthModule, ChunksModule, LintModule, ProjectsModule],
  providers: [
    AddChunksTool,
    AgentUniverseService,
    DeleteChunkTool,
    FindDanglingTool,
    FindDuplicatesTool,
    GetChunkTool,
    GetWordTool,
    KnifeOAuthProvider,
    LintUniverseTool,
    ListChunksTool,
    ListWordsTool,
    McpService,
    OAuthClientsStore,
    SearchChunksTool,
    UniverseIndexService,
  ],
})
export class McpModule implements NestModule {
  constructor(
    private readonly config: ConfigService,
    private readonly oauth: KnifeOAuthProvider,
  ) {}

  /**
   * The door checks the pass before anything else happens behind it, and a
   * caller without one is told where to get it rather than simply refused:
   * that pointer is what lets an agent walk a person through signing in.
   *
   * What the pass allows is not asked here, deliberately. Reading and
   * deleting are separate grants, so a pass carrying only the second one is
   * a pass this server issued and must let in — every tool asks for the
   * scope it needs, and answers for it by name.
   */
  configure(consumer: MiddlewareConsumer): void {
    const publicUrl = this.config
      .get<string>("PUBLIC_URL", "http://localhost:3000")
      .replace(/\/$/, "");

    consumer
      .apply(
        requireBearerAuth({
          resourceMetadataUrl: `${publicUrl}/.well-known/oauth-protected-resource/mcp`,
          verifier: this.oauth,
        }),
      )
      .forRoutes(McpController);
  }
}

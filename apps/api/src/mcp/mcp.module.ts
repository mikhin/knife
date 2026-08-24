import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { AuthModule } from "@/auth/auth.module";
import { ChunksModule } from "@/chunks/chunks.module";
import { FindDuplicatesTool } from "@/mcp/find-duplicates.tool";
import { KnifeOAuthProvider } from "@/mcp/oauth/knife-oauth.provider";
import { READ_SCOPE } from "@/mcp/oauth/knife-scopes";
import { ConsentController } from "@/mcp/oauth/consent.controller";
import { OAuthClientsStore } from "@/mcp/oauth/oauth-clients.store";
import { McpController } from "@/mcp/mcp.controller";
import { McpService } from "@/mcp/mcp.service";
import { UniverseIndexService } from "@/mcp/universe-index.service";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  controllers: [ConsentController, McpController],
  exports: [KnifeOAuthProvider],
  imports: [AuthModule, ChunksModule, ProjectsModule],
  providers: [
    FindDuplicatesTool,
    KnifeOAuthProvider,
    McpService,
    OAuthClientsStore,
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
   */
  configure(consumer: MiddlewareConsumer): void {
    const publicUrl = this.config
      .get<string>("PUBLIC_URL", "http://localhost:3000")
      .replace(/\/$/, "");

    consumer
      .apply(
        requireBearerAuth({
          requiredScopes: [READ_SCOPE],
          resourceMetadataUrl: `${publicUrl}/.well-known/oauth-protected-resource/mcp`,
          verifier: this.oauth,
        }),
      )
      .forRoutes(McpController);
  }
}

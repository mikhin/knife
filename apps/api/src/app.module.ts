import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/auth/auth.module";
import { ChunksModule } from "@/chunks/chunks.module";
import { PrismaModule } from "@/db/prisma.module";
import { LintModule } from "@/lint/lint.module";
import { McpModule } from "@/mcp/mcp.module";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    ChunksModule,
    LintModule,
    McpModule,
  ],
})
export class AppModule {}

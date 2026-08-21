import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChunksModule } from "@/chunks/chunks.module";
import { PrismaModule } from "@/db/prisma.module";
import { LintModule } from "@/lint/lint.module";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    PrismaModule,
    ProjectsModule,
    ChunksModule,
    LintModule,
  ],
})
export class AppModule {}

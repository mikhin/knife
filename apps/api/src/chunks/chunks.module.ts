import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { ProjectsModule } from "@/projects/projects.module";
import { ChunksController } from "@/chunks/chunks.controller";
import { ChunksService } from "@/chunks/chunks.service";

@Module({
  controllers: [ChunksController],
  exports: [ChunksService],
  imports: [AuthModule, ProjectsModule],
  providers: [ChunksService],
})
export class ChunksModule {}

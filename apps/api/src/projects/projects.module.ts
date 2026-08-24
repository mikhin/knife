import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { ProjectsController } from "@/projects/projects.controller";
import { ProjectsService } from "@/projects/projects.service";

@Module({
  controllers: [ProjectsController],
  exports: [ProjectsService],
  imports: [AuthModule],
  providers: [ProjectsService],
})
export class ProjectsModule {}

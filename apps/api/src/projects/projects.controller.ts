import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "@/auth/session.guard";
import { SignedIn } from "@/auth/signed-in.decorator";
import { CreateProjectDto } from "@/projects/create-project.dto";
import { ProjectsService } from "@/projects/projects.service";
import type { Member } from "@/generated/prisma/client";
import type { Project } from "@knife/contract";

@Controller("api/projects")
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@SignedIn() member: Member): Promise<Project[]> {
    return this.projects.list(member.organizationId);
  }

  @Post()
  create(
    @SignedIn() member: Member,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.create(member.organizationId, dto.name);
  }

  @Get(":id")
  get(
    @SignedIn() member: Member,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Project> {
    return this.projects.get(member.organizationId, id);
  }

  /** A project is a folder, so it renames like one. Its chunks do not. */
  @Patch(":id")
  rename(
    @SignedIn() member: Member,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.rename(member.organizationId, id, dto.name);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(
    @SignedIn() member: Member,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.projects.remove(member.organizationId, id);
  }
}

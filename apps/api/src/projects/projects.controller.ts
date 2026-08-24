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
import { InviteDto } from "@/projects/invite.dto";
import { ProjectsService } from "@/projects/projects.service";
import type { User } from "@/generated/prisma/client";
import type { Guest, Project } from "@knife/contract";

@Controller("api/projects")
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@SignedIn() viewer: User): Promise<Project[]> {
    return this.projects.list(viewer);
  }

  @Post()
  create(
    @SignedIn() viewer: User,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.create(viewer, dto.name);
  }

  @Get(":id")
  get(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Project> {
    return this.projects.get(viewer, id);
  }

  /** A project is a folder, so it renames like one. Its chunks do not. */
  @Patch(":id")
  rename(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.rename(viewer, id, dto.name);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.projects.remove(viewer, id);
  }

  @Get(":id/guests")
  guests(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Guest[]> {
    return this.projects.guests(viewer, id);
  }

  @Post(":id/guests")
  invite(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InviteDto,
  ): Promise<Guest> {
    return this.projects.invite(viewer, id, dto.email);
  }

  /**
   * The address travels in the body rather than the path: an email in a URL
   * ends up in every log and proxy between here and the browser.
   */
  @Delete(":id/guests")
  @HttpCode(204)
  revoke(
    @SignedIn() viewer: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InviteDto,
  ): Promise<void> {
    return this.projects.revoke(viewer, id, dto.email);
  }
}

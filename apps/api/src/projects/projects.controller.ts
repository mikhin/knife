import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { CreateProjectDto } from "@/projects/create-project.dto";
import { ProjectsService } from "@/projects/projects.service";
import type { Project } from "@knife/contract";

@Controller("api/projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(): Promise<Project[]> {
    return this.projects.list();
  }

  @Post()
  create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.projects.create(dto.name);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<Project> {
    return this.projects.get(id);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.projects.remove(id);
  }
}

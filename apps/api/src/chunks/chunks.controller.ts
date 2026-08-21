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
import { ChunksService } from "@/chunks/chunks.service";
import { CreateChunkDto } from "@/chunks/create-chunk.dto";
import { CreateChunksDto } from "@/chunks/create-chunks.dto";
import type { Chunk } from "@knife/contract";

/**
 * No PATCH and no PUT, deliberately: a chunk is deleted and rewritten rather
 * than edited, so a wording that was reviewed can never silently become
 * another one under the same id.
 */
@Controller("api")
export class ChunksController {
  constructor(private readonly chunks: ChunksService) {}

  @Get("projects/:projectId/chunks")
  list(@Param("projectId", ParseUUIDPipe) projectId: string): Promise<Chunk[]> {
    return this.chunks.listByProject(projectId);
  }

  @Post("projects/:projectId/chunks")
  create(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChunkDto,
  ): Promise<Chunk> {
    return this.chunks.create(projectId, dto.text);
  }

  @Post("projects/:projectId/chunks/bulk")
  createMany(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChunksDto,
  ): Promise<Chunk[]> {
    return this.chunks.createMany(projectId, dto.texts);
  }

  @Delete("chunks/:id")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.chunks.remove(id);
  }
}

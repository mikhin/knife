import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ChunksService } from "@/chunks/chunks.service";
import { CreateChunkDto } from "@/chunks/create-chunk.dto";
import { CreateChunksDto } from "@/chunks/create-chunks.dto";
import type { Chunk } from "@knife/contract";

/**
 * A chunk is written once and never touched again: no PATCH, no PUT, no
 * DELETE. A wording that was reviewed cannot silently become another one, and
 * nothing disappears from the universe behind anyone's back.
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
}

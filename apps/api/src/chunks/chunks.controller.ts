import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "@/auth/session.guard";
import { SignedIn } from "@/auth/signed-in.decorator";
import { ChunksService } from "@/chunks/chunks.service";
import { CreateChunkDto } from "@/chunks/create-chunk.dto";
import { CreateChunksDto } from "@/chunks/create-chunks.dto";
import type { Member } from "@/generated/prisma/client";
import type { Chunk } from "@knife/contract";

/**
 * No PATCH and no PUT, deliberately: a chunk is deleted and rewritten rather
 * than edited, so a wording that was reviewed can never silently become
 * another one under the same id.
 */
@Controller("api")
@UseGuards(SessionGuard)
export class ChunksController {
  constructor(private readonly chunks: ChunksService) {}

  @Get("projects/:projectId/chunks")
  list(
    @SignedIn() member: Member,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ): Promise<Chunk[]> {
    return this.chunks.listByProject(member.organizationId, projectId);
  }

  @Post("projects/:projectId/chunks")
  create(
    @SignedIn() member: Member,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChunkDto,
  ): Promise<Chunk> {
    return this.chunks.create(member.organizationId, projectId, dto.text);
  }

  @Post("projects/:projectId/chunks/bulk")
  createMany(
    @SignedIn() member: Member,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChunksDto,
  ): Promise<Chunk[]> {
    return this.chunks.createMany(member.organizationId, projectId, dto.texts);
  }

  @Delete("projects/:projectId/chunks/:id")
  @HttpCode(204)
  remove(
    @SignedIn() member: Member,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.chunks.remove(member.organizationId, projectId, id);
  }
}

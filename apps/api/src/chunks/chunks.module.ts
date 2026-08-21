import { Module } from "@nestjs/common";
import { ChunksController } from "@/chunks/chunks.controller";
import { ChunksService } from "@/chunks/chunks.service";

@Module({
  controllers: [ChunksController],
  providers: [ChunksService],
})
export class ChunksModule {}

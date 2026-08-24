import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { ChunksController } from "@/chunks/chunks.controller";
import { ChunksService } from "@/chunks/chunks.service";

@Module({
  controllers: [ChunksController],
  exports: [ChunksService],
  imports: [AuthModule],
  providers: [ChunksService],
})
export class ChunksModule {}

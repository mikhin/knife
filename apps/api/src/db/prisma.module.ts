import { Global, Module } from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";

@Global()
@Module({
  exports: [PrismaService],
  providers: [PrismaService],
})
export class PrismaModule {}

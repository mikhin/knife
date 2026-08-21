import { Module } from "@nestjs/common";
import { LintController } from "@/lint/lint.controller";
import { LintService } from "@/lint/lint.service";

@Module({
  controllers: [LintController],
  providers: [LintService],
})
export class LintModule {}

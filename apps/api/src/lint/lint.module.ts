import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { LintController } from "@/lint/lint.controller";
import { LintService } from "@/lint/lint.service";

@Module({
  controllers: [LintController],
  imports: [AuthModule],
  providers: [LintService],
})
export class LintModule {}

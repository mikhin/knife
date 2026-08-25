import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { LintController } from "@/lint/lint.controller";
import { LintService } from "@/lint/lint.service";

/** The linters answer a screen and an agent alike, so the service leaves the
 * module while the controller behind the session stays in it. */
@Module({
  controllers: [LintController],
  exports: [LintService],
  imports: [AuthModule],
  providers: [LintService],
})
export class LintModule {}

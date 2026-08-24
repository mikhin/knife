import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "@/auth/session.guard";
import { LintRequestDto } from "@/lint/lint-request.dto";
import { LintService } from "@/lint/lint.service";
import type { LintHealth, LintReport } from "@knife/contract";

@Controller("api/lint")
@UseGuards(SessionGuard)
export class LintController {
  constructor(private readonly lint: LintService) {}

  @Get("health")
  health(): Promise<LintHealth> {
    return this.lint.health();
  }

  @Post()
  @HttpCode(200)
  run(@Body() dto: LintRequestDto): Promise<LintReport> {
    return this.lint.lint(dto.items);
  }
}

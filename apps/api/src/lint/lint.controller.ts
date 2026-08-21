import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { LintRequestDto } from "@/lint/lint-request.dto";
import { LintService } from "@/lint/lint.service";
import type { LintHealth, LintReport } from "@knife/contract";

@Controller("api/lint")
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

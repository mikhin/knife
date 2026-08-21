import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LintItemDto } from "@/lint/lint-request.dto";
import type { LintHealth, LintReport } from "@knife/contract";

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name === "TimeoutError" ? "linters timed out" : error.message;
  }
  return String(error);
};

/**
 * Vale, textlint and proselint run in their own container. Nothing here reads
 * or stores what they say — the findings pass straight through to the screen.
 */
@Injectable()
export class LintService {
  private readonly logger = new Logger(LintService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("LINTERS_URL", "http://localhost:8081");
    this.timeoutMs = config.get<number>("LINTERS_TIMEOUT_MS", 30000);
  }

  async health(): Promise<LintHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        return {
          available: false,
          reason: `HTTP ${response.status}`,
          tools: [],
        };
      }
      return (await response.json()) as LintHealth;
    } catch (error) {
      return { available: false, reason: describe(error), tools: [] };
    }
  }

  async lint(items: LintItemDto[]): Promise<LintReport> {
    try {
      const response = await fetch(`${this.baseUrl}/lint`, {
        body: JSON.stringify({ items }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        return {
          available: false,
          findings: [],
          reason: `HTTP ${response.status}`,
          tools: [],
        };
      }
      return (await response.json()) as LintReport;
    } catch (error) {
      const reason = describe(error);
      this.logger.warn(`Linters unreachable: ${reason}`);
      return { available: false, findings: [], reason, tools: [] };
    }
  }
}

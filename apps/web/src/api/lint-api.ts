import { request } from "@/api/request";
import type { Chunk, LintHealth, LintReport } from "@knife/contract";

/**
 * One batch is what the linters can chew through before the request times
 * out. The number is surfaced rather than applied quietly: a run that checked
 * a fifth of the universe must not read like a clean bill of health.
 */
const BATCH = 500;

export const lintApi = {
  batchSize: BATCH,

  health: (): Promise<LintHealth> => request("/api/lint/health"),

  run: (chunks: Chunk[]): Promise<LintReport> =>
    request("/api/lint", {
      body: JSON.stringify({
        items: chunks
          .slice(0, BATCH)
          .map((chunk) => ({ id: chunk.id, text: chunk.text })),
      }),
      method: "POST",
    }),
} as const;

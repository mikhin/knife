import { request } from "@/api/request";
import type { Chunk, LintHealth, LintReport } from "@knife/contract";

/**
 * One request carries at most this many chunks — the limit the API enforces
 * and about as much as the linters chew through before the request times out.
 * A whole universe is checked by sending several.
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

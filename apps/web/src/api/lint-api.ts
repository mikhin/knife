import { request } from "@/api/request";
import type { Chunk } from "@knife/contract";
import type { LintHealth, LintReport } from "@knife/contract";

const MAX_ITEMS = 500;

export const lintApi = {
  health: (): Promise<LintHealth> => request("/api/lint/health"),

  run: (chunks: Chunk[]): Promise<LintReport> =>
    request("/api/lint", {
      body: JSON.stringify({
        items: chunks
          .slice(0, MAX_ITEMS)
          .map((chunk) => ({ id: chunk.id, text: chunk.text })),
      }),
      method: "POST",
    }),
} as const;

import { atom, computed } from "nanostores";
import { lintApi } from "@/api/lint-api";
import type { Chunk } from "@knife/contract";
import type { LintHealth, LintReport } from "@knife/contract";

export const $lintHealth = atom<LintHealth | undefined>(undefined);
export const $lintReport = atom<LintReport | undefined>(undefined);
export const $lintRunning = atom(false);

/** How much of the universe the last run actually looked at. */
export const $lintCoverage = atom<
  undefined | { checked: number; total: number }
>(undefined);

export const checkLinters = async (): Promise<void> => {
  $lintHealth.set(await lintApi.health());
};

/**
 * The whole universe is checked, one batch per request, and the count climbs
 * as batches come back. Findings are held here and nowhere else: they die
 * with the tab, the same as every other verdict on this screen.
 */
export const runLinters = async (chunks: Chunk[]): Promise<void> => {
  $lintRunning.set(true);
  $lintCoverage.set({ checked: 0, total: chunks.length });
  $lintReport.set(undefined);

  const findings: LintReport["findings"] = [];
  const tools = new Set<string>();
  let available = false;
  let reason: string | undefined;

  try {
    for (let from = 0; from < chunks.length; from += lintApi.batchSize) {
      // One batch at a time: the point is to stay under the request limit,
      // not to open a connection per thousand chunks.
      // oxlint-disable-next-line no-await-in-loop
      const batch = await lintApi.run(
        chunks.slice(from, from + lintApi.batchSize),
      );

      findings.push(...batch.findings);
      for (const tool of batch.tools) {
        tools.add(tool);
      }
      available ||= batch.available;
      reason = batch.reason;

      $lintCoverage.set({
        checked: Math.min(from + lintApi.batchSize, chunks.length),
        total: chunks.length,
      });
      $lintReport.set({
        available,
        findings: [...findings],
        tools: [...tools],
      });

      if (!batch.available) {
        break;
      }
    }

    $lintHealth.set({
      available,
      tools: [...tools],
      ...(reason === undefined ? {} : { reason }),
    });
  } finally {
    $lintRunning.set(false);
  }
};

/**
 * How many findings sit on each chunk. The list says the count before a chunk
 * is opened — one nitpick and ten are not the same trouble — while the filter
 * and the order need no more than the ids.
 */
export const $notesByChunk = computed($lintReport, (report) => {
  const counts = new Map<string, number>();

  for (const finding of report?.findings ?? []) {
    counts.set(finding.chunkId, (counts.get(finding.chunkId) ?? 0) + 1);
  }

  return counts;
});

import { atom } from "nanostores";
import { lintApi } from "@/api/lint-api";
import type { Chunk } from "@knife/contract";
import type { LintHealth, LintReport } from "@knife/contract";

export const $lintHealth = atom<LintHealth | undefined>(undefined);
export const $lintReport = atom<LintReport | undefined>(undefined);
export const $lintRunning = atom(false);

export const checkLinters = async (): Promise<void> => {
  $lintHealth.set(await lintApi.health());
};

/**
 * Findings are held here and nowhere else: they die with the tab, the same as
 * every other verdict on this screen.
 */
export const runLinters = async (chunks: Chunk[]): Promise<void> => {
  $lintRunning.set(true);
  try {
    const report = await lintApi.run(chunks);
    $lintReport.set(report);
    $lintHealth.set({
      available: report.available,
      tools: report.tools,
      ...(report.reason === undefined ? {} : { reason: report.reason }),
    });
  } finally {
    $lintRunning.set(false);
  }
};

import type { ChunkLine } from "@/mcp/render-chunks";

export type WordCompanion = {
  chunkCount: number;
  label: string;
};

export type WordProfileReport = {
  companions: WordCompanion[];
  label: string;
  listed: ChunkLine[];
  /** Chunks holding the word, whether or not they fitted into the answer. */
  occurrences: number;
  project: string;
  stem: string;
};

const named = (report: WordProfileReport): string =>
  report.label === report.stem
    ? `"${report.label}"`
    : `"${report.label}" (every form of it, under the stem ${report.stem})`;

const chunksSaid = (count: number): string =>
  count === 1 ? "1 chunk" : `${count} chunks`;

/**
 * One word told twice over: the words it keeps company with, and the chunks
 * it lives in with their text. The company is what says whether a word means
 * one thing across the universe or two — "refund" beside "request" and
 * "refund" beside "battery" are not the same word doing the same work.
 */
export const renderWordProfile = (report: WordProfileReport): string => {
  const head = `${named(report)} in "${report.project}": ${chunksSaid(report.occurrences)}.`;
  const company = report.companions
    .map((companion) => `${companion.label} ${companion.chunkCount}`)
    .join(", ");
  const missing = report.occurrences - report.listed.length;
  const counted =
    missing > 0
      ? `${report.listed.length} listed, ${missing} not listed.`
      : `All of them listed.`;
  const lines = report.listed.map((line) => `${line.id}  ${line.text}`);

  return [
    head,
    company ? `Travels with: ${company}.` : "It travels with nothing else.",
    counted,
    "",
    lines.join("\n"),
  ].join("\n");
};

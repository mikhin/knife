import type { ChunkLine } from "@/mcp/render-chunks";

export type SearchReport = {
  listed: ChunkLine[];
  /** Chunks holding every word of the query, listed or not. */
  matched: number;
  project: string;
  query: string;
  size: number;
};

const chunksSaid = (count: number): string =>
  count === 1 ? "1 chunk" : `${count} chunks`;

/**
 * The same search a person types into the field: every word of the query has
 * to be in the chunk, each of them in any of its forms, and a fragment finds
 * the words it is part of. Nothing is ranked — a hit either holds the whole
 * query or is not a hit.
 */
export const renderSearch = (report: SearchReport): string => {
  const head = `Project "${report.project}" holds ${report.size} chunks.`;

  if (report.matched === 0) {
    return `${head}\n"${report.query}" — nothing holds every word of that.`;
  }

  const missing = report.matched - report.listed.length;
  const counted =
    missing > 0
      ? `"${report.query}" — ${chunksSaid(report.matched)}, ${report.listed.length} listed, ${missing} not listed.`
      : `"${report.query}" — ${chunksSaid(report.matched)}.`;
  const lines = report.listed.map((line) => `${line.id}  ${line.text}`);

  return `${head}\n${counted}\n\n${lines.join("\n")}`;
};

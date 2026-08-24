import { REPEAT_LEVELS } from "@knife/universe";
import type { RepeatLevel } from "@knife/universe";

export type DuplicateLine = {
  first: { id: string; text: string };
  /** One of the two denies what the other asserts: never a safe deletion. */
  polarityDiffers: boolean;
  second: { id: string; text: string };
  sharedWords: string[];
  similarity: number;
};

export type DuplicatesReport = {
  level: RepeatLevel;
  listed: DuplicateLine[];
  /** Pairs the level admits, whether or not they fitted into the answer. */
  matched: number;
  project: string;
  size: number;
  /** Pairs the calculation itself cut to stay fast; never reachable here. */
  unreachable: number;
};

const softerThan = (level: RepeatLevel): string =>
  REPEAT_LEVELS.filter((other) => other.from < level.from)
    .map((other) => `${other.id} (${other.from.toFixed(2)})`)
    .join(", ");

const pairsSaid = (count: number): string =>
  count === 1 ? "1 pair" : `${count} pairs`;

const heading = (report: DuplicatesReport): string => {
  const level = `${report.level.label} — similarity ${report.level.from.toFixed(2)} and up`;
  const hidden = report.matched - report.listed.length;
  const counted =
    hidden > 0
      ? `${pairsSaid(report.matched)}, ${report.listed.length} listed, ${hidden} not listed`
      : pairsSaid(report.matched);

  return `${level}: ${counted}.`;
};

const pair = (line: DuplicateLine): string => {
  const note = line.polarityDiffers
    ? "disagreement — one denies the other, not a repeat"
    : `shares: ${line.sharedWords.join(", ")}`;

  return [
    `${line.similarity.toFixed(2)}  ${note}`,
    `  ${line.first.id}  ${line.first.text}`,
    `  ${line.second.id}  ${line.second.text}`,
  ].join("\n");
};

/**
 * What the agent reads. Both texts are printed in full next to their ids:
 * deciding which of two wordings is the spare one is the whole job, and an
 * id alone would send the agent back for the text it was about to delete.
 */
export const renderDuplicates = (report: DuplicatesReport): string => {
  const lines = [
    `Project "${report.project}" holds ${report.size} chunks.`,
    heading(report),
  ];

  if (report.listed.length === 0) {
    const softer = softerThan(report.level);
    return softer
      ? `${lines.join("\n")}\nSofter levels: ${softer}.`
      : lines.join("\n");
  }

  if (report.unreachable > 0) {
    lines.push(
      `${report.unreachable} more pairs were cut by the calculation itself and cannot be reached at any level.`,
    );
  }

  return [lines.join("\n"), ...report.listed.map(pair)].join("\n\n");
};

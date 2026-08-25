export type ChunkWordLine = {
  /** Other chunks holding this word: 0 means it is said nowhere else. */
  elsewhere: number;
  label: string;
};

export type ChunkProfileReport = {
  arrived: string;
  /** True when not one word of the chunk appears anywhere else. */
  hangs: boolean;
  id: string;
  listed: ChunkWordLine[];
  project: string;
  text: string;
  /** Words the chunk holds, whether or not they fitted into the answer. */
  words: number;
};

const HANGS =
  "Nothing else in this universe shares a word with it: this chunk hangs.";

/**
 * One chunk and what ties it to everything around it. The words come rarest
 * first, so the top of the list is what this chunk alone says — a zero is a
 * word living nowhere else, and a chunk of nothing but zeroes is the hanging
 * one, named word by word rather than merely labelled.
 */
export const renderChunkProfile = (report: ChunkProfileReport): string => {
  const head = `${report.id} in "${report.project}", arrived ${report.arrived}.`;
  const missing = report.words - report.listed.length;
  const counted =
    missing > 0
      ? `Words, rarest first — the number is how many other chunks hold the word. ${report.listed.length} listed, ${missing} not listed.`
      : "Words, rarest first — the number is how many other chunks hold the word.";
  const lines = report.listed.map(
    (word) => `  ${word.label} ${word.elsewhere}`,
  );

  return [
    head,
    report.text,
    "",
    report.hangs ? HANGS : counted,
    lines.join("\n"),
  ].join("\n");
};

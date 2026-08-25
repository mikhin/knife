export type DanglingChunk = {
  id: string;
  text: string;
};

export type DanglingReport = {
  /** Chunks that hang, whether or not they fitted into the answer. */
  hanging: number;
  listed: DanglingChunk[];
  project: string;
  size: number;
};

const WHAT_HANGS =
  "A chunk hangs when not one of its words appears anywhere else in this universe.";

const hangingSaid = (count: number): string =>
  count === 1 ? "1 chunk hangs" : `${count} chunks hang`;

/**
 * The other half of the anti-slop pass, and the half that reads as an
 * accusation if it is printed without its reason: a chunk hangs because
 * nothing around it repeats a single one of its words, which is as often the
 * only sentence saying something as it is a leftover. The text is printed in
 * full for that reason — the verdict is the reader's, not the list's.
 */
export const renderDangling = (report: DanglingReport): string => {
  const head = `Project "${report.project}" holds ${report.size} chunks.`;

  if (report.hanging === 0) {
    return `${head}\n${WHAT_HANGS}\nNothing hangs: every chunk shares a word with another.`;
  }

  const missing = report.hanging - report.listed.length;
  const counted =
    missing > 0
      ? `${hangingSaid(report.hanging)}, ${report.listed.length} listed, ${missing} not listed.`
      : `${hangingSaid(report.hanging)}.`;
  const lines = report.listed.map((chunk) => `${chunk.id}  ${chunk.text}`);

  return `${head}\n${WHAT_HANGS}\n${counted}\n\n${lines.join("\n")}`;
};

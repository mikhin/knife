export type LintNote = {
  message: string;
  rule: string;
  severity: string;
  tool: string;
};

export type LintedChunk = {
  id: string;
  notes: LintNote[];
  text: string;
};

export type LintRun = {
  available: boolean;
  /** Chunks the linters actually read this pass, whole universe or not. */
  checked: number;
  /** Chunks carrying at least one remark, listed or not. */
  flagged: number;
  listed: LintedChunk[];
  project: string;
  reason?: string;
  remarks: number;
  size: number;
  tools: string[];
};

const because = (reason: string | undefined): string =>
  reason ? `: ${reason}` : "";

const read = (run: LintRun): string =>
  run.checked < run.size
    ? `The linters read ${run.checked} of ${run.size} chunks before stopping${because(run.reason)}.`
    : `The linters read all ${run.size} chunks. Tools: ${run.tools.join(", ")}.`;

const counted = (run: LintRun): string => {
  const missing = run.flagged - run.listed.length;
  const remarks = run.remarks === 1 ? "1 remark" : `${run.remarks} remarks`;
  const chunks = run.flagged === 1 ? "1 chunk" : `${run.flagged} chunks`;

  return missing > 0
    ? `${remarks} on ${chunks}, ${run.listed.length} listed, ${missing} not listed.`
    : `${remarks} on ${chunks}.`;
};

const written = (chunk: LintedChunk): string =>
  [
    `${chunk.id}  ${chunk.text}`,
    ...chunk.notes.map(
      (note) =>
        `  ${note.severity}  ${note.tool}/${note.rule}  ${note.message}`,
    ),
  ].join("\n");

/**
 * What the linters wrote, chunk by chunk rather than remark by remark: the
 * same sentence usually collects several, and printing its text once under
 * its id is what lets an agent judge the wording instead of the remark.
 *
 * Nothing here is stored anywhere — this text is the whole of the run, and
 * the next pass over the same universe starts from nothing again.
 */
export const renderLint = (run: LintRun): string => {
  const head = `Project "${run.project}" holds ${run.size} chunks.`;

  if (!run.available) {
    return `${head}\nThe linters are offline${because(run.reason)}. Nothing was read.`;
  }

  if (run.remarks === 0) {
    return `${head}\n${read(run)}\nNothing was written on.`;
  }

  return `${head}\n${read(run)}\n${counted(run)}\n\n${run.listed.map(written).join("\n\n")}`;
};

import type { JSX } from "react";
import { Dialog } from "@/components/dialog";

type Props = {
  checked: number;
  chunksWithNotes: number;
  findings: number;
  onClose: () => void;
  tools: string[];
  total: number;
};

/**
 * How a run went, asked for rather than standing in the header: the bar has
 * room for the question and the numbers are the answer, so they wait behind
 * the count until someone wants them.
 */
export const LintRunDialog = ({
  checked,
  chunksWithNotes,
  findings,
  onClose,
  tools,
  total,
}: Props): JSX.Element => (
  <Dialog onClose={onClose} title="Linter run">
    <p className="leading-relaxed">
      {findings} findings on {chunksWithNotes} chunks
    </p>
    <p className="text-faint">from {tools.join(", ")}</p>
    <p className={checked < total ? "text-note" : "text-faint"}>
      {checked < total
        ? `stopped after ${checked} of ${total} chunks`
        : `read ${checked} of ${total} chunks`}
    </p>
    <div className="mt-4 flex justify-end">
      <button onClick={onClose} type="button">
        Close
      </button>
    </div>
  </Dialog>
);

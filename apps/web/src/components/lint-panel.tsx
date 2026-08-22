import { useStore } from "@nanostores/react";
import { type JSX, useState } from "react";
import { DiamondIcon } from "@/components/icons";
import { LintRunDialog } from "@/components/lint-dialog";
import { attempt } from "@/stores/failure-store";
import {
  $lintCoverage,
  $lintHealth,
  $lintReport,
  $lintRunning,
  $notesByChunk,
  runLinters,
} from "@/stores/lint-store";
import type { Chunk } from "@knife/contract";

type Props = {
  chunks: Chunk[];
};

export const LintPanel = ({ chunks }: Props): JSX.Element => {
  const health = useStore($lintHealth);
  const report = useStore($lintReport);
  const running = useStore($lintRunning);
  const coverage = useStore($lintCoverage);
  const notesByChunk = useStore($notesByChunk);
  const [asked, setAsked] = useState(false);

  /** A run that gave up says so on the count itself, not only inside. */
  const cutShort = coverage !== undefined && coverage.checked < coverage.total;

  return (
    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={running || chunks.length === 0}
        onClick={() => {
          attempt(runLinters(chunks));
        }}
        type="button"
      >
        <DiamondIcon />
        {running ? "Running Vale, textlint, proselint..." : "Run linters"}
      </button>

      {health && !health.available ? (
        <span className="text-xs text-faint">
          linters offline{health.reason ? `: ${health.reason}` : ""} — docker
          compose up linters
        </span>
      ) : null}

      {running && coverage ? (
        <span className="text-xs text-faint">
          {coverage.checked} of {coverage.total} chunks
        </span>
      ) : null}

      {!running && report?.available ? (
        <button
          className={`border-transparent px-1 py-0.5 text-xs ${
            cutShort ? "text-note" : "text-faint"
          }`}
          onClick={() => {
            setAsked(true);
          }}
          type="button"
        >
          {report.findings.length} findings
        </button>
      ) : null}

      {asked && report ? (
        <LintRunDialog
          checked={coverage?.checked ?? 0}
          chunksWithNotes={notesByChunk.size}
          findings={report.findings.length}
          onClose={() => {
            setAsked(false);
          }}
          tools={report.tools}
          total={coverage?.total ?? 0}
        />
      ) : null}
    </div>
  );
};

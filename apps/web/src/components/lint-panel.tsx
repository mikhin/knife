import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import { DiamondIcon } from "@/components/icons";
import { attempt } from "@/stores/failure-store";
import {
  $lintCoverage,
  $lintHealth,
  $lintReport,
  $lintRunning,
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
        <span className="text-xs text-faint">
          {report.findings.length} findings from {report.tools.join(", ")}
          {coverage && coverage.checked < coverage.total
            ? ` — stopped after ${coverage.checked} of ${coverage.total} chunks`
            : ""}
        </span>
      ) : null}
    </div>
  );
};

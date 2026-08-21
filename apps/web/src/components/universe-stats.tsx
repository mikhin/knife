import type { JSX } from "react";
import type { UniverseStage } from "@/stores/universe-store";
import type { UniverseReport } from "@/types/worker";

type Props = {
  chunkCount: number;
  droppedChunks: number;
  duplicateCount: number;
  failure: string | undefined;
  report: undefined | UniverseReport;
  showWordDrop: boolean;
  stage: UniverseStage;
};

const STAGE_TEXT: Partial<Record<UniverseStage, string>> = {
  analysing: "counting on the spot...",
  loading: "loading the universe...",
};

/**
 * Everything the checks left out is named here. A graph that quietly drew a
 * tenth of the universe would read exactly like one that drew all of it.
 */
export const UniverseStats = ({
  chunkCount,
  droppedChunks,
  duplicateCount,
  failure,
  report,
  showWordDrop,
  stage,
}: Props): JSX.Element => {
  const droppedWords = showWordDrop ? (report?.wordGraph.droppedNodes ?? 0) : 0;
  const truncatedPairs = report?.duplicates.truncatedPairs ?? 0;

  return (
    <div
      className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-2 text-xs"
      data-testid="stats"
    >
      {failure ? <span className="text-dup">{failure}</span> : null}
      {STAGE_TEXT[stage] ? <span>{STAGE_TEXT[stage]}</span> : null}

      {report ? (
        <>
          <span>{chunkCount} chunks</span>
          <span>{duplicateCount} duplicate pairs</span>
          <span>{report.water.length} water</span>
          <span>{report.dangling.length} hanging</span>
          <span className="text-faint">counted in {report.elapsedMs} ms</span>
        </>
      ) : null}

      {truncatedPairs > 0 ? (
        <span className="text-faint">{truncatedPairs} weaker pairs not drawn</span>
      ) : null}
      {droppedWords > 0 ? (
        <span className="text-faint">{droppedWords} rarer words not drawn</span>
      ) : null}
      {droppedChunks > 0 ? (
        <span className="text-faint">
          {droppedChunks} quieter chunks not drawn
        </span>
      ) : null}
    </div>
  );
};

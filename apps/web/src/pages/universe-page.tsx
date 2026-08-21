import { useStore } from "@nanostores/react";
import { type JSX, useCallback, useEffect, useMemo } from "react";
import { ChunkInspector } from "@/components/chunk-inspector";
import { ChunkList } from "@/components/chunk-list";
import { GraphCanvas } from "@/components/graph-canvas";
import { LintPanel } from "@/components/lint-panel";
import { NewChunkForm } from "@/components/new-chunk-form";
import { ProjectBar } from "@/components/project-bar";
import { SearchBox } from "@/components/search-box";
import { ThresholdSlider } from "@/components/threshold-slider";
import { WordInspector } from "@/components/word-inspector";
import { $lintReport, checkLinters } from "@/stores/lint-store";
import { $currentProjectId, loadProjects } from "@/stores/projects-store";
import { $graphMode, setGraphMode } from "@/stores/settings-store";
import {
  $chunkGraph,
  $chunks,
  $danglingIds,
  $duplicatesAboveThreshold,
  $failure,
  $report,
  $searchHits,
  $selectedChunkId,
  $stage,
  $waterByChunk,
  $wordProfile,
  addChunk,
  deleteChunk,
  openProject,
  selectChunk,
  selectWord,
} from "@/stores/universe-store";
import type { CanvasLink, CanvasNode } from "@/types/canvas-graph";

const TAG = "rounded border px-1.5 text-[11px] not-italic";
const WORD_NODE_RADIUS = 4;
const CHUNK_NODE_RADIUS = 5;

export const UniversePage = (): JSX.Element => {
  const projectId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const report = useStore($report);
  const stage = useStore($stage);
  const failure = useStore($failure);
  const graphMode = useStore($graphMode);
  const duplicates = useStore($duplicatesAboveThreshold);
  const chunkGraph = useStore($chunkGraph);
  const waterByChunk = useStore($waterByChunk);
  const danglingIds = useStore($danglingIds);
  const selectedChunkId = useStore($selectedChunkId);
  const wordProfile = useStore($wordProfile);
  const searchHits = useStore($searchHits);
  const lintReport = useStore($lintReport);

  useEffect(() => {
    void loadProjects();
    void checkLinters();
  }, []);

  useEffect(() => {
    void openProject(projectId);
  }, [projectId]);

  const chunkById = useMemo(
    () => new Map(chunks.map((chunk) => [chunk.id, chunk])),
    [chunks],
  );

  const spansByChunk = useMemo(
    () => new Map((searchHits ?? []).map((hit) => [hit.chunkId, hit.spans])),
    [searchHits],
  );

  const duplicateIds = useMemo(
    () => new Set(duplicates.flatMap((pair) => [pair.firstId, pair.secondId])),
    [duplicates],
  );

  const listedChunks = useMemo(
    () =>
      searchHits === undefined
        ? chunks
        : searchHits
            .map((hit) => chunkById.get(hit.chunkId))
            .filter((chunk) => chunk !== undefined),
    [chunkById, chunks, searchHits],
  );

  const nodes: CanvasNode[] = useMemo(() => {
    if (graphMode === "words") {
      return (report?.wordGraph.nodes ?? []).map((node) => ({
        id: node.stem,
        label: node.label,
        radius: WORD_NODE_RADIUS + Math.min(6, Math.log2(node.chunkCount + 1)),
        tone: "plain" as const,
      }));
    }

    return chunkGraph.nodes.map((node) => ({
      id: node.id,
      label: node.preview.slice(0, 40),
      radius: CHUNK_NODE_RADIUS,
      tone:
        node.id === selectedChunkId
          ? ("selected" as const)
          : node.isWater
            ? ("water" as const)
            : node.isDangling
              ? ("dangling" as const)
              : duplicateIds.has(node.id)
                ? ("duplicate" as const)
                : ("plain" as const),
    }));
  }, [chunkGraph, duplicateIds, graphMode, report, selectedChunkId]);

  const links: CanvasLink[] = useMemo(() => {
    if (graphMode === "words") {
      const graph = report?.wordGraph;
      const heaviest = graph?.links[0]?.weight ?? 1;
      return (graph?.links ?? []).map((link) => ({
        source: link.source,
        strength: link.weight / heaviest,
        target: link.target,
      }));
    }

    return chunkGraph.links.map((link) => ({
      source: link.source,
      strength: link.similarity,
      target: link.target,
    }));
  }, [chunkGraph, graphMode, report]);

  const onPick = useCallback((id: string): void => {
    if ($graphMode.get() === "words") {
      selectWord(id);
      selectChunk(undefined);
      return;
    }
    selectChunk(id);
  }, []);

  const selectedChunk = selectedChunkId
    ? chunkById.get(selectedChunkId)
    : undefined;

  const selectedDuplicates = useMemo(
    () =>
      duplicates
        .filter(
          (pair) =>
            pair.firstId === selectedChunkId ||
            pair.secondId === selectedChunkId,
        )
        .map((pair) => ({
          other: chunkById.get(
            pair.firstId === selectedChunkId ? pair.secondId : pair.firstId,
          ),
          pair,
        })),
    [chunkById, duplicates, selectedChunkId],
  );

  const lintForSelected = useMemo(
    () =>
      (lintReport?.findings ?? []).filter(
        (finding) => finding.chunkId === selectedChunkId,
      ),
    [lintReport, selectedChunkId],
  );

  return (
    <div className="flex h-screen flex-col">
      <ProjectBar />

      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <SearchBox hits={searchHits?.length} />
        <ThresholdSlider
          floor={report?.duplicates.similarityFloor ?? 0.25}
          shown={duplicates.length}
          total={report?.duplicates.pairs.length ?? 0}
        />
        <div className="flex gap-1">
          <button
            className={
              graphMode === "chunks" ? "border-accent text-accent" : ""
            }
            onClick={() => {
              setGraphMode("chunks");
            }}
            type="button"
          >
            Chunks
          </button>
          <button
            className={graphMode === "words" ? "border-accent text-accent" : ""}
            onClick={() => {
              setGraphMode("words");
            }}
            type="button"
          >
            Words
          </button>
        </div>
        <LintPanel chunks={chunks} />
      </div>

      <div
        className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-2 text-xs"
        data-testid="stats"
      >
        {failure ? <span className="text-dup">{failure}</span> : null}
        {stage === "analysing" ? <span>counting on the spot...</span> : null}
        {stage === "loading" ? <span>loading the universe...</span> : null}
        {report ? (
          <>
            <span>{chunks.length} chunks</span>
            <span>{duplicates.length} duplicate pairs</span>
            <span>{report.water.length} water</span>
            <span>{report.dangling.length} hanging</span>
            <span className="text-faint">counted in {report.elapsedMs} ms</span>
            {report.duplicates.truncatedPairs > 0 ? (
              <span className="text-faint">
                {report.duplicates.truncatedPairs} weaker pairs not drawn
              </span>
            ) : null}
            {report.wordGraph.droppedNodes > 0 ? (
              <span className="text-faint">
                {report.wordGraph.droppedNodes} rarer words not drawn
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(400px,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-y-auto border-r border-line p-3">
          <NewChunkForm
            onAdd={(text) => {
              void addChunk(projectId, text);
            }}
          />
          <ChunkList
            chunks={listedChunks}
            danglingIds={danglingIds}
            duplicateIds={duplicateIds}
            onOpen={(id) => {
              selectChunk(id);
              setGraphMode("chunks");
            }}
            selectedId={selectedChunkId}
            spansByChunk={spansByChunk}
            waterIds={new Set(waterByChunk.keys())}
          />
        </section>

        <section className="relative min-h-0" data-testid="graph">
          <GraphCanvas links={links} nodes={nodes} onPick={onPick} />
          <p className="absolute bottom-2 left-3 flex items-center gap-2 text-xs">
            <em className={`${TAG} text-dup`}>duplicate</em>
            <em className={`${TAG} text-water`}>water</em>
            <em className={`${TAG} text-hang`}>hanging</em>
            <span className="text-faint">
              nothing here is stored — every verdict is recounted on open
            </span>
          </p>
        </section>

        {selectedChunk ? (
          <ChunkInspector
            chunk={selectedChunk}
            duplicates={selectedDuplicates}
            isDangling={danglingIds.has(selectedChunk.id)}
            lint={lintForSelected}
            onDelete={() => {
              void deleteChunk(projectId, selectedChunk.id);
            }}
            onOpenNeighbour={(id) => {
              selectChunk(id);
            }}
            spans={spansByChunk.get(selectedChunk.id) ?? []}
            water={waterByChunk.get(selectedChunk.id)}
          />
        ) : null}

        {!selectedChunk && wordProfile ? (
          <WordInspector
            chunkById={chunkById}
            onOpenChunk={(id) => {
              selectChunk(id);
              setGraphMode("chunks");
            }}
            onPickWord={selectWord}
            profile={wordProfile}
          />
        ) : null}
      </main>
    </div>
  );
};

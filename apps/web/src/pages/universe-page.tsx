import { useStore } from "@nanostores/react";
import { type JSX, useEffect, useMemo } from "react";
import { ChunkInspector } from "@/components/chunk-inspector";
import { ChunkList } from "@/components/chunk-list";
import { FailureBanner } from "@/components/failure-banner";
import { FileImport } from "@/components/file-import";
import { LintPanel } from "@/components/lint-panel";
import { NewChunkForm } from "@/components/new-chunk-form";
import { ProjectBar } from "@/components/project-bar";
import { TextSearch } from "@/components/text-search";
import { WordSearch } from "@/components/word-search";
import { RepeatLevel } from "@/components/repeat-level";
import { WordInspector } from "@/components/word-inspector";
import { WordList } from "@/components/word-list";
import { attempt } from "@/stores/failure-store";
import { $lintReport, checkLinters } from "@/stores/lint-store";
import { $currentProjectId, loadProjects } from "@/stores/projects-store";
import { filterWords } from "@/services/universe/filter-words";
import {
  $chunks,
  $danglingIds,
  $duplicatesAboveThreshold,
  $report,
  $searchHits,
  $selectedChunkId,
  $waterByChunk,
  $wordFilter,
  $wordProfile,
  addText,
  deleteChunk,
  openProject,
  selectChunk,
  selectWord,
} from "@/stores/universe-store";

export const UniversePage = (): JSX.Element => {
  const projectId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const report = useStore($report);
  const duplicates = useStore($duplicatesAboveThreshold);
  const waterByChunk = useStore($waterByChunk);
  const danglingIds = useStore($danglingIds);
  const selectedChunkId = useStore($selectedChunkId);
  const wordProfile = useStore($wordProfile);
  const wordFilter = useStore($wordFilter);
  const searchHits = useStore($searchHits);
  const lintReport = useStore($lintReport);

  useEffect(() => {
    attempt(loadProjects());
    attempt(checkLinters());
  }, []);

  useEffect(() => {
    attempt(openProject(projectId));
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

  const shownWords = useMemo(
    () => filterWords(report?.words ?? [], wordFilter),
    [report, wordFilter],
  );

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
        <RepeatLevel pairs={report?.duplicates.pairs ?? []} />
        <LintPanel chunks={chunks} />
      </div>

      <FailureBanner />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(320px,1.4fr)_minmax(220px,0.6fr)_minmax(0,1fr)]">
        <section className="overflow-y-auto border-r border-line p-3">
          <TextSearch hits={searchHits?.length} />

          {projectId ? (
            <>
              <NewChunkForm
                onAdd={(text) => {
                  attempt(addText(projectId, text));
                }}
              />
              <FileImport projectId={projectId} />
            </>
          ) : (
            <p className="mb-3 text-xs text-faint">
              Create a project above, then write a chunk or add a file.
            </p>
          )}
          <ChunkList
            chunks={listedChunks}
            danglingIds={danglingIds}
            duplicateIds={duplicateIds}
            onOpen={selectChunk}
            selectedId={selectedChunkId}
            spansByChunk={spansByChunk}
            waterIds={new Set(waterByChunk.keys())}
          />
        </section>

        <section className="overflow-y-auto border-r border-line p-3">
          <WordSearch shown={shownWords.length} />
          <WordList
            onPick={(stem) => {
              selectChunk(undefined);
              selectWord(stem);
            }}
            selectedStem={wordProfile?.stem}
            words={shownWords}
          />
        </section>

        {selectedChunk ? (
          <ChunkInspector
            chunk={selectedChunk}
            duplicates={selectedDuplicates}
            isDangling={danglingIds.has(selectedChunk.id)}
            lint={lintForSelected}
            onDelete={() => {
              attempt(deleteChunk(projectId, selectedChunk.id));
            }}
            onOpenNeighbour={selectChunk}
            spans={spansByChunk.get(selectedChunk.id) ?? []}
            water={waterByChunk.get(selectedChunk.id)}
          />
        ) : null}

        {!selectedChunk && wordProfile ? (
          <WordInspector
            chunkById={chunkById}
            onOpenChunk={selectChunk}
            onPickWord={selectWord}
            profile={wordProfile}
          />
        ) : null}
      </main>
    </div>
  );
};

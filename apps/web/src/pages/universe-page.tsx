import { useStore } from "@nanostores/react";
import { type JSX, useEffect, useMemo } from "react";
import { ChunkInspector } from "@/components/chunk-inspector";
import { ChunkList } from "@/components/chunk-list";
import { FailureBanner } from "@/components/failure-banner";
import { FileImport } from "@/components/file-import";
import { LintPanel } from "@/components/lint-panel";
import { ListChoice } from "@/components/list-choice";
import { NewChunkForm } from "@/components/new-chunk-form";
import { ProjectSidebar } from "@/components/project-sidebar";
import { TextSearch } from "@/components/text-search";
import { WordSearch } from "@/components/word-search";
import { RepeatLevel } from "@/components/repeat-level";
import { WordInspector } from "@/components/word-inspector";
import { WordList } from "@/components/word-list";
import { attempt } from "@/stores/failure-store";
import { $lintReport, $notesByChunk, checkLinters } from "@/stores/lint-store";
import {
  $currentProjectId,
  $projects,
  loadProjects,
} from "@/stores/projects-store";
import {
  $chunkFilter,
  $chunkOrder,
  $sidebarOpen,
  $wordOrder,
  setChunkFilter,
  setChunkOrder,
  setWordOrder,
  toggleSidebar,
} from "@/stores/settings-store";
import { filterChunks } from "@/services/lists/filter-chunks";
import { filterWords } from "@/services/lists/filter-words";
import { sortChunks } from "@/services/lists/sort-chunks";
import { sortWords } from "@/services/lists/sort-words";
import {
  $chunks,
  $danglingIds,
  $duplicatesAboveThreshold,
  $report,
  $searchHits,
  $selectedChunkId,
  $wordFilter,
  $wordProfile,
  addText,
  deleteChunk,
  openProject,
  selectChunk,
  selectWord,
} from "@/stores/universe-store";

const COLUMN_TITLE =
  "border-b border-line px-3 py-1 text-xs tracking-wider text-faint uppercase";

export const UniversePage = (): JSX.Element => {
  const projectId = useStore($currentProjectId);
  const projects = useStore($projects);
  const sidebarOpen = useStore($sidebarOpen);
  const chunks = useStore($chunks);
  const report = useStore($report);
  const duplicates = useStore($duplicatesAboveThreshold);
  const danglingIds = useStore($danglingIds);
  const selectedChunkId = useStore($selectedChunkId);
  const wordProfile = useStore($wordProfile);
  const wordFilter = useStore($wordFilter);
  const chunkFilter = useStore($chunkFilter);
  const chunkOrder = useStore($chunkOrder);
  const wordOrder = useStore($wordOrder);
  const searchHits = useStore($searchHits);
  const lintReport = useStore($lintReport);
  const notesByChunk = useStore($notesByChunk);

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

  const notedIds = useMemo(() => new Set(notesByChunk.keys()), [notesByChunk]);

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
    () => sortWords(filterWords(report?.words ?? [], wordFilter), wordOrder),
    [report, wordFilter, wordOrder],
  );

  const shownChunks = useMemo(() => {
    const marks = {
      dangling: danglingIds,
      duplicates: duplicateIds,
      noted: notedIds,
    };

    return sortChunks(
      filterChunks(listedChunks, chunkFilter, marks),
      chunkOrder,
      marks,
    );
  }, [
    chunkFilter,
    chunkOrder,
    danglingIds,
    duplicateIds,
    listedChunks,
    notedIds,
  ]);

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
      <ProjectSidebar onClose={toggleSidebar} open={sidebarOpen} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-3 py-2">
          <button
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
            title="Projects"
            type="button"
          >
            ☰ Projects
          </button>
          <span className="truncate text-faint" data-testid="open-project">
            {projects.find((project) => project.id === projectId)?.name ??
              "No project open"}
          </span>
          <div className="ml-auto flex min-w-0 items-center">
            <LintPanel chunks={chunks} />
          </div>
        </div>

        <FailureBanner />

        <main className="grid min-h-0 flex-1 grid-cols-[minmax(320px,1.4fr)_minmax(220px,0.6fr)_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col border-r border-line">
            <h2 className={COLUMN_TITLE}>Chunks</h2>

            <div className="flex flex-col gap-2 border-b border-line p-3">
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
                <p className="text-xs text-faint">
                  Open Projects and create one, then write a chunk or add a
                  file.
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
              <ChunkList
                chunks={shownChunks}
                danglingIds={danglingIds}
                duplicateIds={duplicateIds}
                noteCounts={notesByChunk}
                onOpen={selectChunk}
                selectedId={selectedChunkId}
                spansByChunk={spansByChunk}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-line p-3">
              <TextSearch hits={searchHits?.length} />
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                <RepeatLevel pairs={report?.duplicates.pairs ?? []} />
                <div className="flex flex-wrap items-center gap-3">
                  <ListChoice
                    label="Show"
                    onChange={(value) => {
                      setChunkFilter(value as typeof chunkFilter);
                    }}
                    options={[
                      { label: "All", value: "all" },
                      { label: "Repeats", value: "duplicates" },
                      { label: "Notes", value: "noted" },
                      { label: "Hanging", value: "dangling" },
                    ]}
                    value={chunkFilter}
                  />
                  <ListChoice
                    label="First"
                    onChange={(value) => {
                      setChunkOrder(value as typeof chunkOrder);
                    }}
                    options={[
                      { label: "Oldest", value: "oldest" },
                      { label: "Newest", value: "newest" },
                      { label: "Longest", value: "longest" },
                      { label: "Flagged", value: "problems" },
                    ]}
                    value={chunkOrder}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col border-r border-line">
            <h2 className={COLUMN_TITLE}>Words</h2>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
              <WordList
                onPick={selectWord}
                selectedStem={wordProfile?.stem}
                words={shownWords}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-line p-3">
              <WordSearch shown={shownWords.length} />
              <div className="flex min-h-8 items-center">
                <ListChoice
                  label="First"
                  onChange={(value) => {
                    setWordOrder(value as typeof wordOrder);
                  }}
                  options={[
                    { label: "Most chunks", value: "common" },
                    { label: "Fewest chunks", value: "rare" },
                    { label: "A–Z", value: "alphabetical" },
                  ]}
                  value={wordOrder}
                />
              </div>
            </div>
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
    </div>
  );
};

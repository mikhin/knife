import { atom, computed } from "nanostores";
import { chunksApi } from "@/api/chunks-api";
import { chunkSource } from "@/services/chunking/chunk-source";
import { detectPastedFormat } from "@/services/chunking/detect-pasted-format";
import { $similarityThreshold } from "@/stores/settings-store";
import type { Chunk } from "@knife/contract";
import type { SourceFormat } from "@/types/source-format";
import type { SearchHit, WordProfile } from "@/types/universe";
import type {
  UniverseReport,
  WorkerRequest,
  WorkerResponse,
} from "@/types/worker";

export const $chunks = atom<Chunk[]>([]);
export const $report = atom<undefined | UniverseReport>(undefined);
export const $selectedChunkId = atom<string | undefined>(undefined);
export const $wordProfile = atom<undefined | WordProfile>(undefined);
export const $searchQuery = atom("");
export const $searchHits = atom<SearchHit[] | undefined>(undefined);

const worker = new Worker(
  new URL("@/workers/universe-worker.ts", import.meta.url),
  {
    type: "module",
  },
);

worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;

  if (response.type === "analysed") {
    $report.set(response.report);
    return;
  }

  if (response.type === "word") {
    $wordProfile.set(response.profile);
    return;
  }

  if (response.query === $searchQuery.get()) {
    $searchHits.set(response.hits);
  }
});

const ask = (request: WorkerRequest): void => {
  worker.postMessage(request);
};

const analyse = (chunks: Chunk[]): void => {
  $chunks.set(chunks);
  $selectedChunkId.set(undefined);
  $wordProfile.set(undefined);
  $searchHits.set(undefined);

  if (chunks.length === 0) {
    $report.set(undefined);
    return;
  }

  ask({ chunks, type: "analyse" });
};

/**
 * Bumped on every open. A universe that arrives after the user has moved on
 * is dropped: showing it would leave chunks of one project on screen while
 * the header names another, and deleting from that screen is irreversible.
 */
let opening = 0;

export const openProject = async (projectId: string): Promise<void> => {
  const mine = opening + 1;
  opening = mine;

  if (!projectId) {
    analyse([]);
    return;
  }

  const chunks = await chunksApi.list(projectId);
  if (mine === opening) {
    analyse(chunks);
  }
};

/**
 * The only way text enters a universe, whether it was typed, pasted or read
 * from a file. It is cut here in the browser — one sentence lands as one
 * chunk, a whole sheet as many — and the file itself never leaves the page.
 */
export const addText = async (
  projectId: string,
  text: string,
  format: SourceFormat = detectPastedFormat(text),
): Promise<number> => {
  const texts = chunkSource(text, format);
  if (texts.length === 0) {
    return 0;
  }

  const created = await chunksApi.addMany(projectId, texts);
  analyse([...$chunks.get(), ...created]);
  return texts.length;
};

/**
 * Gone for good: there is no undo, and no way to edit one back into place.
 *
 * The universe is not fetched again for this. Deleting one chunk out of tens
 * of thousands is the ordinary move here, and re-downloading everything to
 * remove one line made the cheapest action the most expensive one.
 */
export const deleteChunk = async (
  projectId: string,
  chunkId: string,
): Promise<void> => {
  await chunksApi.remove(projectId, chunkId);
  analyse($chunks.get().filter((chunk) => chunk.id !== chunkId));
};

export const selectChunk = (chunkId: string | undefined): void => {
  $selectedChunkId.set(chunkId);
};

export const selectWord = (stem: string): void => {
  ask({ stem, type: "word" });
};

/** Searches the text of the universe; the word list has a filter of its own. */
export const searchChunks = (query: string): void => {
  $searchQuery.set(query);

  if (query.trim() === "") {
    $searchHits.set(undefined);
    return;
  }

  ask({ query, type: "search" });
};

export const $wordFilter = atom("");

export const filterWordList = (fragment: string): void => {
  $wordFilter.set(fragment);
};

export const $duplicatesAboveThreshold = computed(
  [$report, $similarityThreshold],
  (report, threshold) =>
    (report?.duplicates.pairs ?? []).filter(
      (pair) => pair.similarity >= threshold,
    ),
);

export const $waterByChunk = computed(
  $report,
  (report) =>
    new Map((report?.water ?? []).map((verdict) => [verdict.chunkId, verdict])),
);

export const $danglingIds = computed(
  $report,
  (report) => new Set(report?.dangling ?? []),
);

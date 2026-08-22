import { persistentAtom } from "@nanostores/persistent";
import { knownNumber, knownValue } from "@/lib/known-value";
import { CHUNK_FILTERS, CHUNK_ORDERS, WORD_ORDERS } from "@/types/list-view";
import type { ChunkFilter, ChunkOrder, WordOrder } from "@/types/list-view";

/**
 * Kept across reloads because these are reading preferences, not findings:
 * the verdicts themselves are recomputed from the text every time. Each one
 * is checked on the way back in — a browser can be holding a setting this
 * version dropped, and a name nothing answers to would take the screen down.
 */
export const $similarityThreshold = persistentAtom<number>(
  "knife:similarity",
  0.45,
  knownNumber(0.45),
);

export const setSimilarityThreshold = (value: number): void => {
  $similarityThreshold.set(value);
};

export const $chunkOrder = persistentAtom<ChunkOrder>(
  "knife:chunk-order",
  "oldest",
  knownValue(CHUNK_ORDERS, "oldest"),
);

export const $wordOrder = persistentAtom<WordOrder>(
  "knife:word-order",
  "common",
  knownValue(WORD_ORDERS, "common"),
);

export const setChunkOrder = (order: ChunkOrder): void => {
  $chunkOrder.set(order);
};

export const setWordOrder = (order: WordOrder): void => {
  $wordOrder.set(order);
};

export const $chunkFilter = persistentAtom<ChunkFilter>(
  "knife:chunk-filter",
  "all",
  knownValue(CHUNK_FILTERS, "all"),
);

export const setChunkFilter = (filter: ChunkFilter): void => {
  $chunkFilter.set(filter);
};

/**
 * The projects panel slides over the universe instead of pushing it aside,
 * so it starts out of the way: the text is what the screen is for.
 */
export const $sidebarOpen = persistentAtom<boolean>("knife:sidebar", false, {
  decode: (stored) => stored === "open",
  encode: (open) => (open ? "open" : "closed"),
});

export const toggleSidebar = (): void => {
  $sidebarOpen.set(!$sidebarOpen.get());
};

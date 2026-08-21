import { persistentAtom } from "@nanostores/persistent";
import type { ChunkOrder, WordOrder } from "@/types/list-order";

const asNumber = {
  decode: Number,
  encode: String,
};

/**
 * Kept across reloads because it is a reading preference, not a finding: the
 * verdicts themselves are recomputed from the text every time.
 */
export const $similarityThreshold = persistentAtom<number>(
  "knife:similarity",
  0.45,
  asNumber,
);

export const setSimilarityThreshold = (value: number): void => {
  $similarityThreshold.set(value);
};

export const $chunkOrder = persistentAtom<ChunkOrder>(
  "knife:chunk-order",
  "oldest",
);

export const $wordOrder = persistentAtom<WordOrder>(
  "knife:word-order",
  "common",
);

export const setChunkOrder = (order: ChunkOrder): void => {
  $chunkOrder.set(order);
};

export const setWordOrder = (order: WordOrder): void => {
  $wordOrder.set(order);
};

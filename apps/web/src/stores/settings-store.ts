import { persistentAtom } from "@nanostores/persistent";
import type { GraphMode } from "@/types/graph-mode";

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

export const $graphMode = persistentAtom<GraphMode>(
  "knife:graph-mode",
  "chunks",
);

export const setSimilarityThreshold = (value: number): void => {
  $similarityThreshold.set(value);
};

export const setGraphMode = (mode: GraphMode): void => {
  $graphMode.set(mode);
};

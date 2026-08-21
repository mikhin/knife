import { persistentAtom } from "@nanostores/persistent";

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

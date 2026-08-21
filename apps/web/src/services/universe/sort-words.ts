import type { WordOrder } from "@/types/list-view";
import type { WordCount } from "@/types/universe";

export const sortWords = (
  words: WordCount[],
  order: WordOrder,
): WordCount[] => {
  if (order === "alphabetical") {
    return words.toSorted((a, b) => a.label.localeCompare(b.label));
  }
  if (order === "rare") {
    return words.toSorted(
      (a, b) => a.chunkCount - b.chunkCount || a.label.localeCompare(b.label),
    );
  }

  return words.toSorted(
    (a, b) => b.chunkCount - a.chunkCount || a.label.localeCompare(b.label),
  );
};

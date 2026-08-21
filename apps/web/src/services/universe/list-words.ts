import type { UniverseIndex, WordCount } from "@/types/universe";

/**
 * Every word of the universe with the number of chunks it appears in, most
 * common first. One row per stem: "shift" and "shifts" are one word here, the
 * same as they are one hit in search.
 */
export const listWords = (index: UniverseIndex): WordCount[] =>
  [...index.documentFrequency]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([stem, chunkCount]) => ({
      chunkCount,
      label: index.surfaceForms.get(stem) ?? stem,
      stem,
    }));

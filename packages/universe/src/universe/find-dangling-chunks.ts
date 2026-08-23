import type { UniverseIndex } from "../types/universe";

/**
 * A chunk hangs when not one of its words appears anywhere else in the
 * universe: nothing links to it, and nothing would notice it leaving.
 */
export const findDanglingChunks = (index: UniverseIndex): string[] =>
  index.chunks
    .filter((chunk) =>
      chunk.stems.every(
        (stem) => (index.documentFrequency.get(stem) ?? 0) <= 1,
      ),
    )
    .map((chunk) => chunk.id);

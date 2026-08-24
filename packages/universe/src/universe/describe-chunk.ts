import type { ChunkProfile, UniverseIndex } from "../types/universe";

/**
 * One chunk told through its words, each carrying the number of other chunks
 * that hold it. Rarest first: a zero is a word that lives nowhere else, so
 * the top of the list is what this chunk alone says — and a chunk whose words
 * are all zeroes is the hanging one, named here word by word.
 */
export const describeChunk = (
  index: UniverseIndex,
  chunkId: string,
): ChunkProfile => ({
  id: chunkId,
  words: (index.byId.get(chunkId)?.stems ?? [])
    .map((stem) => ({
      elsewhere: (index.documentFrequency.get(stem) ?? 1) - 1,
      label: index.surfaceForms.get(stem) ?? stem,
      stem,
    }))
    .toSorted(
      (a, b) => a.elsewhere - b.elsewhere || a.label.localeCompare(b.label),
    ),
});

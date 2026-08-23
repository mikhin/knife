import type { Chunk } from "@knife/contract";
import type { ChunkFilter } from "@/types/list-view";

type Marks = {
  dangling: ReadonlySet<string>;
  duplicates: ReadonlySet<string>;
  noted: ReadonlySet<string>;
};

/**
 * Keeps only what one check flagged. Cleaning is done one kind of trouble at
 * a time — every repeat, then everything the linters wrote on, then every
 * chunk standing on its own — and a list holding all three at once makes
 * that switch by eye.
 */
export const filterChunks = (
  chunks: Chunk[],
  filter: ChunkFilter,
  marks: Marks,
): Chunk[] => {
  if (filter === "all") {
    return chunks;
  }

  const flagged = marks[filter];
  return chunks.filter((chunk) => flagged.has(chunk.id));
};

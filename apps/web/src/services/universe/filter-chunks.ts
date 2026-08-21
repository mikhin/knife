import type { Chunk } from "@knife/contract";
import type { ChunkFilter } from "@/types/list-view";

type Marks = {
  dangling: ReadonlySet<string>;
  duplicates: ReadonlySet<string>;
  water: ReadonlySet<string>;
};

/**
 * Keeps only what one check flagged. Cleaning is done one kind of trouble at
 * a time — every repeat, then every watery line — and a list holding all
 * three at once makes that switch by eye.
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

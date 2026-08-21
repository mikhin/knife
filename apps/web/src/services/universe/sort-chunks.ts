import type { Chunk } from "@knife/contract";
import type { ChunkOrder } from "@/types/list-order";

type Marks = {
  dangling: ReadonlySet<string>;
  duplicates: ReadonlySet<string>;
  water: ReadonlySet<string>;
};

/** A chunk two checks agree on comes before one only a single check flagged. */
const trouble = (id: string, marks: Marks): number =>
  (marks.duplicates.has(id) ? 2 : 0) +
  (marks.water.has(id) ? 1 : 0) +
  (marks.dangling.has(id) ? 1 : 0);

export const sortChunks = (
  chunks: Chunk[],
  order: ChunkOrder,
  marks: Marks,
): Chunk[] => {
  if (order === "newest") {
    return chunks.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (order === "oldest") {
    return chunks.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  if (order === "longest") {
    return chunks.toSorted((a, b) => b.text.length - a.text.length);
  }

  return chunks.toSorted((a, b) => trouble(b.id, marks) - trouble(a.id, marks));
};
